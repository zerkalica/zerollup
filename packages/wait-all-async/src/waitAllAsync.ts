import {FakePromise} from './FakePromise'
import {AsyncCounter} from './AsyncCounter'
import {Patch, UnPatch, defaultPatches} from './patchers'

class Patcher {
    private counter: AsyncCounter
    private unPatchers: UnPatch[] = []

    constructor(
        resolve: () => void,
        reject: (e: Error) => void,
        target: Object,
        timeout: number = 4000
    ) {
        this.counter = new AsyncCounter(
            target,
            (e?: Error) => {
                this.restore()
                if (e) reject(e)
                else resolve()
            },
            timeout
        )
    }

    add(patch: Patch) {
        this.unPatchers.push(patch(this.counter))
    }

    restore() {
        for (let unPatch of this.unPatchers) unPatch()
        this.unPatchers = []
    }
}

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
    run: () => void

    /**
     * Custom patchers to patch sandbox
     */
    patchers?: Patch[]
}

/**
 * Patch promises, xhr, timeout, animationFrame. Waits all async tasks. Base helper for building SPA prerenders.
 */
export function waitAllAsync(opts: WaitAllAsyncOptions): Promise<void> {
    const sandbox = opts.sandbox || (typeof window === 'undefined' ? global : window)

    /**
     * Can't use real promises here, patcher patches native Promise.prototype to wait async tasks in appilication.
     */
    return new FakePromise((
        resolve: () => void,
        reject: (e: Error) => void
    ) => {
        const patcher = new Patcher(
            resolve,
            reject,
            sandbox,
            opts.timeout
        )
        for (let patch of opts.patchers || defaultPatches) patcher.add(patch)

        // Start async counter, to prevent waiting timeout, if no async tasks added in opts.run
        sandbox.setTimeout(() => {}, 0)

        if (opts.run) opts.run()
    })
}
