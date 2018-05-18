import * as path from 'path'
import {regExpEscape, normalizeName} from './nameHelpers'
import * as fsExtra from 'fs-extra'
import globby from 'globby'

export interface Resource {
    src: string
    target: string
}

export interface AssetsCollectorOptions {
    pkgRoot?: string
    pkgName: string
    isLib?: boolean | void
    pathPrefix?: string
    moduleDirs?: string[]
}

function sortBySrc(r1: Resource, r2: Resource): number {
    return r1.src < r2.src ? -1 : (r1.src > r2.src ? 1 : 0)
}

export class AssetsCollector {
    private dirsToSearch: Set<string> = new Set()
    private mask: RegExp
    private processed: Set<string> = new Set()
    private pathPrefix: string
    private internalResources: Resource[] = []
    private urlPrefix: string
    private nameDedupeMap: Map<string, number> = new Map()
    private pkgRoot: string
    private isLib: boolean

    constructor(
        {
            pkgRoot = process.cwd(),
            pkgName,
            isLib = false,
            pathPrefix = 'i',
            moduleDirs = ['node_modules', 'packages']
        }: AssetsCollectorOptions
    ) {
        const s = path.sep.replace('\\', '\\\\')
        const maskStr = `(.*(?:${moduleDirs.map(regExpEscape).join('|')})${s}(?:(?:@[^${s}]*${s}[^${s}]*)|(?:[^${s}]*))).*`
        this.mask = new RegExp(maskStr)
        this.urlPrefix = normalizeName(pkgName)
        this.pathPrefix = pathPrefix
        this.pkgRoot = pkgRoot
        this.isLib = isLib
    }

    addToSearch(id: string) {
        const isProcessed = this.processed.has(id)
        this.processed.add(id)
        if (!isProcessed && !this.isLib && id.indexOf(this.pkgRoot) === -1) {
            const matches = id.match(this.mask)
            const match = matches ? matches[1] : null
            if (match) this.dirsToSearch.add(match)
        }
    }

    addResource(id: string): string {
        const isProcessed = this.processed.has(id)
        this.processed.add(id)

        const name = path.basename(id)
        const extPos = name.lastIndexOf('.')
        const ext = name.substring(extPos)
        const nameWithoutExt = name.substring(0, extPos)

        let relativeUrl = this.urlPrefix + '/' + normalizeName(nameWithoutExt) + ext

        if (!isProcessed) {
            const count = this.nameDedupeMap.get(relativeUrl) || 0
            if (count > 0) {
                const pos = relativeUrl.lastIndexOf('.')
                relativeUrl = relativeUrl.substring(0, pos) + `_${count}` + relativeUrl.substring(pos)
            }

            this.nameDedupeMap.set(relativeUrl, count + 1)
            this.internalResources.push({
                src: id,
                target: this.addPrefix(relativeUrl.replace(/\//g, path.sep))
            })
        }

        return relativeUrl
    }

    private addPrefix(str: string): string {
        return this.pathPrefix ? path.join(this.pathPrefix, str) : str
    }

    getResources(): Promise<Resource[]> {
        const result: Resource[] = [...this.internalResources]

        return Promise.all(Array.from(this.dirsToSearch).map(dir => {
            const pkg = path.join(dir, 'package.json')

            return fsExtra.pathExists(pkg)
                .then(exists => exists ? fsExtra.readJson(pkg) : undefined)
                .then((subPkg?: {module?: string, main?: string}) => {
                    const main = subPkg && (subPkg.module || subPkg.main)
                    if (!main) return
                    const dist = path.join(dir, path.dirname(main), this.pathPrefix)

                    return <any>Promise.all([dist, <Promise<string[]>>globby(dist + '/**/*')])
                })
        }))
            .then((records: ([string, string[]])[]) => {
                for (let rec of records) {
                    if (!rec) continue
                    const [dist, files] = rec
                    for (let file of files) {
                        if (file.indexOf(dist) === 0) file = file.substring(dist.length + 1)
                        result.push({
                            src: path.join(dist, file),
                            target: this.addPrefix(file)
                        })
                    }
                }

                return result.sort(sortBySrc)
            })
    }

    reset() {
        this.dirsToSearch = new Set()
        this.internalResources = []
    }

    isEmpty() {
        return this.internalResources.length === 0 && this.dirsToSearch.size === 0
    }
}
