import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Route from '../../src/route.js';

describe('Route.create', () => {
  it('created successfully', () => {
    assert.ok(new Route());
  });
});
