import {Plugin, OutputOptions, InputOptions} from 'rollup'
import * as fsExtra from 'fs-extra'
import * as path from 'path'
import { createFilter } from "rollup-pluginutils"
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

export default function assets(
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
        verbose = 1,
        isLib: isLibRaw,
        pkgRoot = process.cwd(),
        configModule = '@zerollup/injector',
        moduleDirs = ['node_modules', 'packages'],
        name: pkgName
    }: AssetOptions = {}
): Plugin {
    let isLib: boolean = isLibRaw

    const filter = createFilter(include, exclude)
    const nameDedupeMap: Map<string, number> = new Map()
    const name = '@zerollup/assets'

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
        options(options: InputOptions) {
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

            let relativeUrl = (urlPrefix + '/' + normalizeName(path.basename(id)))
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
import {config} from '${configModule}'
export default config.assetsUrl + ${JSON.stringify(relativeUrl)}
`
        },

        transformBundle(code: string, options: OutputOptions): Promise<null> {
            if (internalResources.length  === 0 && dirsToSearch.size === 0) return Promise.resolve(null)

            let externalResources = null
            if (dirsToSearch.size > 0) {
                const extAssets: string[] = Array.from(dirsToSearch)

                if (verbose > 2) console.log(`${name} processing external: \n${extAssets.join("\n")}`)

                externalResources = Promise.all(extAssets.map(dir => {
                    const pkg = path.join(dir, 'package.json')

                    return fsExtra.stat(pkg)
                        .then(stat => stat.isFile() ? fsExtra.readJson(pkg) : null)
                        .then(subPkg => {
                            const main = subPkg && (subPkg.module || subPkg.main)
                            if (!main) return null
                            const dist = path.join(dir, path.dirname(main), pathPrefix)
                            if (verbose > 1) console.log(`${name} try include: ${dist}`)

                            return fsExtra.stat(dist)
                                .then(stat => stat.isFile() || stat.isDirectory()
                                    ? { id: dist, targetPath: pathPrefix }
                                    : null
                                )
                        })
                }))
                    .then(records => records.filter(Boolean))
            }

            let targetRoot = path.dirname(options.file)

            const promise = Promise.all([internalResources, externalResources])

            // do not copy same files on next onwrite call if multiple outputs
            dirsToSearch = new Set()
            internalResources = []

            return promise
                .then(([intResources, extResources]) => {
                    const resources = intResources.concat(extResources || [])

                    if (!resources.length) return null

                    if (verbose) console.log(`${name} copy to ${path.resolve(targetRoot)}: \n${resources.map( v => v.id). join("\n")}`)

                    return Promise.all(resources.map(rec =>
                        fsExtra.copy(rec.id, path.join(targetRoot, rec.targetPath))
                            .catch(error => {
                                console.error(error.message, {
                                    from: rec.id,
                                    to: path.join(targetRoot, rec.targetPath),
                                    cwd: process.cwd()
                                })
                                throw error
                            })
                    ))
                })
                .then(() => null)
        }
    }
}
