export interface Counter {
    target: any
    increment(handle: any): void
    decrement(handle: any): void
}

export type UnPatch = () => void
export type Patch = (counter: Counter) => UnPatch

export const defaultPatches: Patch[] = [
    patchPromise,
    patchXhr,
    createPatchTimeout('setTimeout', 'clearTimeout'),
    createPatchTimeout('requestAnimationFrame', 'cancelAnimationFrame'),
]

const patchedEvents = ['abort', 'error', 'load', 'timeout']

export function patchXhr(counter: Counter) {
    const proto = counter.target.XMLHttpRequest.prototype
    const oldSend = proto.send
    proto.send = function newSend(this: XMLHttpRequest, ...args: any[]) {
        const result = oldSend.apply(this, args)
        counter.increment(this)
        const decrement = () => {
            counter.decrement(this)
            for (let event of patchedEvents) this.removeEventListener(event, decrement)
        }
        for (let event of patchedEvents) this.addEventListener(event, decrement)
        return result
    }

    return () => {
        proto.send = oldSend
    }
}

export function patchPromise(counter: Counter) {
    const promise: typeof Promise = counter.target.Promise
    const proto = promise.prototype
    const origThen = proto.then
    const origCatch = proto.catch

    proto.then = function patchedThen(success, error) {
        counter.increment(this)
        const done = () => counter.decrement(this)

        const result: Promise<any> = origThen.call(this, success, error)
        origThen.call(result, done, done)

        return result
    }
      
    proto.catch = function patchedCatch(error) {
        return origCatch.call(this, error).then()
    }

    return () => {
        proto.then = origThen
        proto.catch = origCatch
    }
}

export function createPatchTimeout(setName: string, clearName: string) {
    return function patchTimeout(counter: Counter) {
        const origClear: (...args: any[]) => any = counter.target[clearName]
        const origSet: (...args: any[]) => any = counter.target[setName]
        if (!origClear || typeof origClear !== 'function') {
            throw new Error(`No ${clearName} found in target`)
        }
        if (!origSet || typeof origSet !== 'function') {
            throw new Error(`No ${setName} found in target`)
        }

        function newSet(this: any, ...args: any[]) {
            let handler: any
            const callback = args[0]
            if (!callback || typeof callback !== 'function') {
                throw new Error(`No callback`)
            }
    
            function newCallback(this: any) {
                try {
                    return callback.apply(this, arguments)
                } finally {
                    counter.decrement(handler)
                }
            }

            args[0] = newCallback
            handler = origSet.apply(this, args)
            counter.increment(handler)

            return handler
        }
        counter.target[setName] = newSet
    
        function newClear(this: any, ...args: any[]) {
            const result = origClear.apply(this, args)
            counter.decrement(args[0])
            return result
        }
        counter.target[clearName] = newClear
    
        return () => {
            counter.target[setName] = origSet
            counter.target[clearName] = origClear
        }    
    }
}
