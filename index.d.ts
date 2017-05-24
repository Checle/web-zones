declare module '@checle/zone' {
  interface ZoneOptions { }

  interface Task {
    cancel?: Function
  }

  class Zone extends EventTarget {
    static current: Zone

    static exec <T> (entry: (...args) => T): Promise<T>

    id: any
    readonly size: number

    constructor (id?: any, options?: ZoneOptions)

    add (task: Task, type?: string | symbol): number
    set (id: any, task: Task, type?: string | symbol): this
    get (id: any, type?: string | symbol): Task
    has (id: any, type?: string | symbol): boolean
    delete (id: any, type?: string | symbol): boolean
    cancel (id?: any, type?: string | symbol): Promise<void>
    run <T> (entry: (...args) => T, thisArg?: any, ...args: any[]): T
    bind (fn: Function): Function
  }

  function setTimeout (handler, timeout, ...args)
  function setInterval (handler, timeout, ...args)
  function clearTimeout (id)
  function clearInterval (id)
  function Promise (executor)
}
