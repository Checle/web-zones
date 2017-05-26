# web-zones

by Filip Dalüge

[![Build status](https://img.shields.io/travis/checle/web-zones/master.svg?style=flat-square)](https://travis-ci.org/checle/web-zones)

For a primer on zones in Dart, take a look at the [Dart article](https://www.dartlang.org/articles/libraries/zones). Find the complete API [here](#api).

## Installation

Install using NPM:

    npm install --save web-zones

Import zones:

```javascript

import {Zone} from 'web-zones'
```

## Usage

Current zone
```javascript
global.zone
```
Wait for operations spawned by a function
```javascript
await zone.exec(initAppFunction)
```
Listen to state
```javascript
zone.addEventListener('error', listener)
```
Cancel pending operations
```javascript
zone.cancel()
```
Bind function
```javascript
func = zone.bind(func)
```
Activity state
```javascript
zone.tasks.size > 0 ? 'active' : 'inactive'
```
Terminate the whole script
```javascript
zone.rootZone.cancel()
```

## Examples

* [Instantiate a zone and listen for events](#instantiate-a-zone-and-listen-for-events)
* [Execute tasks parallely](#execute-tasks-parallely)
* [Asynchronous operations](#asynchronous-operations)
* [Extend zones](#extend-zones)
* [Execution contexts](#execution-contexts)
* [Run untrusted code asynchronously](#run-untrusted-code-asynchronously)

### Instantiate a zone and listen for events

Create a zone object and listen for status events.

```javascript
var zone = new Zone('custom-zone')

zone.addEventListener('finish', () => console.log('Zone has terminated'))
zone.addEventListener('error', error => console.log('Error occurred'))

function application () {
  setTimeout(() => null, 1000)
}

zone.run(application) // Prints "Zone has terminated" after one second
```

### Asynchronous operations

Run an application that reads a file making use of asynchronous JS APIs. The result is then awaited, and its content printed.

```javascript
import * as fs from 'fs'

// Application with unknown asynchronous operations
function application() {
  // Waits for a second
  setTimeout(readFile, 1000)

  function readFile () {
    // Read asynchronously
    fs.readFile('data.txt', data => {
      global.fileContent = data
    })
  }
}

try {
  // Call and wait for spawned tasks to terminate
  await global.zone.exec(application)

  console.log('This file content has been read: ' + global.fileContent)
} catch (error) {
  console.log('Either setTimeout or fs.readFile threw an uncatched error')
}
```

### Execute tasks parallely

Run three processes using [`Promise.all`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) and wait for them to finish. Cancel any other zones if one zone throws an error.

```javascript
try {
  await Promise.all([
    zone.exec(app1),
    zone.exec(app2),
    zone.exec(app3),
  ])

  console.log('All tasks have concluded successfully')
} catch (error) {
  console.log('One zone errored:', error)

  // Cancel all remaining zones
  zone.cancel()
}
```

### Extend zones

Add custom properties to `zone` by inheritance.

```javascript
class CustomEnvironment extends Zone {
  constructor () {
    super('custom-environment')

    this.created = Date.now()
  }
}

function routine () {
  if (global.zone instanceof CustomEnvironment) {
    console.log('My environment was created at ' + global.zone.created)
  } else {
    console.log("I think I've been running forever")
  }
}

global.zone.run(routine) // "I think I've been running forever"

new CustomEnvironment().run(routine) // Prints the creation date
```

### Execution contexts

You can hook into `run` operations by setting `onenter` and `onleave` handlers. You might also override `zone.run()`, however, this would loose the context on `async` functions.

```javascript
class MozillaZone extends Zone {
  onenter () {
    zone.currentGlobalDomain = global.domain
    global.domain = 'mozilla.org'
  }

  onleave () {
    global.domain = zone.currentGlobalDomain
    delete zone.currentGlobalDomain
  }
}

global.domain = 'example.com'

new MozillaZone().run(() => console.log(global.domain)) // "mozilla.org"

global.zone.run(() => console.log(global.domain)) // "example.com"
```

### Run untrusted code asynchronously

Run code in a sandbox using NodeJS' [vm module](https://nodejs.org/api/vm.html) and print the result.

```javascript
const vm = require('vm')

// Create sandbox
let sandbox = {
  setTimeout,
  setInterval,
  setImmediate,
  print: console.log
}

let applicationCode = `
  if (typeof console !== 'undefined') {
    console.log("I'm not that secure, it seems.")
  } else {
    print('Oh yes, I am.')
  }
`

try {
  // Use exec with vm to run a program in an isolated environment
  let result = await zone.exec(() => vm.runInNewContext(applicationCode, sandbox))

  console.log('Terminated successfully with result', result)
} catch (error) {
  console.log('An error occurred')
)
```

## API

```typescript
zone: Zone // Get the current zone

interface Task {
  type?: string
  cancel?: Function
}

interface Zone extends Node {
  onerror?: Function // Error event, invoked on each error, bubbles upwards
  onfinish?: Function // Finish event, invoked each time the task list becomes empty
  onenter?: Function // Enter context
  onleave?: Function // Leave context

  readonly name: any // Optional name, e.g., for debugging
  readonly tasks: Map<any, Task> // Pending tasks
  readonly children: Zone[] // Associated children, modifiable by the DOM
  readonly rootZone: Zone // Root zone - all error events bubble towards this zone

  constructor (nameOrSpec?: any)

  // Add and manage custom tasks
  addTask (task: Task): number
  setTask (id: any, task: Task): this
  getTask (id: any): Task
  hasTask (id: any): boolean
  removeTask (id: any): boolean
  cancelTask (id: any): Promise<void>

  // Run function inside zone
  run (entry: Function, thisArg?: any, ...args: any[]): Promise<any>
  // Bind function to zone
  bind (fn: Function): Function
  // Cancels all child zones and pending tasks
  cancel (): Promise<void> 
  // Spawns a new child zone, runs `entry` in it and resolves when all new tasks have been worked off
  exec (entry: Function, thisArg?: any, ...args: any[]): Promise<any>
  // Shortcut to create and append a new child zone
  spawn (nameOrSpec?: any): Zone

  // Add event listeners
  addEventListener (type: 'finish' | 'error', listener: Function, options: any): void
  // Modify the DOM - affects which children will be cancelled on `cancel()` and where 'error' events will bubble to
  appendChild (node: Zone): this
}

// Zone-enabled standard API
function setTimeout (handler, timeout, ...args)
function setInterval (handler, timeout, ...args)
function clearTimeout (id)
function clearInterval (id)
function Promise (executor)
```

## License

MIT © 2016 Filip Dalüge ([license](./LICENSE))
