import {waitAllAsync} from '../src'

describe('timeout related', () => {
    it('should handle setTimeout', done => {
        let t1 = false
        let t2 = false

        const run = () => {
            setTimeout(() => t1 = true , 150)
            setTimeout(() => t2 = true , 10)
        }

        waitAllAsync({run}).then(() => {
            expect(t1).toBeTruthy()
            expect(t2).toBeTruthy()
            done()
        })
    })

    it('should handle requestAnimationFrame', done => {
        let t1 = false
        let t2 = false

        const run = () => {
            requestAnimationFrame(() => t1 = true)
            cancelAnimationFrame(requestAnimationFrame(() => t2 = true))
        }

        waitAllAsync({run}).then(() => {
            expect(t1).toBeTruthy()
            expect(t2).toBeFalsy()
            done()
        })

    })

    it('should produce error after timeout if no async tasks', done => {
        const run = () => {}
        waitAllAsync({timeout: 50, run}).catch((e) => {
            expect(e).toBeInstanceOf(Error)
            done()
        })
    })

    it('should handle clearTimeout after setTimeout', done => {
        let t1 = false
        let t2 = false

        const run = () => {
            setTimeout(() => t2 = true , 10)
            clearTimeout(setTimeout(() => t1 = true , 150))
        }

        waitAllAsync({run}).then(() => {
            expect(t1).toBeFalsy()
            expect(t2).toBeTruthy()
            done()
        })
    })

    it('should handle timeouts in promises', done => {
        let t1 = false
        let t2 = false
        const run = () => {
            const p1 = new Promise((resolve, reject: (e: Error) => void) => {
                setTimeout(resolve, 0)
            }).then(() => t1 = true)
    
            const p2 = new Promise(resolve => {
                setTimeout(resolve, 50)
            }).then(() => t2 = true)
        }

        waitAllAsync({run}).then(() => {
            expect(t1).toBeTruthy()
            expect(t2).toBeTruthy()
            done()
        })
    })

    it('should produce timeout error if one of promises never resolved', done => {
        let t1 = false
        let t2 = false

        const run = () => {
            const p1 = new Promise(
                (resolve, reject: (e: Error) => void) => {
                    // never
                }
            )
                .then(() => t2 = true)
    
            const p2 = new Promise(resolve => {
                setTimeout(resolve, 0)
            }).then(() => t1 = true)
        }

        waitAllAsync({run, timeout: 50}).catch(e => {
            expect(t1).toBeTruthy()
            expect(e).toBeInstanceOf(Error)
            done()
        })
    })
})
