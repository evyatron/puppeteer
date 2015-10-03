//
// # SimpleServer
//
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

var NUMBER_OF_PUPPETS_PER_GAME = Infinity;
var DEBUG_LEVEL = 1;
var GAME_ID_LENGTH = 6;
var MOUTH_OPEN_SPEED = 8;

router.use(express.static(path.resolve(__dirname, 'client')));

var games = {};
var playerGames = {};
var players = {};

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
}

function resizeGameFromClient(data) {
  var width = data.width;
  var height = data.height;
  var playerId = this.id;
  var game = games[playerGames[playerId] || ''];
  
  if (game) {
    game.width = width;
    game.height = height;
  
    sendToGamePlayers(game, 'resizeGameToClient', {
      'width': width,
      'height': height
    });
  }
}

function movementFromClient(movementData) {
  if (movementData.alpha > 180) {
    movementData.alpha = Math.min((360 - movementData.alpha), 90);
  } else {
    movementData.alpha = -movementData.alpha;
  }
  
  getPlayerPuppet(this.id, function onGotPuppet(puppet) {
    puppet.movementData = movementData;
  }, function onError() {
    
  });
}

function positionFromClient(positionData) {
  getPlayerPuppet(this.id, function onGotPuppet(puppet) {
    puppet.x = positionData.x;
    puppet.y = positionData.y;
  }, function onError() {
    
  });
}

function flipPuppetFromClient() {
  getPlayerPuppet(this.id, function onGotPuppet(puppet) {
    puppet.isFlipped = !puppet.isFlipped;
  }, function onError() {
    
  });
}

function openMouthFromClient() {
  getPlayerPuppet(this.id, function onGotPuppet(puppet) {
    puppet.isOpeningMouth = true;
  }, function onError() {
    
  });
}

function closeMouthFromClient() {
  getPlayerPuppet(this.id, function onGotPuppet(puppet) {
    puppet.isOpeningMouth = false;
  }, function onError() {
    
  });
}

function getPlayerPuppet(playerId, onSuccess, onError) {
  var player = players[playerId];
  var game = games[playerGames[playerId] || ''];
  
  if (!player || !game) {
    onError();
    return false;
  }
  
  var puppetId = game.playerPuppets[playerId];
  var puppet = game.puppets[puppetId];
  if (!puppet) {
    onError();
    return false;
  }
  
  onSuccess(puppet);
  
  return true;
}

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

function generateGameId() {
  var id = '';
  var symbols = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
  
  for (var i = 0; i < GAME_ID_LENGTH; i++ ) {
    id += symbols[Math.floor(Math.random() * symbols.length)];
  }
  
  return id;
}

function connectToGameFromClient(data) {
  connectPlayerToGame(this.id, data.gameId);
}

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

function listGamesFromClient() {
  this.emit('listGamesToClient', {
    'games': games
  });
}

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
  socket.on('openMouthFromClient', openMouthFromClient.bind(socket));
  socket.on('closeMouthFromClient', closeMouthFromClient.bind(socket));
}

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

function rand(from, to) {
  return Math.random() * (to - from) + from;
}

function randInt(from, to) {
  return Math.round(rand(from, to));
}

io.set('log level', DEBUG_LEVEL);

io.on('connection', onPlayerConnect);

gameloop.setGameLoop(gameLoop, 1000 / 30);

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});