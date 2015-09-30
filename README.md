# automock

A Node.js automatic mocking tool.

[![npm version](https://img.shields.io/npm/v/automock
.svg)](https://www.npmjs.com/packages/automock)
[![build status](https://img.shields.io/travis/HBOCodeLabs/automock/master.svg)](https://travis-ci.org/HBOCodeLabs/automock)
[![code coverage](https://img.shields.io/codecov/c/github/HBOCodeLabs/automock.svg)](https://codecov.io/github/HBOCodeLabs/automock)
[![dependencies](https://img.shields.io/david/HBOCodeLabs/automock.svg)](https://david-dm.org/HBOCodeLabs/automock)

---

## Overview

There are some really good unit testing tools like `proxyquire` that can help
isolate your code from external dependencies.  The only downside is that you have
to implement any mocked dependencies yourself.  Further, it's very easy to use a
partially-mocked implementation which breaks when the dependency itself changes.

`automock` attempts to solve these problems by automatically creating lookalike
exports with all functionality stubbed out.


## Usage

You should be able to use `automock.require()` anywhere you would use `proxyquire()`,
but without necessarily needing to pre-define your stubs:

```javascript
var automock = require('automock');
automock.setStubCreator(jasmine.createSpy);

var myModule = automock.require('../lib/my-module');

describe('my module', function() {

    it('doIt calls util.format once', function() {
        myModule.doIt();
        expect(myModule.__stubs__.util.format.calls.count()).toBe(1);
    });

});
```

If you do need to manually define stubs, or if you want certain parts of your
dependencies to pass through, you can do so:

```javascript
var automock = require('automock');
automock.setStubCreator(jasmine.createSpy);

var cryptoMock = /* ... hand-crafted mock of Node's 'crypto' module ... */ ;

var myModule = automock.require('../lib/my-module', {
    stubs: {
        // If you need manually-created stubs, list them here, using the
        // same format as `proxyquire`.
        'crypto': cryptoMock,
    },
    passThru: [
        // List any dependencies you *don't* want mocked here.
        'util.inspect',
    ],
});
```

In this case, `crypto` is replaced by your hand-crafted stub, the actual
`util.inspect` module is left unmocked, and any other dependencies are automatically
stubbed out (using `jasmine.createSpy` in this example).

Finally, if you want to customize the automatically created stubs you can do so
in the `stubCreator` function:

```javascript
var automock = require('automock');
automock.setStubCreator(spyCreator);

function spyCreator(name) {
    // Stubs are named for their dot-notation object path, starting with the
    // module name.  Get/Set properties have "__get__" or "__set__" as the
    // last part of their name.
    var spy;

    switch (name) {
        case 'some-dependency.someFunction':
            spy = jasmine.createSpy(name).and.callFake(function() {
                // do something special!
            });
            break;

        case 'some-dependency.someProperty.__get__':
            spy = jasmine.createSpy(name).and.returnValue(42);
            break;

        default:
            spy = jasmine.createSpy(name);
    }

    return spy;
}

// Assume `my-module` has a `require('some-dependency')` statement!
var myModule = automock.require('../lib/my-module');

describe('my module', function() {

    it('calls someFunction', function() {
        myModule.callsSomeFunction();
        expect(myModule.__stubs__['some-dependency'].someFunction.calls.count()).toBe(1);
    });

    it('gets someProperty', function() {
        var prop = myModule.getsSomeProperty();
        expect(prop).toBe(42);
    });

});
```

Or, if your stubs can handle modification after-the-fact,
as jasmine's do, you can modify them _after_ they are created, since they are
passed back via the required module's `__stubs__` property:

```javascript
var automock = require('automock');
automock.setStubCreator(jasmine.createSpy);

// Assume `my-module` has a `require('some-dependency')` statement!
var myModule = automock.require('../lib/my-module');

// Modify the stub/spy behavior after they're created...
myModule.__stubs__['some-dependency'].someFunction.and.callFake(function() {
    // do something special!
});

myModule.__stubs__['some-dependency'].someProperty.__get__.and.returnValue(42);

describe('my module', function() {

    it('calls someFunction', function() {
        myModule.callsSomeFunction();
        expect(myModule.__stubs__['some-dependency'].someFunction.calls.count()).toBe(1);
    });

    it('gets someProperty', function() {
        var prop = myModule.getsSomeProperty();
        expect(prop).toBe(42);
    });

});
```


## Low-level usage

Occasionally, you may want to create a "just-in-time" mock of a particular
dependency or object.  You can do this using the `automock.mockModule()` and
`automock.mockValue()` functions.

```javascript
var automock = require('automock');

var someDependency = automock.mockModule('some-dependency');
// `someDependency` now looks just like the normal exports from
// `require('some-dependency')` would, but any functions are stubbed out.
// This is effectively what you get for `some-dependency` when it's a
// dependency inside of a module you've called `automock.require()` on.

var someDynamicallyCreatedObject = /* ... something returned from an API ... */ ;

var mockedObject = automock.mockValue(someDynamicallyCreatedObject);
// `mockedObject` now looks just like `someDynamicallyCreatedObject`, but any
// function properties (even nested ones!) are stubbed out.
```


## Caveats

In order to ensure it creates look-alike exports, `automock` has to _actually_
load the dependency it's attempting to mock.  If the act of compiling/loading the
module has side-effects, those will happen!  With any luck, though, those should
be rare occurrences; modules really shouldn't be written that way in general, for
exactly that reason.
