var http = require('http');
var express = require('express');
var ioServer = require('socket.io');
var ioClient = require('socket.io-client');
var GameCollection = require('../games.js').GameCollection;

var Responses = { SUCCESS: 0, GAME_EXISTS: 1, GAME_NOT_EXISTS: 2, GAME_FULL: 3 };
var Requests = { CREATE_GAME: 'create-game', JOIN_GAME: 'join-game' };

var server, io, baseUrl;

beforeAll(function (done) {
  var app = express();
  server = http.createServer(app);
  io = ioServer(server);
  var games = new GameCollection();

  io.on('connection', function (socket) {
    socket.on(Requests.CREATE_GAME, function (gameName) {
      if (games.createGame(gameName)) {
        games.getGame(gameName).addPlayer(socket);
        socket.emit('response', Responses.SUCCESS);
      } else {
        socket.emit('response', Responses.GAME_EXISTS);
      }
    });
    socket.on(Requests.JOIN_GAME, function (gameName) {
      var game = games.getGame(gameName);
      if (!game) {
        socket.emit('response', Responses.GAME_NOT_EXISTS);
      } else {
        if (game.addPlayer(socket)) {
          socket.emit('response', Responses.SUCCESS);
        } else {
          socket.emit('response', Responses.GAME_FULL);
        }
      }
    });
  });

  server.listen(0, function () {
    baseUrl = 'http://localhost:' + server.address().port;
    done();
  });
});

afterAll(function (done) {
  io.close();
  server.close(done);
});

function connect() {
  return new Promise(function (resolve) {
    var socket = ioClient(baseUrl, { forceNew: true });
    socket.once('connect', function () {
      resolve(socket);
    });
  });
}

function once(socket, event) {
  return new Promise(function (resolve) {
    socket.once(event, resolve);
  });
}

function disconnectAll() {
  var sockets = Array.prototype.slice.call(arguments);
  sockets.forEach(function (s) {
    if (s && s.connected) {
      s.disconnect();
    }
  });
}

describe('matchmaking relay protocol', function () {

  test('create-game with a new name responds SUCCESS', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.CREATE_GAME, 'game-success');
      return once(p1, 'response').then(function (code) {
        expect(code).toBe(Responses.SUCCESS);
        disconnectAll(p1);
      });
    });
  });

  test('create-game with a name already in use responds GAME_EXISTS', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.CREATE_GAME, 'game-duplicate');
      return once(p1, 'response').then(function () {
        return connect().then(function (p2) {
          p2.emit(Requests.CREATE_GAME, 'game-duplicate');
          return once(p2, 'response').then(function (code) {
            expect(code).toBe(Responses.GAME_EXISTS);
            disconnectAll(p1, p2);
          });
        });
      });
    });
  });

  test('join-game for a name with no active game responds GAME_NOT_EXISTS', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.JOIN_GAME, 'no-such-game');
      return once(p1, 'response').then(function (code) {
        expect(code).toBe(Responses.GAME_NOT_EXISTS);
        disconnectAll(p1);
      });
    });
  });

  test('join-game for an open game responds SUCCESS and notifies the creator via player-connected', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.CREATE_GAME, 'game-join');
      return once(p1, 'response').then(function () {
        var playerConnected = once(p1, 'player-connected');
        return connect().then(function (p2) {
          p2.emit(Requests.JOIN_GAME, 'game-join');
          return Promise.all([once(p2, 'response'), playerConnected]).then(function (results) {
            expect(results[0]).toBe(Responses.SUCCESS);
            expect(results[1]).toBe(0);
            disconnectAll(p1, p2);
          });
        });
      });
    });
  });

  test('join-game for a full game responds GAME_FULL', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.CREATE_GAME, 'game-full');
      return once(p1, 'response').then(function () {
        return connect().then(function (p2) {
          p2.emit(Requests.JOIN_GAME, 'game-full');
          return once(p2, 'response').then(function () {
            return connect().then(function (p3) {
              p3.emit(Requests.JOIN_GAME, 'game-full');
              return once(p3, 'response').then(function (code) {
                expect(code).toBe(Responses.GAME_FULL);
                disconnectAll(p1, p2, p3);
              });
            });
          });
        });
      });
    });
  });

  test('event/life-update/position-update are relayed verbatim between paired players', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.CREATE_GAME, 'game-relay');
      return once(p1, 'response').then(function () {
        return connect().then(function (p2) {
          p2.emit(Requests.JOIN_GAME, 'game-relay');
          return once(p2, 'response').then(function () {
            var p2GotEvent = once(p2, 'event');
            var p1GotLife = once(p1, 'life-update');
            var p1GotPosition = once(p1, 'position-update');

            p1.emit('event', { type: 'attack' });
            p2.emit('life-update', { life: 42 });
            p2.emit('position-update', { x: 10, y: 20 });

            return Promise.all([p2GotEvent, p1GotLife, p1GotPosition]).then(function (results) {
              expect(results[0]).toEqual({ type: 'attack' });
              expect(results[1]).toEqual({ life: 42 });
              expect(results[2]).toEqual({ x: 10, y: 20 });
              disconnectAll(p1, p2);
            });
          });
        });
      });
    });
  });

  test('disconnecting one player ends the match for the other', function () {
    return connect().then(function (p1) {
      p1.emit(Requests.CREATE_GAME, 'game-disconnect');
      return once(p1, 'response').then(function () {
        return connect().then(function (p2) {
          p2.emit(Requests.JOIN_GAME, 'game-disconnect');
          return once(p2, 'response').then(function () {
            var p1Disconnected = once(p1, 'disconnect');
            p2.disconnect();
            return p1Disconnected.then(function () {
              // The game's name must be free again once the match has ended.
              return connect().then(function (p3) {
                p3.emit(Requests.CREATE_GAME, 'game-disconnect');
                return once(p3, 'response').then(function (code) {
                  expect(code).toBe(Responses.SUCCESS);
                  disconnectAll(p1, p3);
                });
              });
            });
          });
        });
      });
    });
  });

});
