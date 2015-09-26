# automock

A Node.js automatic mocking tool.

[![npm version](https://img.shields.io/npm/v/automock
.svg)](https://www.npmjs.com/packages/automock)
[![build status](https://img.shields.io/travis/HBOCodeLabs/automock/master.svg)](https://travis-ci.org/HBOCodeLabs/automock)
[![code coverage](https://img.shields.io/codecov/c/github/HBOCodeLabs/automock.svg)](https://codecov.io/github/HBOCodeLabs/automock)
[![dependencies](https://img.shields.io/david/HBOCodeLabs/automock.svg)](https://david-dm.org/HBOCodeLabs/automock)

---

## Overview

There are some really good unit testing tools like `proxyquire` that can help isolate your code from external dependencies.  The only downside is that you have to implement any mocked dependencies yourself.  Further, it's very easy to use a partially-mocked implementation which breaks when the dependency itself changes.

`automock` attempts to solve these problems by automatically creating lookalike exports with all functionality stubbed out.


## Usage

You should be able to use `automock` where you use `proxyquire`, but without needing
to pre-define your stubs:

```javascript
var automock = require('automock');
automock.setSpyCreator(jasmine.createSpy);

var myModule = automock.require('../lib/my-module');

// Write your tests!

describe('my module', function() {
    
    it('doIt calls util.format once', function() {
        myModule.doIt();
        expect(myModule.__stubs__.util.format).toHaveBeenCalled();
    });

});
```

If you do need to manually define stubs, or if you want certain parts of your
dependencies to pass through, you can do so:

```javascript
var automock = require('automock');
automock.setSpyCreator(jasmine.createSpy);

var cryptoMock = /* ... */ ;

var myModule = automock.require('../lib/my-module', {
    stubs: {
        // If you need manually-created stubs, list them here, using the
        // same format at proxyquire.
        'crypto': cryptoMock,
    },
    passThru: [
        // List dependencies you *don't* want mocked here.
        'util.inspect',
    ],
});
```


## Low-level usage

(Further details to-be-written...)

```javascript
var automock = require('automock');

var someDependency = automock.mock('some-dependency');

// `someDependency` should look just like the normal exports
// from `require('some-dependency')` would, but calling any
// functions won't have any effect.
```

#### Customizing stub/spy creation...

```javascript
var automock = require('automock');
automock.setSpyCreator(jasmine.createSpy);

var someDependency = automock.mock('some-dependency');

someDependency.someFunction();
expect(someDependency.someFunction.calls.count).toBe(1);
```

If you want to control stub/spy creation on a mock-by-mock basis, you can also pass a _spyCreator_ function as the second parameter to the `mock()` call, and it will override the default creator passed to the `automock.setSpyCreator()` function.


```javascript
var anotherDependency = automock.mock('another-dependency', anotherSpyCreator);
```

For more advanced behavior, you can customize the spy on a case-by-case basis:

```javascript
var automock = require('automock');
automock.setSpyCreator(spyCreator);

function spyCreator(name) {
    // Spies are named for their dot-notation object path,
    // starting with the module name.  Get/Set properties
    // have "__get__" or "__set__" as the last part of their
    // name.

    var spy = jasmine.createSpy(name);

    switch (name) {
        case 'some-dependency.someFunction':
            spy.andCallFake(function() {
                // do something special!
            });
            break;

        case 'some-dependency.someProperty.__get__':
            spy.andReturn(42);
            break;
    }

    return spy;
}

var someDependency = automock.mock('some-dependency');

someDependency.someFunction();
expect(someDependency.someFunction.calls.count).toBe(1);
expect(someDependency.someProperty).toBe(42);
```


## Caveats

In order to ensure it creates look-alike exports, `automock` has to _actually_ load the dependency it's attempting to mock.  If the act of compiling/loading the module has side-effects, those will happen!  With any luck, though, those should be rare occurrences; modules really shouldn't be written that way in general, for exactly that reason.


## What's Next?

Implement a `proxyquire`-like loader that can load a module and automatically stub _all_ of it dependencies.  Ideally, it could take a config object (much like `proxyquire` itself does) to indicate hand-crafted mocks, or modules _not_ to mock.
