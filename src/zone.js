import EventTarget from 'event-target-shim'

const DEFAULT = Symbol('DEFAULT')
const PARENT = Symbol('PARENT')
const SCHEDULES = Symbol('SCHEDULES')
const SIZE = Symbol('SIZE')

let currentCall

function createCustomEvent (type, detail) {
  return typeof CustomEvent === 'undefined' ? {type, detail} : new CustomEvent(type, detail)
}

function callScheduleMethod (zone, name, type, args) {
  let schedules = zone[SCHEDULES]
  let schedule = schedules.hasOwnProperty(type) ? schedules[type] : (schedules[type] = new Schedule())

  return schedule[name](...args)
}

class Schedule extends Map {
  length = 0

  add (task) {
    let id = this.length

    this.set(id, task)

    return id
  }

  set (id, task) {
    if (id > this.length - 1) this.length = id + 1

    if (this.has(id)) throw new ReferenceError('Task with equal ID exists')

    return super.set(id, task)
  }

  delete (id) {
    if (!super.delete(id)) throw new ReferenceError('Task not found')

    while (!this.has(this.length) && this.length > 0) this.length--
  }

  cancel (id = undefined) {
    if (id === undefined) {
      let results = []

      for (let id of Objects.getOwnPropertyNames(this)) {
        results.push(this.cancel(id))
      }

      return Promise.all(results)
    } else {
      let task = this.get(id)

      this.delete(id)

      if (task != null && typeof task.cancel === 'function') {
        return task.cancel()
      }
    }
  }
}

export class Zone extends EventTarget {
  static exec (entry) {
    let zone = new Zone()
    let promise = zone.run(entry)

    if (!zone.size) return promise

    return new Promise((resolve, reject) => {
      zone.addEventListener('finish', () => resolve())
      zone.addEventListener('error', error => reject(error))
    })
  }

  static current = new Zone()

  constructor (spec = {}) {
    super()

    if (typeof spec === 'object') Object.assign(this, spec)
    else this.id = spec

    this[PARENT] = Zone.current
    this[SCHEDULES] = {}
    this[SIZE] = 0
  }

  get size () {
    return this[SIZE]
  }

  add (task, type = DEFAULT) {
    return callScheduleMethod(this, 'add', type, arguments)
  }

  set (id, task, type = DEFAULT) {
    callScheduleMethod(this, 'set', type, arguments)

    // Register zone as a parent task when first task is started
    if (this[SIZE] === 0 && this[PARENT]) {
      this[PARENT].set(this, this)
    }

    this[SIZE]++

    return this
  }

  get (id, type = DEFAULT) {
    return callScheduleMethod(this, 'get', type, arguments)
  }

  has (id, type = DEFAULT) {
    return callScheduleMethod(this, 'has', type, arguments)
  }

  delete (id, type = DEFAULT) {
    callScheduleMethod(this, 'delete', type, arguments)

    this[SIZE]--

    if (this[SIZE] === 0) {
      // Unregister parent task when the zone has finished
      if (this[PARENT]) this[PARENT].delete(this)

      this.dispatchEvent(createCustomEvent('finish'))
    }

    return true
  }

  async cancel (id = undefined, type = DEFAULT) {
    try {
      let schedules = this[SCHEDULES]

      if (id === undefined) {
        let types = Object.getOwnPropertyNames(this)
        let results = []

        for (let type of types) results.push(schedules[type].cancel())

        await Promise.all(results)
      } else {
        let schedule = schedules.hasOwnProperty(type) ? schedules[type] : (schedules[type] = new Schedule())

        return schedule.cancel(id)
      }
    } catch (error) {
      this.dispatchEvent(createCustomEvent('error', error))
    }
  }

  async run (entry, thisArg = null, ...args) {
    if (arguments.length > 1) return this.run(() => entry.apply(thisArg, args))

    let lastZone = Zone.current
    let call = Symbol()
    let lastCall = currentCall

    Zone.current = this
    currentCall = call

    try {
      return entry()
    } finally {
      await Promise.resolve()

      if (currentCall !== call) {
        throw new ReferenceError('Unexpected interleaved task')
      }

      Zone.current = lastZone
      currentCall = lastCall
    }
  }

  bind (fn) {
    let zone = this

    return function () {
      return zone.run(() => fn.apply(this, arguments))
    }
  }
}

export default Zone
