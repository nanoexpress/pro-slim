import { HttpResponse } from './polyfills/index.js';
import {
  __request,
  __response,
  resConfig,
  HttpResponseKeys
} from './constants.js';
import _gc from './helpers/gc.js';
import exposeRoute from './expose/Route.js';

export default exposeRoute(
  class Route {
    constructor() {
      this._middlewares = null;

      this._baseUrl = '';

      this._module = true;
      this._rootLevel = false;
    }
    get raw() {
      return this._app;
    }
    _prepareMiddlewares(path, middlewares) {
      middlewares.forEach((middleware) => {
        if (middleware._module) {
          middleware._app = this._app;
          middleware._config = this._config;
          middleware._define = this._define;
          middleware._baseUrl =
            typeof path === 'string' ? path : middleware._baseUrl || '/';

          if (!middleware.defined && this._define) {
            this._define(middleware);
            middleware.defined = true;
          }
          return middleware;
        }
        if (middleware.constructor.name !== 'AsyncFunction') {
          throw new Error(
            '[nanoexpress] Only Async Functions are allowed to expose route'
          );
        }
        return middleware;
      });
    }
    use(path, ...middlewares) {
      let { _middlewares } = this;

      if (!_middlewares) {
        _middlewares = [];
        this._middlewares = _middlewares;
      }

      if (typeof path === 'function' || path._module) {
        middlewares.unshift(path);
        path = undefined;
      }

      middlewares.forEach((middleware) => {
        if (middleware.onPrepare) {
          middleware.onPrepare();
        }
      });
      this._prepareMiddlewares(path, middlewares);
      _middlewares.push(...middlewares);

      _gc();

      return this;
    }
    _prepareMethod(method, { originalUrl, path }, ...middlewares) {
      // eslint-disable-next-line no-unused-vars
      const { _baseUrl, _middlewares, _module, _config } = this;

      const handleError = _config._errorHandler;
      const jsonSpaces = _config.json_spaces;

      const fetchMethod = method.toUpperCase() === 'ANY';
      const fetchUrl = path.indexOf('*') !== -1 || path.indexOf(':') !== -1;

      if (
        middlewares &&
        (middlewares.length > 1 || (_middlewares && _middlewares.length > 0))
      ) {
        this._prepareMiddlewares(path, middlewares);

        middlewares = Array.isArray(_middlewares)
          ? _middlewares.concat(middlewares)
          : middlewares;
      } else if (middlewares.length === 1) {
        middlewares[0].async =
          middlewares[0].constructor.name == 'AsyncFunction';
      }

      _gc();

      return async (res, req) => {
        res.aborted = false;

        req.method = fetchMethod ? req.getMethod().toUpperCase() : method;
        req.path = fetchUrl ? req.getUrl().substr(_baseUrl.length) : path;
        req.baseUrl = _baseUrl || '';

        // Aliases for polyfill
        req.url = req.path;
        req.originalUrl = originalUrl;

        let response;
        let skipCheck = false;
        let stopNext = false;
        let newMethod;

        // Aliases for future usage and easy-access
        req[__response] = res;
        res[__request] = req;
        res[resConfig] = _config;

        // Extending HttpResponse
        for (let i = 0, len = HttpResponseKeys.length; i < len; i++) {
          newMethod = HttpResponseKeys[i];

          res.__proto__[newMethod] = HttpResponse[newMethod];
        }

        if (middlewares && middlewares.length > 0) {
          for (const middleware of middlewares) {
            if (res.aborted || stopNext || skipCheck) {
              break;
            }
            if (typeof middleware !== 'function') {
              continue;
            }

            if (middleware.async === false) {
              response = middleware(req, res);
            } else {
              response = await middleware(req, res).catch(handleError);
            }

            if (response === res) {
              skipCheck = true;
            } else if (
              response &&
              (response.message || response.stack_trace || response.status_code)
            ) {
              if (response.status_code) {
                res.status(response.status_code);
              }
              skipCheck = false;
              stopNext = true;
            }
          }
        }

        if (
          res.aborted ||
          (!skipCheck && (method === 'OPTIONS' || res.stream !== undefined))
        ) {
          skipCheck = true;
        }

        if (
          !res.aborted &&
          !skipCheck &&
          (fetchUrl || (!fetchUrl && req.path === path))
        ) {
          if (res.compiledResponse) {
            res.end(res.compiledResponse);
          } else if (res.serialize) {
            res.end(res.serialize(response));
          } else if (typeof response === 'object') {
            res.end(JSON.stringify(response, null, jsonSpaces));
          } else if (response) {
            res.end(response);
          }
        }
      };
    }
  }
);
