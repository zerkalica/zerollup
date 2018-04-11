import {OutputOptions, Plugin, InputOptions} from 'rollup'
import * as fsExtra from 'fs-extra'
import {cutExt, Pkg} from '@zerollup/helpers'
import * as path from 'path'

export interface TemplateOptions {
    pkg: Pkg
    baseUrl?: string
    env?: string
}

export interface TemplateFnOptions {
    pkg: Pkg
    env: string
    mainUrl: string
    distDir: string
}

export interface NamedTemplate {
    file: string
    data: string
}
export type Template = Promise<string | NamedTemplate[] | null> | string | NamedTemplate[] | null
export type TemplateFn = (opts: TemplateFnOptions) => Template

function defaultTemplate({pkg: {name}, env, mainUrl}: TemplateFnOptions): Template {
    return `<!DOCTYPE html>
    <html>
        <head>
          <meta charset="UTF-8">
          <title>${name + ' - ' + env}</title>
        </head>
        <body>
            <div id="app"></div>
            <script src="${mainUrl}"></script>
        </body>
    </html>
`
}

export default function template(
    opts: TemplateOptions
): Plugin {
    const name = '@zerollup/plugin-template'
    let inputs: string[]
    const cache: Map<string, string> = new Map()

    return {
        name,
        options(options: InputOptions) {
            inputs = typeof options.input === 'string' ? [options.input] : options.input
        },
        transformBundle(code: string, outputOptions: OutputOptions): Promise<null> {
            const outputFile = path.resolve(outputOptions.file)
            return Promise.all(inputs.map(input => {
                const templateInput = path.join(path.dirname(input), 'prerender', path.basename(input))
                const srcExt = templateInput.substring(templateInput.lastIndexOf('.'))
                const sourceTemplateFile = cutExt(templateInput) + '.html' + srcExt
                const commonTemplateFile = cutExt(cutExt(templateInput)) + '.html' + srcExt

                return Promise.all([fsExtra.pathExists(sourceTemplateFile), fsExtra.pathExists(commonTemplateFile)])
                    .then(([sourceTemplateExists, commonTemplateExists]) => {
                        const templateFile = sourceTemplateExists
                            ? sourceTemplateFile
                            : (commonTemplateExists ? commonTemplateFile : null)
                        let template: TemplateFn = defaultTemplate
                        
                        if (templateFile) {
                            try {
                                template = require(templateFile)
                            } catch (e) {
                                if ((e.message || '').indexOf('Cannot find module') === -1) console.warn(e.stack || e)
                            }
                        }

                        const distDir = path.dirname(outputFile)
                        const distFileName = path.basename(outputFile)
                        const defaultFileName = cutExt(distFileName) + '.html'

                        return Promise.resolve()
                            .then(() => template({
                                pkg: opts.pkg,
                                distDir,
                                env: opts.env || 'production',
                                mainUrl: (opts.baseUrl || '') + distFileName
                            }))
                            .then(data => Promise.all(
                                (data
                                    ? (data instanceof Array
                                        ? data
                                        : [{file: defaultFileName, data}]
                                    )
                                    : []
                                )
                                .map(rec => {
                                    const file = path.join(distDir, rec.file)
                                    if (cache.get(file) === rec.data) return null

                                    return fsExtra.ensureDir(path.dirname(file))
                                        .then(() => fsExtra.writeFile(file, rec.data))
                                })
                            ))
                    })
            }))
                .then(() => null)
        }
    }
}
