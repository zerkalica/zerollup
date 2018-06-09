import * as path from 'path'
import typescript from 'rollup-plugin-typescript2'
import * as fsExtra from 'fs-extra'

const cwd = process.cwd()
const pkgDir = path.join(cwd, 'packages')
const cache = {}

const filter = process.env.BUILD_PKG ? process.env.BUILD_PKG.split(',').map(str => str.trim()) : null

function packageFilter(dir) {
  return filter ? filter.indexOf(dir) !== -1 : dir
}

function sortByExternal({pkg: p1}, {pkg: p2}) {
    const deps1 = {...p1.dependencies, ...p1.devDependencies, ...p1.peerDependencies}
    const deps2 = {...p2.dependencies, ...p2.devDependencies, ...p2.peerDependencies}
    if (deps1[p2.name]) return 1
    if (deps2[p1.name]) return -1

    return 0
}


export default fsExtra.readdir(pkgDir)
    .then(dirs => Promise.all(dirs.filter(packageFilter).map(dir =>
        fsExtra.readJson(path.join(pkgDir, dir, 'package.json'))
            .then(pkg => ({
                pkg,
                pkgDir: path.join(pkgDir, dir),
                srcDir: path.join(pkgDir, dir, 'src')
            }))
    )))
    .then(
        recs => recs
        .sort(sortByExternal)
        .map(({pkg, pkgDir, srcDir}) => ({
                plugins: [
                    typescript({
                        abortOnError: true,
                        check: true,
                        exclude: ['*.spec*', '**/*.spec*'],
                        tsconfig: path.join(__dirname, 'tsconfig.json'),
                        tsconfigOverride: {
                            compilerOptions: {
                                paths: null,
                                rootDir: srcDir
                            },
                            include: [srcDir]
                        }
                    })
                ],
                cache,
                input: path.join(srcDir, 'index.ts'),
                external: Object.keys(
                    Object.assign({}, pkg.devDependencies, pkg.peerDependencies, pkg.dependencies)
                ).concat(['path', 'fs']),
                output: [
                    {
                        sourcemap: true,
                        format: 'es',
                        file: path.join(pkgDir, pkg.module)
                    },
                    {
                        sourcemap: true,
                        format: 'cjs',
                        file: path.join(pkgDir, pkg.main)
                    }
                ]
            }))
    )

