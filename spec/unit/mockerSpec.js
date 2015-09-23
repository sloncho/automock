'use strict';

var _ = require('underscore');
_.mixin(require('underscore.string').exports());

var Mocker = require('../../lib/mocker');

describe('mocker', function() {
    var spies;
    var mocker;

    function spyCreator(name) {
        // console.log(_.sprintf('<creating spy for "%s()">', name));
        var spy = jasmine.createSpy(name);
        spies.push(spy);
        return spy;
    }

    // "failing" function so we can detect when it's not getting mocked...
    function origFunction() {
        expect(true).toBe(false);
    }

    beforeEach(function() {
        spies = [];
        mocker = new Mocker(module);
        mocker.setSpyCreator(spyCreator);
    });


    it('has a mock method', function() {
        expect(mocker.mock).toBeTruthy();
    });

    it('can mock simple values', function() {
        expect(mocker.mockValue(undefined)).toBe(undefined);
        expect(mocker.mockValue(null)).toBe(null);
        expect(mocker.mockValue(false)).toBe(false);
        expect(mocker.mockValue(true)).toBe(true);
        expect(mocker.mockValue(0)).toBe(0);
        expect(mocker.mockValue(1)).toBe(1);
        expect(mocker.mockValue(42)).toBe(42);
        expect(mocker.mockValue('')).toBe('');
        expect(mocker.mockValue('hello')).toBe('hello');
        expect(mocker.mockValue('[]')).toBe('[]');
        expect(mocker.mockValue('[1, 2, 3]')).toBe('[1, 2, 3]');
        expect(mocker.mockValue('{}')).toBe('{}');
        expect(mocker.mockValue('{name:"value"}')).toBe('{name:"value"}');
    });

    it('can mock a function by creating a spy', function() {
        var mock = mocker.mockValue(origFunction);

        expect(mock).not.toBe(origFunction);
        expect(typeof mock).toBe('function');

        // calling the mocked function should *not* trigger the failure in origFunction!
        mock('dummy');
        expect(mock.calls.count()).toBe(1);
    });

    it('can mock function properties by replacing them with spies', function() {
        var orig = {
            prop: origFunction
        };

        var mock = mocker.mockValue(orig);

        expect(mock).not.toBe(orig);
        expect(typeof mock).toBe('object');
        expect(mock.prop).not.toBe(origFunction);
        expect(typeof mock.prop).toBe('function');

        // calling the mocked function should *not* trigger the failure in origFunction!
        mock.prop('dummy');
        expect(mock.prop.calls.count()).toBe(1);
    });

    it('can mock getter properties by replacing them with spies', function() {
        var orig = {
            get prop() { origFunction(); }
        };

        var mock = mocker.mockValue(orig);

        expect(mock).not.toBe(orig);
        expect(typeof mock).toBe('object');

        // calling the mocked getter should *not* trigger the failure in origFunction!
        var dummy = mock.prop;
        expect(spies.length).toBe(1);
        expect(spies[0].calls.count()).toBe(1);
    });

    it('can mock setter properties by replacing them with spies', function() {
        var orig = {
            set prop(val) { origFunction(); }
        };

        var mock = mocker.mockValue(orig);

        expect(mock).not.toBe(orig);
        expect(typeof mock).toBe('object');

        // calling the mocked setter should *not* trigger the failure in origFunction!
        mock.prop = 'dummy';
        expect(spies.length).toBe(1);
        expect(spies[0].calls.count()).toBe(1);
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
        var mock = mocker.mock(moduleName);

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
});
