import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import writeHead from '../../../src/polyfills/http-response/polyfill-chunks/write-head.js';
import HttpResponse from '../../mock/http-response.js';

describe('HttpResponse.writeHead', () => {
  it('empty status should do nothing', () => {
    const res = new HttpResponse();
    writeHead.call(res);
    assert.ok(res);
  });
  it('string status code should work', () => {
    const res = new HttpResponse();
    writeHead.call(res, '201 Created');

    assert.equal(res.statusCode, '201 Created');
  });
  it('numeric status code should work', () => {
    const res = new HttpResponse();
    writeHead.call(res, 201);
    assert.ok(res);
  });
  it('http headers should work', () => {
    const res = new HttpResponse();
    writeHead.call(res, 201, { Location: '/path_head' });
    res.applyHeaders();

    assert.equal(res.statusCode, '201 Created');
    assert.deepStrictEqual(res.___headers, [
      { key: 'Location', value: '/path_head' }
    ]);
  });
});
