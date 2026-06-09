var Messages = {
  EVENT: 'event',
  LIFE_UPDATE: 'life-update',
  POSITION_UPDATE: 'position-update',
  PLAYER_CONNECTED: 'player-connected'
};


function Game(id, gameCollection, db) {
  this._id = id;
  this._gameCollection = gameCollection;
  this._db = db || null;
  this._players = [];
}

Game.prototype.getId = function () {
  return this._id;
};

Game.prototype.getPlayerCount = function () {
  return this._players.length;
};

Game.prototype.addPlayer = function (p) {
  if (this._players.length > 1) {
    return false;
  }
  this._players.push(p);
  if (this._players.length > 1) {
    this._addHandlers();
    this._players[0].emit(Messages.PLAYER_CONNECTED, 0);
  }
  return true;
};

Game.prototype._addHandlers = function () {
  var p1 = this._players[0],
      p2 = this._players[1],
      m = Messages,
      self = this;
  p1.on(m.EVENT, function (data) {
    p2.emit(m.EVENT, data);
  });
  p1.on(m.LIFE_UPDATE, function (data) {
    p2.emit(m.LIFE_UPDATE, data);
  });
  p1.on(m.POSITION_UPDATE, function (data) {
    p2.emit(m.POSITION_UPDATE, data);
  });
  p2.on(m.EVENT, function (data) {
    p1.emit(m.EVENT, data);
  });
  p2.on(m.LIFE_UPDATE, function (data) {
    p1.emit(m.LIFE_UPDATE, data);
  });
  p2.on(m.POSITION_UPDATE, function (data) {
    p1.emit(m.POSITION_UPDATE, data);
  });
  p1.on('disconnect', function () {
    self.endGame(0);
  });
  p2.on('disconnect', function () {
    self.endGame(1);
  });
};

Game.prototype.endGame = function (playerOut) {
  if (!this._players.length) return;
  var winner = +!playerOut;
  var player1Id = this._players[0].id;
  var player2Id = this._players[1].id;
  var opponentSocket = this._players[winner];
  this._players = [];
  if (this._db) {
    this._db.saveMatch(this._id, player1Id, player2Id, winner + 1).catch(function (err) {
      console.error('[db] save match failed:', err.message);
    });
  }
  opponentSocket.disconnect();
  this._gameCollection.removeGame(this._id);
};

function GameCollection(db) {
  this._games = Object.create(null);
  this._db = db || null;
}

GameCollection.prototype.getGame = function (game) {
  return this._games[game];
};

GameCollection.prototype.createGame = function (id) {
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }
  if (this._games[id]) {
    return false;
  }
  var game = new Game(id, this, this._db);
  this._games[id] = game;
  return true;
};

GameCollection.prototype.removeGame = function (id) {
  if (this._games[id]) {
    delete this._games[id];
    return true;
  }
  return false;
};

exports.GameCollection = GameCollection;