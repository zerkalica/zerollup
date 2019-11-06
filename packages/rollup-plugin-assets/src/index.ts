import {Plugin, OutputOptions, OutputBundle, LoadHook} from 'rollup'
import {readFile} from 'fs-extra'
import * as path from 'path'
import {createFilter} from 'rollup-pluginutils'
import {AssetsCollector} from '@zerollup/helpers'

export interface AssetOptions {
    include?: string[]
    verbose?: number
    isLib?: boolean
    pkgRoot?: string
    configModule?: string
    moduleDirs?: string[]
    name?: string
}

export default function assets(
    {
        include = [
            '**/*.woff',
            '**/*.woff2',
            '**/*.svg',
            '**/*.png',
            '**/*.jpg',
            '**/*.jpeg',
            '**/*.gif'
        ],
        verbose = 0,
        isLib,
        pkgRoot = process.cwd(),
        configModule = '@zerollup/base-url',
        moduleDirs = ['node_modules', 'packages'],
        name: pkgName
    }: AssetOptions
): Plugin {
    const name = '@zerollup/rollup-plugin-assets'

    const collector = new AssetsCollector({
        pkgName: pkgName || require(path.join(pkgRoot, 'package.json')).name,
        pkgRoot,
        isLib,
        moduleDirs
    })

    const filter = createFilter(include)

    return {
        name,
        load(id: string): ReturnType<LoadHook> {
            if (!filter(id)) {
                collector.addToSearch(id)
                return null
            }

            const relativeUrl = collector.addResource(id)

            return `
import bu from '${configModule}'
export default bu.assets + '${relativeUrl}'
`
        },

    generateBundle(options: OutputOptions, bundle: OutputBundle, isWrite: boolean): Promise<void> | void {
            if (collector.isEmpty()) return

            const resources = collector.getResources()
            collector.reset()

            return resources
                .then(resources => Promise.all(resources.map(resource =>
                    readFile(resource.src)
                        .then(data => ({
                            data,
                            target: resource.target,
                        }))
                        .catch(error => {
                                error.message += ' ' + JSON.stringify(resource, null, '  ')
                                throw error
                            })
                )))
                .then(items => {
                    for (let item of items) {
                        this.emitAsset(item.target, item.data)
                    }
                })
        }
    }
}
