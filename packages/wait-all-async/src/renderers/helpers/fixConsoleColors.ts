const consoleColorChar = '%c'

function stripColors(args: any[]): any[] {
    const result = []
    for (let i = 0; i < args.length; i++) {
        let arg = args[i]
        if (typeof arg === 'string' && arg.indexOf(consoleColorChar) === 0) {
            arg = arg.substring(consoleColorChar.length)
            i++
        }
        if (arg) result.push(arg)
    }
    return result
}

function createWrapper<F extends Function>(origMethod: F): F {
    return function(...args: any[]) {
        const newArgs = stripColors(args)
        return origMethod.apply(this, newArgs)
    } as any
}

const patchedConsoleMethods = ['log', 'error', 'debug', 'info']

export function fixConsoleColors(console: Console): Console {
    const newConsole = Object.create(console)
    for (let method of patchedConsoleMethods) {
        newConsole[method] = createWrapper(console[method])
    }

    return newConsole
}
