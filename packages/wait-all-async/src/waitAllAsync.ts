import {Patcher} from './Patcher'

function canRemoveHttpRequest(this: XMLHttpRequest) {
    return this.readyState === XMLHttpRequest.DONE
}

export interface WaitAllAsyncOptions {
    timeout?: number
    target?: Object
}

function convert<T>(promise: Promise<T>, props?: Object) {
    (promise as any).__proto__ = PromiseSubclass.prototype
    return props ? Object.assign(promise, props) : promise
}

const PromiseSubclass: any = function PromiseSubclass<T>(
    cb: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void
) {
    return convert(new Promise(cb))
}
PromiseSubclass.prototype = Object.create(Promise.prototype)
PromiseSubclass.prototype.constructor = PromiseSubclass
const oldThen = Promise.prototype.then
PromiseSubclass.prototype.then = function then(resolve, reject) {
    return convert(oldThen.call(this, resolve, reject))
}

export function waitAllAsync(opts: WaitAllAsyncOptions = {}): Promise<void> {
    const target = opts.target as any
    if (!target.fetch) target.fetch = fetch
    if (!target.Promise) target.Promise = Promise
    if (!target.XMLHttpRequest) target.XMLHttpRequest = XMLHttpRequest
    if (!target.setTimeout) target.setTimeout = setTimeout
    if (!target.clearTimeout) target.clearTimeout = clearTimeout
    if (!target.requestAnimationFrame) target.requestAnimationFrame = requestAnimationFrame
    if (!target.cancelAnimationFrame) target.cancelAnimationFrame = cancelAnimationFrame

    return new PromiseSubclass((
        resolve: () => void,
        reject: (Error) => void
    ) => {
        const patcher = new Patcher(resolve, reject, opts.timeout, opts.target)
        patcher.callback('setTimeout')
        patcher.callback('requestAnimationFrame')
        patcher.handler('clearTimeout')
        patcher.handler('cancelAnimationFrame')
        patcher.promise('Promise')

        patcher.method('XMLHttpRequest', 'abort')
        patcher.property('XMLHttpRequest', 'onreadystatechange', canRemoveHttpRequest)
        patcher.property('XMLHttpRequest', 'onload')
        patcher.property('XMLHttpRequest', 'onerror')
        patcher.property('XMLHttpRequest', 'ontimeout')
    })
}
