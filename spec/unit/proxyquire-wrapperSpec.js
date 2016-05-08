'use strict';

var _ = require('underscore');
_.mixin(require('underscore.string').exports());

var path = require('path');

// Automock supplants proxyquire, but we have to be careful about relying on it
// for testing itself!  Instead, we rely on bare proxyquire for our tests.
var proxyquire = require('proxyquire');


var MockModule = {
    _resolveFilename: jasmine.createSpy('_resolveFilename').and.returnValue('dummy'),
};

// How meta can we get?  We're using proxyquire to stub out proxyquire in the
// proxyquire-wrapper module.  Thus, we need to create a stub replacement for
// proxyquire to pass in!
var MockProxyquire = jasmine.createSpy('constructor');
MockProxyquire.prototype.load = jasmine.createSpy('load').and.returnValue({ dummy: true });
MockProxyquire.prototype._require = jasmine.createSpy('_require').and.returnValue({ dummy: true });

var mockAutomock = {
    mockValue: jasmine.createSpy('mockValue'),
};

// Proxyquire-wrapper discovers the location of proxyquire dynamically (because
// it needs direct access to the implementation), so we have to do the same.
var proxyquirePath = require.resolve('proxyquire');
var proxyquireClassPath = path.resolve(path.dirname(proxyquirePath), './lib/proxyquire');

var stubs = {};
stubs[proxyquireClassPath] = MockProxyquire;
stubs['module'] = MockModule;

var ProxyquireWrapper = proxyquire('../../lib/proxyquire-wrapper', stubs);


describe('proxyquire-wrapper', function() {
    var wrapper;

    beforeEach(function() {
        MockProxyquire.calls.reset();
        MockProxyquire.prototype.load.calls.reset();
        MockProxyquire.prototype._require.calls.reset();

        wrapper = new ProxyquireWrapper(module, mockAutomock);
    });

    it('inherits from Proxyquire', function() {
        expect(ProxyquireWrapper.super_).toBe(MockProxyquire);
        expect(MockProxyquire.calls.count()).toBe(1);
    });

    describe('load', function() {
        var dummy;

        beforeEach(function() {
            dummy = wrapper.load('./dummy', {}, {});
        });

        it('calls through to Proxyquire\'s load', function() {
            expect(MockProxyquire.prototype.load.calls.count()).toBe(1);
        });

        it('returns require\'d module\'s exports', function() {
            expect(dummy.dummy).toBeTruthy();
        });

        it('returns chained module stubs', function() {
            expect(dummy.__stubs__).not.toBeUndefined();
        });

    });

    describe('_require', function() {
        function callWrapperRequire() {
            wrapper._require({ filename: 'dummy' }, {}, 'dummy');
        }

        beforeEach(function() {
            // Fake the values passed to `load()`.
            wrapper._stubs = {};
            wrapper._params = {};
            wrapper._primaryModuleFile = 'dummy';

            mockAutomock.mockValue.calls.reset();
        });

        it('calls through to Proxyquire\'s _require', function() {
            var result = callWrapperRequire();
            expect(MockProxyquire.prototype._require.calls.count()).toBe(1);
        });

        it('does not mock for dependecies of a non-primary module', function() {
            wrapper._primaryModuleFile = 'not-dummy';
            var result = callWrapperRequire();
            expect(mockAutomock.mockValue.calls.count()).toBe(0);
        });

        it('does mock for dependecies of the primary module', function() {
            var result = callWrapperRequire();
            expect(mockAutomock.mockValue.calls.count()).toBe(1);
        });

        it('does not mock for dependencies in passThru', function() {
            wrapper._params = {passThru: ['dummy']};
            var result = callWrapperRequire();
            expect(mockAutomock.mockValue.calls.count()).toBe(0);
        })
    });

});
