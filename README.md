# zones

by Filip Dalüge

[![Build status](https://img.shields.io/travis/checle/zone/master.svg?style=flat-square)](https://travis-ci.org/checle/zone)

For a primer on zones in Dart, take a look at the [Dart article](https://www.dartlang.org/articles/libraries/zones). Find the complete API [here](#api).

## Installation

Install using NPM:

    npm install --save web-zones

Import zones:

```javascript

import * as zones from 'web-zones'

Object.assign(global, zones) // Optionally, shim the host API (overrides setTimeout, Promise etc.)
```

## Usage

Wait for operations
```javascript
await Zone.exec(applicationFunction)
```
Listen to state
```javascript
Zone.current.addEventListener('error', listener)
```
Cancel pending operations
```javascript
Zone.current.cancel()
```
Bind function
```javascript
func = Zone.current.bind(func)
```
Number of scheduled tasks
```javascript
Zone.current.size
```

## Examples

* [Instantiate a zone and listen for events](#instantiate-a-zone-and-listen-for-events)
* [Execute tasks parallely](#execute-tasks-parallely)
* [Asynchronous operations](#asynchronous-operations)
* [Extend zones](#extend-zones)
* [Override run()](#override-run)
* [Run untrusted code asynchronously](#run-untrusted-code-asynchronously)

### Instantiate a zone and listen for events

Create a zone object and listen for status events.

```javascript
var zone = new Zone('custom-zone')

zone.addEventListener('finish', () => console.log('Zone has terminated'))
zone.addEventListener('error', error => console.log('Error occurred'))

zone.run(application)
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
  await Zone.exec(application)

  console.log('This file content has been read: ' + global.fileContent)
} catch (error) {
  console.log('Either setTimeout or fs.readFile threw an uncatched error')
}
```

### Execute tasks parallely

Run three processes using [`Promise.all`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) and wait for them to finish. Cancel any other zones if one zone throws an error.

```javascript
try {
  await Promise.all(
    Zone.exec(app1),
    Zone.exec(app2),
    Zone.exec(app3),
  )

  console.log('All tasks have concluded successfully')
} catch (error) {
  console.log('One zone errored')

  // Cancel all remaining zones
  Zone.current.cancel()
}
```

### Extend zones

Add custom properties to `Zone.current` by inheritance.

```javascript
class CustomEnvironment extends Zone {
  constructor () {
    super('custom-environment')

    this.created = Date.now()
  }
}

function routine () {
  if (Zone.current instanceof CustomEnvironment) {
    console.log('My environment was created at ' + this.created)
  } else {
    console.log("I think I've been running forever")
  }
}

Zone.current.run(routine) // "I think I've been running forever"

new CustomEnvironment().run(routine) // Prints the creation date
```

### Override run()

You can hook into zone operations overriding `run()`.

```javascript
class MozillaZone extends Zone {
  async run (func) {
    let previousDomain = global.domain

    try {
      global.domain = 'mozilla.org' // Switch global domain during run()

      return await super.run(func)
    } finally {
      global.domain = previousDomain // Restore global domain
    }
  }
}

global.domain = 'example.com'

new MozillaZone().run(() => console.log(global.domain)) // "mozilla.org"

Zone.current.run(() => console.log(global.domain)) // "example.com"
```

### Run untrusted code asynchronously

Run code in a sandbox using NodeJS' [vm module](https://nodejs.org/api/vm.html) and print the result.

```javascript
const vm = require('vm')

// Create a sandbox global object
let sandbox = {print: console.log}

// Copies setTimeout, setInterval and Promise polyfills to the sandbox
Object.assign(sandbox, zone)

let applicationCode = `
  if (typeof console !== 'undefined') {
    console.log("I'm not that secure, it seems.")
  } else {
    print('Oh yes, I am.')
  }
`

try {
  // Use exec with vm to run a program in an isolated environment
  let result = await Zone.exec(() => vm.runInNewContext(applicationCode, sandbox))

  console.log('Terminated successfully with result', result)
} catch (error) {
  console.log('An error occurred')
)
```

## API

```typescript
interface Zone implements EventTarget {
  static current: Zone // Current zone

  // Run an entry function and resolve the result when all dependent tasks have
  // finished or reject the result and cancel pending tasks when an uncatched
  // error is thrown by any task
  static exec (entry: Function): Function

  readonly id: any // Optional ID
  readonly size: number // Number of pending tasks

  constructor (id?: any, spec?: any)

  // Add and manage custom tasks
  add (task: {cancel?: Function}, type?: string | symbol): number
  set (id: any, task: {cancel?: Function}, type?: string | symbol): this
  get (id: any, type?: string | symbol): any
  has (id: any, type?: string | symbol): boolean
  delete (id: any, type?: string | symbol): boolean

  async cancel (id?: any, type?: string | symbol): void // Cancel a task
  async cancel (): void // Cancel all in current and child zones

  // Run function inside zone; promise resolves immediately when microtasks
  // have been worked off
  async run (entry: Function, thisArg?: any, ...args: any[]): any

  // Bind function to zone
  bind (fn: Function): Function

  // Add event listeners
  addEventListener(type: 'finish' | 'error', listener: Function, options: any): void
}

// Zone-supporting standard API
function setTimeout (handler, timeout, ...args)
function setInterval (handler, timeout, ...args)
function clearTimeout (id)
function clearInterval (id)
function Promise (executor)
```

## License

MIT © 2016 Filip Dalüge ([license](./LICENSE))
