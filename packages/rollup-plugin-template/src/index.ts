import * as path from 'path'
import {Plugin, OutputOptions, OutputBundle} from 'rollup'
import {Pkg, Page, getPages, writePages, TemplateFn} from '@zerollup/helpers'

export interface TemplateOpts<Config> {
    pkg: Pkg
    mainFiles: string[]
    baseUrl: string
    configName: string
    globalName: string
    templateFn?: TemplateFn<Config> | string | void
}

export default function template<Config>(opts: TemplateOpts<Config>): Plugin {
    const name = '@zerollup/rollup-plugin-template'

    return {
        name,
        generateBundle(options: OutputOptions, bundle: OutputBundle, isWrite: boolean): Promise<void> | void {
            if (!options.file)
                throw new Error(`Config bundile probably chunked: set output.file`)
            if (options.format !== 'iife' && options.format !== 'umd')
                throw new Error(`Config not in iife or umd format: ${options.format}`)
            const configFile = path.basename(options.file)

            const code = Object.keys(bundle)
                .map(key => {
                    const chunk = bundle[key]
                    if (!chunk) return
                    if (typeof chunk === 'string') return chunk
                    if (chunk instanceof Buffer) return chunk.toString()
                    if (typeof chunk !== 'object') return
                    return chunk.code
                })
                .filter(Boolean)
                .join(';\n')

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
                .then(pageSets => {
                    for (let pageSet of pageSets) {
                        for (let page of pageSet) {
                            this.emitAsset(page.file, page.data)
                        }
                    }
                })
        }
    }
}
