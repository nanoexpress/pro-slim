import http from 'http';
import https from 'https';

http.globalAgent.keepAlive = true;
https.globalAgent.keepAlive = true;

const httpRequest = (agent, url, config) =>
  new Promise((resolve, reject) => {
    agent[config.method](url, config, (response) => {
      let buff;
      response.on('data', (chunk) => {
        if (!buff) {
          buff = Buffer.from(chunk);
        } else {
          buff = Buffer.concat([buff, chunk]);
        }
      });
      response.on('end', () => {
        response.data = buff;

        resolve(response);
      });
      response.on('error', reject);
    });
  });

const prepareProxy = (
  path,
  {
    url,
    method,
    enableHeadersProxy = false,
    restrictedHeaders = ['Host', 'Content-Length', 'uWebSockets']
  } = {},
  wsInstance
) => {
  const isAny = method === undefined;
  const proxyPathLen = path.length;
  const disallowedHeaders = restrictedHeaders.map((header) =>
    header.toLowerCase()
  );

  // Prepared object to return
  const prepared = {
    isAny
  };

  const ssl = url.indexOf('https:') === 0;
  const agent = ssl ? https : http;

  if (method) {
    method = method.toLowerCase();
  }

  // HTTP Request configuration
  const config = {
    url,
    method,
    headers: {}
  };

  prepared.method = isAny ? 'any' : method;
  prepared.http = async (res, req) => {
    // Allow waiting for request finishing
    let isAborted = false;
    res.onAborted(() => {
      isAborted = true;
    });

    // Fetch needed methods and configure
    const httpUrl = url + req.getUrl().substr(proxyPathLen);

    config.method = isAny ? req.getMethod() : method;

    // Proxy headers too if it's defined
    if (enableHeadersProxy) {
      req.forEach((key, value) => {
        if (disallowedHeaders.indexOf(key) === -1) {
          config.headers[key] = value;
        }
      });
    } else {
      config.headers.connection = req.getHeader('connection');
    }

    const { data, headers } = await httpRequest(agent, httpUrl, config);

    if (isAborted) {
      return;
    }

    res.experimental_cork(() => {
      if (isAborted) {
        return;
      }

      if (enableHeadersProxy) {
        for (const key in headers) {
          const value = headers[key];

          if (disallowedHeaders.indexOf(key) !== -1) {
            continue;
          }

          if (typeof value === 'string') {
            res.writeHeader(key, value);
          } else if (value.splice) {
            for (let i = 0, len = value.length; i < len; i++) {
              res.writeHeader(key, value[i]);
            }
          }
        }
      }

      res.end(data);
    });
  };
  if (wsInstance) {
    prepared.ws = {
      open(ws, req) {
        config.method = 'ws';

        const wsUrl =
          url.replace(/http/, 'ws') + req.getUrl().substr(proxyPathLen);

        ws.instance = new wsInstance(wsUrl);

        ws.instance.on('message', (data) => {
          ws.send(data);
        });

        ws.instance.emit('open');
      },
      message(ws, message, isBinary) {
        if (!isBinary) {
          message = Buffer.from(message).toString('utf-8');
        }

        ws.instance.send(message);
      },
      close(ws, code, reason) {
        ws.instance.close(code, reason);
      }
    };
  }

  return prepared;
};

export default (app) => {
  app.proxy = (path, config, wsInstance) => {
    const { ws, http, method } = prepareProxy(path, config, wsInstance);

    if (http) {
      app._app[method](path, http);
    }
    if (ws) {
      app._app.ws(path, ws);
    }
    return app;
  };
};
