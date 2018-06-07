import {Script} from 'vm'
import {waitAllAsync} from './waitAllAsync'

export interface Renderer {
    readonly window: any
    serialize(): string
    runVMScript(script: Script): void
}

export interface PrerenderResult {
    page: string
    error?: Error
}

export function prerender(
    opts: {
        renderer: Renderer
        timeout?: number
        bundle: string
    }
): Promise<PrerenderResult> {
    const result: Promise<PrerenderResult> = waitAllAsync({
        timeout: opts.timeout,
        target: opts.renderer.window
    })
        .then(() => ({
            page: opts.renderer.serialize(),
        }))
        .catch(error => ({
            page: opts.renderer.serialize(),
            error
        }))

    opts.renderer.runVMScript(new Script(opts.bundle))

    return result
}
