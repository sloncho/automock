'use strict';

var _ = require('underscore');
_.mixin(require('underscore.string').exports());

var proxyquire = require('proxyquire');


describe('automock', function() {
    var AutoMock = require('../../lib/automock');
    var automock;

    // "failing" function so we can detect when it's not getting mocked...
    function origFunction() {
        expect(true).toBe(false);
    }

    beforeEach(function() {
        automock = new AutoMock(module);
    });

    it('has a mockModule method', function() {
        expect(automock.mockModule).toBeTruthy();
    });

    it('has a mockValue method', function() {
        expect(automock.mockValue).toBeTruthy();
    });

    it('can mock simple values', function() {
        expect(automock.mockValue(undefined)).toBe(undefined);
        expect(automock.mockValue(null)).toBe(null);
        expect(automock.mockValue(false)).toBe(false);
        expect(automock.mockValue(true)).toBe(true);
        expect(automock.mockValue(0)).toBe(0);
        expect(automock.mockValue(1)).toBe(1);
        expect(automock.mockValue(42)).toBe(42);
        expect(automock.mockValue('')).toBe('');
        expect(automock.mockValue('hello')).toBe('hello');
        expect(automock.mockValue('[]')).toBe('[]');
        expect(automock.mockValue('[1, 2, 3]')).toBe('[1, 2, 3]');
        expect(automock.mockValue('{}')).toBe('{}');
        expect(automock.mockValue('{name:"value"}')).toBe('{name:"value"}');
    });

    it('can mock functions', function() {
        var mock = automock.mockValue(origFunction, { name: 'origFunction' });

        expect(mock).not.toBe(origFunction);
        expect(typeof mock).toBe('function');

        // should not execute test-failing code in origFunction...
        mock();
    });

    describe('with a spy creator', function() {
        var spies;

        function spyCreator(name) {
            var spy = jasmine.createSpy(name);
            spies.push(spy);
            return spy;
        }

        beforeEach(function() {
            spies = [];
            automock.setStubCreator(spyCreator);
        });

        it('can mock a function by creating a stub', function() {
            automock.setStubCreator(spyCreator);
            var mock = automock.mockValue(origFunction);

            expect(mock).not.toBe(origFunction);
            expect(typeof mock).toBe('function');

            // calling the mocked function should *not* trigger the failure in origFunction!
            mock('dummy');
            expect(mock.calls.count()).toBe(1);
        });

        it('can mock function properties by replacing them with stubs', function() {
            var orig = {
                prop: origFunction
            };

            var mock = automock.mockValue(orig);

            expect(mock).not.toBe(orig);
            expect(typeof mock).toBe('object');
            expect(mock.prop).not.toBe(origFunction);
            expect(typeof mock.prop).toBe('function');

            // calling the mocked function should *not* trigger the failure in origFunction!
            mock.prop('dummy');
            expect(mock.prop.calls.count()).toBe(1);
        });

        it('can mock getter properties by replacing them with stubs', function() {
            var orig = {
                get prop() { origFunction(); }
            };

            var mock = automock.mockValue(orig);

            expect(mock).not.toBe(orig);
            expect(typeof mock).toBe('object');

            // calling the mocked getter should *not* trigger the failure in origFunction!
            var dummy = mock.prop;
            expect(spies.length).toBe(1);
            expect(spies[0].calls.count()).toBe(1);
        });

        it('can mock setter properties by replacing them with stubs', function() {
            var orig = {
                set prop(val) { origFunction(); }
            };

            var mock = automock.mockValue(orig);

            expect(mock).not.toBe(orig);
            expect(typeof mock).toBe('object');

            // calling the mocked setter should *not* trigger the failure in origFunction!
            mock.prop = 'dummy';
            expect(spies.length).toBe(1);
            expect(spies[0].calls.count()).toBe(1);
        });

        it('can mock a prototype-based class', function() {
            function Orig() {
                origFunction();
            }

            Orig.prototype.fn = function() {
                origFunction();
            };

            var mock = automock.mockValue(Orig);

            expect(mock).not.toBe(Orig);
            expect(typeof mock).toBe('function');

            // calling the mocked function should *not* trigger the failure in origFunction!
            var mockInstance = new mock();
            expect(mock.calls.count()).toBe(1);
            mockInstance.fn();
            expect(mockInstance.fn.calls.count()).toBe(1);
        });

        it('uses hand-crafted stubs as-is', function() {
            var orig = {
                prop: origFunction
            };

            var mock = automock.mockValue(orig, {
                name: 'orig',
                passThru: [
                    'orig.prop',
                ]
            });

            expect(mock).not.toBe(orig);
            expect(typeof mock).toBe('object');
            expect(mock.prop).toBe(origFunction);
        });
    });

    function checkMocking(orig, mock) {
        // Check basic types...
        expect(typeof mock).toBe(typeof orig);

        if (_.isObject(orig)) {
            var origProps = Object.getOwnPropertyNames(orig);
            var mockProps = Object.getOwnPropertyNames(mock);

            origProps.forEach(function(prop) {
                expect(_.contains(mockProps, prop)).toBe(true);
                // TODO: check type/signature as well?
            });
        }
    }

    function checkModuleMocking(moduleName) {
        var real = require(moduleName);
        var mock = automock.mockModule(moduleName);

        checkMocking(real, mock);
    }

    var standardModules = [
        'buffer',
        'child_process',
        'cluster',
        'crypto',
        'dns',
        'domain',
        'events',
        'fs',
        'http',
        'https',
        'net',
        'os',
        'path',
        'punycode',
        'querystring',
        'readline',
        'repl',
        'stream',
        'string_decoder',
        'tls',
        'tty',
        'dgram',
        'url',
        'util',
        'vm',
        'zlib',
    ];

    standardModules.forEach(function(moduleName) {
        it(_.sprintf('properly mocks %s', moduleName), function() {
            checkModuleMocking(moduleName);
        });

    });

    it('require() wraps proxyquire\'s load()', function() {
        var mockProxyquire = jasmine.createSpyObj('proxyquire-wrapper', ['load']);
        automock._proxyquire = mockProxyquire;

        automock.require('dummy');
        expect(mockProxyquire.load.calls.count()).toBe(1);
    });
});
