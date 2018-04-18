import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {cutExt} from './nameHelpers'
import {NormalizedPkg} from './getPackageJson'
import {SettingsConfig} from './getConfigs'

export interface TemplateFnOptions {
    pkg: NormalizedPkg
    baseUrl: string
    configFile: string
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
        <script src="${baseUrl + configFile}"></script>
        <script src="${baseUrl + mainFile}"></script>
        <script>${globalName}(document.getElementById('app'))</script>
    </body>
</html>
`
}

export interface Page extends TemplatePage, TemplateFnOptions {}

export type TemplateFn = (opts: TemplateFnOptions) => Template

const templateFnCache: Map<string, Promise<TemplateFn>> = new Map()

export function getTemplateFn(templateFile?: string): Promise<TemplateFn> {
    if (!templateFile) return Promise.resolve(defaultTemplate)

    let fn: Promise<TemplateFn> | void = templateFnCache.get(templateFile)
    if (fn) return fn

    fn = (templateFile ? fsExtra.pathExists(templateFile) : Promise.resolve(false))
        .then(exists =>
            exists ? require(templateFile) : defaultTemplate
        )

    templateFnCache.set(templateFile, fn)
    return fn
}


export function getPages(
    {templateFile, mainFile, configs, pkg}: {
        templateFile?: string
        mainFile: string
        configs: SettingsConfig[]
        pkg: NormalizedPkg
    }
): Promise<Page[]> {
    return getTemplateFn(templateFile)
        .then(templateFn => Promise.all(
            configs.map(config => {
                const configPath = config.ios.output[0].file
                let configDir = path.dirname(configPath)
                if (configDir.indexOf(pkg.distDir) === 0) configDir = configDir.substring(pkg.distDir.length)

                const opts = {
                    pkg,
                    hostId: config.hostId,
                    baseUrl: config.baseUrl,
                    mainFile,
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
                    : [{data, file: cutExt(mainFile) + '.html'}]

                for (let templatePage of pageData) {
                    const file = templatePage.file
                    pages.push({
                        ...opts,
                        ...templatePage,
                        file: path.join(configDir, file)
                    })
                }
            }

            return pages
        })
}
