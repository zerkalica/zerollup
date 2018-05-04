import * as path from 'path'
import * as rollup from 'rollup'
import {Pkg, Page, getPages, writePages, TemplateFn} from '@zerollup/helpers'

export interface TemplateOpts<Config> {
    pkg: Pkg
    mainFiles: string[]
    baseUrl: string
    configName: string
    globalName: string
    templateFn?: TemplateFn<Config> | string | void
}

export default function template<Config>(
    opts: TemplateOpts<Config>
): rollup.Plugin {
    const name = '@zerollup/plugin-template'

    return {
        name,
        transformBundle(code: string, options: rollup.OutputOptions): Promise<any> {
            if (!options.file)
                throw new Error(`Config bundile probably chunked: set output.file`)
            if (options.format !== 'iife' && options.format !== 'umd')
                throw new Error(`Config not in iife or umd format: ${options.format}`)
            const configFile = path.basename(options.file)
            const distDir = path.dirname(options.file)
            const config: Config = new Function(`
var module = {exports: null};
${code};
return module.exports || ${opts.configName}
`)()

            return Promise.all(opts.mainFiles.map(mainFile =>
                getPages({
                    pkg: opts.pkg,
                    baseUrl: opts.baseUrl,
                    configName: opts.configName,
                    globalName: opts.globalName,
                    mainFile,
                    config,
                    configFile
                })
            ))
                .then(pageSets => writePages({
                    distDir,
                    pages: pageSets.reduce(
                        (acc, pages) => ([...acc, ...pages]),
                        <Page[]>[]
                    )
                }))
        }
    }
}
