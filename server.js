//
// # Puppeteer
//
var http = require('http');
var path = require('path');
var socketio = require('socket.io');
var express = require('express');
var gameloop = require('node-gameloop');
var QRCode = require('qrcode');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

// Config
var BASE_URL = 'http://puppeteer.evyatron.c9.io/';
var NUMBER_OF_PUPPETS_PER_ROOM = Infinity;
var DEBUG_LEVEL = 1;
var ROOM_ID_LENGTH = 3;
var MOUTH_OPEN_SPEED = 13;
var TIME_TO_REPORT_STATS = 15;
var GAME_LOOP_RATE = 1000 / 30;

// Stuff
var timeToReportStats = TIME_TO_REPORT_STATS;
var rooms = {};
var playerRooms = {};
var players = {};

// Client connected - listen to all events
function onPlayerConnect(socket) {
  var playerId = socket.id;
  
  console.info('Player connect:', playerId);
  
  players[playerId] = socket;

  socket.on('disconnect', onPlayerDisconnect.bind(socket));
  socket.on('listRoomsFromClient', listRoomsFromClient.bind(socket));
  socket.on('connectToRoomFromClient', connectToRoomFromClient.bind(socket));
  
  socket.on('createRoomFromClient', createRoomFromClient.bind(socket));
  socket.on('resizeRoomFromClient', resizeRoomFromClient.bind(socket));
  
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
  
  for (var roomId in rooms) {
    var room = rooms[roomId];
    
    if (room.playerIds.indexOf(playerId) !== -1) {
      sendToRoomPlayers(room, 'removePlayerToClient', playerId);
      room.playerIds.splice(room.playerIds.indexOf(playerId), 1);
    }
    
    var roomPuppetId = room.playerPuppets[playerId];
    if (roomPuppetId) {
      delete room.puppets[roomPuppetId];
      delete room.playerPuppets[playerId];
      room.numberOfPuppets--;
    }
    
    if (room.playerIds.length === 0) {
      delete rooms[roomId];
    }
  }
  
  delete playerRooms[playerId];
  delete players[playerId];
  
  sendIdlePlayersRooms();
}

// Main game loop - update all puppets and send to all clients
function gameLoop(dt) {
  for (var id in rooms) {
    var room = rooms[id];
    var puppets = rooms[id].puppets;
    
    for (var puppetId in puppets) {
      var puppet = puppets[puppetId];
      
      var mouthOpenChange = MOUTH_OPEN_SPEED * dt * (puppet.isOpeningMouth? 1 : -1);
      puppet.mouthOpen = Math.max(Math.min(puppet.mouthOpen + mouthOpenChange, 1), 0);
    }
    
    sendToRoomPlayers(room, 'roomPuppetsToClient', puppets);
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
  var numIdle = 0;
  
  (hours < 10) && (hours = '0' + hours);
  (minutes < 10) && (minutes = '0' + minutes);
  (seconds < 10) && (seconds = '0' + seconds);
  
  for (var playerId in players) {
    playerRooms[playerId]? getPlayerPuppet(playerId)? numControllers++ : numViewers++ : numIdle++;
  }

  console.info('[' + hours + ':' + minutes + ':' + seconds + '] Stats: ' +
               len(rooms) + ' Rooms | ' +
               len(players) + ' Players ' +
               '(' + numIdle + ' idle, ' + numViewers + ' viewers, ' + numControllers + ' controllers)');
}

// Client changed the size of the room - viewers only
function resizeRoomFromClient(data) {
  var playerId = this.id;
  var room = rooms[playerRooms[playerId] || ''];
  
  if (room && room.ownerId === playerId) {
    room.width = data.width;
    room.height = data.height;
  
    sendToRoomPlayers(room, 'resizeRoomToClient', {
      'width': room.width,
      'height': room.height
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
  var room = rooms[playerRooms[playerId] || ''];
  if (!room) {
    return null;
  }
  
  var puppet = room.puppets[room.playerPuppets[playerId]];
  if (!puppet) {
    return null;
  }

  return puppet;
}

// Client requested to add a puppet
function addPuppetFromClient(data) {
  var playerId = this.id;
  var player = players[playerId];
  var room = rooms[playerRooms[playerId]];
  
  if (!player || !room) {
    console.warn('addPuppetFromClient | missing player info', playerId, playerRooms[playerId], room);
    return false;
  }
  
  if (room.numberOfPuppets >= NUMBER_OF_PUPPETS_PER_ROOM) {
    console.warn('Maximum puppets reached per room', room);
    return false;
  }

  var puppet = {
    'id': 'puppet_' + room.id + '_' + room.numberOfPuppets,
    'width': 200,
    'height': 200,
    'isFlipped': false,
    'mouthOpen': 0,
    'type': data.type,
    'name': data.name || player.name || 'Puppet',
    'colour': 'rgb(' + randInt(50, 200) + ',' + randInt(50, 200) + ',' + randInt(50, 200) + ')',
    'movementData': {}
  };
  puppet.x = rand(puppet.width / room.width, 1 - puppet.width / room.width),
  puppet.y = rand(puppet.height / room.height, 1 - puppet.height / room.height),
  
  room.numberOfPuppets++;
  room.puppets[puppet.id] = puppet;
  room.playerPuppets[playerId] = puppet.id;
  
  sendToRoomPlayers(room, 'addPuppetToClient', {
    'puppet': puppet
  });
  
  player.emit('possessPuppetToClient', {
    'puppetId': puppet.id
  });
  
  console.info('Create puppet and send to player', puppet.id, playerId);
  
  return true;
}

// Helper method to send a message to all the players in a room
function sendToRoomPlayers(room, message, data) {
  for (var i = 0, len = room.playerIds.length; i < len; i++) {
    var player = players[room.playerIds[i]];
    if (player) {
      player.emit(message, data);
    }
  }
}

// Client requested to join a room
function connectToRoomFromClient(data) {
  connectPlayerToRoom(this.id, data.roomId);
}

// Connect a client to a room
function connectPlayerToRoom(playerId, roomId) {
  var player = players[playerId];
  var room = rooms[roomId];
  
  if (!player) {
    console.warn('connectPlayerToRoom Empty player', playerId);
    return false;
  }
  
  if (!room) {
    player.emit('errorToClient', {
      'code': 1,
      'message': 'Trying to join an invalid room'
    });
    
    console.warn('Trying to join an invalid room');
    return;
  }
  
  console.info('connectPlayerToRoom', playerId, roomId);
  
  room.playerIds.push(playerId);
  playerRooms[playerId] = roomId;
  
  player.emit('roomInfoToClient', {
    'room': room
  });
}

// Client wants to create a new room
function createRoomFromClient(data) {
  var playerId = this.id;
  var room = {
    'id': generateRoomId(),
    'ownerId': playerId,
    'width': data.width,
    'height': data.height,
    'playerIds': [],
    'puppets': {},
    'playerPuppets': {},
    'numberOfPuppets': 0,
    'qr': ''
  };
  room.url = BASE_URL + '?' + room.id;
  rooms[room.id] = room;
  
  console.info('Create new room', room.id);
  
  QRCode.toDataURL(room.url, function onQRReady(err, url) {
    if (!err) {
      room.qr = url;
    }
    
    connectPlayerToRoom(playerId, room.id);
  });
  
  sendIdlePlayersRooms();
}

function sendIdlePlayersRooms() {
  for (var playerId in players) {
    if (!playerRooms[playerId]) {
      listRoomsToClient(players[playerId]);
    }
  }
}

// Client requested a list of rooms
function listRoomsFromClient() {
  listRoomsToClient(this);
}

// Client requested a list of rooms
function listRoomsToClient(player) {
  player.emit('listRoomsToClient', {
    'rooms': rooms
  });
}

// Generate a room id
function generateRoomId() {
  var roomId = '';
  var symbols = ['a','b','c','d','e','f','g','h','i','j','k','l','m',
                 'n','o','p','q','r','s','t','u','v','w','x','y','z'];
  
  do {
    for (var i = 0; i < ROOM_ID_LENGTH; i++) {
      roomId += symbols[Math.floor(Math.random() * symbols.length)];
    }
  } while (rooms[roomId])
  
  return roomId;
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