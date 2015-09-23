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

In order to get access to Node.js module-loading paths, you need to pass the current module's `module` object.

```javascript
var mocker = require('automock').mocker;

var someDependency = mocker.mock('some-dependency');

// `someDependency` should look just like the normal exports
// from `require('some-dependency')` would, but calling any
// functions won't have any effect.
```

#### Customizing stub/spy creation...


```javascript
var mocker = require('automock').mocker;
mocker.setSpyCreator(spyCreator);

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

var someDependency = mocker.mock('some-dependency');

someDependency.someFunction();
expect(someDependency.someFunction.calls.count).toBe(1);
expect(someDependency.someProperty).toBe(42);
```

If you want to control stub/spy creation on a mock-by-mock basis, you can also pass a _spyCreator_ function as the second parameter to the `mock()` call, and it will override the default creator passed to the `Mocker` constructor.


```javascript
var anotherDependency = mocker.mock('another-dependency', anotherSpyCreator);
```


## Caveats

In order to ensure it creates look-alike exports, `automock` has to _actually_ load the dependency it's attempting to mock.  If the act of compiling/loading the module has side-effects, those will happen!  With any luck, though, those should be rare occurrences; modules really shouldn't be written that way in general, for exactly that reason.


## What's Next?

Implement a `proxyquire`-like loader that can load a module and automatically stub _all_ of it dependencies.  Ideally, it could take a config object (much like `proxyquire` itself does) to indicate hand-crafted mocks, or modules _not_ to mock.
