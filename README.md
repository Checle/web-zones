# zone

[![Build status](https://img.shields.io/travis/checle/zone/master.svg?style=flat-square)](https://travis-ci.org/checle/zone)

## Installation

Install using NPM:

    npm install @checle/zone

Import the `Zone` constructor:

```javascript
import {Zone} from '@checle/zone'
```

Optionally shim the standard API:

```javascript
import * as zone from '@checle/zone'

Object.assign(global, zone) // Overrides setTimeout, Promise and others
```

## API

```typescript
interface Zone implements EventTarget {
  // Current zone
  static current: Zone

  // Run an entry function and resolve the result when all dependent tasks have
  // finished or reject the result and cancel pending tasks when an uncatched
  // error is thrown by any task
  static exec (entry: Function): Function

  // Custom optional ID
  id: any

  // Number of pending tasks
  readonly size: number

  constructor (id?: any)

  // Add and manage custom tasks
  add (task: {cancel?: Function}, type?: string | symbol): number
  set (id: any, task: {cancel?: Function}, type?: string | symbol): this
  get (id: any, type?: string | symbol): any
  has (id: any, type?: string | symbol): boolean
  delete (id: any, type?: string | symbol): boolean

  // Cancels a task
  async cancel (id?: any, type?: string | symbol): void

  // Cancels all tasks
  async cancel (): void

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

## Examples

For a primer on zones, review the [Dart overview](https://www.dartlang.org/articles/libraries/zones).
For more on promises, check out this [Google Developers introduction](https://developers.google.com/web/fundamentals/getting-started/primers/promises).

### General concept

The example creates an tiny asynchronous application that reads a file making use of various JS APIs. The result is then awaited and its content printed.

```javascript
import {Zone} from '@checle/zone'
import * as zone from '@checle/zone'
import * as fs from 'fs'

// Install hooked functions such as setTimeout on the global object
Object.assign(global, zone)

// An application that does multiple unknown asynchronous operations
function application() {
  // Waits for 1 second to start a request
  setTimeout(readFile, 1000)

  function readFile () {
    // Read file asynchronously
    fs.readFile('data.txt', data => {
      global.fileContent = data
    })
  }
}

try {
  // Calls application and waits for all spawned tasks to terminate
  await Zone.exec(application)

  console.log('This file content has been read: ' + global.fileContent)
} catch (error) {
  console.log('Either setTimeout or fs.readFile threw an uncatched error')
}
```

### Terminate a zone from the outside

Cancels all pending tasks of a zone after a minute.

```javascript
await Zone.exec(application)

// Cancel all pending events after 1 minute
setTimeout(() => Zone.current.cancel(), 60000)

// If node is stalled due to pending tasks in the operating zone,
// zone.cancel() will unstall it.
```

### Instantiate a zone and listen for events

Creates a zone object and listens for status events.

```javascript
var zone = new Zone('custom-zone')

zone.addEventListener('finish', () => console.log('Zone has terminated'))
zone.addEventListener('error', error => console.log('Error occurred'))

zone.run(application)
```

### Extend zones

Adds custom properties to `Zone.current` using inheritance.

```javascript
let id = 0

class CustomEnvironment extends Zone {
  constructor () {
    super('custom-environment-' + (++id))

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

new CustomEnvironment().run(routine) // Prints the date
```

### Bind a function

Binds a function to a zone.

```javascript
function application () {
  console.log(Zone.current.id)
}

let zone = new Zone('cute-zone')

application = zone.bind(application)

application() // "cute-zone"
```

### Execute tasks parallely

Runs 4 zoned processes using [`Promise.all`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) and waits for them to finish. Cancels all zones if one zone throws an error.

```javascript
try {
  await Promise.all(
    Zone.exec(app1),
    Zone.exec(app2),
    Zone.exec(app3),
  )

  console.log('All tasks have concluded successfully')
} catch (error) {
  console.log('Some task has failed')

  Zone.current.cancel()
}
```

### Run untrusted code asynchronously

Runs code in a sandbox using NodeJS' [vm module](https://nodejs.org/api/vm.html) and prints the result.

```javascript
const vm = require('vm')

let sandbox = {print: console.log}

// Copies setTimeout, setInterval and Promise polyfills to the sandbox
Object.assign(sandbox, zone)

let applicationCode = `
  try {
    console.log("I'm not that secure, it seems.")
  } catch (error) {
    print('Or maybe I am!')
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

## License

MIT © 2016 ([see full text](./LICENSE))
