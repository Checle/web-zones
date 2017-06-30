const CHILDREN = Symbol('CHILDREN')
const LISTENERS = Symbol('LISTENERS')
const PARENT = Symbol('PARENT')

export class DOMException extends Error {
  constructor (message = '', name) {
    super(message)

    this.name = name
  }
}

export class Event {
  constructor (type, init = {}) {
    let {cancelable = false, bubbles = false} = init

    Object.assign(this, {type, cancelable, bubbles})
  }

  preventDefault () {
    this.defaultPrevented = true
  }
}

Object.assign(Event.prototype, {
  defaultPrevented: false,
})

export class CustomEvent extends Event {
  constructor (type, init = {}) {
    super(type, init)

    let {detail = null} = init

    this.detail = detail
  }
}

export class EventTarget {
  constructor () {
    this[LISTENERS] = {}
  }

  addEventListener (type, callback) {
    if (!this[LISTENERS].hasOwnProperty(type)) {
      this[LISTENERS][type] = []
    }

    this[LISTENERS][type].push(callback)
  }

  removeEventListener (type, callback) {
    if (!this[LISTENERS].hasOwnProperty(type)) return

    let stack = this[LISTENERS][type]

    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback){
        stack.splice(i, 1)

        break
      }
    }
  }

  dispatchEvent (event) {
    event.currentTarget = this

    if (!this[LISTENERS].hasOwnProperty(event.type)) {
      return true
    }

    let stack = this[LISTENERS][event.type]

    event.target = this

    for (let i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, event)
    }

    return !event.defaultPrevented
  }
}

export class Node extends EventTarget {
  constructor () {
    super()

    this[CHILDREN] = []
    this[PARENT] = null
  }

  get childNodes () {
    return Object.freeze(this[CHILDREN].slice())
  }

  get parentNode () {
    return this[PARENT]
  }

  dispatchEvent (event) {
    let result = super.dispatchEvent(event)

    if (event.bubbles && this[PARENT]) {
      return this[PARENT].dispatchEvent(event)
    }

    return result
  }

  removeChild (child) {
    if (child.parentNode !== this) throw new DOMException('Not a child', 'NotFoundError')

    let index = this[CHILDREN].indexOf(child)

    this[CHILDREN] = this[CHILDREN].splice(index, 1)
    node[PARENT] = null

    return child
  }

  insertBefore (node, child) {
    if (child != null && child.parentNode !== this) throw new DOMException('Not a child', 'NotFoundError')
    if (node.parentNode) node.parentNode.removeChild(node)

    let children = this[CHILDREN]

    if (child != null) {
      this[CHILDREN] = children.splice(children.indexOf(child), 0, node)
    } else {
      children.push(node)
    }

    node[PARENT] = this

    return node
  }

  appendChild (node) {
    return this.insertBefore(node)
  }
}
