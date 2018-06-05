const savedSetTimeout = setTimeout
const savedClearTimeout = clearTimeout

const frame: (cb: () => void) => any = typeof requestAnimationFrame === 'undefined'
    ? (cb: () => void) => savedSetTimeout(cb, 16)
    : requestAnimationFrame

export class AsyncCounter {
    private handler: NodeJS.Timer | void
    private handlers: Set<any> = new Set()

    constructor(
        private resolve: (e?: Error) => void,
        timeout: number = 4000
    ) {
        this.handler = savedSetTimeout(this.onTimeout, timeout)
    }

    increment(handler: any) {
        this.handlers.add(handler)
    }

    decrement(handler: any) {
        this.handlers.delete(handler)
        if (this.handlers.size === 0) this.scheduleResolve()
    }

    private scheduled = false
    private scheduleResolve() {
        if (this.scheduled) return
        this.scheduled = true
        frame(this.doResolve)
    }

    private onTimeout = () => {
        this.handler = null
        this.scheduled = false
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

    private doResolve = () => {
        this.scheduled = false
        if (this.handlers.size !== 0) return
        if (this.handler) savedClearTimeout(this.handler)
        this.handlers = new Set()
        this.handler = null
        this.resolve()
    }
}
