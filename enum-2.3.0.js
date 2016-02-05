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

  Enum.prototype.getList = function getList(k) {
    var vList = [];
    for (var i in this.enums) {
      vList.push(this.enums[i][k]);
    }
    return vList;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qaWVqaW5ndGFvL3JlcG9zL2VudW0vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2ppZWppbmd0YW8vcmVwb3MvZW51bS9kaXN0L2VudW0uanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL2Rpc3QvZW51bUl0ZW0uanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL2Rpc3QvaW5kZXhPZi5qcyIsIi9Vc2Vycy9qaWVqaW5ndGFvL3JlcG9zL2VudW0vZGlzdC9pc1R5cGUuanMiLCIvVXNlcnMvamllamluZ3Rhby9yZXBvcy9lbnVtL2Zha2VfOGIxN2E3Mi5qcyIsIi9Vc2Vycy9qaWVqaW5ndGFvL3JlcG9zL2VudW0vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIiwiL1VzZXJzL2ppZWppbmd0YW8vcmVwb3MvZW51bS9ub2RlX21vZHVsZXMvaXMtYnVmZmVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqW1wiZGVmYXVsdFwiXSA6IG9iajsgfTtcblxudmFyIF9jbGFzc0NhbGxDaGVjayA9IGZ1bmN0aW9uIChpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9O1xuXG52YXIgb3MgPSBfaW50ZXJvcFJlcXVpcmUocmVxdWlyZShcIm9zXCIpKTtcblxudmFyIEVudW1JdGVtID0gX2ludGVyb3BSZXF1aXJlKHJlcXVpcmUoXCIuL2VudW1JdGVtXCIpKTtcblxudmFyIGlzU3RyaW5nID0gcmVxdWlyZShcIi4vaXNUeXBlXCIpLmlzU3RyaW5nO1xuXG52YXIgaW5kZXhPZiA9IHJlcXVpcmUoXCIuL2luZGV4T2ZcIikuaW5kZXhPZjtcblxudmFyIGlzQnVmZmVyID0gX2ludGVyb3BSZXF1aXJlKHJlcXVpcmUoXCJpcy1idWZmZXJcIikpO1xuXG52YXIgZW5kaWFubmVzcyA9IG9zLmVuZGlhbm5lc3MoKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEVudW0gd2l0aCBlbnVtIGl0ZW1zLlxuICogQHBhcmFtIHtBcnJheSB8fCBPYmplY3R9ICBtYXAgICAgIFRoaXMgYXJlIHRoZSBlbnVtIGl0ZW1zLlxuICogQHBhcmFtIHtTdHJpbmcgfHwgT2JqZWN0fSBvcHRpb25zIFRoaXMgYXJlIG9wdGlvbnMuIFtvcHRpb25hbF1cbiAqL1xuXG52YXIgRW51bSA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW0obWFwLCBvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBFbnVtKTtcblxuICAgIC8qIGltcGxlbWVudCB0aGUgXCJyZWYgdHlwZSBpbnRlcmZhY2VcIiwgc28gdGhhdCBFbnVtIHR5cGVzIGNhblxuICAgICAqIGJlIHVzZWQgaW4gYG5vZGUtZmZpYCBmdW5jdGlvbiBkZWNsYXJhdGlvbnMgYW5kIGludm9rYXRpb25zLlxuICAgICAqIEluIEMsIHRoZXNlIEVudW1zIGFjdCBhcyBgdWludDMyX3RgIHR5cGVzLlxuICAgICAqXG4gICAgICogaHR0cHM6Ly9naXRodWIuY29tL1Rvb1RhbGxOYXRlL3JlZiN0aGUtdHlwZS1pbnRlcmZhY2VcbiAgICAgKi9cbiAgICB0aGlzLnNpemUgPSA0O1xuICAgIHRoaXMuaW5kaXJlY3Rpb24gPSAxO1xuXG4gICAgaWYgKG9wdGlvbnMgJiYgaXNTdHJpbmcob3B0aW9ucykpIHtcbiAgICAgIG9wdGlvbnMgPSB7IG5hbWU6IG9wdGlvbnMgfTtcbiAgICB9XG5cbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9vcHRpb25zLnNlcGFyYXRvciA9IHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yIHx8IFwiIHwgXCI7XG4gICAgdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzID0gdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzIHx8IGVuZGlhbm5lc3M7XG4gICAgdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlID0gdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlIHx8IGZhbHNlO1xuICAgIHRoaXMuX29wdGlvbnMuZnJlZXogPSB0aGlzLl9vcHRpb25zLmZyZWV6IHx8IGZhbHNlO1xuXG4gICAgdGhpcy5lbnVtcyA9IFtdO1xuICAgIHRoaXMuY2hvaWNlcyA9IHt9O1xuXG4gICAgaWYgKG1hcC5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX2VudW1MYXN0SW5kZXggPSBtYXAubGVuZ3RoO1xuICAgICAgdmFyIGFycmF5ID0gbWFwO1xuICAgICAgbWFwID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWFwW2FycmF5W2ldXSA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIG1lbWJlciBpbiBtYXApIHtcbiAgICAgIGd1YXJkUmVzZXJ2ZWRLZXlzKHRoaXMuX29wdGlvbnMubmFtZSwgbWVtYmVyKTtcbiAgICAgIHRoaXNbbWVtYmVyXSA9IG5ldyBFbnVtSXRlbShtZW1iZXIsIG1hcFttZW1iZXJdLCB7IGlnbm9yZUNhc2U6IHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSB9KTtcbiAgICAgIHRoaXMuZW51bXMucHVzaCh0aGlzW21lbWJlcl0pO1xuICAgICAgdGhpcy5jaG9pY2VzW21lbWJlcl0gPSB0aGlzW21lbWJlcl0uZGVzIHx8IHRoaXNbbWVtYmVyXTtcbiAgICB9XG4gICAgdGhpcy5fZW51bU1hcCA9IG1hcDtcblxuICAgIGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UpIHtcbiAgICAgIHRoaXMuZ2V0TG93ZXJDYXNlRW51bXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuZW51bXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICByZXNbdGhpcy5lbnVtc1tpXS5rZXkudG9Mb3dlckNhc2UoKV0gPSB0aGlzLmVudW1zW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9vcHRpb25zLm5hbWUpIHtcbiAgICAgIHRoaXMubmFtZSA9IHRoaXMuX29wdGlvbnMubmFtZTtcbiAgICB9XG5cbiAgICB2YXIgaXNGbGFnZ2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gX3RoaXMuZW51bXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGUgPSBfdGhpcy5lbnVtc1tpXTtcblxuICAgICAgICBpZiAoIShlLnZhbHVlICE9PSAwICYmICEoZS52YWx1ZSAmIGUudmFsdWUgLSAxKSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB0aGlzLmlzRmxhZ2dhYmxlID0gaXNGbGFnZ2FibGUoKTtcbiAgICBpZiAodGhpcy5fb3B0aW9ucy5mcmVleikge1xuICAgICAgdGhpcy5mcmVlemVFbnVtcygpOyAvL3RoaXMgd2lsbCBtYWtlIGluc3RhbmNlcyBvZiBFbnVtIG5vbi1leHRlbnNpYmxlXG4gICAgfVxuICB9XG5cbiAgRW51bS5wcm90b3R5cGUuZ2V0UGFpcnMgPSBmdW5jdGlvbiBnZXRQYWlycyhrLCB2KSB7XG4gICAgdmFyIHBhaXJzID0ge307XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmVudW1zKSB7XG4gICAgICBwYWlyc1t0aGlzLmVudW1zW2ldW2tdXSA9IHRoaXMuZW51bXNbaV1bdl07XG4gICAgfTtcbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgRW51bS5wcm90b3R5cGUuZ2V0TGlzdCA9IGZ1bmN0aW9uIGdldExpc3Qoaykge1xuICAgIHZhciB2TGlzdCA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5lbnVtcykge1xuICAgICAgdkxpc3QucHVzaCh0aGlzLmVudW1zW2ldW2tdKTtcbiAgICB9XG4gICAgcmV0dXJuIHZMaXN0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBhcHByb3ByaWF0ZSBFbnVtSXRlbSBrZXkuXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IGtleSBUaGUgb2JqZWN0IHRvIGdldCB3aXRoLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGdldCByZXN1bHQuXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLmdldEtleSA9IGZ1bmN0aW9uIGdldEtleSh2YWx1ZSkge1xuICAgIHZhciBpdGVtID0gdGhpcy5nZXQodmFsdWUpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS5rZXk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBhcHByb3ByaWF0ZSBFbnVtSXRlbSB2YWx1ZS5cbiAgICogQHBhcmFtICB7RW51bUl0ZW0gfHwgU3RyaW5nIHx8IE51bWJlcn0ga2V5IFRoZSBvYmplY3QgdG8gZ2V0IHdpdGguXG4gICAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgZ2V0IHJlc3VsdC5cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiBnZXRWYWx1ZShrZXkpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuZ2V0KGtleSk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYXBwcm9wcmlhdGUgRW51bUl0ZW0uXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IGtleSBUaGUgb2JqZWN0IHRvIGdldCB3aXRoLlxuICAgKiBAcmV0dXJuIHtFbnVtSXRlbX0gICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGdldCByZXN1bHQuXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChrZXksIG9mZnNldCkge1xuICAgIGlmIChrZXkgPT09IG51bGwgfHwga2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIEJ1ZmZlciBpbnN0YW5jZSBzdXBwb3J0LCBwYXJ0IG9mIHRoZSByZWYgVHlwZSBpbnRlcmZhY2VcbiAgICBpZiAoaXNCdWZmZXIoa2V5KSkge1xuICAgICAga2V5ID0ga2V5W1wicmVhZFVJbnQzMlwiICsgdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzXShvZmZzZXQgfHwgMCk7XG4gICAgfVxuXG4gICAgaWYgKEVudW1JdGVtLmlzRW51bUl0ZW0oa2V5KSkge1xuICAgICAgdmFyIGZvdW5kSW5kZXggPSBpbmRleE9mLmNhbGwodGhpcy5lbnVtcywga2V5KTtcbiAgICAgIGlmIChmb3VuZEluZGV4ID49IDApIHtcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc0ZsYWdnYWJsZSB8fCB0aGlzLmlzRmxhZ2dhYmxlICYmIGtleS5rZXkuaW5kZXhPZih0aGlzLl9vcHRpb25zLnNlcGFyYXRvcikgPCAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldChrZXkua2V5KTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGtleSkpIHtcblxuICAgICAgdmFyIGVudW1zID0gdGhpcztcbiAgICAgIGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UpIHtcbiAgICAgICAgZW51bXMgPSB0aGlzLmdldExvd2VyQ2FzZUVudW1zKCk7XG4gICAgICAgIGtleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoa2V5LmluZGV4T2YodGhpcy5fb3B0aW9ucy5zZXBhcmF0b3IpID4gMCkge1xuICAgICAgICB2YXIgcGFydHMgPSBrZXkuc3BsaXQodGhpcy5fb3B0aW9ucy5zZXBhcmF0b3IpO1xuXG4gICAgICAgIHZhciB2YWx1ZSA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgICAgICAgdmFsdWUgfD0gZW51bXNbcGFydF0udmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IEVudW1JdGVtKGtleSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGVudW1zW2tleV07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIG0gaW4gdGhpcykge1xuICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShtKSkge1xuICAgICAgICAgIGlmICh0aGlzW21dLnZhbHVlID09PSBrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW21dO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgcmVzdWx0ID0gbnVsbDtcblxuICAgICAgaWYgKHRoaXMuaXNGbGFnZ2FibGUpIHtcbiAgICAgICAgZm9yICh2YXIgbiBpbiB0aGlzKSB7XG4gICAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkobikpIHtcbiAgICAgICAgICAgIGlmICgoa2V5ICYgdGhpc1tuXS52YWx1ZSkgIT09IDApIHtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSB0aGlzLl9vcHRpb25zLnNlcGFyYXRvcjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBcIlwiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlc3VsdCArPSBuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQocmVzdWx0IHx8IG51bGwpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogU2V0cyB0aGUgRW51bSBcInZhbHVlXCIgb250byB0aGUgZ2l2ZSBgYnVmZmVyYCBhdCB0aGUgc3BlY2lmaWVkIGBvZmZzZXRgLlxuICAgKiBQYXJ0IG9mIHRoZSByZWYgXCJUeXBlIGludGVyZmFjZVwiLlxuICAgKlxuICAgKiBAcGFyYW0gIHtCdWZmZXJ9IGJ1ZmZlciBUaGUgQnVmZmVyIGluc3RhbmNlIHRvIHdyaXRlIHRvLlxuICAgKiBAcGFyYW0gIHtOdW1iZXJ9IG9mZnNldCBUaGUgb2Zmc2V0IGluIHRoZSBidWZmZXIgdG8gd3JpdGUgdG8uIERlZmF1bHQgMC5cbiAgICogQHBhcmFtICB7RW51bUl0ZW0gfHwgU3RyaW5nIHx8IE51bWJlcn0gdmFsdWUgVGhlIEVudW1JdGVtIHRvIHdyaXRlLlxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQoYnVmZmVyLCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgdmFyIGl0ZW0gPSB0aGlzLmdldCh2YWx1ZSk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIHJldHVybiBidWZmZXJbXCJ3cml0ZVVJbnQzMlwiICsgdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzXShpdGVtLnZhbHVlLCBvZmZzZXQgfHwgMCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgZnJlZXplRW51bXMoKSBhcyBhIHByb3BlcnR5IG9mIHRoZSBwcm90b3R5cGUuXG4gICAqIG1ha2UgZW51bWVyYWJsZSBpdGVtcyBub25jb25maWd1cmFibGUgYW5kIGRlZXAgZnJlZXplIHRoZSBwcm9wZXJ0aWVzLiBUaHJvdyBFcnJvciBvbiBwcm9wZXJ0eSBzZXR0ZXIuXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLmZyZWV6ZUVudW1zID0gZnVuY3Rpb24gZnJlZXplRW51bXMoKSB7XG4gICAgZnVuY3Rpb24gZW52U3VwcG9ydHNGcmVlemluZygpIHtcbiAgICAgIHJldHVybiBPYmplY3QuaXNGcm96ZW4gJiYgT2JqZWN0LmlzU2VhbGVkICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgJiYgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMgJiYgT2JqZWN0Ll9fZGVmaW5lR2V0dGVyX18gJiYgT2JqZWN0Ll9fZGVmaW5lU2V0dGVyX187XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnJlZXplcihvKSB7XG4gICAgICB2YXIgcHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvKTtcbiAgICAgIHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgICAgaWYgKCFPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG8sIHApLmNvbmZpZ3VyYWJsZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG8sIHAsIHsgd3JpdGFibGU6IGZhbHNlLCBjb25maWd1cmFibGU6IGZhbHNlIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQcm9wZXJ0eVZhbHVlKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVlcEZyZWV6ZUVudW1zKG8pIHtcbiAgICAgIGlmICh0eXBlb2YgbyAhPT0gXCJvYmplY3RcIiB8fCBvID09PSBudWxsIHx8IE9iamVjdC5pc0Zyb3plbihvKSB8fCBPYmplY3QuaXNTZWFsZWQobykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2V5IGluIG8pIHtcbiAgICAgICAgaWYgKG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIG8uX19kZWZpbmVHZXR0ZXJfXyhrZXksIGdldFByb3BlcnR5VmFsdWUuYmluZChudWxsLCBvW2tleV0pKTtcbiAgICAgICAgICBvLl9fZGVmaW5lU2V0dGVyX18oa2V5LCBmdW5jdGlvbiB0aHJvd1Byb3BlcnR5U2V0RXJyb3IodmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIkNhbm5vdCByZWRlZmluZSBwcm9wZXJ0eTsgRW51bSBUeXBlIGlzIG5vdCBleHRlbnNpYmxlLlwiKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBkZWVwRnJlZXplRW51bXMob1trZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKE9iamVjdC5mcmVlemUpIHtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShvKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZyZWV6ZXIobyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVudlN1cHBvcnRzRnJlZXppbmcoKSkge1xuICAgICAgZGVlcEZyZWV6ZUVudW1zKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIEpTT04gb2JqZWN0IHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgRW51bS5cbiAgICogQHJldHVybiB7U3RyaW5nfSBKU09OIG9iamVjdCByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW0uXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5fZW51bU1hcDtcbiAgfTtcblxuICAvKipcbiAgICogRXh0ZW5kcyB0aGUgZXhpc3RpbmcgRW51bSB3aXRoIGEgTmV3IE1hcC5cbiAgICogQHBhcmFtICB7QXJyYXl9ICBtYXAgIE1hcCB0byBleHRlbmQgZnJvbVxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmQobWFwKSB7XG4gICAgaWYgKG1hcC5sZW5ndGgpIHtcbiAgICAgIHZhciBhcnJheSA9IG1hcDtcbiAgICAgIG1hcCA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBleHBvbmVudCA9IHRoaXMuX2VudW1MYXN0SW5kZXggKyBpO1xuICAgICAgICBtYXBbYXJyYXlbaV1dID0gTWF0aC5wb3coMiwgZXhwb25lbnQpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBtZW1iZXIgaW4gbWFwKSB7XG4gICAgICAgIGd1YXJkUmVzZXJ2ZWRLZXlzKHRoaXMuX29wdGlvbnMubmFtZSwgbWVtYmVyKTtcbiAgICAgICAgdGhpc1ttZW1iZXJdID0gbmV3IEVudW1JdGVtKG1lbWJlciwgbWFwW21lbWJlcl0sIHsgaWdub3JlQ2FzZTogdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlIH0pO1xuICAgICAgICB0aGlzLmVudW1zLnB1c2godGhpc1ttZW1iZXJdKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2VudW1NYXApIHtcbiAgICAgICAgbWFwW2tleV0gPSB0aGlzLl9lbnVtTWFwW2tleV07XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VudW1MYXN0SW5kZXggKz0gbWFwLmxlbmd0aDtcbiAgICAgIHRoaXMuX2VudW1NYXAgPSBtYXA7XG5cbiAgICAgIGlmICh0aGlzLl9vcHRpb25zLmZyZWV6KSB7XG4gICAgICAgIHRoaXMuZnJlZXplRW51bXMoKTsgLy90aGlzIHdpbGwgbWFrZSBpbnN0YW5jZXMgb2YgbmV3IEVudW0gbm9uLWV4dGVuc2libGVcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyB0aGUgRW51bSBUeXBlIGdsb2JhbGx5IGluIG5vZGUuanMuXG4gICAqIEBwYXJhbSAge1N0cmluZ30ga2V5IEdsb2JhbCB2YXJpYWJsZS4gW29wdGlvbmFsXVxuICAgKi9cblxuICBFbnVtLnJlZ2lzdGVyID0gZnVuY3Rpb24gcmVnaXN0ZXIoKSB7XG4gICAgdmFyIGtleSA9IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gXCJFbnVtXCIgOiBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAoIWdsb2JhbFtrZXldKSB7XG4gICAgICBnbG9iYWxba2V5XSA9IEVudW07XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBFbnVtO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbnVtO1xuXG4vLyBwcml2YXRlXG5cbnZhciByZXNlcnZlZEtleXMgPSBbXCJfb3B0aW9uc1wiLCBcImdldFwiLCBcImdldEtleVwiLCBcImdldFZhbHVlXCIsIFwiZW51bXNcIiwgXCJpc0ZsYWdnYWJsZVwiLCBcIl9lbnVtTWFwXCIsIFwidG9KU09OXCIsIFwiX2VudW1MYXN0SW5kZXhcIl07XG5cbmZ1bmN0aW9uIGd1YXJkUmVzZXJ2ZWRLZXlzKGN1c3RvbU5hbWUsIGtleSkge1xuICBpZiAoY3VzdG9tTmFtZSAmJiBrZXkgPT09IFwibmFtZVwiIHx8IGluZGV4T2YuY2FsbChyZXNlcnZlZEtleXMsIGtleSkgPj0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkVudW0ga2V5IFwiICsga2V5ICsgXCIgaXMgYSByZXNlcnZlZCB3b3JkIVwiKTtcbiAgfVxufVxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9jbGFzc0NhbGxDaGVjayA9IGZ1bmN0aW9uIChpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9O1xuXG52YXIgX2lzVHlwZSA9IHJlcXVpcmUoXCIuL2lzVHlwZVwiKTtcblxudmFyIGlzT2JqZWN0ID0gX2lzVHlwZS5pc09iamVjdDtcbnZhciBpc1N0cmluZyA9IF9pc1R5cGUuaXNTdHJpbmc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBJdGVtIG9mIGFuIEVudW0uXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5ICAgVGhlIEVudW0ga2V5LlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIFRoZSBFbnVtIHZhbHVlLlxuICovXG5cbnZhciBFbnVtSXRlbSA9IChmdW5jdGlvbiAoKSB7XG5cbiAgLypjb25zdHJ1Y3RvciByZWZlcmVuY2Ugc28gdGhhdCwgdGhpcy5jb25zdHJ1Y3Rvcj09PUVudW1JdGVtLy89PnRydWUgKi9cblxuICBmdW5jdGlvbiBFbnVtSXRlbShrZXksIHZhbHVlKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEVudW1JdGVtKTtcblxuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcblxuICAgIHRoaXMudmFsID0gdGhpcy52YWx1ZS52O1xuICAgIHRoaXMuZGVzID0gdGhpcy52YWx1ZS5kO1xuXG4gICAgdGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlID0gdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlIHx8IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgZmxhZ2dlZCBFbnVtSXRlbSBoYXMgdGhlIHBhc3Npbmcgb2JqZWN0LlxuICAgKiBAcGFyYW0gIHtFbnVtSXRlbSB8fCBTdHJpbmcgfHwgTnVtYmVyfSB2YWx1ZSBUaGUgb2JqZWN0IHRvIGNoZWNrIHdpdGguXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBjaGVjayByZXN1bHQuXG4gICAqL1xuXG4gIEVudW1JdGVtLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbiBoYXModmFsdWUpIHtcbiAgICBpZiAoRW51bUl0ZW0uaXNFbnVtSXRlbSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiAodGhpcy52YWx1ZSAmIHZhbHVlLnZhbHVlKSAhPT0gMDtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgaWYgKHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5rZXkudG9Mb3dlckNhc2UoKS5pbmRleE9mKHZhbHVlLnRvTG93ZXJDYXNlKCkpID49IDA7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5rZXkuaW5kZXhPZih2YWx1ZSkgPj0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICh0aGlzLnZhbHVlICYgdmFsdWUpICE9PSAwO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBFbnVtSXRlbSBpcyB0aGUgc2FtZSBhcyB0aGUgcGFzc2luZyBvYmplY3QuXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IGtleSBUaGUgb2JqZWN0IHRvIGNoZWNrIHdpdGguXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgY2hlY2sgcmVzdWx0LlxuICAgKi9cblxuICBFbnVtSXRlbS5wcm90b3R5cGUuaXMgPSBmdW5jdGlvbiBpcyhrZXkpIHtcbiAgICBpZiAoRW51bUl0ZW0uaXNFbnVtSXRlbShrZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcy5rZXkgPT09IGtleS5rZXk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhrZXkpKSB7XG4gICAgICBpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmtleS50b0xvd2VyQ2FzZSgpID09PSBrZXkudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmtleSA9PT0ga2V5O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy52YWx1ZSA9PT0ga2V5O1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtSXRlbS5cbiAgICogQHJldHVybiB7U3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtSXRlbS5cbiAgICovXG5cbiAgRW51bUl0ZW0ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMua2V5O1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIEpTT04gb2JqZWN0IHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgRW51bUl0ZW0uXG4gICAqIEByZXR1cm4ge1N0cmluZ30gSlNPTiBvYmplY3QgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtSXRlbS5cbiAgICovXG5cbiAgRW51bUl0ZW0ucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5rZXk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHZhbHVlIHRvIGNvbXBhcmUgd2l0aC5cbiAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgdmFsdWUgdG8gY29tcGFyZSB3aXRoLlxuICAgKi9cblxuICBFbnVtSXRlbS5wcm90b3R5cGUudmFsdWVPZiA9IGZ1bmN0aW9uIHZhbHVlT2YoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gIH07XG5cbiAgRW51bUl0ZW0uaXNFbnVtSXRlbSA9IGZ1bmN0aW9uIGlzRW51bUl0ZW0odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBFbnVtSXRlbSB8fCBpc09iamVjdCh2YWx1ZSkgJiYgdmFsdWUua2V5ICE9PSB1bmRlZmluZWQgJiYgdmFsdWUudmFsdWUgIT09IHVuZGVmaW5lZDtcbiAgfTtcblxuICByZXR1cm4gRW51bUl0ZW07XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudW1JdGVtOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xudmFyIGluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiB8fCBmdW5jdGlvbiAoZmluZCwgaSAvKm9wdCovKSB7XG4gIGlmIChpID09PSB1bmRlZmluZWQpIGkgPSAwO1xuICBpZiAoaSA8IDApIGkgKz0gdGhpcy5sZW5ndGg7XG4gIGlmIChpIDwgMCkgaSA9IDA7XG4gIGZvciAodmFyIG4gPSB0aGlzLmxlbmd0aDsgaSA8IG47IGkrKykgaWYgKGkgaW4gdGhpcyAmJiB0aGlzW2ldID09PSBmaW5kKSByZXR1cm4gaTtcbiAgcmV0dXJuIC0xO1xufTtcbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgaXNUeXBlID0gZnVuY3Rpb24gKHR5cGUsIHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IHR5cGU7XG59O1xuZXhwb3J0cy5pc1R5cGUgPSBpc1R5cGU7XG52YXIgaXNPYmplY3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIGlzVHlwZShcIm9iamVjdFwiLCB2YWx1ZSk7XG59O1xuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xudmFyIGlzU3RyaW5nID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBpc1R5cGUoXCJzdHJpbmdcIiwgdmFsdWUpO1xufTtcbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9lbnVtJyk7XG4iLCJleHBvcnRzLmVuZGlhbm5lc3MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnTEUnIH07XG5cbmV4cG9ydHMuaG9zdG5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGxvY2F0aW9uLmhvc3RuYW1lXG4gICAgfVxuICAgIGVsc2UgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5sb2FkYXZnID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW10gfTtcblxuZXhwb3J0cy51cHRpbWUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAwIH07XG5cbmV4cG9ydHMuZnJlZW1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMudG90YWxtZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5NQVhfVkFMVUU7XG59O1xuXG5leHBvcnRzLmNwdXMgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnR5cGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnQnJvd3NlcicgfTtcblxuZXhwb3J0cy5yZWxlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbmF2aWdhdG9yLmFwcFZlcnNpb247XG4gICAgfVxuICAgIHJldHVybiAnJztcbn07XG5cbmV4cG9ydHMubmV0d29ya0ludGVyZmFjZXNcbj0gZXhwb3J0cy5nZXROZXR3b3JrSW50ZXJmYWNlc1xuPSBmdW5jdGlvbiAoKSB7IHJldHVybiB7fSB9O1xuXG5leHBvcnRzLmFyY2ggPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnamF2YXNjcmlwdCcgfTtcblxuZXhwb3J0cy5wbGF0Zm9ybSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdicm93c2VyJyB9O1xuXG5leHBvcnRzLnRtcGRpciA9IGV4cG9ydHMudG1wRGlyID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnL3RtcCc7XG59O1xuXG5leHBvcnRzLkVPTCA9ICdcXG4nO1xuIiwiLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqIGBucG0gaW5zdGFsbCBpcy1idWZmZXJgXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShvYmogIT0gbnVsbCAmJlxuICAgIChvYmouX2lzQnVmZmVyIHx8IC8vIEZvciBTYWZhcmkgNS03IChtaXNzaW5nIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IpXG4gICAgICAob2JqLmNvbnN0cnVjdG9yICYmXG4gICAgICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKSlcbiAgICApKVxufVxuIl19
(5)
});
