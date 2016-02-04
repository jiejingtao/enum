!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Enum=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var os = _interopRequire(_dereq_("os"));

var EnumItem = _interopRequire(_dereq_("./enumItem"));

var isString = _dereq_("./isType").isString;

var indexOf = _dereq_("./indexOf").indexOf;

var isBuffer = _interopRequire(_dereq_("is-buffer"));

var endianness = os.endianness();

/**
 * Represents an Enum with enum items.
 * @param {Array || Object}  map     This are the enum items.
 * @param {String || Object} options This are options. [optional]
 */

var Enum = (function () {
  function Enum(map, options) {
    var _this = this;

    _classCallCheck(this, Enum);

    /* implement the "ref type interface", so that Enum types can
     * be used in `node-ffi` function declarations and invokations.
     * In C, these Enums act as `uint32_t` types.
     *
     * https://github.com/TooTallNate/ref#the-type-interface
     */
    this.size = 4;
    this.indirection = 1;

    if (options && isString(options)) {
      options = { name: options };
    }

    this._options = options || {};
    this._options.separator = this._options.separator || " | ";
    this._options.endianness = this._options.endianness || endianness;
    this._options.ignoreCase = this._options.ignoreCase || false;
    this._options.freez = this._options.freez || false;

    this.enums = [];
    this.choices = {};

    if (map.length) {
      this._enumLastIndex = map.length;
      var array = map;
      map = {};

      for (var i = 0; i < array.length; i++) {
        map[array[i]] = Math.pow(2, i);
      }
    }

    for (var member in map) {
      guardReservedKeys(this._options.name, member);
      this[member] = new EnumItem(member, map[member], { ignoreCase: this._options.ignoreCase });
      this.enums.push(this[member]);
      this.choices[member] = this[member].des || this[member];
    }
    this._enumMap = map;

    if (this._options.ignoreCase) {
      this.getLowerCaseEnums = function () {
        var res = {};
        for (var i = 0, len = this.enums.length; i < len; i++) {
          res[this.enums[i].key.toLowerCase()] = this.enums[i];
        }
        return res;
      };
    }

    if (this._options.name) {
      this.name = this._options.name;
    }

    var isFlaggable = function () {
      for (var i = 0, len = _this.enums.length; i < len; i++) {
        var e = _this.enums[i];

        if (!(e.value !== 0 && !(e.value & e.value - 1))) {
          return false;
        }
      }
      return true;
    };

    this.isFlaggable = isFlaggable();
    if (this._options.freez) {
      this.freezeEnums(); //this will make instances of Enum non-extensible
    }
  }

  Enum.prototype.getPairs = function getPairs(k, v) {
    var pairs = {};
    for (var i in this.enums) {
      pairs[this.enums[i][k]] = this.enums[i][v];
    };
    return pairs;
  };

  /**
   * Returns the appropriate EnumItem key.
   * @param  {EnumItem || String || Number} key The object to get with.
   * @return {String}                           The get result.
   */

  Enum.prototype.getKey = function getKey(value) {
    var item = this.get(value);
    if (item) {
      return item.key;
    }
  };

  /**
   * Returns the appropriate EnumItem value.
   * @param  {EnumItem || String || Number} key The object to get with.
   * @return {Number}                           The get result.
   */

  Enum.prototype.getValue = function getValue(key) {
    var item = this.get(key);
    if (item) {
      return item.value;
    }
  };

  /**
   * Returns the appropriate EnumItem.
   * @param  {EnumItem || String || Number} key The object to get with.
   * @return {EnumItem}                         The get result.
   */

  Enum.prototype.get = function get(key, offset) {
    if (key === null || key === undefined) {
      return;
    } // Buffer instance support, part of the ref Type interface
    if (isBuffer(key)) {
      key = key["readUInt32" + this._options.endianness](offset || 0);
    }

    if (EnumItem.isEnumItem(key)) {
      var foundIndex = indexOf.call(this.enums, key);
      if (foundIndex >= 0) {
        return key;
      }
      if (!this.isFlaggable || this.isFlaggable && key.key.indexOf(this._options.separator) < 0) {
        return;
      }
      return this.get(key.key);
    } else if (isString(key)) {

      var enums = this;
      if (this._options.ignoreCase) {
        enums = this.getLowerCaseEnums();
        key = key.toLowerCase();
      }

      if (key.indexOf(this._options.separator) > 0) {
        var parts = key.split(this._options.separator);

        var value = 0;
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];

          value |= enums[part].value;
        }

        return new EnumItem(key, value);
      } else {
        return enums[key];
      }
    } else {
      for (var m in this) {
        if (this.hasOwnProperty(m)) {
          if (this[m].value === key) {
            return this[m];
          }
        }
      }

      var result = null;

      if (this.isFlaggable) {
        for (var n in this) {
          if (this.hasOwnProperty(n)) {
            if ((key & this[n].value) !== 0) {
              if (result) {
                result += this._options.separator;
              } else {
                result = "";
              }
              result += n;
            }
          }
        }
      }

      return this.get(result || null);
    }
  };

  /**
   * Sets the Enum "value" onto the give `buffer` at the specified `offset`.
   * Part of the ref "Type interface".
   *
   * @param  {Buffer} buffer The Buffer instance to write to.
   * @param  {Number} offset The offset in the buffer to write to. Default 0.
   * @param  {EnumItem || String || Number} value The EnumItem to write.
   */

  Enum.prototype.set = function set(buffer, offset, value) {
    var item = this.get(value);
    if (item) {
      return buffer["writeUInt32" + this._options.endianness](item.value, offset || 0);
    }
  };

  /**
   * Define freezeEnums() as a property of the prototype.
   * make enumerable items nonconfigurable and deep freeze the properties. Throw Error on property setter.
   */

  Enum.prototype.freezeEnums = function freezeEnums() {
    function envSupportsFreezing() {
      return Object.isFrozen && Object.isSealed && Object.getOwnPropertyNames && Object.getOwnPropertyDescriptor && Object.defineProperties && Object.__defineGetter__ && Object.__defineSetter__;
    }

    function freezer(o) {
      var props = Object.getOwnPropertyNames(o);
      props.forEach(function (p) {
        if (!Object.getOwnPropertyDescriptor(o, p).configurable) {
          return;
        }

        Object.defineProperties(o, p, { writable: false, configurable: false });
      });
      return o;
    }

    function getPropertyValue(value) {
      return value;
    }

    function deepFreezeEnums(o) {
      if (typeof o !== "object" || o === null || Object.isFrozen(o) || Object.isSealed(o)) {
        return;
      }
      for (var key in o) {
        if (o.hasOwnProperty(key)) {
          o.__defineGetter__(key, getPropertyValue.bind(null, o[key]));
          o.__defineSetter__(key, function throwPropertySetError(value) {
            throw TypeError("Cannot redefine property; Enum Type is not extensible.");
          });
          deepFreezeEnums(o[key]);
        }
      }
      if (Object.freeze) {
        Object.freeze(o);
      } else {
        freezer(o);
      }
    }

    if (envSupportsFreezing()) {
      deepFreezeEnums(this);
    }

    return this;
  };

  /**
   * Returns JSON object representation of this Enum.
   * @return {String} JSON object representation of this Enum.
   */

  Enum.prototype.toJSON = function toJSON() {
    return this._enumMap;
  };

  /**
   * Extends the existing Enum with a New Map.
   * @param  {Array}  map  Map to extend from
   */

  Enum.prototype.extend = function extend(map) {
    if (map.length) {
      var array = map;
      map = {};

      for (var i = 0; i < array.length; i++) {
        var exponent = this._enumLastIndex + i;
        map[array[i]] = Math.pow(2, exponent);
      }

      for (var member in map) {
        guardReservedKeys(this._options.name, member);
        this[member] = new EnumItem(member, map[member], { ignoreCase: this._options.ignoreCase });
        this.enums.push(this[member]);
      }

      for (var key in this._enumMap) {
        map[key] = this._enumMap[key];
      }

      this._enumLastIndex += map.length;
      this._enumMap = map;

      if (this._options.freez) {
        this.freezeEnums(); //this will make instances of new Enum non-extensible
      }
    }
  };

  /**
   * Registers the Enum Type globally in node.js.
   * @param  {String} key Global variable. [optional]
   */

  Enum.register = function register() {
    var key = arguments[0] === undefined ? "Enum" : arguments[0];

    if (!global[key]) {
      global[key] = Enum;
    }
  };

  return Enum;
})();

module.exports = Enum;

// private

var reservedKeys = ["_options", "get", "getKey", "getValue", "enums", "isFlaggable", "_enumMap", "toJSON", "_enumLastIndex"];

function guardReservedKeys(customName, key) {
  if (customName && key === "name" || indexOf.call(reservedKeys, key) >= 0) {
    throw new Error("Enum key " + key + " is a reserved word!");
  }
}
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./enumItem":2,"./indexOf":3,"./isType":4,"is-buffer":7,"os":6}],2:[function(_dereq_,module,exports){
"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _isType = _dereq_("./isType");

var isObject = _isType.isObject;
var isString = _isType.isString;

/**
 * Represents an Item of an Enum.
 * @param {String} key   The Enum key.
 * @param {Number} value The Enum value.
 */

var EnumItem = (function () {

  /*constructor reference so that, this.constructor===EnumItem//=>true */

  function EnumItem(key, value) {
    var options = arguments[2] === undefined ? {} : arguments[2];

    _classCallCheck(this, EnumItem);

    this.key = key;
    this.value = value;

    this.val = this.value.v;
    this.des = this.value.d;

    this._options = options;
    this._options.ignoreCase = this._options.ignoreCase || false;
  }

  /**
   * Checks if the flagged EnumItem has the passing object.
   * @param  {EnumItem || String || Number} value The object to check with.
   * @return {Boolean}                            The check result.
   */

  EnumItem.prototype.has = function has(value) {
    if (EnumItem.isEnumItem(value)) {
      return (this.value & value.value) !== 0;
    } else if (isString(value)) {
      if (this._options.ignoreCase) {
        return this.key.toLowerCase().indexOf(value.toLowerCase()) >= 0;
      }
      return this.key.indexOf(value) >= 0;
    } else {
      return (this.value & value) !== 0;
    }
  };

  /**
   * Checks if the EnumItem is the same as the passing object.
   * @param  {EnumItem || String || Number} key The object to check with.
   * @return {Boolean}                          The check result.
   */

  EnumItem.prototype.is = function is(key) {
    if (EnumItem.isEnumItem(key)) {
      return this.key === key.key;
    } else if (isString(key)) {
      if (this._options.ignoreCase) {
        return this.key.toLowerCase() === key.toLowerCase();
      }
      return this.key === key;
    } else {
      return this.value === key;
    }
  };

  /**
   * Returns String representation of this EnumItem.
   * @return {String} String representation of this EnumItem.
   */

  EnumItem.prototype.toString = function toString() {
    return this.key;
  };

  /**
   * Returns JSON object representation of this EnumItem.
   * @return {String} JSON object representation of this EnumItem.
   */

  EnumItem.prototype.toJSON = function toJSON() {
    return this.key;
  };

  /**
   * Returns the value to compare with.
   * @return {String} The value to compare with.
   */

  EnumItem.prototype.valueOf = function valueOf() {
    return this.value;
  };

  EnumItem.isEnumItem = function isEnumItem(value) {
    return value instanceof EnumItem || isObject(value) && value.key !== undefined && value.value !== undefined;
  };

  return EnumItem;
})();

module.exports = EnumItem;
},{"./isType":4}],3:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
var indexOf = Array.prototype.indexOf || function (find, i /*opt*/) {
  if (i === undefined) i = 0;
  if (i < 0) i += this.length;
  if (i < 0) i = 0;
  for (var n = this.length; i < n; i++) if (i in this && this[i] === find) return i;
  return -1;
};
exports.indexOf = indexOf;
},{}],4:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
var isType = function (type, value) {
  return typeof value === type;
};
exports.isType = isType;
var isObject = function (value) {
  return isType("object", value);
};
exports.isObject = isObject;
var isString = function (value) {
  return isType("string", value);
};
exports.isString = isString;
},{}],5:[function(_dereq_,module,exports){
module.exports = _dereq_('./dist/enum');

},{"./dist/enum":1}],6:[function(_dereq_,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}],7:[function(_dereq_,module,exports){
/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install is-buffer`
 */

module.exports = function (obj) {
  return !!(obj != null &&
    (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
      (obj.constructor &&
      typeof obj.constructor.isBuffer === 'function' &&
      obj.constructor.isBuffer(obj))
    ))
}

},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qaWVqaW5ndGFvL3JlcG9zL2VudW0vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2ppZWppbmd0YW8vcmVwb3MvZW51bS9kaXN0L2VudW0uanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL2Rpc3QvZW51bUl0ZW0uanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL2Rpc3QvaW5kZXhPZi5qcyIsIi9Vc2Vycy9qaWVqaW5ndGFvL3JlcG9zL2VudW0vZGlzdC9pc1R5cGUuanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL2Zha2VfOGMwNGE1YWMuanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL29zLWJyb3dzZXJpZnkvYnJvd3Nlci5qcyIsIi9Vc2Vycy9qaWVqaW5ndGFvL3JlcG9zL2VudW0vbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqW1wiZGVmYXVsdFwiXSA6IG9iajsgfTtcblxudmFyIF9jbGFzc0NhbGxDaGVjayA9IGZ1bmN0aW9uIChpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9O1xuXG52YXIgb3MgPSBfaW50ZXJvcFJlcXVpcmUocmVxdWlyZShcIm9zXCIpKTtcblxudmFyIEVudW1JdGVtID0gX2ludGVyb3BSZXF1aXJlKHJlcXVpcmUoXCIuL2VudW1JdGVtXCIpKTtcblxudmFyIGlzU3RyaW5nID0gcmVxdWlyZShcIi4vaXNUeXBlXCIpLmlzU3RyaW5nO1xuXG52YXIgaW5kZXhPZiA9IHJlcXVpcmUoXCIuL2luZGV4T2ZcIikuaW5kZXhPZjtcblxudmFyIGlzQnVmZmVyID0gX2ludGVyb3BSZXF1aXJlKHJlcXVpcmUoXCJpcy1idWZmZXJcIikpO1xuXG52YXIgZW5kaWFubmVzcyA9IG9zLmVuZGlhbm5lc3MoKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEVudW0gd2l0aCBlbnVtIGl0ZW1zLlxuICogQHBhcmFtIHtBcnJheSB8fCBPYmplY3R9ICBtYXAgICAgIFRoaXMgYXJlIHRoZSBlbnVtIGl0ZW1zLlxuICogQHBhcmFtIHtTdHJpbmcgfHwgT2JqZWN0fSBvcHRpb25zIFRoaXMgYXJlIG9wdGlvbnMuIFtvcHRpb25hbF1cbiAqL1xuXG52YXIgRW51bSA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW0obWFwLCBvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBFbnVtKTtcblxuICAgIC8qIGltcGxlbWVudCB0aGUgXCJyZWYgdHlwZSBpbnRlcmZhY2VcIiwgc28gdGhhdCBFbnVtIHR5cGVzIGNhblxuICAgICAqIGJlIHVzZWQgaW4gYG5vZGUtZmZpYCBmdW5jdGlvbiBkZWNsYXJhdGlvbnMgYW5kIGludm9rYXRpb25zLlxuICAgICAqIEluIEMsIHRoZXNlIEVudW1zIGFjdCBhcyBgdWludDMyX3RgIHR5cGVzLlxuICAgICAqXG4gICAgICogaHR0cHM6Ly9naXRodWIuY29tL1Rvb1RhbGxOYXRlL3JlZiN0aGUtdHlwZS1pbnRlcmZhY2VcbiAgICAgKi9cbiAgICB0aGlzLnNpemUgPSA0O1xuICAgIHRoaXMuaW5kaXJlY3Rpb24gPSAxO1xuXG4gICAgaWYgKG9wdGlvbnMgJiYgaXNTdHJpbmcob3B0aW9ucykpIHtcbiAgICAgIG9wdGlvbnMgPSB7IG5hbWU6IG9wdGlvbnMgfTtcbiAgICB9XG5cbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9vcHRpb25zLnNlcGFyYXRvciA9IHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yIHx8IFwiIHwgXCI7XG4gICAgdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzID0gdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzIHx8IGVuZGlhbm5lc3M7XG4gICAgdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlID0gdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlIHx8IGZhbHNlO1xuICAgIHRoaXMuX29wdGlvbnMuZnJlZXogPSB0aGlzLl9vcHRpb25zLmZyZWV6IHx8IGZhbHNlO1xuXG4gICAgdGhpcy5lbnVtcyA9IFtdO1xuICAgIHRoaXMuY2hvaWNlcyA9IHt9O1xuXG4gICAgaWYgKG1hcC5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX2VudW1MYXN0SW5kZXggPSBtYXAubGVuZ3RoO1xuICAgICAgdmFyIGFycmF5ID0gbWFwO1xuICAgICAgbWFwID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWFwW2FycmF5W2ldXSA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIG1lbWJlciBpbiBtYXApIHtcbiAgICAgIGd1YXJkUmVzZXJ2ZWRLZXlzKHRoaXMuX29wdGlvbnMubmFtZSwgbWVtYmVyKTtcbiAgICAgIHRoaXNbbWVtYmVyXSA9IG5ldyBFbnVtSXRlbShtZW1iZXIsIG1hcFttZW1iZXJdLCB7IGlnbm9yZUNhc2U6IHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSB9KTtcbiAgICAgIHRoaXMuZW51bXMucHVzaCh0aGlzW21lbWJlcl0pO1xuICAgICAgdGhpcy5jaG9pY2VzW21lbWJlcl0gPSB0aGlzW21lbWJlcl0uZGVzIHx8IHRoaXNbbWVtYmVyXTtcbiAgICB9XG4gICAgdGhpcy5fZW51bU1hcCA9IG1hcDtcblxuICAgIGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UpIHtcbiAgICAgIHRoaXMuZ2V0TG93ZXJDYXNlRW51bXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuZW51bXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICByZXNbdGhpcy5lbnVtc1tpXS5rZXkudG9Mb3dlckNhc2UoKV0gPSB0aGlzLmVudW1zW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9vcHRpb25zLm5hbWUpIHtcbiAgICAgIHRoaXMubmFtZSA9IHRoaXMuX29wdGlvbnMubmFtZTtcbiAgICB9XG5cbiAgICB2YXIgaXNGbGFnZ2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gX3RoaXMuZW51bXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGUgPSBfdGhpcy5lbnVtc1tpXTtcblxuICAgICAgICBpZiAoIShlLnZhbHVlICE9PSAwICYmICEoZS52YWx1ZSAmIGUudmFsdWUgLSAxKSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB0aGlzLmlzRmxhZ2dhYmxlID0gaXNGbGFnZ2FibGUoKTtcbiAgICBpZiAodGhpcy5fb3B0aW9ucy5mcmVleikge1xuICAgICAgdGhpcy5mcmVlemVFbnVtcygpOyAvL3RoaXMgd2lsbCBtYWtlIGluc3RhbmNlcyBvZiBFbnVtIG5vbi1leHRlbnNpYmxlXG4gICAgfVxuICB9XG5cbiAgRW51bS5wcm90b3R5cGUuZ2V0UGFpcnMgPSBmdW5jdGlvbiBnZXRQYWlycyhrLCB2KSB7XG4gICAgdmFyIHBhaXJzID0ge307XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmVudW1zKSB7XG4gICAgICBwYWlyc1t0aGlzLmVudW1zW2ldW2tdXSA9IHRoaXMuZW51bXNbaV1bdl07XG4gICAgfTtcbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGFwcHJvcHJpYXRlIEVudW1JdGVtIGtleS5cbiAgICogQHBhcmFtICB7RW51bUl0ZW0gfHwgU3RyaW5nIHx8IE51bWJlcn0ga2V5IFRoZSBvYmplY3QgdG8gZ2V0IHdpdGguXG4gICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgZ2V0IHJlc3VsdC5cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUuZ2V0S2V5ID0gZnVuY3Rpb24gZ2V0S2V5KHZhbHVlKSB7XG4gICAgdmFyIGl0ZW0gPSB0aGlzLmdldCh2YWx1ZSk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLmtleTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGFwcHJvcHJpYXRlIEVudW1JdGVtIHZhbHVlLlxuICAgKiBAcGFyYW0gIHtFbnVtSXRlbSB8fCBTdHJpbmcgfHwgTnVtYmVyfSBrZXkgVGhlIG9iamVjdCB0byBnZXQgd2l0aC5cbiAgICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBnZXQgcmVzdWx0LlxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uIGdldFZhbHVlKGtleSkge1xuICAgIHZhciBpdGVtID0gdGhpcy5nZXQoa2V5KTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBhcHByb3ByaWF0ZSBFbnVtSXRlbS5cbiAgICogQHBhcmFtICB7RW51bUl0ZW0gfHwgU3RyaW5nIHx8IE51bWJlcn0ga2V5IFRoZSBvYmplY3QgdG8gZ2V0IHdpdGguXG4gICAqIEByZXR1cm4ge0VudW1JdGVtfSAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgZ2V0IHJlc3VsdC5cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KGtleSwgb2Zmc2V0KSB7XG4gICAgaWYgKGtleSA9PT0gbnVsbCB8fCBrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gQnVmZmVyIGluc3RhbmNlIHN1cHBvcnQsIHBhcnQgb2YgdGhlIHJlZiBUeXBlIGludGVyZmFjZVxuICAgIGlmIChpc0J1ZmZlcihrZXkpKSB7XG4gICAgICBrZXkgPSBrZXlbXCJyZWFkVUludDMyXCIgKyB0aGlzLl9vcHRpb25zLmVuZGlhbm5lc3NdKG9mZnNldCB8fCAwKTtcbiAgICB9XG5cbiAgICBpZiAoRW51bUl0ZW0uaXNFbnVtSXRlbShrZXkpKSB7XG4gICAgICB2YXIgZm91bmRJbmRleCA9IGluZGV4T2YuY2FsbCh0aGlzLmVudW1zLCBrZXkpO1xuICAgICAgaWYgKGZvdW5kSW5kZXggPj0gMCkge1xuICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzRmxhZ2dhYmxlIHx8IHRoaXMuaXNGbGFnZ2FibGUgJiYga2V5LmtleS5pbmRleE9mKHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yKSA8IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KGtleS5rZXkpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoa2V5KSkge1xuXG4gICAgICB2YXIgZW51bXMgPSB0aGlzO1xuICAgICAgaWYgKHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSkge1xuICAgICAgICBlbnVtcyA9IHRoaXMuZ2V0TG93ZXJDYXNlRW51bXMoKTtcbiAgICAgICAga2V5ID0ga2V5LnRvTG93ZXJDYXNlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChrZXkuaW5kZXhPZih0aGlzLl9vcHRpb25zLnNlcGFyYXRvcikgPiAwKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGtleS5zcGxpdCh0aGlzLl9vcHRpb25zLnNlcGFyYXRvcik7XG5cbiAgICAgICAgdmFyIHZhbHVlID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICAgICAgICB2YWx1ZSB8PSBlbnVtc1twYXJ0XS52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgRW51bUl0ZW0oa2V5LCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZW51bXNba2V5XTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgbSBpbiB0aGlzKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KG0pKSB7XG4gICAgICAgICAgaWYgKHRoaXNbbV0udmFsdWUgPT09IGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbbV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciByZXN1bHQgPSBudWxsO1xuXG4gICAgICBpZiAodGhpcy5pc0ZsYWdnYWJsZSkge1xuICAgICAgICBmb3IgKHZhciBuIGluIHRoaXMpIHtcbiAgICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShuKSkge1xuICAgICAgICAgICAgaWYgKChrZXkgJiB0aGlzW25dLnZhbHVlKSAhPT0gMCkge1xuICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ICs9IG47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldChyZXN1bHQgfHwgbnVsbCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBFbnVtIFwidmFsdWVcIiBvbnRvIHRoZSBnaXZlIGBidWZmZXJgIGF0IHRoZSBzcGVjaWZpZWQgYG9mZnNldGAuXG4gICAqIFBhcnQgb2YgdGhlIHJlZiBcIlR5cGUgaW50ZXJmYWNlXCIuXG4gICAqXG4gICAqIEBwYXJhbSAge0J1ZmZlcn0gYnVmZmVyIFRoZSBCdWZmZXIgaW5zdGFuY2UgdG8gd3JpdGUgdG8uXG4gICAqIEBwYXJhbSAge051bWJlcn0gb2Zmc2V0IFRoZSBvZmZzZXQgaW4gdGhlIGJ1ZmZlciB0byB3cml0ZSB0by4gRGVmYXVsdCAwLlxuICAgKiBAcGFyYW0gIHtFbnVtSXRlbSB8fCBTdHJpbmcgfHwgTnVtYmVyfSB2YWx1ZSBUaGUgRW51bUl0ZW0gdG8gd3JpdGUuXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChidWZmZXIsIG9mZnNldCwgdmFsdWUpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuZ2V0KHZhbHVlKTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgcmV0dXJuIGJ1ZmZlcltcIndyaXRlVUludDMyXCIgKyB0aGlzLl9vcHRpb25zLmVuZGlhbm5lc3NdKGl0ZW0udmFsdWUsIG9mZnNldCB8fCAwKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlZmluZSBmcmVlemVFbnVtcygpIGFzIGEgcHJvcGVydHkgb2YgdGhlIHByb3RvdHlwZS5cbiAgICogbWFrZSBlbnVtZXJhYmxlIGl0ZW1zIG5vbmNvbmZpZ3VyYWJsZSBhbmQgZGVlcCBmcmVlemUgdGhlIHByb3BlcnRpZXMuIFRocm93IEVycm9yIG9uIHByb3BlcnR5IHNldHRlci5cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUuZnJlZXplRW51bXMgPSBmdW5jdGlvbiBmcmVlemVFbnVtcygpIHtcbiAgICBmdW5jdGlvbiBlbnZTdXBwb3J0c0ZyZWV6aW5nKCkge1xuICAgICAgcmV0dXJuIE9iamVjdC5pc0Zyb3plbiAmJiBPYmplY3QuaXNTZWFsZWQgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgJiYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydGllcyAmJiBPYmplY3QuX19kZWZpbmVHZXR0ZXJfXyAmJiBPYmplY3QuX19kZWZpbmVTZXR0ZXJfXztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmcmVlemVyKG8pIHtcbiAgICAgIHZhciBwcm9wcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG8pO1xuICAgICAgcHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgICBpZiAoIU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobywgcCkuY29uZmlndXJhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobywgcCwgeyB3cml0YWJsZTogZmFsc2UsIGNvbmZpZ3VyYWJsZTogZmFsc2UgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBvO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWUodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWVwRnJlZXplRW51bXMobykge1xuICAgICAgaWYgKHR5cGVvZiBvICE9PSBcIm9iamVjdFwiIHx8IG8gPT09IG51bGwgfHwgT2JqZWN0LmlzRnJvemVuKG8pIHx8IE9iamVjdC5pc1NlYWxlZChvKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrZXkgaW4gbykge1xuICAgICAgICBpZiAoby5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgby5fX2RlZmluZUdldHRlcl9fKGtleSwgZ2V0UHJvcGVydHlWYWx1ZS5iaW5kKG51bGwsIG9ba2V5XSkpO1xuICAgICAgICAgIG8uX19kZWZpbmVTZXR0ZXJfXyhrZXksIGZ1bmN0aW9uIHRocm93UHJvcGVydHlTZXRFcnJvcih2YWx1ZSkge1xuICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiQ2Fubm90IHJlZGVmaW5lIHByb3BlcnR5OyBFbnVtIFR5cGUgaXMgbm90IGV4dGVuc2libGUuXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGRlZXBGcmVlemVFbnVtcyhvW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoT2JqZWN0LmZyZWV6ZSkge1xuICAgICAgICBPYmplY3QuZnJlZXplKG8pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnJlZXplcihvKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW52U3VwcG9ydHNGcmVlemluZygpKSB7XG4gICAgICBkZWVwRnJlZXplRW51bXModGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgSlNPTiBvYmplY3QgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IEpTT04gb2JqZWN0IHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgRW51bS5cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLl9lbnVtTWFwO1xuICB9O1xuXG4gIC8qKlxuICAgKiBFeHRlbmRzIHRoZSBleGlzdGluZyBFbnVtIHdpdGggYSBOZXcgTWFwLlxuICAgKiBAcGFyYW0gIHtBcnJheX0gIG1hcCAgTWFwIHRvIGV4dGVuZCBmcm9tXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLmV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZChtYXApIHtcbiAgICBpZiAobWFwLmxlbmd0aCkge1xuICAgICAgdmFyIGFycmF5ID0gbWFwO1xuICAgICAgbWFwID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cG9uZW50ID0gdGhpcy5fZW51bUxhc3RJbmRleCArIGk7XG4gICAgICAgIG1hcFthcnJheVtpXV0gPSBNYXRoLnBvdygyLCBleHBvbmVudCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIG1lbWJlciBpbiBtYXApIHtcbiAgICAgICAgZ3VhcmRSZXNlcnZlZEtleXModGhpcy5fb3B0aW9ucy5uYW1lLCBtZW1iZXIpO1xuICAgICAgICB0aGlzW21lbWJlcl0gPSBuZXcgRW51bUl0ZW0obWVtYmVyLCBtYXBbbWVtYmVyXSwgeyBpZ25vcmVDYXNlOiB0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UgfSk7XG4gICAgICAgIHRoaXMuZW51bXMucHVzaCh0aGlzW21lbWJlcl0pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5fZW51bU1hcCkge1xuICAgICAgICBtYXBba2V5XSA9IHRoaXMuX2VudW1NYXBba2V5XTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fZW51bUxhc3RJbmRleCArPSBtYXAubGVuZ3RoO1xuICAgICAgdGhpcy5fZW51bU1hcCA9IG1hcDtcblxuICAgICAgaWYgKHRoaXMuX29wdGlvbnMuZnJlZXopIHtcbiAgICAgICAgdGhpcy5mcmVlemVFbnVtcygpOyAvL3RoaXMgd2lsbCBtYWtlIGluc3RhbmNlcyBvZiBuZXcgRW51bSBub24tZXh0ZW5zaWJsZVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVnaXN0ZXJzIHRoZSBFbnVtIFR5cGUgZ2xvYmFsbHkgaW4gbm9kZS5qcy5cbiAgICogQHBhcmFtICB7U3RyaW5nfSBrZXkgR2xvYmFsIHZhcmlhYmxlLiBbb3B0aW9uYWxdXG4gICAqL1xuXG4gIEVudW0ucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcigpIHtcbiAgICB2YXIga2V5ID0gYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyBcIkVudW1cIiA6IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICghZ2xvYmFsW2tleV0pIHtcbiAgICAgIGdsb2JhbFtrZXldID0gRW51bTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIEVudW07XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudW07XG5cbi8vIHByaXZhdGVcblxudmFyIHJlc2VydmVkS2V5cyA9IFtcIl9vcHRpb25zXCIsIFwiZ2V0XCIsIFwiZ2V0S2V5XCIsIFwiZ2V0VmFsdWVcIiwgXCJlbnVtc1wiLCBcImlzRmxhZ2dhYmxlXCIsIFwiX2VudW1NYXBcIiwgXCJ0b0pTT05cIiwgXCJfZW51bUxhc3RJbmRleFwiXTtcblxuZnVuY3Rpb24gZ3VhcmRSZXNlcnZlZEtleXMoY3VzdG9tTmFtZSwga2V5KSB7XG4gIGlmIChjdXN0b21OYW1lICYmIGtleSA9PT0gXCJuYW1lXCIgfHwgaW5kZXhPZi5jYWxsKHJlc2VydmVkS2V5cywga2V5KSA+PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRW51bSBrZXkgXCIgKyBrZXkgKyBcIiBpcyBhIHJlc2VydmVkIHdvcmQhXCIpO1xuICB9XG59XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH07XG5cbnZhciBfaXNUeXBlID0gcmVxdWlyZShcIi4vaXNUeXBlXCIpO1xuXG52YXIgaXNPYmplY3QgPSBfaXNUeXBlLmlzT2JqZWN0O1xudmFyIGlzU3RyaW5nID0gX2lzVHlwZS5pc1N0cmluZztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEl0ZW0gb2YgYW4gRW51bS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgICBUaGUgRW51bSBrZXkuXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgVGhlIEVudW0gdmFsdWUuXG4gKi9cblxudmFyIEVudW1JdGVtID0gKGZ1bmN0aW9uICgpIHtcblxuICAvKmNvbnN0cnVjdG9yIHJlZmVyZW5jZSBzbyB0aGF0LCB0aGlzLmNvbnN0cnVjdG9yPT09RW51bUl0ZW0vLz0+dHJ1ZSAqL1xuXG4gIGZ1bmN0aW9uIEVudW1JdGVtKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMl07XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRW51bUl0ZW0pO1xuXG4gICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuXG4gICAgdGhpcy52YWwgPSB0aGlzLnZhbHVlLnY7XG4gICAgdGhpcy5kZXMgPSB0aGlzLnZhbHVlLmQ7XG5cbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UgPSB0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UgfHwgZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBmbGFnZ2VkIEVudW1JdGVtIGhhcyB0aGUgcGFzc2luZyBvYmplY3QuXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IHZhbHVlIFRoZSBvYmplY3QgdG8gY2hlY2sgd2l0aC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGNoZWNrIHJlc3VsdC5cbiAgICovXG5cbiAgRW51bUl0ZW0ucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIGhhcyh2YWx1ZSkge1xuICAgIGlmIChFbnVtSXRlbS5pc0VudW1JdGVtKHZhbHVlKSkge1xuICAgICAgcmV0dXJuICh0aGlzLnZhbHVlICYgdmFsdWUudmFsdWUpICE9PSAwO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICBpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmtleS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodmFsdWUudG9Mb3dlckNhc2UoKSkgPj0gMDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmtleS5pbmRleE9mKHZhbHVlKSA+PSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKHRoaXMudmFsdWUgJiB2YWx1ZSkgIT09IDA7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIEVudW1JdGVtIGlzIHRoZSBzYW1lIGFzIHRoZSBwYXNzaW5nIG9iamVjdC5cbiAgICogQHBhcmFtICB7RW51bUl0ZW0gfHwgU3RyaW5nIHx8IE51bWJlcn0ga2V5IFRoZSBvYmplY3QgdG8gY2hlY2sgd2l0aC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBjaGVjayByZXN1bHQuXG4gICAqL1xuXG4gIEVudW1JdGVtLnByb3RvdHlwZS5pcyA9IGZ1bmN0aW9uIGlzKGtleSkge1xuICAgIGlmIChFbnVtSXRlbS5pc0VudW1JdGVtKGtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmtleSA9PT0ga2V5LmtleTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGtleSkpIHtcbiAgICAgIGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMua2V5LnRvTG93ZXJDYXNlKCkgPT09IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMua2V5ID09PSBrZXk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZhbHVlID09PSBrZXk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW1JdGVtLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW1JdGVtLlxuICAgKi9cblxuICBFbnVtSXRlbS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5rZXk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgSlNPTiBvYmplY3QgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtSXRlbS5cbiAgICogQHJldHVybiB7U3RyaW5nfSBKU09OIG9iamVjdCByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW1JdGVtLlxuICAgKi9cblxuICBFbnVtSXRlbS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLmtleTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgdmFsdWUgdG8gY29tcGFyZSB3aXRoLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSB2YWx1ZSB0byBjb21wYXJlIHdpdGguXG4gICAqL1xuXG4gIEVudW1JdGVtLnByb3RvdHlwZS52YWx1ZU9mID0gZnVuY3Rpb24gdmFsdWVPZigpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgfTtcblxuICBFbnVtSXRlbS5pc0VudW1JdGVtID0gZnVuY3Rpb24gaXNFbnVtSXRlbSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIEVudW1JdGVtIHx8IGlzT2JqZWN0KHZhbHVlKSAmJiB2YWx1ZS5rZXkgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZS52YWx1ZSAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIHJldHVybiBFbnVtSXRlbTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRW51bUl0ZW07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgaW5kZXhPZiA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mIHx8IGZ1bmN0aW9uIChmaW5kLCBpIC8qb3B0Ki8pIHtcbiAgaWYgKGkgPT09IHVuZGVmaW5lZCkgaSA9IDA7XG4gIGlmIChpIDwgMCkgaSArPSB0aGlzLmxlbmd0aDtcbiAgaWYgKGkgPCAwKSBpID0gMDtcbiAgZm9yICh2YXIgbiA9IHRoaXMubGVuZ3RoOyBpIDwgbjsgaSsrKSBpZiAoaSBpbiB0aGlzICYmIHRoaXNbaV0gPT09IGZpbmQpIHJldHVybiBpO1xuICByZXR1cm4gLTE7XG59O1xuZXhwb3J0cy5pbmRleE9mID0gaW5kZXhPZjsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbnZhciBpc1R5cGUgPSBmdW5jdGlvbiAodHlwZSwgdmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gdHlwZTtcbn07XG5leHBvcnRzLmlzVHlwZSA9IGlzVHlwZTtcbnZhciBpc09iamVjdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gaXNUeXBlKFwib2JqZWN0XCIsIHZhbHVlKTtcbn07XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG52YXIgaXNTdHJpbmcgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIGlzVHlwZShcInN0cmluZ1wiLCB2YWx1ZSk7XG59O1xuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kaXN0L2VudW0nKTtcbiIsImV4cG9ydHMuZW5kaWFubmVzcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdMRScgfTtcblxuZXhwb3J0cy5ob3N0bmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb24uaG9zdG5hbWVcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLmxvYWRhdmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnVwdGltZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDAgfTtcblxuZXhwb3J0cy5mcmVlbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy50b3RhbG1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMuY3B1cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdCcm93c2VyJyB9O1xuXG5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuYXZpZ2F0b3IuYXBwVmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5uZXR3b3JrSW50ZXJmYWNlc1xuPSBleHBvcnRzLmdldE5ldHdvcmtJbnRlcmZhY2VzXG49IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9IH07XG5cbmV4cG9ydHMuYXJjaCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdqYXZhc2NyaXB0JyB9O1xuXG5leHBvcnRzLnBsYXRmb3JtID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2Jyb3dzZXInIH07XG5cbmV4cG9ydHMudG1wZGlyID0gZXhwb3J0cy50bXBEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcvdG1wJztcbn07XG5cbmV4cG9ydHMuRU9MID0gJ1xcbic7XG4iLCIvKipcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgQnVmZmVyXG4gKlxuICogQXV0aG9yOiAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBMaWNlbnNlOiAgTUlUXG4gKlxuICogYG5wbSBpbnN0YWxsIGlzLWJ1ZmZlcmBcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuICEhKG9iaiAhPSBudWxsICYmXG4gICAgKG9iai5faXNCdWZmZXIgfHwgLy8gRm9yIFNhZmFyaSA1LTcgKG1pc3NpbmcgT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvcilcbiAgICAgIChvYmouY29uc3RydWN0b3IgJiZcbiAgICAgIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopKVxuICAgICkpXG59XG4iXX0=
(5)
});
