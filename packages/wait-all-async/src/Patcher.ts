import {AsyncCounter} from './AsyncCounter'
import {Patch, UnPatch} from './patchers'

export class Patcher {
    private counter: AsyncCounter
    private unpatchers: UnPatch[] = []

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
        this.unpatchers.push(patch(this.counter))
    }

    restore() {
        for (let restore of this.unpatchers) restore()
        this.unpatchers = []
    }
}
