import Zone from './zone.js'

let NativePromise = global.Promise
let clearNativeInterval = global.clearInterval
let clearNativeTimeout = global.clearTimeout
let setNativeInterval = global.setInterval
let setNativeTimeout = global.setTimeout

function getHandler (handler, ...args) {
  let evaluate = eval

  if (typeof handler === 'function') return handler.bind(null, ...args)
  else return () => evaluate(handler)
}

export function setTimeout (handler, timeout, ...args) {
  var id

  let zone = global.zone
  let fn = zone.bind(getHandler(handler, ...args))

  let task = {
    type: 'timer',
    id: setNativeTimeout(() => {
      try {
        return fn()
      } finally {
        zone.removeTask(id, 'timer')
      }
    }, timeout),
    cancel: () => clearNativeTimeout(task.id),
  }

  return (id = zone.addTask(task))
}

export function setInterval (handler, timeout, ...args) {
  let zone = global.zone
  let fn = zone.bind(getHandler(handler, ...args))

  let task = {
    type: 'timer',
    id: setNativeInterval(fn, timeout),
    cancel: () => clearNativeInterval(task.id),
  }

  return zone.addTask(task)
}

export function clearTimeout (id) {
  let task = zone.getTask(id)

  if (task && task.type === 'timer') zone.cancelTask(id)
}

export var clearInterval = clearTimeout

/*
export function Promise (executor) {
  if (!new.target) return NativePromise.apply(this, arguments)

  return new NativePromise((resolve, reject) => executor(zone.bind(resolve), zone.bind(reject)))
}

Object.defineProperties(Promise, Object.getOwnPropertyDescriptors(NativePromise))
*/