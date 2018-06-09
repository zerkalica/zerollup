import * as fs from 'fs'
import * as path from 'path'

import fetchMock from 'fetch-mock'
import xhrMock from 'xhr-mock'

export function setupBrowser(window: any) {
    Object.keys(fetchMock.config).forEach(key => {
        if (window[key]) fetchMock.config[key] = window[key]
    })
}

export const url = 'http://localhost/testapi'
export const urlError = 'http://localhost/testapi-error'
export const testObject = {hello: 'world'}
export const testString = JSON.stringify(testObject)
export const template = `<html><head></head><body><div id="app">{PLACEHOLDER}</div></body></html>`

const error = () => {
    throw new Error('Some error')
}

export function setup() {
    fetchMock.get(url, testObject)
    fetchMock.get(urlError, error)

    xhrMock.setup()
    xhrMock.get(url, (req, res) => {
        return res.status(200).body(JSON.stringify(testObject))
    })
    xhrMock.get(urlError, error)
}

export function teardown() {
    fetchMock.restore()
    xhrMock.teardown()
}

export function load(pkgName: string, suffix: string = 'production.min', dir: string = 'umd'): string {
    return fs.readFileSync(path.join(
        path.dirname(require.resolve(pkgName)),
        dir,
        `${pkgName}.${suffix}.js`
    )).toString() + ';\n'
}

