import {AsyncCounter} from './AsyncCounter'
import {patchResponseMethods} from './patchResponseMethods'

type Patch = {
    t: 'callback'
    name: string
    fn: Function
} | {
    t: 'timeout'
    name: string
    fn: Function
} | {
    t: 'method'
    name: string
    proto: Object
    fn: Function
} | {
    t: 'prop'
    name: string
    proto: Object
    desc: PropertyDescriptor
}

export class Patcher {
    private counter: AsyncCounter
    target: Object
    private patches: Patch[] = []

    constructor(
        resolve: () => void,
        reject: (e: Error) => void,
        timeout: number = 4000,
        win?: Object
    ) {
        this.target = win || window
        this.counter = new AsyncCounter(
            (e?: Error) => {
                this.restore()
                if (e) reject(e)
                else resolve()
            },
            timeout
        )
    }

    callback(
        name: string,
        canRemove?: (...args: any[]) => boolean,
        callbackPos: number = 0
    ) {
        const {patches, target, counter} = this
        const fn: (...args: any[]) => any = target[name]

        function newCb(...args: any[]) {
            let handler: any
            const callback = args[callbackPos]

            function newCallback() {
                try {
                    return callback.apply(this, arguments)
                } finally {
                    if (!canRemove || canRemove.apply(this, arguments)) counter.decrement(handler)
                }
            }

            args[callbackPos] = newCallback
            handler = fn.apply(this, args)
            counter.increment(handler)

            return handler
        }
        target[name] = newCb

        patches.push({t: 'callback', name, fn})
    }

    handler(name: string) {
        const {patches, target, counter} = this
        const fn: (...args: any[]) => any = target[name]

        function newTimeout(handler: any) {
            const result = fn.apply(this, arguments)
            counter.decrement(handler)
            return result
        }
        target[name] = newTimeout

        patches.push({t: 'timeout', name, fn})
    }

    fetchLike(
        name: string
    ) {
        const {target, counter, patches} = this
        const oldFetch = target[name]

        function newFetch(input?: Request | string, init?: RequestInit): Promise<Response> {
            const signal = init ? init.signal : null
            const decrement = () => {
                counter.decrement(result)
                if (signal) signal.removeEventListener('abort', decrement)
            }
            const increment = () => {
                counter.increment(result)
                if (signal) signal.addEventListener('abort', decrement)
            }

            const result = oldFetch(input, init)
                .then((response: Response) => {
                    decrement()
                    return patchResponseMethods(response, decrement, increment)
                })
                .catch(error => {
                    decrement()
                    throw error
                })

            increment()

            return result
        }

        target[name] = newFetch

        patches.push({t: 'callback', name, fn: oldFetch})
    }

    method(
        className: string,
        name: string,
        canRemove?: (...args: any[]) => boolean
    ) {
        const {target, counter, patches} = this
        const proto = target[className].prototype
        const fn = proto[name]

        function newMethod(...args: any[]) {
            try {
                return fn.apply(this, args)
            } finally {
                counter.decrement(this)
            }
        }
        proto[name] = newMethod

        patches.push({t: 'method', name, proto, fn})
    }

    property(
        className: string,
        name: string,
        canRemove?: (...args: any[]) => boolean
    ) {
        const {target, counter, patches} = this
        const proto = target[className].prototype

        const desc = Object.getOwnPropertyDescriptor(proto, name)
        const newPropName = '$' + name

        Object.defineProperty(proto, name, {
            configurable: true,
            get() {
                return desc ? desc.get.call(this) : this[newPropName]
            },
            set(callback: Function) {
                const self = this
                function newCallback() {
                    try {
                        return callback.apply(this, arguments)
                    } finally {
                        if (!canRemove || canRemove.apply(this, arguments)) counter.decrement(self)
                    }
                }
                counter.increment(self)
                if (desc) desc.set.call(this, newCallback)
                else this[newPropName] = newCallback
            }
        })

        patches.push({t: 'prop', name, proto, desc: desc || {value: undefined, configurable: true}})
    }

    restore() {
        const {target, patches} = this
        for (let item of patches) {
            switch (item.t) {
                case 'timeout':
                case 'callback':
                    target[item.name] = item.fn
                    break
                case 'method':
                    item.proto[item.name] = item.fn
                    break
                case 'prop':
                    Object.defineProperty(item.proto, item.name, item.desc)
                    break
            }
        }

        this.patches = []
    }
}
