import { createReadStream, statSync } from 'fs';
import {
  reqHeaderResponse,
  resHeaders,
  __request
} from '../../../constants.js';
import { getMime } from '../../../helpers/mime.js';

// eslint-disable-next-line max-lines-per-function, complexity
export default function sendFile(
  path,
  lastModified = true,
  compressed = false
) {
  const req = this[__request];
  const { headers } = req;
  const responseHeaders = this[resHeaders] || {};

  const stat = statSync(path);
  let { size } = stat;

  // handling last modified
  if (lastModified) {
    const { mtime } = stat;

    mtime.setMilliseconds(0);
    const mtimeutc = mtime.toUTCString();

    // Return 304 if last-modified
    if (headers && headers['if-modified-since']) {
      if (new Date(headers['if-modified-since']) >= mtime) {
        this.writeStatus('304 Not Modified');
        return this.end();
      }
    }
    responseHeaders['last-modified'] = mtimeutc;
  }
  responseHeaders['content-type'] = getMime(path);

  // write data
  let start = 0;
  let end = 0;

  if (headers && headers.range) {
    [start, end] = headers.range
      .substr(6)
      .split('-')
      .map((byte) => (byte ? parseInt(byte, 10) : undefined));

    // Chrome patch for work
    if (end === undefined) {
      end = size - 1;
    }

    if (start !== undefined) {
      this.writeStatus('206 Partial Content');
      responseHeaders['accept-ranges'] = 'bytes';
      responseHeaders['content-range'] = `bytes ${start}-${end}/${size}`;
      size = end - start + 1;
    }
  }

  // for size = 0
  if (end < 0) {
    end = 0;
  }

  req[reqHeaderResponse] = responseHeaders;

  const createStreamInstance = end
    ? createReadStream(path, { start, end })
    : createReadStream(path);

  const pipe = this.pipe(createStreamInstance, size, compressed);
  this.writeHeaders(responseHeaders);

  return pipe;
}
