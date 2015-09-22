'use strict';

var _ = require('underscore');
_.mixin(require('underscore.string').exports());

var path = require('path');
var util = require('util');
var Module = require('module');


function stubSpyCreator(name) {
    return function spy() {
        // TODO: report arguments in a sane/safe way?
        console.log(_.sprintf('<spy for "%s()">', name));
    };
}

// Can't rely on relative paths, because we'd need to know the path of the
// caller as well!  Therefore, you should pass the results of
// `require.resolve('module-name-or-path')`.
function Mocker(callingModule, filename, spyCreator) {
    this.callingModule = callingModule;
    this.defaultSpyCreator = spyCreator || stubSpyCreator;
    this.spyCreator = this.defaultSpyCreator;

    // In order to get the context from which requires are made, we have to load
    // the module.
    Module._load(filename, this.callingModule);
    this.baseModule = Module._cache[Module._resolveFilename(filename, this.callingModule)];
}

Mocker.prototype.mock = function (moduleName, spyCreator) {
    this.spyCreator = spyCreator || this.defaultSpyCreator;

    var orig = Module._load(moduleName, this.baseModule);

    // Create a copy/clone/fake of the exports that looks as close as possible...
    var mock = this._mockValue(moduleName, orig);

    return mock;
};

Mocker.prototype.mockValue = function (orig) {
    return this._mockValue('(none)', orig);
};

Mocker.prototype._mockProperties = function (name, orig, mock) {
    var functionIgnored = [
            'length',
            'name',
            'arguments',
            'caller',
            'prototype',
            'constructor',
    ];

    var arrayIgnored = [
            'length',
    ];

    var keys = Object.getOwnPropertyNames(orig);

    var self = this;
    keys.forEach(function(key) {
        if (_.isFunction(orig) && _.contains(functionIgnored, key)) {
            return;
        }

        if (_.isArray(orig) && _.contains(arrayIgnored, key)) {
            return;
        }

        var desc = Object.getOwnPropertyDescriptor(orig, key);

        var mockDesc = {
            writeable: desc.writeable,
            enumerable: desc.enumerable,
            configurable: desc.configurable,
        };

        var fullName = _.sprintf("%s.%s", name, key);

        if (desc.value) {
            mockDesc.value = self._mockValue(fullName, desc.value);
        }

        if (desc.get) {
            mockDesc.get = self._mockValue(_.sprintf("%s.%s", fullName, '__get__'), desc.get);
        }

        if (desc.set) {
            mockDesc.set = self._mockValue(_.sprintf("%s.%s", fullName, '__set__'), desc.set);
        }

        Object.defineProperty(mock, key, mockDesc);
    });
};

Mocker.prototype._mockValue = function (name, orig) {
    var mock;

    if (_.isFunction(orig)) {
        mock = this.spyCreator(name);
        this._mockProperties(name, orig, mock);
    } else if (_.isArray(orig)) {
        mock = [];
        this._mockProperties(name, orig, mock);
    } else if (_.isObject(orig)) {
        mock = {};
        this._mockProperties(name, orig, mock);
    } else {
        mock = orig;
    }

    return mock;
};


module.exports = {
    Mocker: Mocker,
};
