import {Plugin, OutputOptions, InputOptions} from 'rollup'
import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {createFilter} from 'rollup-pluginutils'
import {regExpEscape, normalizeName} from '@zerollup/helpers'

export interface AssetOptions {
    include?: string[]
    exclude?: string[]
    verbose?: number
    isLib?: boolean
    pkgRoot?: string
    configModule?: string
    moduleDirs?: string[]
    name?: string
}

export interface Resource {
    id: string
    targetPath: string
}

const tsTypes = path.resolve('..', '@types')

function assets(
    {
        include = [
            "**/*.woff",
            "**/*.woff2",
            "**/*.svg",
            "**/*.png",
            "**/*.jpg",
            "**/*.jpeg",
            "**/*.gif"
        ],
        exclude,
        verbose = 0,
        isLib: isLibRaw,
        pkgRoot = process.cwd(),
        configModule = '@zerollup/base-url',
        moduleDirs = ['node_modules', 'packages'],
        name: pkgName
    }: AssetOptions
): Plugin {
    let isLib: boolean | void = isLibRaw

    const filter = createFilter(include, exclude)
    const nameDedupeMap: Map<string, number> = new Map()
    const name = '@zerollup/plugin-assets'

    let dirsToSearch: Set<string> = new Set()
    let internalResources: Resource[] = []

    const s = path.sep.replace('\\', '\\\\')
    const maskStr = `(.*(?:${moduleDirs.map(regExpEscape).join('|')})${s}(?:(?:@[^${s}]*${s}[^${s}]*)|(?:[^${s}]*))).*`
    const mask = new RegExp(maskStr)
    const pathPrefix = 'i'
    const urlPrefix = normalizeName(pkgName || require(path.join(pkgRoot, 'package.json')).name)
    const processedIds: Set<string> = new Set()

    return {
        name,
        options(options: InputOptions): void {
            if (isLib === undefined) {
                isLib = options.external && (Array.isArray(options.external) ? options.external.filter(Boolean).length > 0: true)
            }
        },

        load(id: string): void | string {
            const processed = processedIds.has(id)
            processedIds.add(id)

            if (!filter(id)) {
                if (!processed && !isLib && id.indexOf(pkgRoot) === -1) {
                    const matches = id.match(mask)
                    const match = matches ? matches[1] : null
                    if (match) dirsToSearch.add(match)
                }
                return undefined
            }
            const name = path.basename(id)
            const extPos = name.lastIndexOf('.')
            const ext = name.substring(extPos)
            const nameWithoutExt = name.substring(0, extPos)

            let relativeUrl = (urlPrefix + '/' + normalizeName(nameWithoutExt) + ext)
            const count = nameDedupeMap.get(relativeUrl) || 0
            if (count > 0) {
                const pos = relativeUrl.lastIndexOf('.')
                relativeUrl = relativeUrl.substring(0, pos) + `_${count}` + relativeUrl.substring(pos)
            }

            if (!processed) {
                nameDedupeMap.set(relativeUrl, count + 1)
                internalResources.push({
                    id,
                    targetPath: path.join(pathPrefix, relativeUrl.replace(/\//g, path.sep))
                })
            }

            return `
import bu from '${configModule}'
export default bu.assets + ${JSON.stringify(relativeUrl)}
`
        },

        transformBundle(code: string, options: OutputOptions): Promise<any> {
            if (internalResources.length  === 0 && dirsToSearch.size === 0) return Promise.resolve(null)

            let externalResources: Promise<Resource[]> = Promise.resolve([])
            if (dirsToSearch.size > 0) {
                const extAssets: string[] = Array.from(dirsToSearch)

                if (verbose > 2) console.log(`${name} processing external: \n${extAssets.join("\n")}`)

                externalResources = Promise.all(extAssets.map(dir => {
                    const pkg = path.join(dir, 'package.json')

                    return fsExtra.pathExists(pkg)
                        .then(exists => exists ? fsExtra.readJson(pkg) : undefined)
                        .then((subPkg?: {module?: string, main?: string}) => {
                            const main = subPkg && (subPkg.module || subPkg.main)
                            if (!main) return undefined
                            const dist = path.join(dir, path.dirname(main), pathPrefix)
                            if (verbose > 1) console.log(`${name} try include: ${dist}`)

                            return fsExtra.pathExists(dist)
                                .then(exists => exists
                                    ? <Resource>{ id: dist, targetPath: pathPrefix }
                                    : undefined
                                )
                        })
                }))
                    .then(records => <Resource[]>records.filter(Boolean))
            }


            const targetRoot = options.file ? path.dirname(options.file) : options.dir
            if (!targetRoot) {
                throw new Error(`Can't find options.file or options.dir`)
            }

            const intResources = internalResources

            // do not copy same files on next onwrite call if multiple outputs
            dirsToSearch = new Set()
            internalResources = []

            return externalResources
                .then(extResources => {
                    const resources = intResources.concat(extResources)

                    if (!resources.length) return undefined

                    if (verbose) console.log(`${name} copy to ${path.resolve(targetRoot)}: \n${resources.map( v => v.id). join("\n")}`)

                    return Promise.all(resources.map(rec =>
                        fsExtra.copy(rec.id, path.join(targetRoot, rec.targetPath))
                            .catch(error => {
                                error.message += ' ' + JSON.stringify({
                                    from: rec.id,
                                    to: path.join(targetRoot, rec.targetPath),
                                    cwd: process.cwd()
                                }, null, '  ')
                                throw error
                            })
                    ))
                        .then(() => undefined)
                })
        }
    }
}

export interface Assets {
    (opts: AssetOptions): Plugin
    tsTypes: string
}

(<Assets>assets).tsTypes = tsTypes

export default <Assets> assets
