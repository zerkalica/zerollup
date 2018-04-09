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
    const name = '@zerollup/template'
    let inputs: string[]

    return {
        name,
        options(options: InputOptions) {
            inputs = typeof options.input === 'string' ? [options.input] : options.input
        },
        transformBundle(code: string, outputOptions: OutputOptions): Promise<null> {
            const outputFile = outputOptions.file
            return Promise.all(inputs.map(input => {
                const templateInput = path.join(path.dirname(input), 'prerender', path.basename(input))
                const srcExt = templateInput.substring(templateInput.lastIndexOf('.'))
                const sourceTemplateFile = cutExt(templateInput) + '.html' + srcExt
                const commonTemplateFile = cutExt(cutExt(templateInput)) + '.html' + srcExt

                return Promise.all([fsExtra.stat(sourceTemplateFile), fsExtra.stat(commonTemplateFile)])
                    .then(([stat, commonStat]) => {
                        const templateFile = stat.isFile()
                            ? sourceTemplateFile
                            : (commonStat.isFile() ? commonTemplateFile : null)

                        const template: TemplateFn = templateFile ? require(templateFile) : defaultTemplate

                        const distDir = path.dirname(outputFile)
                        const distFileName = path.basename(outputFile)
                        const defaultFileName = cutExt(distFileName) + '.html'

                        return Promise.resolve()
                            .then(() => template({
                                pkg: opts.pkg,
                                distDir,
                                env: opts.env || 'production',
                                mainUrl: (opts.baseUrl || '/') + distFileName
                            }))
                            .then(data => Promise.all(
                                (data
                                    ? (data instanceof Array
                                        ? data
                                        : [{file: defaultFileName, data}]
                                    )
                                    : []
                                )
                                .map(rec => fsExtra.writeFile(path.join(distDir, rec.file), rec.data))
                            ))
                    })
            }))
                .then(() => null)
        }
    }
}
