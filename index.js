'use strict';

var Mocker = require('./lib/mocker');

// In order to "magically" normalize path references in terms of our "requirer",
// we have to be sure to re-require this module every time.  To do so, we remove
// the reference to this module from Node's require cache...
delete require.cache[require.resolve(__filename)];

var parent = module.parent;

module.exports = {
    mocker: new Mocker(module.parent),
};
