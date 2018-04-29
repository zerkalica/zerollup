import {InputOptions, OutputOptions, WatcherOptions, Plugin} from 'rollup'
import * as path from 'path'
import typescript from 'rollup-plugin-typescript2'
import uglify from 'rollup-plugin-uglify'
import resolve from 'rollup-plugin-node-resolve'
import globals from 'rollup-plugin-node-globals'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import sourcemaps from 'rollup-plugin-sourcemaps'
import builtins from 'rollup-plugin-node-builtins'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import {minify} from 'uglify-es'

import notify from '@zerollup/plugin-notify'
import assets from '@zerollup/plugin-assets'
import {getPackageSet, writePages} from '@zerollup/helpers'
import tsTransformPaths from '@zerollup/ts-transform-paths'
import {createTransformerChain} from '@zerollup/ts-helpers'

export type Config = OutputOptions & InputOptions & WatcherOptions

const transformers = createTransformerChain([tsTransformPaths])

const nodePrefix = 'node:'

export default function rollupConfig(
    {watch, config}: {
        watch?: boolean
        config?: string
    }
): Promise<Config[]> {
    const cache = { modules: [] }

    return getPackageSet({
        pkgRoot: config && config.indexOf(nodePrefix) === -1
            ? path.resolve(path.dirname(config))
            : process.cwd(),

        env: process.env.BUILD_ENV || process.env.NODE_ENV || 'production',

        oneOfHost: process.env.BUILD_CONFIG
            ? process.env.BUILD_CONFIG.split(',').map(n => n.trim())
            : (watch ? ['local', 'dev'] : undefined),

        selectedNames: process.env.BUILD_PKG
            ? process.env.BUILD_PKG.split(',').map(n => n.trim())
            : undefined
    }).then(({repoRoot, packageSet, namedExports, paths}) => {
        const commonPlugins: Plugin[] = [
            builtins(),
            globals(),
            sourcemaps(),
            watch && notify(),
            process.env.UGLIFY && uglify({
                warnings: true,
                compress: {
                    reduce_vars: false,
                    dead_code: true,
                    unused: true,
                    toplevel: true,
                    warnings: true
                },
                mangle: {
                    properties: false,
                    toplevel: false
                }
            }, minify)
        ]
        return Promise.all(packageSet.map(({pkg, configs, pages}, pkgIndex) => {
            const pkgPlugins: Plugin[] = [
                resolve({
                    extensions: ['.mjs', '.js', '.json'],
                    jsnext: true
                }),
                commonjs({
                    include: 'node_modules/**',
                    namedExports
                }),  
                assets({
                    name: pkg.json.name,
                    pkgRoot: pkg.pkgRoot,
                    isLib: pkg.lib
                }),
                typescript({
                    abortOnError: true,
                    check: !watch,
                    clean: true,
                    exclude: ['*.spec*', '**/*.spec*'],
                    tsconfig: path.join(repoRoot, 'tsconfig.base.json'),
                    useTsconfigDeclarationDir: true,
                    transformers,
                    tsconfigOverride: {
                        compilerOptions: {
                            baseUrl: repoRoot,
                            paths: {
                                ...paths,
                                [pkg.json.name]: [pkg.srcDir]
                            },
                            rootDir: pkg.srcDir,
                            declarationDir: pkg.declarationDir,
                            declaration: pkg.lib
                        },
                        include: [pkg.srcDir]
                    }
                }),
                ...commonPlugins,
            ]

            const configSet = configs.map((config, i) => ({
                input: config.ios.input,
                output: config.ios.output,
                external: config.ios.external,
                cache,
                plugins: <Plugin[]>[
                    ...pkgPlugins,
                    replace({
                        values: {
                            'process.env.BROWSER': JSON.stringify(!pkg.lib),
                            'process.env.NODE_ENV': JSON.stringify(config.env)
                        }
                    }),
                    config.baseUrl && replace({
                        include: [
                            `${pkg.configDir}/*`
                        ],
                        values: {
                            'PKG_NAME': pkg.urlName,
                            'PKG_VERSION': pkg.json.version,
                            'ZEROLLUP_CONFIG_BASE_URL': config.baseUrl
                        }
                    }),
                    i === 0 && watch && !pkg.lib && serve({
                        open: false,
                        port: 10001 + pkgIndex,
                        // historyApiFallback: false,
                        contentBase: pkg.distDir
                    }),
                    i === 0 && watch && !pkg.lib && livereload({
                        port: 35729 + pkgIndex,
                        watch: [pkg.pkgRoot] // pkg.srcDir, pkg.distDir, 
                    }),
                ].filter(Boolean)
            }))

            return writePages({pages, distDir: pkg.distDir})
                .then(() => configSet)
        }))
            .then(packageSetConfig => packageSetConfig.reduce((acc, config) => acc.concat(config), []))
    })
}
