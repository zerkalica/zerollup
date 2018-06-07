import {Patcher} from './Patcher'
import {FakePromise} from './FakePromise'

function canRemoveHttpRequest(this: XMLHttpRequest) {
    return this.readyState === XMLHttpRequest.DONE
}

export interface WaitAllAsyncOptions {
    timeout?: number
    target?: Object
}

export function waitAllAsync(opts: WaitAllAsyncOptions = {}): Promise<void> {
    const target: any = opts.target || (typeof window === 'undefined' ? global : window)
    if (!target.fetch && typeof fetch !== 'undefined') {
        target.fetch = fetch
        // fetch produces non-patched promises without it if target is a vm-contexted window from jsdom.
        target.Promise = Promise
    }

    return new FakePromise((
        resolve: () => void,
        reject: (Error) => void
    ) => {
        const patcher = new Patcher(resolve, reject, target, opts.timeout)
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
