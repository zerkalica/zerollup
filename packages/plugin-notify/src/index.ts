import {Task, Plugin} from 'rollup'
import * as nodeNotifier from 'node-notifier'

function patchRollup() {
    const onlyErrors = false
    const pkgName = 'test'
    const oldOn = Task.prototype.run

    let attached = false

    function newOn() {
        const result = oldOn.call(this)
        if (attached) return result
        attached = true

        this.watcher.on('event', event => {
            switch (event.code) {
                case 'START':
                    if (!onlyErrors) {
                        nodeNotifier.notify({
                            title: `${pkgName}: Start`
                        })
                    }
                    break
                case 'BUNDLE_START':
                    if (!onlyErrors) {
                        nodeNotifier.notify({
                            title: `${pkgName}: Compiling`,
                            message: typeof event.input === 'string' ? event.input : event.input.join(', ')
                        })
                    }
                    break
                case 'END':
                    if (!onlyErrors) {
                        nodeNotifier.notify({
                            title: `${pkgName}: Done`
                        })
                    }
                    break
                case 'ERROR':
                case 'FATAL':
                    nodeNotifier.notify({
                        title: `${pkgName}: Error`,
                        message: event.error.stack || event.error
                    })
                    break
                default: break
            }
        })

        return result
    }

    Task.prototype.run = newOn
}

patchRollup()

export default function notify({onlyErrors = true, pkgName}: {
    onlyErrors?: boolean
    pkgName: string
}): Plugin {
    const name = '@zerollup/plugin-notify'

    return {
        name,
        // onwrite(options: OutputOptions, source: SourceDescription) {
        //     nodeNotifier.notify({
        //         title: `${pkgName}: UPDATE`,
        //         message: options.file
        //     })
        // }
    }
}
