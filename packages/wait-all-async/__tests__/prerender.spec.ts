import {jsDomRender} from '../src'
import * as jsdom from 'jsdom'
import fetchMock from 'fetch-mock'
import {createContext} from 'vm'

describe('jsDomRender', () => {
    const template = `<html><head></head><body><div id="app">{PLACEHOLDER}</div></body></html>`
    const url = '/testapi'
    const testObject = {hello: 'world'}
    beforeEach(() => {
        fetchMock.get('*', testObject)
    })

    afterEach(() => {
        fetchMock.restore()
    })

    it('should render on timeout', done => {
        const testString = 'TEST_STRING'
        const bundle = `
        setTimeout(() => {
            document.getElementById('app').innerHTML = '${testString}'
        }, 101)
`
        const result = template.replace('{PLACEHOLDER}', testString)

        jsDomRender({jsdom, template, bundle})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })

    it('should render on promise resolve', done => {
        const testString = 'TEST_STRING'
        const bundle = `
        Promise.resolve({json: () => (${JSON.stringify(testObject)})}).then(r => r.json()).then(data => {
            document.getElementById('app').innerHTML = data.hello
        })
`
        const result = template.replace('{PLACEHOLDER}', testObject.hello)

        jsDomRender({jsdom, template, bundle})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })

    it('should render on fetch', done => {
        const bundle = `
        const p = fetch('${url}')
        p.then(r => r.json()).then(function(data) {
            document.getElementById('app').innerHTML = data.hello
        })
`
        const result = template.replace('{PLACEHOLDER}', testObject.hello)

        jsDomRender({jsdom, template, bundle})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })
})