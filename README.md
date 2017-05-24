# zone

[![Build status](https://img.shields.io/travis/checle/zone/master.svg?style=flat-square)](https://travis-ci.org/checle/zone)

## Installation

Install this package using NPM:

    npm install @record/zone

## Examples

For a primer on zones, review the [Dart overview](https://www.dartlang.org/articles/libraries/zones).
For more on promises, check out this [Google Developers introduction](https://developers.google.com/web/fundamentals/getting-started/primers/promises).

## API

```typescript
interface Task {
  cancel?: Function
}

interface Zone implements EventTarget {
  // Current zone.
  static current: Zone

  // Custom optional ID.
  id: any

  // Number of pending tasks.
  size: number

  constructor (id?: any)

  // Add or modify custom tasks.
  add (task: Task, type?: string | symbol): number
  get (id: number | string | symbol, type?: string | symbol): any
  has (id: number | string | symbol, type?: string | symbol): boolean
  delete (id: number | string | symbol, type?: string | symbol): boolean
  cancel (id?: number | string | symbol, type?: string | symbol): void

  // Run function inside zone; promise resolves immediately when microtasks
  // have been worked off.
  async run (entry: Function, thisArg?: any, ...args: any[]): Promise<any>

  // Bind function to zone.
  bind <T extends Function> (fn: T): T
}

// Run an entry function, resolve the promise when all dependent tasks have
// finished or reject the promise and cancel pending tasks when an uncatched
// error is thrown by a task.
function operate (entry: Function): Function
```

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
