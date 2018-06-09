import * as jsdom from 'jsdom'
import {waitAllAsync} from '../waitAllAsync'
import {Render, RenderOptions} from './interfaces'
import {fixConsoleColors} from './helpers/fixConsoleColors'
import {defaultNodeDomSetup} from './helpers/defaultNodeDomSetup'

/**
 * Setup jsdom, eval bundle code and generate resulting html page string
 */
export function createJsDomRender(dom: typeof jsdom): Render {
    return function jsDomRender(opts: RenderOptions): Promise<string> {
        const renderer = new dom.JSDOM(opts.template, {
            url: opts.url,
            beforeParse: (window: jsdom.DOMWindow) => {
                opts.setup && opts.setup(window)
                defaultNodeDomSetup(window)
            },
            referrer: opts.referrer,
            userAgent: opts.userAgent,
            runScripts: 'outside-only',
            includeNodeLocations: false,
            virtualConsole: new dom.VirtualConsole().sendTo(fixConsoleColors(opts.console || console)),
        })
        const sandbox = renderer.window as any

        return waitAllAsync({
            timeout: opts.timeout,
            sandbox,
            run: () => sandbox.eval(opts.bundle)
        })
            .then(() => renderer.serialize())
            .catch(error => {
                if (!(error instanceof Error)) error = new Error(String(error))
                error.page = renderer.serialize()
                throw error
            })
    }
}
