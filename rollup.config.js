import * as fs from 'fs'
import * as path from 'path'
import typescript from 'rollup-plugin-typescript2'
import resolve from 'rollup-plugin-node-resolve'
import sourcemaps from 'rollup-plugin-sourcemaps'

const cwd = process.cwd()
const pkg = require(path.join(cwd, 'package.json'))
const lernaRoot = path.join(__dirname, 'packages')
const dirs = fs.readdirSync(lernaRoot)

export default {
    plugins: [
        typescript({
            abortOnError: true,
            check: true,
            exclude: ['*.spec*', '**/*.spec*'],
            tsconfig: path.join(__dirname, 'tsconfig.json'),
            tsconfigOverride: {
                // compilerOptions: {
                //     rootDir: cwd 
                // },
                include: [
                    __dirname + '/packages/*/src'
                ]
            }
        })
    ],
    input: 'src/index.ts',
    external: Object.keys(
        Object.assign({}, pkg.devDependencies, pkg.peerDependencies, pkg.dependencies)
    ).concat(['path', 'fs']),
    output: [
        {
            sourcemaps: true,
            format: 'es',
            file: pkg.module
        },
        {
            sourcemaps: true,
            format: 'cjs',
            file: pkg.main
        }
    ]
}
