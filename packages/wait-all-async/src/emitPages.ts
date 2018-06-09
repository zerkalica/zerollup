import * as jsdom from 'jsdom'
import * as path from 'path'
import {Render, RenderType, createJsDomRender, SandboxSetup} from './renderers'
import {normalizeUrl} from './FakePromise'

const defaultRender = createJsDomRender(jsdom)
const renders: Map<RenderType, Render> = new Map()
renders.set('jsdom', defaultRender)

export interface OutputPage {
    /**
     * Prerendered html page data
     */
    data: string

    /**
     * Source page url with query
     */
    url: string

    /**
     * Page filename
     */
    file: string
}

export interface EmitPagesOptions {
    /**
     * Array of urls with filenames and queries.
     * @example ['index.html?page=main', 'secondary.html?page=some', 'https://example.com?q=1']
     *
     * Default is 'index.html'
     */
    page?: string[]

    /**
     * Bundle js code
     */
    bundle: string

    /**
     * Html page template.
     */
    template: string
    /**
     * Rendering engine, jsdom is default.
     */
    engine?: RenderType

    /**
     * Fallback timeout to prerender page. Used if can't autodetect all async tasks endings. Default is 4000 ms.
     */
    timeout?: number

    /**
     * Setup environment function
     */
    setup?: SandboxSetup
}

/**
 * Prerender pages and return array of page data
 */
export function emitPages(opts: EmitPagesOptions): Promise<OutputPage[]> {
    const render = renders.get(opts.engine) || defaultRender

    return Promise.all((opts.page || ['index.html']).map(page => {
        const pageUrl = normalizeUrl(page)
        const parts = new URL(pageUrl)
        let file = parts.pathname[0]
        if (file[0] === '/') file = file.substring(1)
        if (!file) file = 'index.html'
        file = file.replace(/\//g, path.sep)

        return render({
            url: pageUrl,
            template: opts.template,
            bundle: opts.bundle,
            timeout: opts.timeout,
            setup: opts.setup,
        })
            .catch((e: Error & {page?: string}) => {
                e.message += `. page url="${page}"`
                if (!e.page) throw e
                console.warn(e.stack || e)
                return e.page
            })
            .then(data => ({
                data,
                file,
                url: page
            }))
    }))
}
