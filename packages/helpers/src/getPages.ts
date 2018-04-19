import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {NormalizedPkg} from './getPackageJson'
import {SettingsConfig} from './getConfigs'
import {MainConfig} from './getInputs'
import {HelpersError} from './interfaces'

export class GetPagesError extends HelpersError {}

export interface TemplateFnOptions {
    pkg: NormalizedPkg
    baseUrl: string
    configFile?: string
    mainFile: string
    hostId: string
}

export interface TemplatePage {
    file: string
    data: string
}

export type Template = Promise<string | TemplatePage[] | null> | string | TemplatePage[] | null

export function defaultTemplate({pkg: {globalName}, baseUrl, configFile, mainFile}: TemplateFnOptions): Template {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>DEV template</title>
    </head>
    <body>
        <div id="app"></div>
        ${configFile ? `<script src="${baseUrl + configFile}"></script>` : ''}
        <script src="${baseUrl + mainFile}"></script>
        <script>${globalName}(document.getElementById('app'))</script>
    </body>
</html>
`
}

export interface Page extends TemplatePage, TemplateFnOptions {}

export type TemplateFn = (opts: TemplateFnOptions) => Template

const templateFnCache: Map<string, Promise<TemplateFn | void>> = new Map()

export function getTemplateFn(templateFile?: string): Promise<TemplateFn | void> {
    if (!templateFile) return Promise.resolve(defaultTemplate)

    let fn: Promise<TemplateFn | void> | void = templateFnCache.get(templateFile)
    if (fn) return fn

    fn = (templateFile ? fsExtra.pathExists(templateFile) : Promise.resolve(false))
        .then(exists => exists ? require(templateFile) : undefined)

    templateFnCache.set(templateFile, fn)
    return fn
}

export function getPages(
    {input: {input, envs}, configs, pkg}: {
        input: MainConfig
        configs: SettingsConfig[]
        pkg: NormalizedPkg
    }
): Promise<Page[]> {
    if (configs.length === 0) return Promise.resolve(<Page[]>[])
    const extPos = input.lastIndexOf('.')
    const inputExt = input.substring(extPos)
    const templateFile = input.substring(0, extPos) + '.html' + inputExt
    const defaultTemplateFile = path.join(path.dirname(input), 'default.html' + inputExt)

    return Promise.all([getTemplateFn(templateFile), getTemplateFn(defaultTemplateFile)])
        .then(([templateFn, defaultTemplateFn]) => templateFn || defaultTemplateFn || defaultTemplate)
        .then(templateFn => Promise.all(
            configs.map(config => {
                const configPath = config.ios.output[0].file
                let configDir = path.dirname(configPath)
                if (configDir.indexOf(pkg.distDir) === 0) configDir = configDir.substring(pkg.distDir.length)
                const mainEnv = envs.find(rec => rec.env === config.env)
                if (!mainEnv) throw new GetPagesError(
                    `Given envs ${envs.map(rec => rec.env).join(', ')}, needed ${config.env}`
                )
                const opts = {
                    pkg,
                    hostId: config.hostId,
                    baseUrl: config.baseUrl,
                    mainFile: path.basename(mainEnv.ios.output[0].file),
                    configFile: path.basename(configPath)
                }
                return Promise.all([opts, configDir, templateFn(opts)])
            })
        ))
        .then(pageSets => {
            const pages: Page[] = []
            for (let [opts, configDir, data] of pageSets) {
                if (!data) continue
                const pageData: TemplatePage[] = data instanceof Array
                    ? data
                    : [{
                        data,
                        file: opts.mainFile.substring(0, opts.mainFile.indexOf('.')) + '.html'
                    }]

                for (let templatePage of pageData) {
                    pages.push({
                        ...opts,
                        data: templatePage.data,
                        file: path.join(configDir, templatePage.file)
                    })
                }
            }

            return pages
        })
}
