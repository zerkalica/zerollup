import {Plugin, OutputOptions, OutputBundle} from 'rollup'
import {Pkg, getPage, cutExt, getExt} from '@zerollup/helpers'
import {emitPages} from '@zerollup/wait-all-async'

export interface TemplateBuilderOptions {
    env: string
    prerender?: string[] | void
    baseUrl: string
}

export interface TemplateOptions {
    pkg: Pkg
    pkgName: string
    allowedExts?: string[]
} 

type BundleRec = {data: string, file: string, env: string}
const defaultExts: string[] = [
    '.js'
]
export default class TemplatePluginFactory<Config> {
    private bundles: Promise<BundleRec[]>[] = []
    constructor(
        private opts: TemplateOptions
    ) {}

    bundleCollector(pluginOpts: {env: string}): Plugin {
        const {opts, bundles} = this
        let resolve: (v: BundleRec[]) => void
        const bundlePromise: Promise<BundleRec[]> = new Promise((res: (string) => void) => {
            resolve = res
        })
        bundles.push(bundlePromise)

        return {
            name: '@zerollup/rollup-plugin-template/bundleCollector',
            generateBundle(options: OutputOptions, bundle: OutputBundle, isWrite: boolean): Promise<void> | void {
                if (options.format !== 'iife' && options.format !== 'umd')
                throw new Error(`Config not in iife or umd format: ${options.format}`)
                const recs: BundleRec[] = []
                for (let key in bundle) {
                    if ((opts.allowedExts || defaultExts).indexOf(getExt(key)) === -1) continue
                    const chunk = bundle[key]
                    if (!chunk) continue
                    let data: string
                    if (typeof chunk === 'string') data = chunk
                    else if (chunk instanceof Buffer) data = chunk.toString()
                    else if (typeof chunk === 'object') data = chunk.code
                    if (data) {
                        recs.push({
                            data,
                            file: key,
                            env: pluginOpts.env,
                        })
                    }
                }
                resolve(recs)
            }
        }
    }

    templateBuilder(builderOpts: TemplateBuilderOptions): Plugin {
        const {opts} = this
        const bundlesPromises = Promise.all(this.bundles)
            .then(bundleSets => {
                const acc: BundleRec[] = []
                for (let bundles of bundleSets) {
                    for (let bundle of bundles) {
                        if (bundle.env === builderOpts.env) acc.push(bundle)
                    }
                }
                return acc
            })

        return {
            name: '@zerollup/rollup-plugin-template/templateBuilder',
            generateBundle(options: OutputOptions, bundle: OutputBundle, isWrite: boolean): Promise<void> | void {
                const keys = Object.keys(bundle)
                if (keys.length !== 1) {
                    throw new Error('Need one chunk of config module')
                }
                const configName = keys[0]
                const chunk = bundle[configName]
                if (!chunk) {
                    throw new Error('No data in config chunk file')
                }
                // const dest = options.dir || path.dirname(options.file)

                const configData: string = chunk instanceof Buffer
                    ? chunk.toString()
                    : (typeof chunk === 'object' ? chunk.code : chunk)

                return bundlesPromises
                    .then(bundles => {
                        const bundleData = [
                            {
                                file: configName,
                                data: configData,
                            },
                            ...bundles.map(bundle => ({
                                // data: bundle.data,
                                file: bundle.file,
                            })),
                        ]

                        return getPage({
                            pkg: opts.pkg,
                            pkgName: opts.pkgName,
                            bundleData,
                            baseUrl: builderOpts.baseUrl,
                        })
                            .then((page: string) => {
                                return builderOpts.prerender
                                    ? emitPages({
                                        page: builderOpts.prerender,
                                        bundle: configData + ';\n' + bundles.map(bundle => bundle.data).join(';\n'),
                                        template: page
                                    })
                                    : [
                                        {
                                            url: '/',
                                            file: cutExt(bundles[0].file) + '.html',
                                            data: page,
                                        }
                                    ]
                            })
                    })
                    .then(pages => {
                        for (let page of pages) {
                            this.emitAsset(page.file, page.data)
                        }
                    })
            }
        }
    }
}
