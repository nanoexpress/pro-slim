import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { __request } from '../../../src/constants.js';
import redirect from '../../../src/polyfills/http-response/polyfill-chunks/redirect.js';
import HttpResponse from '../../mock/http-response.js';

describe('HttpResponse.redirect', () => {
  it('should return correct code', () => {
    const res = new HttpResponse();

    redirect.call(res, 301);

    assert.equal(res.___code, '301 Moved Permanently');
  });
  it('should return correct path and autocorrected code', () => {
    const res = new HttpResponse();

    redirect.call(res, '/path');

    assert.equal(res.___code, '301 Moved Permanently');
    assert.deepStrictEqual(res.___headers, [
      { key: 'Location', value: '/path' }
    ]);
  });
  it('should ignore the request Host header (untrusted)', () => {
    const res = new HttpResponse();
    res[__request].headers = {
      host: 'evil.example:3333'
    };

    redirect.call(res, '/path');

    assert.equal(res.___code, '301 Moved Permanently');
    assert.deepStrictEqual(res.___headers, [
      { key: 'Location', value: '/path' }
    ]);
  });
});
