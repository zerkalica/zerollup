import {Patcher} from './Patcher'
import {FakePromise} from './FakePromise'
import * as patchers from './patchers'

export interface WaitAllAsyncOptions {
    /**
     * Throw exception after this timeout in ms, if not all async operations completed
     */
    timeout?: number

    /**
     * Sandbox, where to patch async functions. Window, if not set
     */
    sandbox?: any

    /**
     * Run code inside waitAllAsync and wait
     */
    run?: () => void

    /**
     * Custom patchers to patch sandbox
     */
    patchers?: patchers.Patch[]
}

/**
 * Patch promises, xhr, timeout, animationFrame. Waits all async tasks and. Base helper for building SPA prerenders
 */
export function waitAllAsync(opts: WaitAllAsyncOptions = {}): Promise<void> {
    const sandbox: any = opts.sandbox || (typeof window === 'undefined' ? global : window)
    const customPatchers = opts.patchers

    return new FakePromise((
        resolve: () => void,
        reject: (Error) => void
    ) => {
        const patcher = new Patcher(resolve, reject, sandbox, opts.timeout)
        patcher.add(patchers.patchPromise)
        patcher.add(patchers.patchXhr)
        patcher.add(patchers.createPatchTimeout('setTimeout', 'clearTimeout'))
        patcher.add(patchers.createPatchTimeout('requestAnimationFrame', 'cancelAnimationFrame'))
        if (customPatchers) {
            for (let customPatch of customPatchers) {
                patcher.add(customPatch)
            }
        }

        if (opts.run) opts.run()
    })
}
