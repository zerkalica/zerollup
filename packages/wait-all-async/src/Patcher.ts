import {AsyncCounter} from './AsyncCounter'
import {Patch, UnPatch} from './patchers'

export class Patcher {
    private counter: AsyncCounter
    private unPatchers: UnPatch[] = []

    constructor(
        resolve: () => void,
        reject: (e: Error) => void,
        target: Object,
        timeout: number = 4000
    ) {
        this.counter = new AsyncCounter(
            target,
            (e?: Error) => {
                this.restore()
                if (e) reject(e)
                else resolve()
            },
            timeout
        )
    }

    add(patch: Patch) {
        this.unPatchers.push(patch(this.counter))
    }

    restore() {
        for (let unPatch of this.unPatchers) unPatch()
        this.unPatchers = []
    }
}
