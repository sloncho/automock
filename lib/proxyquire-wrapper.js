'use strict';

var _ = require('underscore');
_.mixin(require('underscore.string').exports());

var path = require('path');
var util = require('util');
var Module = require('module');

// Here there be dragons...
//
// So as not to have to reimplement the logic that's in proxyquire, we simply
// take it as a dependency.  But proxyquire is cleverly authored such that
// the function you get back from `require('proxyquire')` isn't actually a
// Proxyquire object... it's an instance of the `Proxyquire.load()` function,
// with Proxyquire's prototype functions bound to it as properties.  This means
// that it's incredibly difficult to inject new behavior into the middle of the
// returned object.
//
// However, since Proxyquire is already playing tricks with Node's built-in
// module logic, there's no reason we can't play similar tricks on Proxyquire
// itself.  Rather than requiring the top-level proxyquire export, we use
// knowledge of Proxyquire's innards so that we can directly acquire the
// Proxyquire class, which allows us to override individual function properties
// as needed.

// find the location of the proxyquire module, and then get the implementation
// directly.
var proxyquirePath = require.resolve('proxyquire');
var proxyquireClassPath = path.resolve(path.dirname(proxyquirePath), './lib/proxyquire');
var Proxyquire = require(proxyquireClassPath);

// Even though we now have direct access to the Proxyquire class, we still have
// difficulty because the constructor doesn't return the object itself. Instead,
// it returns a pre-bound `Proxyquire.load()` that is hard-wired to the containing
// object.
//
// We can, however, define our own subclass and ignore the return value from the
// Proxyquire constructor.
function ProxyquireWrapper(parent, automock) {
    // We *don't* return the value!
    ProxyquireWrapper.super_.call(this, parent);
    this._automock = automock;
}

util.inherits(ProxyquireWrapper, Proxyquire);

ProxyquireWrapper.prototype.load = function (request, stubs, params) {
    // Fix up stubs for proxyquire based on params...
    stubs = {};

    this._stubs = {};                   // REVIEW: rename to _mocks?
    this._params = params;
    this._primaryModuleFile = Module._resolveFilename(request, this._parent);
    var original = ProxyquireWrapper.super_.prototype.load.call(this, request, stubs);
    delete this._primaryModuleFile;

    // graft the stubs onto the returned exports...
    original.__stubs__ = this._stubs;   // REVIEW: rename to __mocks__?
    delete this._stubs;

    return original;
};

ProxyquireWrapper.prototype._require = function(callingModule, stubs, path) {
    // Let Proxyquire's implementation do its thing...
    var original = ProxyquireWrapper.super_.prototype._require.call(this, callingModule, stubs, path);
    var result = original;

    // We only mock the original if:
    //   * it doesn't have a manual stub in place
    //   * it hasn't been excluded from mocking
    //   * it is being required directly by the file under test // REVIEW: true?
    if (callingModule.filename === this._primaryModuleFile) {
        if (!this._stubs.hasOwnProperty(path)) {
            var localParams = {
                name: path,
            }

            _.defaults(localParams, this._params);

            this._stubs[path] = this._automock.mockValue(original, localParams);
        }

        result = this._stubs[path];
    }

    return result;
};

module.exports = ProxyquireWrapper;
