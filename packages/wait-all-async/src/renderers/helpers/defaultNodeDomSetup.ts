import MockWebStorage from 'mock-webstorage'
import nodeFetch, {Response, Request, Headers} from 'node-fetch'

export function defaultNodeDomSetup(window: Window | any) {
    if (!window.fetch) window.fetch = typeof fetch === 'undefined' ? nodeFetch : fetch
    if (!window.Response) window.Response = Response
    if (!window.Request) window.Request = Request
    if (!window.Headers) window.Headers = Headers

    if (!window.requestAnimationFrame || !window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (handler: any) => clearTimeout(handler)
        window.requestAnimationFrame = (cb: Function) => setTimeout(cb, 0)
    }

    if (!window.localStorage) window.localStorage = new MockWebStorage()
    if (!window.sessionStorage) window.sessionStorage = new MockWebStorage()
    if (!window.Storage) window.Storage = MockWebStorage
}
