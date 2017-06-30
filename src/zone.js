import {CustomEvent, DOMException, Node} from './dom.js'

const LENGTH = Symbol('LENGTH')

let Promise = global.Promise
let setTimeout = global.setTimeout
let currentZone
let currentOperation
let lastZones = []

function dispatchEvent (zone, type, init = {}) {
  let event = new CustomEvent(type, init)
  let handler = zone['on' + type]

  zone.dispatchEvent(event)

  if (typeof handler === 'function') handler.call(zone, event)

  return !event.defaultPrevented
}

function defineProperty (object, name, value, writable = false, configurable = true) {
  Object.defineProperty(object, name, {value, writable, configurable})
}

class TaskMap extends Map {
  constructor () {
    super()

    this[LENGTH] = 0
  }

  get length () {
    return this[LENGTH]
  }

  set (id, task) {
    if (this.has(id)) throw new ReferenceError('Task with equal ID exists')
    if (id > this[LENGTH] - 1) this[LENGTH] = id + 1

    super.set(id, task)

    return this
  }

  delete (id) {
    let result = super.delete(id)

    while (this[LENGTH] && !this.has(this[LENGTH] - 1)) this[LENGTH]--

    return result
  }
}

export class Zone extends Node {
  constructor (nameOrSpec = null) {
    super()

    if (typeof nameOrSpec === 'object') Object.assign(this, nameOrSpec)
    else this.name = nameOrSpec

    defineProperty(this, 'tasks', new TaskMap())
  }

  get nodeName () {
    return this.name == null ? '#zone' : String(this.name)
  }

  get children () {
    return this.childNodes
  }

  append (...nodes) {
    for (let node of nodes) this.appendChild(node)
  }

  get rootZone () {
    return this.parentNode instanceof Zone ? this.parentNode.rootZone : this
  }

  insertBefore (node, child) {
    if (!(node instanceof Zone)) throw new DOMException('Child is not a zone', 'TypeError')

    return super.insertBefore(node, child)
  }

  appendChild (node) {
    return this.insertBefore(node, null)
  }

  addTask (task) {
    let tasks = this.tasks
    let id = tasks[LENGTH]

    this.setTask(id, task)

    return id
  }

  setTask (id, task) {
    this.tasks.set(id, task)

    return this
  }

  getTask (id) {
    return this.tasks.get(id)
  }

  hasTask (id) {
    return this.tasks.has(id)
  }

  removeTask (id) {
    if (!this.tasks.delete(id)) return

    if (this.tasks.size === 0) {
      dispatchEvent(this, 'finish')
    }

    return true
  }

  cancelTask (id) {
    let task = this.tasks.get(id)

    this.removeTask(id)

    if (task != null && typeof task.cancel === 'function') {
      return task.cancel()
    }
  }

  async cancel () {
    let results = []

    for (let id of this.tasks.keys()) {
      results.push(this.cancelTask(id))
    }

    for (let child of this.children) {
      results.push(child.cancel())
    }

    await Promise.all(results)
  }

  bind (fn) {
    let zone = this

    function bound () {
      return zone.run(fn, this, ...arguments)
    }

    Object.defineProperty(bound, 'name', {value: 'bound ' + fn.name})

    return bound
  }

  run (entry, thisArg = undefined, ...args) {
    try {
      if (currentZone === this) return entry.apply(this, args)

      this.enter()

      try {
        return entry.apply(this, args)
      } finally {
        this.leave()
      }
    } catch (error) {
      if (dispatchEvent(this, 'error', {detail: error, bubbles: true})) {
        console.error(error)
        this.cancel()
      }
    } finally {
      if (this.tasks.size === 0) {
        dispatchEvent(this, 'finish')
      }
    }
  }

  enter () {
    lastZones.push(currentZone)

    if (typeof this.onenter === 'function') this.onenter()

    currentZone = this
  }

  leave () {
    currentZone = lastZones.pop()

    if (typeof this.onleave === 'function') this.onleave()
  }

  exec (entry, thisArg = undefined, ...args) {
    return new Promise((resolve, reject) => {
      let child = this.spawn(entry.name)
      let promise = child.run(...arguments)

      if (!child.tasks.size) return resolve(promise)

      child.onfinish = () => resolve()
      child.onerror = event => (event.preventDefault(), reject(event.detail))
    })
  }

  spawn (nameOrSpec = null) {
    return this.appendChild(new Zone(nameOrSpec))
  }
}

Object.assign(Zone.prototype, {
  onfinish: null,
  onerror: null,
  onenter: null,
  onexit: null,
})

export default Zone

currentZone = new Zone()

Object.defineProperty(global, 'zone', {get: () => currentZone, enumerable: true})
