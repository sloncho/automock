'use strict';

var proxyquire = require('proxyquire');
var MockAutoMock = jasmine.createSpy('constructor');


describe('index', function() {
    var automock;

    beforeEach(function() {
        MockAutoMock.calls.reset();

        automock = proxyquire('../../index', {
            './lib/automock': MockAutoMock,
        });
    });

    it('creates an automock object', function() {
        expect(MockAutoMock.calls.count()).toBe(1);
    });

    it('passes the requiring module as the parent', function() {
        expect(MockAutoMock.calls.argsFor(0)[0].id).toEqual(module.id);
    });

});
