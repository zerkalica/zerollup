import * as jsdom from 'jsdom'
import {WaitAllAsyncOptions, waitAllAsync} from './waitAllAsync'

export interface RenderOptions extends WaitAllAsyncOptions {
    /**
     * Html page template
     */
    template: string

    /**
     * Eval-able string with js code from bundlers
     */
    bundle: string

    /**
     * Console instance to log eval messages
     */
    console?: Console
}

export type Render = (opts: RenderOptions) => Promise<string>

/**
 * Setup jsdom, eval bundle code and generate resulting html page string
 *
 * @return string with html page
 */
export function createJsDomRender(dom: typeof jsdom): Render {
    return function jsDomRender(opts: RenderOptions): Promise<string> {
        const renderer = new dom.JSDOM(opts.template, {
            runScripts: 'outside-only',
            includeNodeLocations: false,
            virtualConsole: new dom.VirtualConsole().sendTo(opts.console || console),
        })
        const sandbox = renderer.window as any
        sandbox.Promise = Promise
        sandbox.fetch = fetch
    
        return waitAllAsync({
            timeout: opts.timeout,
            sandbox,
            run: () => sandbox.eval(opts.bundle)
        })
            .then(() => renderer.serialize())
            .catch(error => {
                error.page = renderer.serialize()
                throw error
            })
    }
}
