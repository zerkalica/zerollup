// @jest-environment jsdom
import {createJsDomRender} from '../src'
import * as jsdom from 'jsdom'
import {setupBrowser, setup, teardown, template, url, urlError, testObject, testString} from './fetchHelper'

describe('createJsDomRender', () => {
    beforeEach(setup)
    afterEach(teardown)

    it('should render on timeout', done => {
        const bundle = `
        setTimeout(() => {
            document.getElementById('app').innerHTML = '${testString}'
        }, 101)
`
        const result = template.replace('{PLACEHOLDER}', testString)

        createJsDomRender(jsdom)({template, bundle, setup: setupBrowser})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })

    it('should render on promise resolve', done => {
        const bundle = `
        Promise.resolve({json: () => (${JSON.stringify(testObject)})}).then(r => r.json()).then(data => {
            document.getElementById('app').innerHTML = data.hello
        })
`
        const result = template.replace('{PLACEHOLDER}', testObject.hello)

        createJsDomRender(jsdom)({template, bundle, setup: setupBrowser})
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

        createJsDomRender(jsdom)({template, bundle, setup: setupBrowser})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })
})