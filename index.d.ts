interface ZoneOptions { }

interface Task {
  cancel?: Function
}

declare class Zone extends EventTarget {
  static current: Zone

  id: any
  size: number

  constructor (id?: any, options?: ZoneOptions)

  add (task: Task, type?: string | symbol): number
  get (id: number | string | symbol, type?: string | symbol): any
  has (id: number | string | symbol, type?: string | symbol): boolean
  delete (id: number | string | symbol, type?: string | symbol): boolean
  cancel (id?: number | string | symbol, type?: string | symbol): void
  run <T extends Function> (entry: (...args) => T, thisArg?: any, ...args: any[]): Promise<T>
  bind (fn: Function): Function
}

declare function operate <T> (entry: (...args) => T): Promise<T>
