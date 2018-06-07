import {Patcher} from './Patcher'
import {FakePromise} from './FakePromise'
import * as patchers from './patchers'

export interface WaitAllAsyncOptions {
    timeout?: number
    target?: Object
    patchers?: patchers.Patch[]
}

export function waitAllAsync(opts: WaitAllAsyncOptions = {}): Promise<void> {
    const target: any = opts.target || (typeof window === 'undefined' ? global : window)
    if (!target.fetch && typeof fetch !== 'undefined') {
        target.fetch = fetch
        // fetch produces non-patched promises without it if target is a vm-contexted window from jsdom.
        target.Promise = Promise
    }

    const customPatchers = opts.patchers

    return new FakePromise((
        resolve: () => void,
        reject: (Error) => void
    ) => {
        const patcher = new Patcher(resolve, reject, target, opts.timeout)
        patcher.add(patchers.patchPromise)
        patcher.add(patchers.patchXhr)
        patcher.add(patchers.createPatchTimeout('setTimeout', 'clearTimeout'))
        patcher.add(patchers.createPatchTimeout('requestAnimationFrame', 'cancelAnimationFrame'))
        if (customPatchers) {
            for (let customPatch of customPatchers) {
                patcher.add(customPatch)
            }
        }
    })
}
