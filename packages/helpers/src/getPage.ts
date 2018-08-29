import * as fsExtra from 'fs-extra'
import {Pkg} from './getPackageJson'

export interface BundleData {
    file: string
    data?: string | void
}

export interface TemplateFnOptions {
    pkg: Pkg
    pkgName: string
    baseUrl: string
    bundleData: BundleData[]
}

export type Template = Promise<string> | string 
export type TemplateFn = (opts: TemplateFnOptions) => Template
export type RequireFn = (module: string) => Promise<TemplateFn | void> | TemplateFn | void

export function defaultTemplate(
    {
        baseUrl,
        bundleData,
        pkg,
        pkgName,
    }: TemplateFnOptions
): string {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>${pkg.description || pkg.name}</title>
    </head>
    <body>
        <div id="${pkgName}"></div>
        ${bundleData.map(item =>
            `<script${item.file && !item.data ? ` src="${baseUrl}${item.file}" `: ''}>${item.data || ''}</script>`
        ).join('\n')}
    </body>
</html>
`
}

const templateFnCache: Map<string, Promise<TemplateFn | void>> = new Map()
function getTemplateFn(
    templateFile: string,
    require: RequireFn
): Promise<TemplateFn | void> {
    if (!templateFile) return Promise.resolve(defaultTemplate)

    let fn: Promise<TemplateFn | void> | void = templateFnCache.get(templateFile)
    if (fn) return fn

    fn = (templateFile ? fsExtra.pathExists(templateFile) : Promise.resolve(false))
        .then(exists => exists ? require(templateFile) : undefined)

    templateFnCache.set(templateFile, fn)
    return fn
}

export interface GetPagesOptions extends TemplateFnOptions {
    templateFn?: TemplateFn | string | void
}

export function getPage(
    opts: GetPagesOptions
): Promise<string> {
    return (
        typeof opts.templateFn === 'string'
            ? getTemplateFn(opts.templateFn, require)
            : Promise.resolve(opts.templateFn)
    )
        .then(templateFn => (templateFn || defaultTemplate)(opts))
}
