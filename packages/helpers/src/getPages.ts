import * as fsExtra from 'fs-extra'
import {Pkg} from './getPackageJson'

export interface TemplateFnOptions<Config> {
    pkg: Pkg
    baseUrl: string
    configFile?: string | void
    config?: Config | void
    mainFile: string
    pkgName: string
}

export interface Page {
    file: string
    data: string
}

export type Template = Promise<string | Page[] | void> | string | Page[] | void
export type TemplateFn<Config> = (opts: TemplateFnOptions<Config>) => Template
export type RequireFn<Config> = (module: string) => Promise<TemplateFn<Config> | void> | TemplateFn<Config> | void

export function defaultTemplate<Config>(
    {
        config,
        pkg, pkgName, baseUrl, configFile, mainFile
    }: TemplateFnOptions<Config>
): Template {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>${pkg.description || pkg.name}</title>
    </head>
    <body>
        <div id="${pkgName}"></div>
        ${config
            ? `<script>${config}</script>`
            : configFile ? `<script src="${baseUrl + configFile}"></script>` : ''
        }
        <script src="${baseUrl + mainFile}"></script>
    </body>
</html>
`
}

const templateFnCache: Map<string, Promise<TemplateFn<any> | void>> = new Map()
function getTemplateFn<Config>(
    templateFile: string,
    require: RequireFn<Config>
): Promise<TemplateFn<Config> | void> {
    if (!templateFile) return Promise.resolve(defaultTemplate)

    let fn: Promise<TemplateFn<Config> | void> | void = templateFnCache.get(templateFile)
    if (fn) return fn

    fn = (templateFile ? fsExtra.pathExists(templateFile) : Promise.resolve(false))
        .then(exists => exists ? require(templateFile) : undefined)

    templateFnCache.set(templateFile, fn)
    return fn
}

export interface GetPagesOptions<Config> extends TemplateFnOptions<Config> {
    templateFn?: TemplateFn<Config> | string | void
}

export function getPages<Config>(
    opts: GetPagesOptions<Config>
): Promise<Page[]> {
    const defaultPageName = opts.mainFile.substring(0, opts.mainFile.indexOf('.')) + '.html'

    return (
        typeof opts.templateFn === 'string'
            ? getTemplateFn(opts.templateFn, require)
            : Promise.resolve(opts.templateFn)
    )
        .then(templateFn => (templateFn || defaultTemplate)(opts))
        .then((data: string | Page[] | void) => (
            data instanceof Array
                ? data
                : (data
                    ? [<Page>{data, file: defaultPageName}]
                    : <Page[]>[]
                )
        ))
}
