'use strict';

var _ = require('underscore');
_.mixin(require('underscore.string').exports());

var path = require('path');
var util = require('util');
var Module = require('module');

var ProxyquireWrapper = require('./proxyquire-wrapper');


function simpleStubCreator(name) {
    return function stub() {
        // TODO: report arguments in a sane/safe way?
        console.log(_.sprintf('<stub for "%s()">', name));
    };
}


function AutoMock(parent) {
    this._parent = parent;
    this._proxyquire = new ProxyquireWrapper(parent, this);
    this.setStubCreator();
}

AutoMock.prototype.setStubCreator = function (stubCreator) {
    this.defaultStubCreator = stubCreator || simpleStubCreator;
};

AutoMock.prototype.mockModule = function (moduleName, params) {
    var context = this._createMockingContext(params);

    var orig = Module._load(moduleName, this._parent);

    // Create a copy/clone/fake of the exports that looks as close as possible...
    var mock = this._mockValue(moduleName, orig, context);

    return mock;
};

AutoMock.prototype._createMockingContext = function (params) {
    params = params || {};

    return {
        stubCreator: params.stubCreator || this.defaultStubCreator,

        passThru: params.passThru || [],

        // track originals and mocks in order to avoid circular references
        originals: [],
        mocks: [],
    }
};

AutoMock.prototype.mockValue = function (orig, params) {
    params = params || {};
    var context = this._createMockingContext(params);
    return this._mockValue(params.name || '(none)', orig, context);
};

AutoMock.prototype._mockValue = function (name, orig, context) {
    var mock;
    var ignoredProperties;

    if (_.isObject(orig)) {
        // check for circular reference...
        var index = _.indexOf(context.originals, orig);
        if (index >= 0) {
            return context.mocks[index];
        }
        if (_.isFunction(orig)) {
            mock = context.stubCreator(name);
            ignoredProperties = functionIgnored;
        } else if (_.isArray(orig)) {
            mock = [];
            ignoredProperties = arrayIgnored;
        } else {
            mock = {};
        }

        context.originals.push(orig);
        context.mocks.push(mock);

        this._mockProperties(name, orig, mock, ignoredProperties, context);

        // The `prototype` property is excluded from property mocking because we
        // don't want to create a *new* prototype object.  Instead, we just want
        // to extend the mock's prototype with mocks of any prototype values of
        // the original.  (This is how we mock classes.)
        if (_.isFunction(orig) && !_.isUndefined(orig.prototype)) {
            this._mockProperties(name + '.prototype', orig.prototype, mock.prototype, prototypeIgnored, context);
        }
    } else {
        mock = orig;
    }

    return mock;
};

var functionIgnored = [
    'length',
    'name',
    'arguments',
    'caller',
    'prototype',
];

var prototypeIgnored = [
    'constructor',
];

var arrayIgnored = [
    'length',
];

AutoMock.prototype._mockProperties = function (name, orig, mock, ignoredProperties, context) {
    var keys = Object.getOwnPropertyNames(orig);

    var self = this;
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (ignoredProperties && _.contains(ignoredProperties, key)) {
            continue;
        }

        // REVIEW: classes have a 'super_' property that points to the
        // superclass... we currently mock that, but don't create the
        // full class chain... if we run into problems with that, we'll
        // need better class/prototype support.

        var desc = Object.getOwnPropertyDescriptor(orig, key);
        var mockDesc;
        var fullName = _.sprintf("%s.%s", name, key);

        if (_.contains(context.passThru, fullName)) {
            mockDesc = desc;
        } else {
            mockDesc = {
                writeable: desc.writeable,
                enumerable: desc.enumerable,
                configurable: desc.configurable,
            };

            if (desc.value) {
                mockDesc.value = self._mockValue(fullName, desc.value, context);
            }

            if (desc.get) {
                mockDesc.get = self._mockValue(_.sprintf("%s.%s", fullName, '__get__'), desc.get, context);
            }

            if (desc.set) {
                mockDesc.set = self._mockValue(_.sprintf("%s.%s", fullName, '__set__'), desc.set, context);
            }
        }

        Object.defineProperty(mock, key, mockDesc);
    }
};

AutoMock.prototype.require = function (moduleName, params) {
    // Use proxyquire to help us load the module.
    var moduleExports = this._proxyquire.load(moduleName, null, params);
    return moduleExports;
};


module.exports = AutoMock;
