import * as rollup from 'rollup'
import * as nodeNotifier from 'node-notifier'

export default function notify(
    {onlyErrors = true}: {
        onlyErrors?: boolean
    }  = {}
): rollup.Plugin {
    const name = '@zerollup/rollup-plugin-notify'
    let handler: NodeJS.Timeout | null = null
    return {
        name,
        watchChange(id: string) {
            if (handler) return
            handler = setTimeout(() => {
                nodeNotifier.notify({
                    title: `Changed`,
                    message: id
                })
                handler = null
            }, 300)
        }
    }
}
