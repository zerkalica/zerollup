import {Counter} from './patchers'

const savedSetTimeout = setTimeout
const savedClearTimeout = clearTimeout

const frame: (cb: () => void) => any = typeof requestAnimationFrame === 'undefined'
    ? (cb: () => void) => savedSetTimeout(cb, 16)
    : requestAnimationFrame

export class AsyncCounter implements Counter {
    private handler: NodeJS.Timer | void
    private handlers: Set<any> = new Set()

    constructor(
        public target: any,
        private resolve: (e?: Error) => void,
        timeout: number = 4000
    ) {
        this.handler = savedSetTimeout(this.onTimeout, timeout)
    }

    increment(handler: any) {
        this.handlers.add(handler)
    }

    decrement(handler: any) {
        const {handlers} = this
        if (!handlers.has(handler)) return
        handlers.delete(handler)
        if (handlers.size === 0) this.doResolve()
    }

    private onTimeout = () => {
        this.handler = null
        const names = []
        const handlers = this.handlers
        this.handlers = new Set()
        try {
            handlers.forEach(handler => {
                if (handler)
                    names.push(typeof handler === 'object' ? handler.toString() : String(handler))
            })    
        } finally {
            this.resolve(new Error(`Timeout handlers: ${names.join(',')}`))
        }
    }

    private doResolve() {
        if (this.handler) savedClearTimeout(this.handler)
        this.handlers = new Set()
        this.handler = null
        this.resolve()
    }
}
