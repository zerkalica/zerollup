import * as jsdom from 'jsdom'
import {WaitAllAsyncOptions, waitAllAsync} from './waitAllAsync'

export interface BaseRenderOptions extends WaitAllAsyncOptions {
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

export interface JsDomRenderOptions extends BaseRenderOptions {
    /**
     * jsdom module
     */
    jsdom: typeof jsdom
}

/**
 * Setup jsdom, eval bundle code and generate resulting html page string
 *
 * @return rendered html page in string
 */
export function jsDomRender(opts: JsDomRenderOptions): Promise<string> {
    const renderer = new opts.jsdom.JSDOM(opts.template, {
        runScripts: 'outside-only',
        includeNodeLocations: false,
        virtualConsole: new opts.jsdom.VirtualConsole().sendTo(opts.console || console),
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
