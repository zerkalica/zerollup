import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {NormalizedPkg} from './getPackageJson'

import {SettingsConfig} from './getConfigs'
import {MainConfig, MainEnv} from './getInputs'
import {HelpersError} from './interfaces'

export class GetPagesError extends HelpersError {}

export interface TemplateFnOptions {
    pkg: NormalizedPkg
    baseUrl: string
    configFile?: string
    mainFile: string
    hostId: string
}

export interface Page {
    file: string
    data: string
}

export type Template = Promise<string | Page[] | void> | string | Page[] | void

export function defaultTemplate({pkg: {json, globalName}, baseUrl, configFile, mainFile}: TemplateFnOptions): Template {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>${json.description || json.name}</title>
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

export type TemplateFn = (opts: TemplateFnOptions) => Template

const templateFnCache: Map<string, Promise<TemplateFn | void>> = new Map()

function getTemplateFn(templateFile?: string): Promise<TemplateFn | void> {
    if (!templateFile) return Promise.resolve(defaultTemplate)

    let fn: Promise<TemplateFn | void> | void = templateFnCache.get(templateFile)
    if (fn) return fn

    fn = (templateFile ? fsExtra.pathExists(templateFile) : Promise.resolve(false))
        .then(exists => exists ? require(templateFile) : undefined)

    templateFnCache.set(templateFile, fn)
    return fn
}

interface InternalPage {
    pkg: NormalizedPkg
    main: MainEnv
    config: SettingsConfig
}

function pageToTemplatePage({pkg, main, config}: InternalPage): Promise<Page[]> {
    const input = main.ios.input
    const extPos = input.lastIndexOf('.')
    const inputExt = input.substring(extPos)
    const templateFile = input.substring(0, extPos) + '.html' + inputExt
    const defaultTemplateFile = path.join(path.dirname(input), 'default.html' + inputExt)

    const configPath = config.ios.output[0].file
    let templateDir = path.dirname(configPath)
    if (templateDir.indexOf(pkg.distDir) === 0) templateDir = templateDir.substring(pkg.distDir.length)
    const mainFile = path.basename(main.ios.output[0].file)

    const defaultPageName = mainFile.substring(0, mainFile.indexOf('.')) + '.html'

    const opts: TemplateFnOptions = {
        pkg,
        hostId: config.hostId,
        baseUrl: config.baseUrl,
        mainFile,
        configFile: path.basename(configPath)
    }

    return Promise.all([getTemplateFn(templateFile), getTemplateFn(defaultTemplateFile)])
        .then(([templateFn, defaultTemplateFn]) => (templateFn || defaultTemplateFn || defaultTemplate)(opts))
        .then((data: string | Page[] | void) => {
            return (data instanceof Array
                    ? data
                    : (data ? [{data, file: defaultPageName}] : [])
                ).map(tp => <Page>({
                    data: tp.data,
                    file: path.join(templateDir, tp.file)
                }))
        })
}

export function getPages(
    {input: {input, envs}, configs, pkg}: {
        input: MainConfig
        configs: SettingsConfig[]
        pkg: NormalizedPkg
    }
): Promise<Page[]> {
    const pages: InternalPage[] = configs.map(config => {
        const main = envs.find(rec => rec.env === config.env)
        if (!main) throw new GetPagesError(
            `Given envs ${envs.map(rec => rec.env).join(', ')}, needed ${config.env}`
        )
        return {
            pkg,
            config,
            main
        }
    })

    return Promise.all(pages.map(pageToTemplatePage))
        .then(pageSets => pageSets.reduce(
            (acc, templatePages) => ([...acc, ...templatePages]),
            <Page[]>[]
        ))
}
