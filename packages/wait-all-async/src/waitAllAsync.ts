import {Patcher} from './Patcher'

function canRemoveHttpRequest(this: XMLHttpRequest) {
    return this.readyState === XMLHttpRequest.DONE
}

export interface WaitAllAsyncOptions {
    timeout?: number
    target?: Object
}

export function waitAllAsync(opts: WaitAllAsyncOptions = {}): Promise<void> {
    return new Promise((
        resolve: () => void,
        reject: (Error) => void
    ) => {
        const patcher = new Patcher(resolve, reject, opts.timeout, opts.target)
        patcher.callback('setTimeout')
        patcher.callback('requestAnimationFrame')
        patcher.handler('clearTimeout')
        patcher.handler('cancelAnimationFrame')
        patcher.fetchLike('fetch')
    
        patcher.method('XMLHttpRequest', 'abort')
        patcher.property('XMLHttpRequest', 'onreadystatechange', canRemoveHttpRequest)
        patcher.property('XMLHttpRequest', 'onload')
        patcher.property('XMLHttpRequest', 'onerror')
        patcher.property('XMLHttpRequest', 'ontimeout')
    })
}
