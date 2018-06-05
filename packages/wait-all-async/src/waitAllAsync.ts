import {Patcher} from './Patcher'

function canRemoveHttpRequest(this: XMLHttpRequest) {
    return this.readyState === XMLHttpRequest.DONE
}

export function waitAllAsync(
    timeout?: number,
    win?: Object
): Promise<void> {
    return new Promise((
        resolve: () => void,
        reject: (Error) => void
    ) => {
        const patcher = new Patcher(resolve, reject, timeout, win)
        patcher.callback('setTimeout')
        patcher.callback('requestAnimationFrame')
        patcher.handler('clearTimeout')
        patcher.handler('cancelAnimationFrame')
        patcher.fetchLike('fetch')
    
        patcher.method('XMLHttpRequest', 'abort')
        patcher.property('XMLHttpRequest', 'onreadystatechange', canRemoveHttpRequest)
        patcher.property('XMLHttpRequest', 'onerror')
        patcher.property('XMLHttpRequest', 'onload')
    })
}
