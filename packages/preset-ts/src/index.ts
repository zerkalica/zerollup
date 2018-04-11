import {InputOptions, OutputOptions, WatcherOptions, Plugin, CachedChunkSet} from 'rollup'
import * as path from 'path'
import typescript from 'rollup-plugin-typescript2'
import uglify from 'rollup-plugin-uglify'
import resolve from 'rollup-plugin-node-resolve'
import globals from 'rollup-plugin-node-globals'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import sourcemaps from 'rollup-plugin-sourcemaps'
import alias from 'rollup-plugin-alias'
import builtins from 'rollup-plugin-node-builtins'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import {minify} from 'uglify-es'

import notify from '@zerollup/plugin-notify'
import template from '@zerollup/plugin-template'
import assets from '@zerollup/plugin-assets'
import {getRepoPackages, getPackageConfig, checkEnv, CmdOptions} from '@zerollup/helpers'

export type Config = OutputOptions & InputOptions & WatcherOptions

export default function rollupConfig({watch, config, target}: CmdOptions): Promise<Config[]> {
    const cache: CachedChunkSet = { chunks: {} }
    const cwd = process.cwd()
    const env = checkEnv()
    const repoRoot = typeof config === 'string'
        ? path.resolve(path.dirname(config).replace(/^node:.*/, ''))
        : cwd
    const selectedPackage = process.env.PACKAGE

    return getRepoPackages(repoRoot)
        .then(repoPkgs => {
            const commonPlugins: Plugin[] = [
                builtins(),
                sourcemaps(),
                globals(),
                watch && notify({pkgName: repoPkgs[0].pkg.name}),
                replace({
                    exclude: [
                        'node_modules/mobx/**'
                    ],
                    'process.env.NODE_ENV': JSON.stringify(env)
                }),
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

            const selectedPackageRoots: string[] = cwd === repoRoot
                ? repoPkgs
                    .map(rec => path.dirname(rec.file))
                    .filter(dir => selectedPackage ? path.basename(dir) === selectedPackage : true)
                : [cwd]

            return Promise.all(selectedPackageRoots.map(
                (pkgRoot, index) => getPackageConfig({pkgRoot, repoRoot, repoPkgs, env, watch})
                    .then(rc => {
                        const plugins: Plugin[] = [
                            resolve({
                                extensions: ['.ts', '.js', '.json'],
                                jsnext: true
                            }),
                            commonjs({
                                namedExports: rc.namedExports
                            }),
                            typescript({
                                abortOnError: true,
                                // cacheRoot: path.join(__dirname, '..', `.rpt2_cache_${process.env.NODE_ENV}`),
                                check: env === 'production',
                                //clean: true,
                                // verbosity: 5,
                                exclude: ['*.spec*', '**/*.spec*'],
                                tsconfig: path.join(rc.repoRoot, 'tsconfig.json'),
                                // tsconfigOverride: rc.lib
                                //     ? {
                                //         compilerOptions: {
                                //             declaration: true,
                                //             paths: [],
                                //             rootDir: rc.srcDir,
                                //             typeRoots: [
                                //                 path.join(rc.repoRoot, '@types')
                                //             ]
                                //         },
                                //         include: [rc.srcDir]
                                //     }
                                //     : {
                                //         compilerOptions: {
                                //             declaration: false,
                                //             typeRoots: [
                                //                 path.join(rc.repoRoot, '@types')
                                //             ]
                                //         }
                                //     }
                            }),
                            alias(rc.aliases),

                            assets({
                                name: rc.pkg.name,
                                pkgRoot,
                                isLib: rc.lib
                            }),

                            rc.lib || template({
                                pkg: rc.pkg,
                                env: env
                            }),
                            watch && !rc.lib && serve({
                                open: false,
                                port: 10001 + index,
                                // historyApiFallback: false,
                                contentBase: rc.distDir
                            }),
                            watch && !rc.lib && livereload({
                                port: 35729 + index,
                                watch: [pkgRoot] // rc.srcDir, rc.distDir, 
                            }),
                            ...commonPlugins
                        ].filter(Boolean)

                        return rc.baseConfig.map(cfg => {
                            return {...cfg, cache, plugins}
                        })
                    })
            ))
        })
        .then(configSets => configSets.reduce((acc, config) => acc.concat(config), []))
}
