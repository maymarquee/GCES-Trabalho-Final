'use strict';

var fc = require('fast-check');
var GameCollection = require('../games').GameCollection;

function makeSocket(id) {
  return {
    id: id || ('s-' + Math.random().toString(36).slice(2)),
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  };
}

// Covers normal strings plus boundary-breaking values a client might send
var anyInput = fc.oneof(
  fc.string(),
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('__proto__'),
  fc.constant('constructor'),
  fc.constant('toString'),
  fc.integer(),
  fc.float(),
  fc.boolean(),
  fc.array(fc.string(), { maxLength: 3 }),
  fc.object({ maxDepth: 1 }),
  fc.string({ minLength: 1000, maxLength: 10000 })
);

var nonStringInput = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.integer(),
  fc.float(),
  fc.boolean(),
  fc.array(fc.string(), { maxLength: 3 }),
  fc.object({ maxDepth: 1 })
);

describe('GameCollection fuzz', function () {

  test('createGame never throws for arbitrary inputs', function () {
    fc.assert(
      fc.property(anyInput, function (id) {
        var col = new GameCollection();
        expect(function () { col.createGame(id); }).not.toThrow();
      }),
      { numRuns: 300 }
    );
  });

  test('getGame never throws for arbitrary inputs', function () {
    fc.assert(
      fc.property(anyInput, function (id) {
        var col = new GameCollection();
        expect(function () { col.getGame(id); }).not.toThrow();
      }),
      { numRuns: 300 }
    );
  });

  test('removeGame never throws for arbitrary inputs', function () {
    fc.assert(
      fc.property(anyInput, function (id) {
        var col = new GameCollection();
        expect(function () { col.removeGame(id); }).not.toThrow();
      }),
      { numRuns: 300 }
    );
  });

  // RED: createGame silently coerces non-string inputs (null -> "null" etc.)
  // instead of rejecting them. Both assertions below fail before the fix.
  test('createGame with non-string input returns false', function () {
    fc.assert(
      fc.property(nonStringInput, function (id) {
        var col = new GameCollection();
        expect(col.createGame(id)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  test('createGame(null) does not occupy the slot for string "null"', function () {
    var col = new GameCollection();
    col.createGame(null);
    expect(col.createGame('null')).toBe(true);
  });

  test('round-trip: createGame(s) true implies getGame(s) is defined', function () {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), function (name) {
        var col = new GameCollection();
        if (col.createGame(name)) {
          expect(col.getGame(name)).toBeDefined();
        }
      }),
      { numRuns: 200 }
    );
  });

  test('addPlayer never throws for arbitrary game names', function () {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), function (name) {
        var col = new GameCollection();
        col.createGame(name);
        var game = col.getGame(name);
        expect(function () { game.addPlayer(makeSocket()); }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

});
