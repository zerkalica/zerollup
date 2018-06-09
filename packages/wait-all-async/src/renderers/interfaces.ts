export type RenderType = 'jsdom'
export const renderTypes: RenderType[] = ['jsdom']

export interface RenderOptions {
    /**
     * Browser url to pass jsdom environment
     */
    url?: string

    /**
     * Html page template
     */
    template: string

    /**
     * Eval-able string with js code from bundlers
     */
    bundle: string

    /**
     * Throw exception after this timeout in ms, if not all async operations completed
     */
    timeout?: number

    /**
     * referrer just affects the value read from document.referrer.
     * It defaults to no referrer (which reflects as the empty string).
     */
    referrer?: string

    /**
     * userAgent affects the value read from navigator.userAgent, as well as the User-Agent header sent while fetching subresources.
     * It defaults to `Mozilla/5.0 (${process.platform}) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/${jsdomVersion}`.
     */
    userAgent?: string

    /**
     * Console instance to log eval messages
     */
    console?: Console

    /**
     * Setup environment function
     */
    setup?: SandboxSetup
}

export type SandboxSetup = ((sandbox: any) => void)

/**
 * Rendering engine function
 */
export type Render = (opts: RenderOptions) => Promise<string>
