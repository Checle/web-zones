/// <reference path='node_modules/@types/core-js/index.d.ts' />

declare var zone: Zone

declare module NodeJS  {
  interface Global {
    zone: Zone
  }
}

interface Task extends Event {
  cancel?: Function
}

interface Zone extends EventTarget, Node {
  onerror?: Function
  onfinish?: Function
  onenter?: Function
  onleave?: Function

  readonly name: string
  readonly tasks: Map<any, Task>
  readonly children: Zone[]
  readonly rootZone: Zone

  constructor (nameOrSpec?: any)

  addTask (task: Task): number
  setTask (id: any, task: Task): this
  getTask (id: any): Task
  hasTask (id: any): boolean
  removeTask (id: any): boolean
  cancelTask (id: any): Promise<void>

  run <T> (entry: (...args) => T, thisArg?: any, ...args: any[]): Promise<T>
  exec <T> (entry: (...args) => T, thisArg?: any, ...args: any[]): Promise<T>
  bind <T> (fn: (...args) => T): (...args) => Promise<T>
  cancel (): Promise<void>
  spawn (nameOrSpec?: any): Zone
}

declare module '@checle/zone' {
  function setTimeout (handler, timeout, ...args)
  function setInterval (handler, timeout, ...args)
  function clearTimeout (id)
  function clearInterval (id)
  function Promise (executor)
}
