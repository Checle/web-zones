# zone

[![Build status](https://img.shields.io/travis/checle/zone/master.svg?style=flat-square)](https://travis-ci.org/checle/zone)

## Installation

Install this package using NPM:

    npm install @record/zone

## Examples

For a primer on zones, review the [Dart](https://www.dartlang.org/articles/libraries/zones) overview.
For more on promises, check out this [Google Developers](https://developers.google.com/web/fundamentals/getting-started/primers/promises) introduction.

### General concept

```javascript
const exec = require('@record/zone').exec;
const fs = require('fs');

var fileContent = null;

// An application that does multiple unknown asynchronous operations
function application() {
  function readFile () {
    // Read file asynchronously
    fs.readFile('data.txt', function callback (data) {
      fileContent = data;
    });
  }
  // Wait for 1 second and then start a request
  setTimeout(readFile, 1000);
}

exec(application).then(
  function () {
    console.log('This file content has been read: ' + fileContent);
  }
).catch(
  function (error) {
    console.log('Either setTimeout or fs.readFile threw an uncatched error');
  }
);
```

### Run untrusted code asynchronously

```javascript
const vm = require('vm');

var sandbox = {
  setTimeout,
  setInterval,
  setImmediate,
  print: console.log
};

// Use exec with vm to run a program in an isolated environment
exec(
  function () {
    vm.runInNewContext(applicationCode, sandbox);
  }
).then(
  function () { console.log('Terminated successfully'); }
).catch(
  function (error) { console.log('An error occurred'); }
);
```

### Terminate a zone from outside

```javascript
var zone = exec(application);

// Cancel all pending events after 1 minute

setTimeout(function () {
  zone.cancel();
}, 60000);

// If node is stalling due to pending tasks in the operating zone,
// zone.cancel() will unstall it.
```

### Execute zones parallely

```javascript
Promise.all(
  exec(app1),
  exec(app2),
  exec(app3)
).then(
  function() { console.log('All tasks have concluded successfully'); }
).catch(
  function() { console.log('An error occurred'); }
);
```

### Non-blocking mode

```javascript
// Run a huge number of untrusted applications in non-blocking mode
for (var i = 0; i < applications.length; i++) {
  exec(applications[i], { blocking: false });
}

function application () {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "data.txt", false);
  } catch (error) {
    console.log(error); // Error: No permission to execute the synchronous system operation XMLHttpRequest.prototype.open()
  }

  try {
    var xhr = fs.readfileSync('data.txt');
  } catch (error) {
    console.log(error); // Error: No permission to execute the synchronous system operation fs.readFileSync()
  }
}

exec(application, { blocking: false });
```

## License

MIT © 2016 ([see full text](./LICENSE))
