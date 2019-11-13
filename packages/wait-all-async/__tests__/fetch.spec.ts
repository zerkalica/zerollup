// @jest-environment jsdom
import {waitAllAsync} from '../src'
import {setup, teardown, url, urlError, testObject} from './fetchHelper'

describe('fetch related', () => {
    beforeEach(setup)
    afterEach(teardown)

    it('should handle get json', done => {
        let t2 = false
        let data: Object

        const run = () => fetch(url)
            .then(r => r.json())
            .then(obj => data = obj)

        waitAllAsync({run}).then(() => {
            expect(data).toEqual(testObject)
            done()
        })
    })

    it('should handle get text', done => {
        let t2 = false
        let data: Object

        const run = () => fetch(url)
            .then(r => r.text())
            .then(obj => data = obj)

        waitAllAsync({run}).then(() => {
            expect(data).toEqual(JSON.stringify(testObject))
            done()
        })

    })

    it('should handle get response', done => {
        let t2 = false
        const run = () => {
            fetch(url).then(r => t2 = r.ok)
        }

        waitAllAsync({run}).then(() => {
            expect(t2).toBeTruthy()
            done()
        })

    })

    it('should handle get json with setTimeout', done => {
        let t2 = false
        let data: Object

        const run = () => fetch(url)
            .then(r => r.json())
            .then(obj => data = obj)
            .then(() => {
                setTimeout(() => t2 = true , 150)
            })

        waitAllAsync({run}).then(() => {
            expect(data).toEqual(testObject)
            expect(t2).toBeTruthy()
            done()
        })

    })

    it('should handle multiple fetches', done => {
        let data1: Object
        let data2: Object

        const run = () => {
            fetch(url)
            .then(r => r.json())
            .then(obj => data1 = obj)

            fetch(url)
                .then(r => r.json())
                .then(obj => data2 = obj)
        }

        waitAllAsync({run}).then(() => {
            expect(data1).toEqual(testObject)
            expect(data2).toEqual(testObject)
            done()
        })
    })

    it('should handle abort in fetch', done => {
        const run = () => {
            const controller = new AbortController()
            const stub = () => {}
            fetch(url, {signal: controller.signal})
                .then(stub)
            controller.abort()
        }

        waitAllAsync({run}).then(() => {
            done()
        })
    })
})
