import {waitAllAsync} from '../src'
import fetchMock from 'fetch-mock'

const url = '/testapi'
const testObject = {hello: 'world'}

describe('fetch related', () => {
    beforeEach(() => {
        fetchMock.get('*', testObject)
    })

    afterEach(() => {
        fetchMock.restore()
    })

    it('should handle get json', done => {
        let t2 = false
        let data: Object

        waitAllAsync().then(() => {
            expect(data).toEqual(testObject)
            done()
        })

        fetch(url)
            .then(r => r.json())
            .then(obj => data = obj)
    })

    it('should handle get text', done => {
        let t2 = false
        let data: Object

        waitAllAsync().then(() => {
            expect(data).toEqual(JSON.stringify(testObject))
            done()
        })

        fetch(url)
            .then(r => r.text())
            .then(obj => data = obj)
    })

    it('should handle get response', done => {
        let t2 = false

        waitAllAsync().then(() => {
            expect(t2).toBeTruthy()
            done()
        })

        fetch(url).then(r => t2 = r.ok)
    })

    it('should handle get json with setTimeout', done => {
        let t2 = false
        let data: Object

        waitAllAsync().then(() => {
            expect(data).toEqual(testObject)
            expect(t2).toBeTruthy()
            done()
        })

        fetch(url)
            .then(r => r.json())
            .then(obj => data = obj)
            .then(() => {
                setTimeout(() => t2 = true , 150)
            })
    })

    it('should handle multiple fetches', done => {
        let data1: Object
        let data2: Object

        waitAllAsync().then(() => {
            expect(data1).toEqual(testObject)
            expect(data2).toEqual(testObject)
            done()
        })

        fetch(url)
            .then(r => r.json())
            .then(obj => data1 = obj)

        fetch(url)
            .then(r => r.json())
            .then(obj => data2 = obj)

    })

    it('should handle abort in fetch', done => {
        waitAllAsync().then(() => {
            done()
        })

        const controller = new AbortController()

        fetch(url, {signal: controller.signal})

        controller.abort()

    })
})
