import {Plugin} from 'rollup'
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

import fixDts from '@zerollup/plugin-fix-dts'
import template from '@zerollup/plugin-template'
import assets from '@zerollup/plugin-assets'
import {getRollupConfig, Config, CmdOptions} from '@zerollup/helpers'

export default function rollupConfig(options: CmdOptions): Promise<Config[]> {
    return getRollupConfig(options).then(rc => {
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
                check: rc.cmd.env === 'production',
                //clean: true,
                // verbosity: 5,
                exclude: ['*.spec*', '**/*.spec*'],
                tsconfig: path.join(rc.lernaRootDir, 'tsconfig.json'),
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: rc.isLib
                    }
                }
            }),
            rc.isLib && fixDts(),
            alias(rc.aliases),
            builtins(),
            assets({
                name: rc.pkg.name,
                pkgRoot: rc.cmd.cwd,
                isLib: rc.isLib
            }),
            rc.isLib || template({
                pkg: rc.pkg,
                env: rc.cmd.env,
                baseUrl: '/'
            }),
            replace({
                exclude: [
                    'node_modules/mobx/**'
                ],
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
            }),
            sourcemaps(),
            globals(),
            rc.cmd.watch && !rc.isLib && serve({
                open: true,
                // historyApiFallback: false,
                contentBase: rc.distDir
            }),
            rc.cmd.watch && !rc.isLib && livereload({
                watch: [rc.srcDir, rc.distDir]
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
        ].filter(Boolean)

        return rc.baseConfig.map(cfg => ({...cfg, plugins}))
    })
}
