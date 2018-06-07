import {waitAllAsync} from './waitAllAsync'

export interface Renderer {
    readonly window: any
    serialize(): string
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
    const target = opts.renderer.window
    const result: Promise<PrerenderResult> = waitAllAsync({
        timeout: opts.timeout,
        target
    })
        .then(() => ({
            page: opts.renderer.serialize(),
        }))
        .catch(error => ({
            page: opts.renderer.serialize(),
            error
        }))

    target.eval(opts.bundle)

    return result
}
