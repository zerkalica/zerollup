import {waitAllAsync} from '../src'
import xhrMock from 'xhr-mock'

const url = '/testapi'
const urlError = '/testapi-error'
const testObject = {hello: 'world'}

describe('xhr related', () => {
    beforeEach(() => {
        xhrMock.setup()
        xhrMock.get(url, (req, res) => {
            return res.status(200).body(JSON.stringify(testObject))
        })
        xhrMock.get(urlError, (req, res) => {
            throw new Error('Some error')
        })
    })

    afterEach(() => {
        xhrMock.teardown()
    })

    it('should handle onreadystatechange', done => {
        let t2 = false
        let data: Object

        waitAllAsync().then(() => {
            expect(data).toEqual(testObject)
            done()
        })

        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            data = JSON.parse(xhr.responseText)
        }

        xhr.open('get', url)
        xhr.send()
    })

    it('should handle onload', done => {
        let t2 = false
        let data: Object

        waitAllAsync().then(() => {
            expect(data).toEqual(testObject)
            done()
        })

        const xhr = new XMLHttpRequest()
        xhr.onload = () => {
            data = JSON.parse(xhr.responseText)
        }

        xhr.open('get', url)
        xhr.send()
    })

    it('should handle onerror', done => {
        let data: Object
        let error: boolean = false

        waitAllAsync().then(() => {
            expect(data).toBeUndefined()
            expect(error).toBeTruthy()
            done()
        })

        const xhr = new XMLHttpRequest()
        xhr.onload = () => {
            data = JSON.parse(xhr.responseText)
        }
        xhr.onerror = () => {
            setTimeout(() => error = true, 1)
        }

        xhr.open('get', urlError)
        xhr.send()
    })
})
