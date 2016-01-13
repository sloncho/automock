# automock

A Node.js mock object creation tool for unit testing.

[![npm version](https://img.shields.io/npm/v/automock.svg)](https://www.npmjs.com/packages/automock)
[![build status](https://img.shields.io/travis/HBOCodeLabs/automock/master.svg)](https://travis-ci.org/HBOCodeLabs/automock)
[![code coverage](https://img.shields.io/codecov/c/github/HBOCodeLabs/automock.svg)](https://codecov.io/github/HBOCodeLabs/automock)
[![dependencies](https://img.shields.io/david/HBOCodeLabs/automock.svg)](https://david-dm.org/HBOCodeLabs/automock)

---

## Overview

Automock is a utility for unit testing. It automatically creates mock objects for your dependencies, so that you can isolate the code you're testing from your dependencies without having to mock up objects yourself. If you're familiar with [proxyquire](https://www.npmjs.com/package/proxyquire), automock should be easy to learn.

Automock atuomatically creates mock objects for dependencies by requiring them and then using the resulting exports to create the benign mock objects for your test. That process spares you the need to carefully stub out each function in the object manually. It also means that you don't have to worry about changing your mocked objects whenever your dependencies change&mdash;automock automatically represents the current state of your dependencies in its mock objects.

**Important**&nbsp;&nbsp;&nbsp;In order to create its mock objects, automock loads the dependencies you specify. That means that any side-effects of loading the required module will occur. You shouldn't generally encounter any problems from this, however, because modules should not be written to cause side-effects during loading. However, it's important to remember that everything is getting loaded, particularly if you encounter some unexpected behavior in your tests.

## Assumptions ##

Automock is designed to make unit testing easier and more reliable. It helps experienced developers get more out of their tests. This documentation assumes that you have a certain level of knowledge and experience with unit testing in JavaScript and Node.js, and that you are familiar with proxyquire and Jasmine, or similar unit testing tools.

## Usage ##
You can use automock in three basic ways:

-   [To automatically generate all mock objects](#to-automatically-generate-all-mock-objects)
-   [To selectively auto-generate some mock objects](#to-selectively-auto-generate-some-mock-objects)
-   [To customize automatically generated mock objects](#to-customize-automatically-generated-mock-objects)

You should generally be able to use `automock.require()` anywhere you
would use `proxyquire()`, but without needing to predefine your stubs.

### To automatically generate all mock objects ###

You can have automock create a mock object with all of the original's functionality mocked for you. The following example demonstrates the process for two simple dependencies using Jasmine. Each automock call is preceded by comments showing the equivalent calls when using proxyquire for manual definition.

```javascript
// var proxyquire = require('proxyquire');
var automock = require('automock');

// var mockUtil = jasmine.createSpyObj('util', ['format']);
// var mockOther = jasmine.createSpyObj('other-package', ['fn1', 'fn2', 'fn3']);
automock.setStubCreator(jasmine.createSpy);

// var myModule = proxyquire('../lib/my-module', {
//     'util': mockUtil,
//     'other-package': mockOther,
// });
var myModule = automock.require('../lib/my-module');

describe('my module', function() {

    it('doIt calls util.format once', function() {
        myModule.doIt();

        // expect(mockUtil.format.calls.count()).toBe(1);
        expect(myModule.__stubs__.util.format.calls.count()).toBe(1);
    });

    it('doOther calls other-package functions', function() {
        myModule.doOther();

        // expect(mockOther.fn1.calls.count()).toBe(1);
        // expect(mockOther.fn2.calls.count()).toBe(1);
        // expect(mockOther.fn3.calls.count()).toBe(1);
        expect(myModule.__stubs__['other-package'].fn1.calls.count()).toBe(1);
        expect(myModule.__stubs__['other-package'].fn2.calls.count()).toBe(1);
        expect(myModule.__stubs__['other-package'].fn3.calls.count()).toBe(1);
    });
});
```

The basic procedure for using automock is demonstrated in the example:

1.  Call `setStubCreator`, passing the function that you want to use
    to create stubs for your mock objects. In the example, we used
    `jasmine.createSpy`, but you can use others. See
    [Choosing a stub creator](#choosing-a-stub-creator) for more information.
2.  Generate the mock object for each dependency by calling
    `automock.require` once for each, passing the path to the module
    as the input parameter.
3.  Access the stubs in your mock object, using its `__stubs__` member.

### To selectively auto-generate some mock objects ###

You can manually define stubs, or your can have automock skip certain parts of a dependency altogether (letting them "pass through").
If you do need to manually define stubs, or if you want certain parts
of your dependencies to pass through, you can do so:

```javascript
var automock = require('automock');
automock.setStubCreator(jasmine.createSpy);

var cryptoMock = /* ... hand-crafted mock of Node's 'crypto' module ... */ ;

var myModule = automock.require('../lib/my-module', {
    stubs: {
        // If you need manually-created stubs, list them here, using
        //  the same format as `proxyquire`.
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

Or, if your stubs can handle modification after-the-fact,
as Jasmine's do, you can modify them _after_ they are created, since they are
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

### To customize automatically generated mock objects ###

You can customize what happens when a stub is automaticaaly created by your chosen creator function. The following example demonstrates the process.

```javascript
var automock = require('automock');
automock.setStubCreator(spyCreator);

function spyCreator(name) {
    // Stubs are named for their dot-notation object path, starting
    //  with the module name.
    // Get/Set properties have "__get__" or "__set__" as the last part
    //  of their name.
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

// Assume `my-module` has a `require('some-dependency')` statement.
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

You can capture some or all of the functions in the dependency with the `switch` statement, but you should always include a `default` case that simply passes the name on to the stub generator.

## Low-level usage ##

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

## Choosing a stub creator ##

To have automock make mock objects for you, you need to tell it what
stub creator to use. You can use a creator function from a published
package, like `jasmine.createSpy`, which is used in the examples given
in this document, or you can use a custom function.

Whatever stub creator you use, it must take the path of the function
as its input parameter, and it must return the stub function. You may
use a creator that provides additional functionality, such as
generating "spy" stubs that track calls or add other functionality.

The principle of automock is, "use what you're using." You should be
able to use whatever stub creator you are already familiar with.

## Making a custom stub creator ##

You can create your own stub creator function to use with automock. As
with using an existing stub creator, you'll need to accept the name
(and path) of the function to be stubbed as the input parameter. Your
function must return the function stub.

One way to customize stub creation is to add functionality to the
stubs returned by an existing stub generator, as discussed in
[To customize automtically generated mock objects](#to-customize-automatically-generated-mock-objects).
