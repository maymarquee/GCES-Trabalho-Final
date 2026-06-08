jest.mock('pg', function () {
  var mockQuery = jest.fn();
  var Pool = jest.fn(function () {
    return { query: mockQuery };
  });
  Pool._mockQuery = mockQuery;
  return { Pool: Pool };
});

var pg = require('pg');

beforeEach(function () {
  pg.Pool._mockQuery.mockReset();
});

// Re-require db.js fresh each test so the Pool mock is used
function loadDb() {
  jest.resetModules();
  jest.mock('pg', function () {
    var mockQuery = jest.fn();
    var Pool = jest.fn(function () {
      return { query: mockQuery };
    });
    Pool._mockQuery = mockQuery;
    return { Pool: Pool };
  });
  return require('../db');
}

describe('db module', function () {
  test('saveMatch calls pool.query with correct INSERT and parameters', async function () {
    var db = loadDb();
    var freshPg = require('pg');
    var mockQuery = freshPg.Pool._mockQuery;
    mockQuery.mockResolvedValue({ rows: [] });

    await db.saveMatch('sala1', 'socket-aaa', 'socket-bbb', 2);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    var call = mockQuery.mock.calls[0];
    expect(call[0]).toMatch(/INSERT INTO matches/i);
    expect(call[1]).toEqual(['sala1', 'socket-aaa', 'socket-bbb', 2]);
  });

  test('getMatches calls pool.query with SELECT and returns rows', async function () {
    var db = loadDb();
    var freshPg = require('pg');
    var mockQuery = freshPg.Pool._mockQuery;
    var fakeRows = [
      { id: 1, game_name: 'sala1', player1_id: 'aaa', player2_id: 'bbb', winner: 2, created_at: new Date() }
    ];
    mockQuery.mockResolvedValue({ rows: fakeRows });

    var result = await db.getMatches();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toMatch(/SELECT/i);
    expect(result).toEqual(fakeRows);
  });

  test('saveMatch propagates query errors', async function () {
    var db = loadDb();
    var freshPg = require('pg');
    var mockQuery = freshPg.Pool._mockQuery;
    mockQuery.mockRejectedValue(new Error('connection refused'));

    await expect(db.saveMatch('x', 'a', 'b', 1)).rejects.toThrow('connection refused');
  });
});
