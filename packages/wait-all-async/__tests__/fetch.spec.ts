import {waitAllAsync} from '../src'
import fetchMock from 'fetch-mock'

const url = 'https://example.com'
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

})
