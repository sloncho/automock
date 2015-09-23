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

    // In order to get the context from which requires are made, we have to load
    // the module.
    Module._load(filename, this.callingModule);
    this.baseModule = Module._cache[Module._resolveFilename(filename, this.callingModule)];
}

Mocker.prototype.mock = function (moduleName, spyCreator) {
    var context = this._createMockingContext(spyCreator);

    var orig = Module._load(moduleName, this.baseModule);

    // Create a copy/clone/fake of the exports that looks as close as possible...
    var mock = this._mockValue(moduleName, orig, context);

    return mock;
};

Mocker.prototype._createMockingContext = function (spyCreator) {
    return {
        spyCreator: spyCreator || this.defaultSpyCreator,
        // track originals and mocks in order to avoid circular references
        originals: [],
        mocks: [],
    }
};

Mocker.prototype.mockValue = function (orig, spyCreator) {
    var context = this._createMockingContext(spyCreator);
    return this._mockValue('(none)', orig, context);
};

Mocker.prototype._mockProperties = function (name, orig, mock, context) {
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
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (_.isFunction(orig) && _.contains(functionIgnored, key)) {
            continue;
        }

        if (_.isArray(orig) && _.contains(arrayIgnored, key)) {
            continue;
        }

        var desc = Object.getOwnPropertyDescriptor(orig, key);

        var mockDesc = {
            writeable: desc.writeable,
            enumerable: desc.enumerable,
            configurable: desc.configurable,
        };

        var fullName = _.sprintf("%s.%s", name, key);

        if (desc.value) {
            mockDesc.value = self._mockValue(fullName, desc.value, context);
        }

        if (desc.get) {
            mockDesc.get = self._mockValue(_.sprintf("%s.%s", fullName, '__get__'), desc.get, context);
        }

        if (desc.set) {
            mockDesc.set = self._mockValue(_.sprintf("%s.%s", fullName, '__set__'), desc.set, context);
        }

        Object.defineProperty(mock, key, mockDesc);
    }
};

Mocker.prototype._mockValue = function (name, orig, context) {
    var mock;

    if (_.isObject(orig)) {
        // check for circular reference...
        var index = _.indexOf(context.originals, orig);
        if (index >= 0) {
            return context.mocks[index];
        }

        if (_.isFunction(orig)) {
            mock = context.spyCreator(name);
        } else if (_.isArray(orig)) {
            mock = [];
        } else {
            mock = {};
        }

        context.originals.push(orig);
        context.mocks.push(mock);

        this._mockProperties(name, orig, mock, context);
    } else {
        mock = orig;
    }

    return mock;
};


module.exports = {
    Mocker: Mocker,
};
