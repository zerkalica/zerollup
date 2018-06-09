import MockWebStorage from 'mock-webstorage'
import nodeFetch from 'node-fetch'

export function defaultNodeDomSetup(window: any) {
    if (!window.fetch) window.fetch = typeof fetch === 'undefined' ? nodeFetch : fetch
    if (!window.Response) window.Response = nodeFetch.Response
    if (!window.Request) window.Request = nodeFetch.Request
    if (!window.Headers) window.Headers = nodeFetch.Headers

    if (!window.requestAnimationFrame || !window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (handler: any) => clearTimeout(handler)
        window.requestAnimationFrame = (cb: Function) => setTimeout(cb, 0)
    }

    if (!window.localStorage) window.localStorage = new MockWebStorage()
    if (!window.sessionStorage) window.sessionStorage = new MockWebStorage()
    if (!window.Storage) window.Storage = MockWebStorage
}
