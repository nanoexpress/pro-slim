import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import status from '../../../src/polyfills/http-response/polyfill-chunks/status.js';

const _this = {
  writeStatus(statusCode) {
    this.statusCode = statusCode;
  }
};

describe('HttpResponse.status', () => {
  it('empty values should throw', () => {
    try {
      status.call(_this);
    } catch (e) {
      assert.equal(e.message, 'Invalid Code: undefined');
    }
  });
  it('status string should not changed', () => {
    status.call(_this, '201 Created');

    assert.equal(_this.statusCode, '201 Created');
  });
  it('status http code should be normalised', () => {
    status.call(_this, 201);

    assert.equal(_this.statusCode, '201 Created');
  });
  it('status invalid code-type should be thrown', () => {
    try {
      status.call(_this, { code: 200 });
    } catch (e) {
      assert.equal(e.message, 'Invalid Code: {"code":200}');
    }
  });
});
