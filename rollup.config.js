import * as path from 'path'
import typescript from 'rollup-plugin-typescript2'

const cwd = process.cwd()
const pkg = require(path.join(cwd, 'package.json'))
const srcDir = path.join(cwd, 'src')

export default {
    plugins: [
        typescript({
            abortOnError: true,
            check: true,
            exclude: ['*.spec*', '**/*.spec*'],
            tsconfig: path.join(__dirname, 'tsconfig.json'),
            tsconfigOverride: {
                compilerOptions: {
                    paths: [],
                    rootDir: srcDir
                },
                include: [srcDir]
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
