import {Task, Plugin} from 'rollup'
import * as nodeNotifier from 'node-notifier'

export default function notify(
    {onlyErrors = true}: {
        onlyErrors?: boolean
    }  = {}
): Plugin {
    const name = '@zerollup/plugin-notify'

    const oldMethod = Task.prototype.run

    let attached = false

    function newMethod() {
        const result = oldMethod.call(this)
        if (attached) return result
        attached = true

        this.watcher.on('event', event => {
            switch (event.code) {
                case 'START':
                    if (!onlyErrors) {
                        nodeNotifier.notify({
                            title: `Start`
                        })
                    }
                    break
                case 'BUNDLE_START':
                    if (!onlyErrors) {
                        nodeNotifier.notify({
                            title: `Compiling`,
                            message: typeof event.input === 'string' ? event.input : event.input.join(', ')
                        })
                    }
                    break
                case 'END':
                    if (!onlyErrors) {
                        nodeNotifier.notify({
                            title: `Done`
                        })
                    }
                    break
                case 'ERROR':
                case 'FATAL':
                    nodeNotifier.notify({
                        title: `Error`,
                        message: event.error.stack || event.error
                    })
                    break
                default: break
            }
        })

        return result
    }

    Task.prototype.run = newMethod

    return {
        name
    }
}
