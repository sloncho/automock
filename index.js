'use strict';

var AutoMock = require('./lib/automock');

// In order to "magically" normalize path references in terms of our "requirer",
// we have to be sure to re-require this module every time.  To do so, we remove
// the reference to this module from Node's require cache...
delete require.cache[require.resolve(__filename)];

module.exports = new AutoMock(module.parent);
