import Zone from './zone.js'

let NativePromise = Promise
let clearNativeInterval = global.clearInterval
let clearNativeTimeout = global.clearTimeout
let setNativeInterval = global.setInterval
let setNativeTimeout = global.setTimeout

function getHandler (handler, ...args) {
  if (typeof handler === 'function') return handler.bind(null, ...args)
  else return () => eval(handler)
}

export function setTimeout (handler, timeout, ...args) {
  var id

  let zone = Zone.current
  let fn = zone.bind(getHandler(handler, ...args))

  let task = {
    id: setNativeTimeout(() => zone.delete(id, 'timer') && fn(), timeout),
    cancel: () => zone.has(id, 'timer') && clearNativeTimeout(task.id),
  }

  return (id = zone.add(task, 'timer'))
}

export function setInterval (handler, timeout, ...args) {
  let zone = Zone.current
  let fn = zone.bind(getHandler(handler, ...args))

  let task = {
    id: setNativeInterval(fn, timeout),
    cancel: () => zone.has(id, 'timer') && clearNativeInterval(task.id),
  }

  return zone.add(task, 'timer')
}

export function clearTimeout (id) {
  Zone.current.cancel(id, 'timer')
}

export function clearInterval (id) {
  Zone.current.cancel(id, 'timer')
}

export function Promise (executor) {
  if (!new.target) return NativePromise.apply(this, arguments)

  let zone = Zone.current

  return new NativePromise((resolve, reject) => executor(zone.bind(resolve), zone.bind(reject)))
}

Object.defineProperties(Promise, Object.getOwnPropertyDescriptors(NativePromise))
