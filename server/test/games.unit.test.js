var GameCollection = require('../games').GameCollection;

function makeSocket(id) {
  return {
    id: id || ('socket-' + Math.random().toString(36).slice(2)),
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  };
}

describe('GameCollection', function () {
  test('createGame returns true for a new game name', function () {
    var col = new GameCollection();
    expect(col.createGame('game-new')).toBe(true);
  });

  test('createGame returns false for a duplicate name', function () {
    var col = new GameCollection();
    col.createGame('game-dupe');
    expect(col.createGame('game-dupe')).toBe(false);
  });

  test('getGame returns the game after creation', function () {
    var col = new GameCollection();
    col.createGame('game-get');
    expect(col.getGame('game-get')).toBeDefined();
  });

  test('getGame returns undefined for a non-existent game', function () {
    var col = new GameCollection();
    expect(col.getGame('ghost')).toBeUndefined();
  });

  test('removeGame removes an existing game and returns true', function () {
    var col = new GameCollection();
    col.createGame('game-remove');
    expect(col.removeGame('game-remove')).toBe(true);
    expect(col.getGame('game-remove')).toBeUndefined();
  });

  test('removeGame returns false for a non-existent game', function () {
    var col = new GameCollection();
    expect(col.removeGame('ghost')).toBe(false);
  });
});

describe('Game.addPlayer', function () {
  test('accepts a first and second player and returns true', function () {
    var col = new GameCollection();
    col.createGame('game-players');
    var game = col.getGame('game-players');
    expect(game.addPlayer(makeSocket('p1'))).toBe(true);
    expect(game.addPlayer(makeSocket('p2'))).toBe(true);
  });

  test('rejects a third player and returns false', function () {
    var col = new GameCollection();
    col.createGame('game-full');
    var game = col.getGame('game-full');
    game.addPlayer(makeSocket('p1'));
    game.addPlayer(makeSocket('p2'));
    expect(game.addPlayer(makeSocket('p3'))).toBe(false);
  });
});

describe('Game.getPlayerCount', function () {
  test('returns 0 for a newly created game', function () {
    var col = new GameCollection();
    col.createGame('count-0');
    var game = col.getGame('count-0');
    expect(game.getPlayerCount()).toBe(0);
  });

  test('returns 1 after one player is added', function () {
    var col = new GameCollection();
    col.createGame('count-1');
    var game = col.getGame('count-1');
    game.addPlayer(makeSocket('p1'));
    expect(game.getPlayerCount()).toBe(1);
  });

  test('returns 2 after two players are added', function () {
    var col = new GameCollection();
    col.createGame('count-2');
    var game = col.getGame('count-2');
    game.addPlayer(makeSocket('p1'));
    game.addPlayer(makeSocket('p2'));
    expect(game.getPlayerCount()).toBe(2);
  });
});
