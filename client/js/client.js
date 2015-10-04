/*
  global io
*/
var Client = (function Client() {
  function Client(options) {
    this.el;
    
    this.socket;
    
    this.gameId;
    this.canvas;
    this.context;
    this.lastUpdate = 0;
    this.dt = 0;
    
    this.possessedPuppetId;

    this.puppets = {};
    
    this.angleLerpAlpha = 0.5;
    this.mouthOpenPercent = 0.4;
    this.backMouthWidth = 0.5;
    
    this.didCleanJoinMessage = false;
    
    this.myPuppet = {};
    
    this.init(options);
  }
  
  Client.prototype.init = function init(options) {
    !options && (options = {});
    
    this.el = options.el || document.body;
    this.socket = io.connect();
    
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.el.appendChild(this.canvas);
    
    this.lastUpdate = Date.now();
    window.requestAnimationFrame(this.tick.bind(this));
    
    this.socket.on('connect', this.connect.bind(this));
    this.socket.on('listGamesToClient', this.listGamesToClient.bind(this));
    this.socket.on('errorToClient', this.errorToClient.bind(this));
  };
  
  Client.prototype.connect = function connect(data) {
    this.socket.on('gameInfoToClient', this.gameInfoToClient.bind(this));
    this.socket.on('gamePuppetsToClient', this.gamePuppetsToClient.bind(this));
    this.socket.on('removePlayerToClient', this.removePlayerToClient.bind(this));
    this.socket.on('removePuppetToClient', this.removePuppetToClient.bind(this));
    
    this.gameId = window.location.search.replace('?', '');
    
    if ('ontouchstart' in window) {
      Controller.init(this, this.gameId);
    } else {
      Viewer.init(this, this.gameId);
    }
    
    if (this.gameId) {
      document.body.classList.add('in-game');
      
      this.socket.emit('connectToGameFromClient', {
        'gameId': this.gameId
      });
    } else {
      this.socket.emit('listGamesFromClient');
    }
  };
  
  Client.prototype.errorToClient = function errorToClient(data) {
    var html = '<div class="error">' +
                  data.message + '<br />' +
                  '<a href="/">Go back to create a new one</a>' +
                '</div>';
    
    document.getElementById('game').innerHTML = html;
  };
  
  Client.prototype.listGamesToClient = function listGamesToClient(data) {
    if (this.gameId) {
      return;
    }
    
    var games = data.games;
    var html = '<h2>Please select from one of the active games:</h2>';
    
    for (var id in games) {
      var game = games[id];
      var url = 'http://' + window.location.host + '/?' + id;
      var numPuppets = Object.keys(game.puppets).length;
      var numPlayers = game.playerIds.length;
      
      html += '<div>' +
                '<a href="' + url + '">' + url + '</a> - ' + 
                (numPlayers - numPuppets) + ' viewers, ' +
                numPuppets + ' puppets' +
              '</div>';
    }
    
    html += '<div class="create-message create button viewer-only">Or create a new one!</div>';
    html += '<div class="create-message controller-only">Or create a new onefrom your PC!</div>';
    
    document.getElementById('game').innerHTML = html;
    document.querySelector('#game .create').addEventListener('click', this.createGame.bind(this));
  };
  
  Client.prototype.createGame = function createGame() {
    this.socket.emit('createGameFromClient', {
      'width': window.innerWidth,
      'height': window.innerHeight
    });
  };
  
  Client.prototype.tick = function tick() {
    var now = Date.now();
    this.dt = (now - this.lastUpdate) / 1000;
    
    Controller.tick(this.dt);
    
    var context = this.context;
    var maxMouthOpen = this.mouthOpenPercent;
    var backMouthWidth = this.backMouthWidth;
    
    context.clearRect(0, 0, this.width, this.height);

    for (var id in this.puppets) {
      var puppet = this.puppets[id];

      puppet.targetAngle = puppet.movementData.alpha || 0;

      puppet.angle += (puppet.targetAngle - puppet.angle) * this.angleLerpAlpha;
      
      var ratio = this.ratio;
      var x = puppet.x * this.width;
      var y = puppet.y * this.height;
      var w = puppet.width * ratio;
      var h = puppet.height * ratio;
      var hw = w / 2;
      var hh = h / 2;
      var mouthDist = puppet.mouthOpen * h * maxMouthOpen;
      
      if (id === Controller.possessedPuppetId) {
        Controller.puppetBounds = {
          'top': y - hh,
          'bottom': y + hh,
          'left': x - hw,
          'right': x + hw
        };
      }
      
      context.save();
      
      context.translate(x, y);
      context.rotate(puppet.angle * Math.PI / 180);
      
      if (puppet.isFlipped) {
        context.scale(-1, 1);
      }

      // body
      context.fillStyle = puppet.colour;
      context.fillRect(-hw, -hh, w, h * 0.8);
      // mouth
      context.fillRect(-hw, -hh + h * 0.8 - 1, w * backMouthWidth, mouthDist);
      context.fillRect(-hw, -hh + h * 0.8 + mouthDist - 2, w, h * 0.2);
      // eye
      context.fillStyle = 'rgba(255, 255, 255, 1)';
      context.beginPath();
      context.arc(-hw + w * 0.85, -hh + h * 0.2, 14 * ratio, 0, Math.PI * 180);
      context.fill();
      context.fillStyle = 'rgba(0, 0, 0, 1)';
      context.beginPath();
      context.arc(-hw + w * 0.87, -hh + h * 0.21, 5 * ratio, 0, Math.PI * 180);
      context.fill();
      
      // debug
      //context.fillText(puppet.mouthOpen, 0, 0);
      
      context.restore();
    }
    
    this.lastUpdate = now;
    window.requestAnimationFrame(this.tick.bind(this));
  };
  
  Client.prototype.gamePuppetsToClient = function gamePuppetsToClient(puppets) {
    var puppetId;
    
    for (puppetId in puppets) {
      var puppetData = puppets[puppetId];
      var puppet = this.puppets[puppetId];
      
      if (puppet) {
        puppet.mouthOpen += (puppetData.mouthOpen - puppet.mouthOpen) * 0.5;
        puppet.isFlipped = puppetData.isFlipped;
        puppet.x += (puppetData.x - puppet.x) * 0.5;
        puppet.y += (puppetData.y - puppet.y) * 0.5;
        puppet.movementData = puppetData.movementData;
      } else {
        this.addNewPuppet(puppetData);
      }
    }
    
    for (puppetId in this.puppets) {
      if (!puppets[puppetId]) {
        delete this.puppets[puppetId];
      }
    }
    
    if (!this.didCleanJoinMessage && Object.keys(puppets).length > 0) {
      this.didCleanJoinMessage = true;
      document.getElementById('game').innerHTML = '';
    }
  };
  
  Client.prototype.gameInfoToClient = function gameInfoToClient(data) {
    this.game = data.game;
    
    console.warn('Got game info', this.game);
    
    window.history.pushState('', '', this.game.url);
    
    this.setSize({
      'width': this.game.width,
      'height': this.game.height
    });
    
    Viewer.gotGame();
    Controller.gotGame();
  };
  
  Client.prototype.addNewPuppet = function addNewPuppet(puppet) {
    this.puppets[puppet.id] = puppet;
    
    puppet.targetAngle = puppet.angle = puppet.movementData.alpha || 0;
  };

  Client.prototype.removePlayerToClient = function removePlayerToClient(data) {
    console.warn('...removeplayer...');
  };
  
  Client.prototype.removePuppetToClient = function removePuppetToClient(puppetId) {
    this.puppets[puppetId] = null;
    delete this.puppets[puppetId];
  };

  Client.prototype.setSize = function setSize(data) {
    this.ratio = Math.min(window.innerWidth / data.width, window.innerHeight / data.height);
    
    this.canvas.width = this.width = data.width * this.ratio;
    this.canvas.height = this.height = data.height * this.ratio;
    this.canvas.style.marginTop = -this.height / 2 + 'px';
    this.canvas.style.marginLeft = -this.width / 2 + 'px';
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
  };
  
  Client.prototype.getPossessedPuppet = function getPossessedPuppet() {
    return this.puppets[Controller.possessedPuppetId] || {};
  };
  
  return Client;
}());

var Controller = (function Controller() {
  function Controller() {
    this.isActive = false;
    this.client;
    
    this.mouthOpener = null;
    
    this.possessedPuppetId = null;
    
    this.timeToReportSensor = 0;
    this.sensorFreq = 
    this.sensorData = {};
    this.sensorFreq = 0.06;
    this.timeToReportSensor = this.sensorFreq;
    this.sensorData = {
      'alpha': 0,
      'beta': 0,
      'gamma': 0
    };
    
    this.touchStart = null;
    
    this.timeForTap = 150;
  }
  
  Controller.prototype.init = function init(client, gameId) {
    this.isActive = true;
    this.client = client;
    
    document.body.classList.add('controller');
    
    if (gameId) {
      this.client.socket.on('resizeGameToClient', this.client.setSize.bind(this.client));
      this.client.socket.on('possessPuppetToClient', this.possessPuppetToClient.bind(this));
      this.client.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
      this.client.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
      this.client.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  
      this.mouthOpener = new TimedButton({
        'el': document.body.querySelector('.button.open-mouth'),
        'onDown': this.onMouthOpenerPressed.bind(this),
        'onUp': this.onMouthOpenerReleased.bind(this)
      });
  
      window.addEventListener('deviceorientation', this.gotDeviceMotion.bind(this));
    }
  };
  
  Controller.prototype.onMouthOpenerPressed = function onMouthOpenerPressed() {
    this.client.socket.emit('setMouthStateFromClient', true);
  };
  
  Controller.prototype.onMouthOpenerReleased = function onMouthOpenerReleased() {
    this.client.socket.emit('setMouthStateFromClient', false);
  };
  
  Controller.prototype.gotDeviceMotion = function gotDeviceMotion(e) {
    this.sensorData.alpha = e.alpha;
    this.sensorData.beta = e.beta;
    this.sensorData.gamma = e.gamma;
  };
  
  Controller.prototype.possessPuppetToClient = function possessPuppetToClient(data) {
    this.possessedPuppetId = data.puppetId;
  };
  
  Controller.prototype.tick = function tick(dt) {
    if (!this.isActive) {
      return;
    }
    
    this.timeToReportSensor -= dt;
    
    if (this.timeToReportSensor <= 0) {
      this.timeToReportSensor = this.sensorFreq;

      this.client.socket.emit('movementFromClient', this.sensorData);
    }
  };
  
  Controller.prototype.onTouchStart = function onTouchStart(e) {
    e.preventDefault();
    
    if (this.touchStart) {
      return;
    }
    
    var x = e.touches[0].pageX - this.client.canvas.offsetLeft;
    var y = e.touches[0].pageY - this.client.canvas.offsetTop;
    var bounds = this.puppetBounds || {}; 

    if (x > bounds.left && x < bounds.right &&
        y > bounds.top && y < bounds.bottom) {
          
      var localPuppet = this.client.getPossessedPuppet();
      this.touchStart = {
        'when': Date.now(),
        'x': x - localPuppet.x * this.client.width,
        'y': y - localPuppet.y * this.client.height
      };
    } else {
      this.touchStart = null;
    }
  };

  Controller.prototype.onTouchMove = function onTouchMove(e) {
    if (!this.touchStart) {
      return;
    }
    
    var touch = e.changedTouches[0];
    var canvas = this.client.canvas;
    var x = touch.pageX - canvas.offsetLeft - this.touchStart.x;
    var y = touch.pageY - canvas.offsetTop - this.touchStart.y;
    
    x = Math.max(Math.min(x / this.client.width, 1), 0);
    y = Math.max(Math.min(y / this.client.height, 1), 0);

    this.client.socket.emit('positionFromClient', {
      'x': x,
      'y': y
    });
  };
  
  Controller.prototype.onTouchEnd = function onTouchEnd(e) {
    if (!this.touchStart) {
      return;
    }

    if (Date.now() - this.touchStart.when <= this.timeForTap) {
      this.client.socket.emit('flipPuppetFromClient');
    }
    
    this.touchStart = null;
  };
  
  Controller.prototype.gotGame = function gotGame() {
    if (!this.isActive) {
      return;
    }
    
    document.getElementById('game').innerHTML = 'Connected to game';

    this.client.socket.emit('addPuppetFromClient', {
      'type': 'default',
      'name': 'My Puppet'
    });
  };
  
  return new Controller();
}());

var Viewer = (function Viewer() {
  function Viewer() {
    this.isActive = false;
    this.client;
  }
  
  Viewer.prototype.init = function init(client, gameId) {
    this.isActive = true;
    this.client = client;
    
    document.body.classList.add('viewer');

    if (gameId) {
      window.addEventListener('resize', this.onResize.bind(this));
    }
  };
  
  Viewer.prototype.gotGame = function gotGame() {
    if (!this.isActive) {
      return;
    }
    
    if (this.client.game.numberOfPuppets === 0) {
      document.getElementById('game').innerHTML = 'Waiting for players to join...' +
                                                  '<br />' +
                                                  'Please open this link on your mobile device' +
                                                  '<br />' +
                                                  '<img src="' + this.client.game.qr + '" />';
    }
  };
  
  Viewer.prototype.onResize = function onResize() {
    var size = {
      'width': window.innerWidth,
      'height': window.innerHeight
    };
    
    this.client.socket.emit('resizeGameFromClient', size);
    this.client.setSize(size);
  };
  
  return new Viewer();
}());

var TimedButton = (function TimedButton() {
  function TimedButton(options) {
    this.el;
    this.isDown = false;
    this.timeStarted = 0;
    
    this.onClick;
    this.onDown;
    this.onUp;
    
    this.init(options);
  }
  
  TimedButton.prototype.init = function init(options) {
    this.el = options.el;
    this.onClick = options.onClick || function(){};
    this.onDown = options.onDown || function(){};
    this.onUp = options.onUp || function(){};
    
    this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
    document.body.addEventListener('touchend', this.onTouchEnd.bind(this));
  };
  
  TimedButton.prototype.onTouchStart = function onTouchStart(e) {
    e.preventDefault();
    
    if (this.isDown) {
      return;
    }
    
    this.el.classList.add('active');
    this.isDown = true;
    this.timeStarted = Date.now();
    
    this.onDown();
  };
  
  TimedButton.prototype.onTouchEnd = function onTouchEnd(e) {
    if (!this.isDown) {
      return;
    }
    
    this.el.classList.remove('active');
    this.isDown = false;
    this.timeStarted = 0;
    
    this.onUp();
  };
  
  
  return TimedButton;
}());