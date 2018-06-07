import {Script} from 'vm'
import {waitAllAsync} from 'wait-all-async'

export interface Renderer {
    window: any
    serialize(): string;
    runVMScript(script: Script): void;
}

export function prerender(
    opts: {
        renderer: Renderer
        timeout?: number
        bundle: string
        bootstrap?: string
    }
): Promise<string> {
    const scriptData = opts.bundle + '\n; ' + (opts.bootstrap || '')
    const result: Promise<string> = waitAllAsync({
        timeout: opts.timeout,
        target: opts.renderer.window
    })
        .then(() => opts.renderer.serialize())
        .catch(error => opts.renderer.serialize())

    opts.renderer.runVMScript(new Script(scriptData))

    return result
}