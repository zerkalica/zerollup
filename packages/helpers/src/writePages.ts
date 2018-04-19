import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {Page} from './getPages'
import {NormalizedPkg} from './getPackageJson'

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

export type Template = Promise<string | TemplatePage[] | void> | string | TemplatePage[] | void

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

export function getTemplateFn(templateFile?: string): Promise<TemplateFn | void> {
    if (!templateFile) return Promise.resolve(defaultTemplate)

    let fn: Promise<TemplateFn | void> | void = templateFnCache.get(templateFile)
    if (fn) return fn

    fn = (templateFile ? fsExtra.pathExists(templateFile) : Promise.resolve(false))
        .then(exists => exists ? require(templateFile) : undefined)

    templateFnCache.set(templateFile, fn)
    return fn
}

export function writePageData(
    {pages, distDir}: {
        pages: TemplatePage[]
        distDir: string
    }
): Promise<void> {
    return Promise.all(
        pages.map(page => {
            const templateFile = path.join(distDir, page.file)
            return fsExtra.ensureDir(path.dirname(templateFile))
                .then(() => fsExtra.writeFile(templateFile, page.data))
        })
    )
    .then(() => undefined)
}

export function getPageData({pkg, main, config}: Page): Promise<TemplatePage[]> {
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
        .then((data: string | TemplatePage[] | void) => {
            return (data instanceof Array
                    ? data
                    : (data ? [{data, file: defaultPageName}] : [])
                ).map(tp => ({
                    ...tp,
                    file: path.join(templateDir, tp.file)
                }))
        })
}

export function writePages(
    {pages, distDir}: {
        pages: Page[]
        distDir: string
    }
): Promise<void> {
    return Promise.all(pages.map(getPageData))
        .then(pageSets => pageSets.reduce(
            (acc, templatePages) => ([...acc, ...templatePages]),
            <TemplatePage[]>[]
        ))
        .then(pages => writePageData({pages, distDir}))
}
