/*!
MIT License

Copyright (c) 2011 Max Kueng, George Crabtree
 
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
 
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
!function(t){if("object"==typeof exports)module.exports=t();else if("function"==typeof define&&define.amd)define(t);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.Victor=t()}}(function(){return function t(n,i,o){function r(s,h){if(!i[s]){if(!n[s]){var u="function"==typeof require&&require;if(!h&&u)return u(s,!0);if(e)return e(s,!0);throw new Error("Cannot find module '"+s+"'")}var p=i[s]={exports:{}};n[s][0].call(p.exports,function(t){var i=n[s][1][t];return r(i?i:t)},p,p.exports,t,n,i,o)}return i[s].exports}for(var e="function"==typeof require&&require,s=0;s<o.length;s++)r(o[s]);return r}({1:[function(t,n,i){function o(t,n){return this instanceof o?(this.x=t||0,void(this.y=n||0)):new o(t,n)}function r(t,n){return Math.floor(Math.random()*(n-t+1)+t)}function e(t){return t*h}function s(t){return t/h}i=n.exports=o,o.fromArray=function(t){return new o(t[0]||0,t[1]||0)},o.fromObject=function(t){return new o(t.x||0,t.y||0)},o.prototype.addX=function(t){return this.x+=t.x,this},o.prototype.addY=function(t){return this.y+=t.y,this},o.prototype.add=function(t){return this.x+=t.x,this.y+=t.y,this},o.prototype.subtractX=function(t){return this.x-=t.x,this},o.prototype.subtractY=function(t){return this.y-=t.y,this},o.prototype.subtract=function(t){return this.x-=t.x,this.y-=t.y,this},o.prototype.divideX=function(t){return this.x/=t.x,this},o.prototype.divideY=function(t){return this.y/=t.y,this},o.prototype.divide=function(t){return this.x/=t.x,this.y/=t.y,this},o.prototype.invertX=function(){return this.x*=-1,this},o.prototype.invertY=function(){return this.y*=-1,this},o.prototype.invert=function(){return this.invertX(),this.invertY(),this},o.prototype.multiplyX=function(t){return this.x*=t.x,this},o.prototype.multiplyY=function(t){return this.y*=t.y,this},o.prototype.multiply=function(t){return this.x*=t.x,this.y*=t.y,this},o.prototype.normalize=function(){var t=this.length();return 0===t?(this.x=1,this.y=0):this.divide(o(t,t)),this},o.prototype.norm=o.prototype.normalize,o.prototype.limit=function(t,n){return Math.abs(this.x)>t&&(this.x*=n),Math.abs(this.y)>t&&(this.y*=n),this},o.prototype.randomize=function(t,n){return this.randomizeX(t,n),this.randomizeY(t,n),this},o.prototype.randomizeX=function(t,n){var i=Math.min(t.x,n.x),o=Math.max(t.x,n.x);return this.x=r(i,o),this},o.prototype.randomizeY=function(t,n){var i=Math.min(t.y,n.y),o=Math.max(t.y,n.y);return this.y=r(i,o),this},o.prototype.randomizeAny=function(t,n){return Math.round(Math.random())?this.randomizeX(t,n):this.randomizeY(t,n),this},o.prototype.unfloat=function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},o.prototype.mixX=function(t,n){return"undefined"==typeof n&&(n=.5),this.x=(1-n)*this.x+n*t.x,this},o.prototype.mixY=function(t,n){return"undefined"==typeof n&&(n=.5),this.y=(1-n)*this.y+n*t.y,this},o.prototype.mix=function(t,n){return this.mixX(t,n),this.mixY(t,n),this},o.prototype.clone=function(){return new o(this.x,this.y)},o.prototype.copyX=function(t){return this.x=t.x,this},o.prototype.copyY=function(t){return this.y=t.y,this},o.prototype.copy=function(t){return this.copyX(t),this.copyY(t),this},o.prototype.zero=function(){return this.x=this.y=0,this},o.prototype.dot=function(t){return this.x*t.x+this.y*t.y},o.prototype.cross=function(t){return this.x*t.y-this.y*t.x},o.prototype.projectOnto=function(t){var n=(this.x*t.x+this.y*t.y)/(t.x*t.x+t.y*t.y);return this.x=n*t.x,this.y=n*t.y,this},o.prototype.horizontalAngle=function(){return Math.atan2(this.y,this.x)},o.prototype.horizontalAngleDeg=function(){return e(this.horizontalAngle())},o.prototype.verticalAngle=function(){return Math.atan2(this.x,this.y)},o.prototype.verticalAngleDeg=function(){return e(this.verticalAngle())},o.prototype.angle=o.prototype.horizontalAngle,o.prototype.angleDeg=o.prototype.horizontalAngleDeg,o.prototype.direction=o.prototype.horizontalAngle,o.prototype.rotate=function(t){var n=this.x*Math.cos(t)-this.y*Math.sin(t),i=this.x*Math.sin(t)+this.y*Math.cos(t);return this.x=n,this.y=i,this},o.prototype.rotateDeg=function(t){return t=s(t),this.rotate(t)},o.prototype.rotateBy=function(t){var n=this.angle()+t;return this.rotate(n)},o.prototype.rotateByDeg=function(t){return t=s(t),this.rotateBy(t)},o.prototype.distanceX=function(t){return this.x-t.x},o.prototype.absDistanceX=function(t){return Math.abs(this.distanceX(t))},o.prototype.distanceY=function(t){return this.y-t.y},o.prototype.absDistanceY=function(t){return Math.abs(this.distanceY(t))},o.prototype.distance=function(t){return Math.sqrt(this.distanceSq(t))},o.prototype.distanceSq=function(t){var n=this.distanceX(t),i=this.distanceY(t);return n*n+i*i},o.prototype.length=function(){return Math.sqrt(this.lengthSq())},o.prototype.lengthSq=function(){return this.x*this.x+this.y*this.y},o.prototype.magnitude=o.prototype.length,o.prototype.isZero=function(){return 0===this.x&&0===this.y},o.prototype.isEqualTo=function(t){return this.x===t.x&&this.y===t.y},o.prototype.toString=function(){return"x:"+this.x+", y:"+this.y},o.prototype.toArray=function(){return[this.x,this.y]},o.prototype.toObject=function(){return{x:this.x,y:this.y}};var h=180/Math.PI},{}]},{},[1])(1)});

var EventDispatcher = (function EventDispatcher() {
  function EventDispatcher() {
    this._listeners = {};
  }

  EventDispatcher.prototype.dispatch = function dispatch(eventName, data) {
    if (!this._listeners) {
      this._listeners = {};
    }

    var listeners = this._listeners[eventName] || [];
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i].call(this, data);
    }
  };

  EventDispatcher.prototype.on = function on(eventName, callback) {
    if (!this._listeners) {
      this._listeners = {};
    }

    if (!this._listeners[eventName]) {
      this._listeners[eventName] = [];
    }

    this._listeners[eventName].push(callback);
  };

  EventDispatcher.prototype.off = function off(eventName, callback) {
    if (!this._listeners) {
      this._listeners = {};
    }

    var listeners = this._listeners[eventName] || [];
    for (var i = 0, len = listeners.length; i < len; i++) {
      if (listeners[i] === callback) {
        listeners.splice(i, 1);
        break;
      }
    }
  };

  EventDispatcher.prototype.once = function once(eventName, callback) {
    if (!this._listeners) {
      this._listeners = {};
    }
    
    this.on(eventName, function callbackOnce() {
      this.off(eventName, callbackOnce);
      callback.apply(this, arguments);
    }.bind(this));
  };

  return EventDispatcher;
}());

var utils = {
  random: function random(from, to) {
    if (Array.isArray(from)) {
      return from[Math.floor(Math.random() * from.length)];
    }

    if (typeof from === 'boolean') {
      return Math.random() > 0.5;
    }

    if (to === undefined) {
      to = from || 1;
      from = 0;
    }

    return Math.random() * (to - from) + from;
  }
};

var Particles = (function Particles() {
  function Particles(options) {
    this.canvas;
    this.context;

    this.speed;
    this.size;
    this.angle;
    this.position;
    this.lifetime;
    this.frequency;
    this.gravity;
    this.colours = [];

    this.timeUntilNext = 0;
    this.numberOfParticles = 0;
    this.particles = {};

    this.didCreateCanvas = false;
    this.isGenerating = false;
    this.isRunning = false;
    this.lastUpdate = 0;
    this.dt;

    this.onDestroy;
    this.onStop;

    this.colourPresets = {
      'grayscale': ['#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd'],
      'fire': ['#fa0', '#ff0', '#f00'],
    };

    this.init(options);
  }

  Particles.prototype = Object.create(EventDispatcher.prototype);
  Particles.prototype.constructor = Particles;

  Particles.prototype.init = function init(options) {
    this.setAngle(options.angle);
    this.setFrequency(options.frequency);
    this.setGravity(options.gravity);
    this.setSpeed(options.speed);
    this.setLifetime(options.lifetime);
    this.setSize(options.size);
    this.setPosition(options.position);
    this.setColours(options.colours);

    this.onDestroy = options.onDestroy || function(){};
    this.onStop = options.onStop || function(){};

    if (options.canvas) {
      this.canvas = options.canvas;
    } else if (options.context) {
      this.canvas = options.context.canvas;
    } else {
      this.didCreateCanvas = true;
      this.canvas = document.createElement('canvas');
    }

    if (this.canvas) {
      this.context = this.canvas.getContext('2d');
    }
  };

  Particles.prototype.addColourPreset = function addColourPreset(name, colours) {
    this.colourPresets[name] = colours;
    return this;
  };

  Particles.prototype.setAngle = function setAngle(angle) {
    this.angle = angle !== undefined? angle : [-35, 35];
    return this;
  };

  Particles.prototype.setGravity = function setGravity(gravity) {
    this.gravity = gravity !== undefined? gravity : [0.5, 1.5];
    return this;
  };

  Particles.prototype.setFrequency = function setFrequency(frequency) {
    this.frequency = frequency !== undefined? frequency: 0;
    return this;
  };

  Particles.prototype.setSpeed = function setSpeed(speed) {
    this.speed = speed !== undefined? speed: utils.random(200, 400);
    return this;
  };

  Particles.prototype.setPosition = function setPosition(position) {
    if (typeof position === 'number' && typeof arguments[1] === 'number') {
      position = new Victor(arguments[0], arguments[1]);
    }

    this.position = position? position.clone() : new Victor();
    return this;
  };

  Particles.prototype.setLifetime = function setLifetime(lifetime) {
    this.lifetime = lifetime !== undefined? lifetime: 0;
    return this;
  };

  Particles.prototype.setSize = function setSize(size) {
    this.size = size;
    return this;
  };

  Particles.prototype.setColours = function setColours(colours) {
    this.colours = [];

    if (!colours) {
      colours = 'rgb(255, 0, 0)';
    }

    if (typeof colours === 'string') {
      if (this.colourPresets[colours]) {
        colours = this.colourPresets[colours];
      } else {
        colours = [colours];
      }
    }

    if (typeof colours === 'number') {
      for (var i = 0; i < colours; i++) {
        var r = Math.round(utils.random(0, 255));
        var g = Math.round(utils.random(0, 255));
        var b = Math.round(utils.random(0, 255));
        this.colours.push('rgb(' + r + ',' + g + ',' + b + ')');
      }
    } else if (Array.isArray(colours)) {
      for (var i = 0; i < colours.length; i++) {
        this.colours.push(colours[i]);
      }
    }

    return this;
  };

  Particles.prototype.start = function start(setNumber) {
    this.timeUntilNext = 0;

    if (setNumber) {
      for (var i = 0; i < setNumber; i++) {
        this.createNew();
      }
    } else {
      this.isGenerating = true;
    }

    this.isRunning = true;
    /*
    this.lastUpdate = Date.now();
    window.requestAnimationFrame(this.tick.bind(this));
    */

    return this;
  };

  Particles.prototype.stop = function stop() {
    if (this.isRunning) {
      this.isGenerating = false;
      this.isRunning = false;
      this.onStop();
    }

    return this;
  };

  Particles.prototype.destroy = function destroy() {
    this.stop();

    if (this.didCreateCanvas) {
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }

    this.onDestroy();

    return this;
  };

  Particles.prototype.getValue = function getValue(value) {
    return typeof value === 'number'?
             value
           :
             utils.random(value[0], value[1]);
  };

  Particles.prototype.createNew = function createNew() {
    var colour = utils.random(this.colours);
    var angle = this.getValue(this.angle);
    var size = this.getValue(this.size);
    var lifetime = this.getValue(this.lifetime);
    var speed = this.getValue(this.speed);
    var gravity = this.getValue(this.gravity);
    var x = this.position.x - size / 2;
    var y = this.position.y - size / 2;
    var vSpeed = new Victor(speed, speed).rotateByDeg(angle - 180);

    if (!this.particles[colour]) {
      this.particles[colour] = [];
    }

    this.numberOfParticles++;
    this.particles[colour].push({
      'x': x,
      'y': y,
      'startX': x,
      'startY': y,
      'size': size,
      'halfSize': size / 2,
      'speedX': vSpeed.x,
      'speedY': vSpeed.y,
      'opacity': 1,
      'timeToLive': lifetime,
      'timeLived': 0,
      'life': 0,
      'gravity': gravity
    });
  };

  Particles.prototype.tick = function tick() {
    var now = Date.now();

    this.dt = Math.min((now - this.lastUpdate) / 1000, 1000 / 60);

    this.update(this.dt);
    this.draw(this.context);

    this.lastUpdate = now;
    window.requestAnimationFrame(this.tick.bind(this));
  };

  Particles.prototype.update = function update(dt) {
    for (var colour in this.particles) {
      var particles = this.particles[colour];

      for (var i = 0, len = particles.length, particle; i < len; i++) {
        particle = particles[i];

        if (particle) {
          particle.timeLived += dt;
          particle.life = particle.timeLived / particle.timeToLive;
          particle.opacity = 1 - particle.life;
          particle.x += (particle.speedX * dt);
          particle.y += (particle.speedY * dt);

          particle.speedY += particle.gravity * dt;

          if (particle.timeLived >= particle.timeToLive) {
            this.numberOfParticles--;
            particles.splice(i, 1);
            i--;
          }
        }
      }
    }

    if (this.isGenerating) {
      this.timeUntilNext -= dt;
      if (this.timeUntilNext <= 0) {
        this.timeUntilNext = this.getValue(this.frequency);
        this.createNew();
      }
    } else {
      if (this.frequency === 0 && this.numberOfParticles <= 0) {
        this.stop();
      }
    }
  };

  Particles.prototype.draw = function draw(context) {
    var i, len, particle;

    if (this.didCreateCanvas) {
      context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (var colour in this.particles) {
      var particles = this.particles[colour];

      context.fillStyle = colour;

      for (i = 0, len = particles.length; i < len; i++) {
        particle = particles[i];

        context.globalAlpha = particle.opacity;
        
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
    }

    context.globalAlpha = 1;
  };

  return Particles;
}());