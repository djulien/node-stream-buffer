'use strict';

var util = require('util');
var stream = require('stream');
var constants = require('./constants');
var int24 = require('int24');

var WritableStreamBuffer = module.exports = function(opts) {
  opts = opts || {};
  opts.decodeStrings = true;

  stream.Writable.call(this, opts);

  var initialSize = opts.initialSize || constants.DEFAULT_INITIAL_SIZE;
  var incrementAmount = opts.incrementAmount || constants.DEFAULT_INCREMENT_AMOUNT;

  var buffer = new Buffer(initialSize);
  var size = 0;

  this.size = function() {
    return size;
  };

  this.maxSize = function() {
    return buffer.length;
  };

  this.getContents = function(length) {
    if(!size) return false;

    var data = new Buffer(Math.min(length || size, size));
    buffer.copy(data, 0, 0, data.length);

    if(data.length < size)
      buffer.copy(buffer, 0, data.length);

    size -= data.length;

    return data;
  };

  this.getContentsAsString = function(encoding, length) {
    if(!size) return false;

    var data = buffer.toString(encoding || 'utf8', 0, Math.min(length || size, size));
    var dataLength = Buffer.byteLength(data);

    if(dataLength < size)
      buffer.copy(buffer, 0, dataLength);

    size -= dataLength;
    return data;
  };

  var increaseBufferIfNecessary = function(incomingDataSize) {
    if((buffer.length - size) < incomingDataSize) {
      var factor = Math.ceil((incomingDataSize - (buffer.length - size)) / incrementAmount);

      var newBuffer = new Buffer(buffer.length + (incrementAmount * factor));
      buffer.copy(newBuffer, 0, 0, size);
      buffer = newBuffer;
    }
  };

  this._write = function(chunk, encoding, callback) {
    increaseBufferIfNecessary(chunk.length);
    chunk.copy(buffer, size, 0);
    size += chunk.length;
    callback();
  };

//add the following methods:
//writeDoubleBE(value, offset[, noAssert])
//writeDoubleLE(value, offset[, noAssert])
//writeFloatBE(value, offset[, noAssert])
//writeFloatLE(value, offset[, noAssert])
//writeInt8(value, offset[, noAssert])
//writeInt16BE(value, offset[, noAssert])
//writeInt16LE(value, offset[, noAssert])
//writeInt24BE(value, offset[, noAssert])
//writeInt24LE(value, offset[, noAssert])
//writeInt32BE(value, offset[, noAssert])
//writeInt32LE(value, offset[, noAssert])
//writeIntBE(value, offset, byteLength[, noAssert])
//writeIntLE(value, offset, byteLength[, noAssert])
//writeUInt8(value, offset[, noAssert])
//writeUInt16BE(value, offset[, noAssert])
//writeUInt16LE(value, offset[, noAssert])
//writeUInt24BE(value, offset[, noAssert])
//writeUInt24LE(value, offset[, noAssert])
//writeUInt32BE(value, offset[, noAssert])
//writeUInt32LE(value, offset[, noAssert])
//writeUIntBE(value, offset, byteLength[, noAssert])
//writeUIntLE(value, offset, byteLength[, noAssert])

//code block for additional methods adapted from https://github.com/deoxxa/concentrate
  [8, 16, 24, 32].forEach(function(b) {
    ["", "u"].forEach(function(s) {
      ["", "le", "be"].forEach(function(e) {
        // derive endiannes postfix supported by node Buffer api
        // for all the numbers, except 8 bit integer, endiannes is mandatory
        var endiannes = e || "le";
        // for 8 bit integers - no endiannes postfix
        if(b === 8){
            endiannes = "";
        }
      
        var type = [s, "int", b, e].join(""),
          method = ["write", s.toUpperCase(), "Int", b, endiannes.toUpperCase()].join(""),
          length = b / 8;

        this[type] = function(data) {
          if (length == 3) int24[type](buffer, data, size); //special case
          else buffer[type](data, size);
          size += length;
          return this; //fluent
        };
      }.bind(this));
    }.bind(this));
  }.bind(this));

  [["float", 4], ["double", 8]].forEach(function(t) {
    ["le", "be"].forEach(function(e) {
      var type = [t[0], e].join(""),
          method = ["write", t[0].replace(/^(.)/, function(e) { return e.toUpperCase(); }), e.toUpperCase()].join(""),
        length = t[1];

      this[type] = function(data) {
        buffer[type](data, size);
        size += length;
        return this; //fluent
      };
    }.bind(this));
  }.bind(this));


  this._write = function(chunk, encoding, callback) {
    increaseBufferIfNecessary(chunk.length);
    chunk.copy(buffer, size, 0);
    size += chunk.length;
    callback();
  };
};

util.inherits(WritableStreamBuffer, stream.Writable);
