//
// # Puppeteer
//
var http = require('http');
var path = require('path');
var socketio = require('socket.io');
var express = require('express');
var gameloop = require('node-gameloop');
var uuid = require('node-uuid');
var QRCode = require('qrcode');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));



var NUMBER_OF_PUPPETS_PER_GAME = Infinity;
var DEBUG_LEVEL = 1;
var GAME_ID_LENGTH = 3;
var MOUTH_OPEN_SPEED = 10;
var TIME_TO_REPORT_STATS = 10;
var GAME_LOOP_RATE = 1000 / 30;


var timeToReportStats = TIME_TO_REPORT_STATS;
var games = {};
var playerGames = {};
var players = {};

// Client connected
function onPlayerConnect(socket) {
  var playerId = socket.id;
  
  console.info('Player connect:', playerId);
  
  players[playerId] = socket;

  socket.on('disconnect', onPlayerDisconnect.bind(socket));
  socket.on('listGamesFromClient', listGamesFromClient.bind(socket));
  socket.on('connectToGameFromClient', connectToGameFromClient.bind(socket));
  
  socket.on('createGameFromClient', createGameFromClient.bind(socket));
  socket.on('resizeGameFromClient', resizeGameFromClient.bind(socket));
  
  socket.on('addPuppetFromClient', addPuppetFromClient.bind(socket));
  socket.on('movementFromClient', movementFromClient.bind(socket));
  socket.on('positionFromClient', positionFromClient.bind(socket));
  socket.on('flipPuppetFromClient', flipPuppetFromClient.bind(socket));
  socket.on('setMouthStateFromClient', setMouthStateFromClient.bind(socket));
}

// Client disconnected
function onPlayerDisconnect() {
  var playerId = this.id;
  
  console.info('Player disconnect:', playerId);
  
  for (var gameId in games) {
    var game = games[gameId];
    
    if (game.playerIds.indexOf(playerId) !== -1) {
      sendToGamePlayers(game, 'removePlayerToClient', playerId);
      
      console.info('-DC: remove from game');
      game.playerIds.splice(game.playerIds.indexOf(playerId), 1);
    }
    
    var gamePuppetId = game.playerPuppets[playerId];
    if (gamePuppetId) {
      console.info('-DC: remove puppet', gamePuppetId);
      delete game.puppets[gamePuppetId];
      delete game.playerPuppets[playerId];
      game.numberOfPuppets--;
    }
    
    if (game.playerIds.length === 0) {
      delete games[gameId];
    }
  }
  
  delete playerGames[playerId];
  delete players[playerId];
}

// Main game loop - update all puppets and send to all clients
function gameLoop(dt) {
  for (var id in games) {
    var game = games[id];
    var puppets = games[id].puppets;
    
    for (var puppetId in puppets) {
      var puppet = puppets[puppetId];
      
      if (puppet.isOpeningMouth) {
        puppet.mouthOpen = Math.min(puppet.mouthOpen + MOUTH_OPEN_SPEED * dt, 1);
      } else {
        puppet.mouthOpen = Math.max(puppet.mouthOpen - MOUTH_OPEN_SPEED * dt, 0);
      }
    }
    
    sendToGamePlayers(game, 'gamePuppetsToClient', puppets);
  }
  
  timeToReportStats -= dt;
  if (timeToReportStats <= 0) {
    showStats();
    timeToReportStats = TIME_TO_REPORT_STATS;
  }
}

// Perdically log stats to console
function showStats() {
  var now = new Date();
  var hours = now.getHours();
  var minutes = now.getMinutes();
  var seconds = now.getSeconds();
  var numViewers = 0;
  var numControllers = 0;
  var logMessage = '';
  
  (hours < 10) && (hours = '0' + hours);
  (minutes < 10) && (minutes = '0' + minutes);
  (seconds < 10) && (seconds = '0' + seconds);
  
  for (var playerId in players) {
    if (getPlayerPuppet(playerId)) {
      numControllers++;
    } else {
      numViewers++;
    }
  }
  
  logMessage += '[' + hours + ':' + minutes + ':' + seconds + '] Stats: ';
  logMessage += len(games) + ' Games | ';
  logMessage += len(players) + ' Players ';
  logMessage += '(' + numViewers + ' viewers, ' + numControllers + ' controllers)';
  
  console.info(logMessage);
}

// Client changed the size of the game - viewers only
function resizeGameFromClient(data) {
  var width = data.width;
  var height = data.height;
  var playerId = this.id;
  var game = games[playerGames[playerId] || ''];
  
  if (game && game.ownerId === playerId) {
    game.width = width;
    game.height = height;
  
    sendToGamePlayers(game, 'resizeGameToClient', {
      'width': width,
      'height': height
    });
  }
}

// Client changed the puppet orientation
function movementFromClient(movementData) {
  var puppet = getPlayerPuppet(this.id);
  if (puppet) {
    if (movementData.alpha > 180) {
      movementData.alpha = Math.min((360 - movementData.alpha), 90);
    } else {
      movementData.alpha = -movementData.alpha;
    }
    
    puppet.movementData = movementData;
  }
}

// Client moved the puppet
function positionFromClient(positionData) {
  var puppet = getPlayerPuppet(this.id);
  if (puppet) {
    puppet.x = positionData.x;
    puppet.y = positionData.y;
  }
}

// Client requested to flip the puppet
function flipPuppetFromClient() {
  var puppet = getPlayerPuppet(this.id);
  if (puppet) {
    puppet.isFlipped = !puppet.isFlipped;
  }
}

// Client changed the mouth state (will do it over time in gameLoop)
function setMouthStateFromClient(isOpen) {
  var puppet = getPlayerPuppet(this.id);
  if (puppet) {
    puppet.isOpeningMouth = isOpen;
  }
}

// Gets the puppet associated with a player
function getPlayerPuppet(playerId) {
  var game = games[playerGames[playerId] || ''];
  if (!game) {
    return null;
  }
  
  var puppet = game.puppets[game.playerPuppets[playerId]];
  if (!puppet) {
    return null;
  }

  return puppet;
}

// Client requested to add a puppet
function addPuppetFromClient(data) {
  var playerId = this.id;
  var player = players[playerId];
  var game = games[playerGames[playerId] || ''];
  
  if (!player || !game) {
    console.warn('addPuppetFromClient | missing player info', playerId, playerGames[playerId], game);
    return false;
  }
  
  if (game.numberOfPuppets >= NUMBER_OF_PUPPETS_PER_GAME) {
    console.warn('Maximum puppets reached per game', game);
    return false;
  }
    
  var width = 200;
  var height = 200;
  
  var puppet = {
    'id': 'puppet_' + uuid.v4(),
    'x': rand(width / game.width, 1 - width / game.width),
    'y': rand(height / game.height, 1 - height / game.height),
    'width': width,
    'height': height,
    'isFlipped': false,
    'mouthOpen': 0,
    'type': data.type,
    'name': data.name || player.name || 'Puppet',
    'colour': 'rgb(' + randInt(50, 200) + ',' + randInt(50, 200) + ',' + randInt(50, 200) + ')',
    'movementData': {}
  };
  
  game.numberOfPuppets++;
  game.puppets[puppet.id] = puppet;
  game.playerPuppets[playerId] = puppet.id;
  
  sendToGamePlayers(game, 'addPuppetToClient', {
    'puppet': puppet
  });
  
  player.emit('possessPuppetToClient', {
    'puppetId': puppet.id
  });
  
  console.info('Create puppet and send to player', puppet.id, playerId);
}

// Helper method to send a message to all the players in a game
function sendToGamePlayers(game, message, data) {
  var playerIds = game.playerIds || [];
  for (var i = 0, len = playerIds.length; i < len; i++) {
    var playerId = playerIds[i];
    var player = players[playerId];
    
    if (player) {
      player.emit(message, data);
    }
  }
}

// Client requested to join a game
function connectToGameFromClient(data) {
  connectPlayerToGame(this.id, data.gameId);
}

// Connect a client to a game
function connectPlayerToGame(playerId, gameId) {
  var player = players[playerId];
  var game = games[gameId];
  
  if (!game) {
    player.emit('errorToClient', {
      'code': 1,
      'message': 'Trying to join invalid game'
    });
    
    console.warn('trying to connect to missing game');
    return;
  }
  
  console.info('connectPlayerToGame', playerId, gameId);
  
  game.playerIds.push(playerId);
  playerGames[playerId] = gameId;
  
  player.emit('gameInfoToClient', {
    'game': game
  });
}

// Client wants to create a new game
function createGameFromClient(data) {
  var playerId = this.id;
  var gameId = generateGameId();
  var game = {
    'id': gameId,
    'url': 'http://pupeteer.evyatron.c9.io/?' + gameId,
    'ownerId': playerId,
    'width': data.width,
    'height': data.height,
    'playerIds': [],
    'puppets': {},
    'playerPuppets': {},
    'numberOfPuppets': 0,
    'qr': ''
  };
  games[gameId] = game;
  
  console.info('Create new game', gameId);
  
  QRCode.toDataURL(game.url, function onQRReady(err, url) {
    if (!err) {
      game.qr = url;
    }
    
    connectPlayerToGame(playerId, gameId, true);
  });
}

// Client requested a list of games
function listGamesFromClient() {
  this.emit('listGamesToClient', {
    'games': games
  });
}

// Generate a game id
function generateGameId() {
  var id = '';
  var symbols = ['a','b','c','d','e','f','g','h','i','j','k','l','m',
                 'n','o','p','q','r','s','t','u','v','w','x','y','z'];
  
  do {
    for (var i = 0; i < GAME_ID_LENGTH; i++ ) {
      id += symbols[Math.floor(Math.random() * symbols.length)];
    }
  } while (games[id])
  
  return id;
}

/* Utils */
function rand(from, to) { return Math.random() * (to - from) + from; }
function randInt(from, to) { return Math.round(rand(from, to)); }
function len(obj) { return Array.isArray(obj)? obj.length : Object.keys(obj).length; }
/* Utils END */


io.set('log level', DEBUG_LEVEL);

io.on('connection', onPlayerConnect);

gameloop.setGameLoop(gameLoop, GAME_LOOP_RATE);

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});