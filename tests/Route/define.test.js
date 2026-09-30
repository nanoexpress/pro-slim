import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import App from '../../src/app.js';
import Route from '../../src/route.js';

const define1 = (instance) => {
  instance.foo = true;
};

describe('Route.define via App', () => {
  it('defined successfully', () => {
    const route = new Route();
    const app = new App({}, null, route);

    app.define(define1);

    assert.equal(route.foo, true);
  });
  it('defined externally successfully', () => {
    const route = new Route();
    const routeExternal = new Route();
    const app = new App({}, null, route);

    app.define(define1);
    app.use(routeExternal);

    assert.equal(route.foo, true);
    assert.equal(routeExternal.foo, true);
  });
});
