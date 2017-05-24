import EventTarget from 'event-target-shim'

const DEFAULT = ''
const PARENT = Symbol('PARENT')
const SCHEDULES = Symbol('SCHEDULES')
const PREVIOUS = Symbol('PREVIOUS')
const SIZE = Symbol('SIZE')

let Promise = global.Promise
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

  set (id, task) {
    if (this.has(id)) throw new ReferenceError('Task with equal ID exists')
    if (id > this.length - 1) this.length = id + 1

    super.set(id, task)

    return this
  }

  delete (id) {
    let result = super.delete(id)

    while (this.length && !this.has(this.length - 1)) this.length--

    return result
  }

  cancel (id = undefined) {
    if (id === undefined) {
      let results = []

      for (let id of this.keys()) {
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
    let zone = new Zone("<exec>")
    let promise = zone.run(entry)

    if (!zone.size) return promise

    return new Promise((resolve, reject) => {
      zone.addEventListener('finish', () => resolve())
      zone.addEventListener('error', event => reject(event.detail))
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
    let schedules = this[SCHEDULES]
    let id = schedules.hasOwnProperty(type) ? schedules[type].length : 0

    this.set(id, task, type)

    return id
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
        let types = Object.getOwnPropertyNames(schedules)
        let results = []

        for (let type of types) {
          results.push(schedules[type].cancel())
        }

        await Promise.all(results)
      } else {
        let schedule = schedules.hasOwnProperty(type) ? schedules[type] : (schedules[type] = new Schedule())

        return schedule.cancel(id)
      }
    } catch (error) {
      this.dispatchEvent(createCustomEvent('error', error))
    }
  }

  run (entry, thisArg = null, ...args) {
    let call, lastZone, lastCall
    let enter = () => (lastZone = Zone.current, Zone.current = this, lastCall = currentCall, call = {})
    let leave = () => (Zone.current = lastZone, currentCall = lastCall)

    try {
      enter()
      Promise.resolve().then(() => enter)

      return entry.apply(this, args)
    } catch (error) {
      this.dispatchEvent(createCustomEvent('error', error))
    } finally {
      leave()
      Promise.resolve().then(() => leave)
    }
  }

  bind (fn) {
    let zone = this

    return function bound () {
      return zone.run(fn, this, ...arguments)
    }
  }
}

export default Zone
