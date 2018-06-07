import {prerender} from '../src'
import {JSDOM} from 'jsdom'
import fetchMock from 'fetch-mock'

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

    it('should prerender on timeout', done => {
        const testString = 'TEST_STRING'
        const bundle = `
        setTimeout(() => {
            document.getElementById('app').innerHTML = '${testString}'
        }, 101)
`
        const result = template.replace('{PLACEHOLDER}', testString)

        const renderer = new JSDOM(template, {runScripts: 'outside-only'})

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

        const renderer = new JSDOM(template, {runScripts: 'outside-only'})

        prerender({ renderer, bundle })
            .then(({page, error}) => {
                expect(error).toBeUndefined()
                expect(page).toEqual(result)
                done()
            })
    })
})