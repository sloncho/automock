# automock

A Node.js automatic mocking tool.

[![npm version](https://img.shields.io/npm/v/automock
.svg)](https://travis-ci.org/HBOCodeLabs/automock)
[![build status](https://img.shields.io/travis/HBOCodeLabs/automock/master.svg)](https://travis-ci.org/HBOCodeLabs/automock)
[![code coverage](https://img.shields.io/codecov/c/github/HBOCodeLabs/automock.svg)](https://travis-ci.org/HBOCodeLabs/automock)
[![dependencies](https://img.shields.io/david/HBOCodeLabs/automock.svg)](https://travis-ci.org/HBOCodeLabs/automock)

---

## Overview

There are some really good unit testing tools like `proxyquire` that can help isolate your code from external dependencies.  The only downside is that you have to implement any mocked dependencies yourself.  Further, it's very easy to use a partially-mocked implementation which breaks when the dependency itself changes.

`automock` attempts to solve these problems by automatically creating lookalike exports with all functionality stubbed out.

## Usage

## Examples
