function convert<T>(promise: Promise<T>, props?: Object) {
    (promise as any).__proto__ = PromiseSubclass.prototype
    return props ? Object.assign(promise, props) : promise
}

function PromiseSubclass<T>(
    cb: (
        resolve: (value?: T | PromiseLike<T>) => void,
        reject: (reason?: any) => void
    ) => void
) {
    return convert(new Promise(cb))
}

PromiseSubclass.prototype = Object.create(Promise.prototype)
PromiseSubclass.prototype.constructor = PromiseSubclass
const oldThen = Promise.prototype.then
PromiseSubclass.prototype.then = function then(resolve, reject) {
    return convert(oldThen.call(this, resolve, reject))
}

export const FakePromise: typeof Promise = PromiseSubclass as any

export const protoRegExp = /^https?:\/\//

export function normalizeUrl(page: string): string {
    return protoRegExp.test(page) ? page : ('http://localhost/' + page)
}
