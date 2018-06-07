import {prerender} from '../src'
import {VirtualConsole, JSDOM} from 'jsdom'
import fetchMock from 'fetch-mock'
import {createContext} from 'vm'

const opts: any = {
    runScripts: 'outside-only',
    includeNodeLocations: false,
    virtualConsole: new VirtualConsole().sendTo(console),
}

describe('prerender', () => {
    const template = `<html><head></head><body><div id="app">{PLACEHOLDER}</div></body></html>`
    const url = '/testapi'
    const testObject = {hello: 'world'}
    beforeEach(() => {
        fetchMock.get('*', testObject)
    })

    afterEach(() => {
        fetchMock.restore()
    })

    it('test Promise', () => {
        const renderer = new JSDOM(template, opts)
    })

    it('should prerender on timeout', done => {
        const testString = 'TEST_STRING'
        const bundle = `
        setTimeout(() => {
            document.getElementById('app').innerHTML = '${testString}'
        }, 101)
`
        const result = template.replace('{PLACEHOLDER}', testString)

        const renderer = new JSDOM(template, opts)

        prerender({ renderer, bundle })
            .then(({page, error}) => {
                expect(error).toBeUndefined()
                expect(page).toEqual(result)
                done()
            })
    })

    it('should prerender on promise resolve', done => {
        const testString = 'TEST_STRING'
        const bundle = `
        Promise.resolve({json: () => (${JSON.stringify(testObject)})}).then(r => r.json()).then(data => {
            document.getElementById('app').innerHTML = data.hello
        })
`
        const result = template.replace('{PLACEHOLDER}', testObject.hello)

        const renderer = new JSDOM(template, opts)

        prerender({ renderer, bundle })
            .then(({page, error}) => {
                expect(error).toBeUndefined()
                expect(page).toEqual(result)
                done()
            })
    })

    it('should prerender on fetch', done => {
        const bundle = `
        fetch('${url}').then(r => r.json()).then((data) => {
            document.getElementById('app').innerHTML = data.hello
        })
`
        const result = template.replace('{PLACEHOLDER}', testObject.hello)

        const renderer = new JSDOM(template, opts)
        prerender({ renderer, bundle })
            .then(({page, error}) => {
                expect(error).toBeUndefined()
                expect(page).toEqual(result)
                done()
            })
    })
})