import {Plugin, OutputOptions} from 'rollup'
import * as fsExtra from 'fs-extra'
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
        load(id: string): void | string {
            if (!filter(id)) {
                collector.addToSearch(id)
                return
            }

            const relativeUrl = collector.addResource(id)

            return `
import bu from '${configModule}'
export default bu.assets + '${relativeUrl}'
`
        },

        transformBundle(code: string, options: OutputOptions): Promise<any> {
            if (collector.isEmpty()) return Promise.resolve()

            const targetRoot = options.file ? path.dirname(options.file) : options.dir
            if (!targetRoot) {
                throw new Error(`Can't find options.file or options.dir`)
            }

            const resources = collector.getResources()
            collector.reset()

            return resources
                .then(resources => Promise.all(resources.map(resource => 
                    fsExtra.copy(resource.src, path.join(targetRoot, resource.target))
                        .catch(error => {
                            error.message += ' ' + JSON.stringify({
                                ...resource,
                                targetRoot
                            }, null, '  ')
                            throw error
                        })
                )))
                .then(() => undefined)
        }
    }
}
