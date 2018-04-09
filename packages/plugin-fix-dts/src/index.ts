import {Plugin, OutputOptions, InputOptions} from 'rollup'
import {join, resolve, dirname, basename} from 'path'
import * as fsExtra from 'fs-extra'

function replaceExt(name, ext) {
    const pos = name.lastIndexOf('.')
    return (pos === -1 ? name : name.substring(0, pos)) + ext
}

export interface FixDtsOptions {
    pkgRoot?: string
    verbose?: number
    newDtsRoot?: string
    declarationsDirName?: string
}

export default function fixDts(
    {
        pkgRoot = process.cwd(),
        verbose = 0,
        newDtsRoot = '@types',
        declarationsDirName = 'packages'
    }: FixDtsOptions = {}
): Plugin {
    const generated: Set<string> = new Set()
    let input: string = ''
    const name = '@zerollup/fixDts'

    return {
        name,
        options({input: inp}: InputOptions) {
            input = (inp && (typeof inp === 'string' ? inp : inp[0])) || ''
        },

        transformBundle(code: string, outputOptions: OutputOptions): Promise<null> {
            const dist = resolve(dirname(outputOptions.file))
            const declRoot = join(dist, declarationsDirName)
            const relativeSrcRoot = resolve(dirname(input)).substring(resolve(pkgRoot).length + 1)
            const declDir = join(declRoot, basename(pkgRoot), relativeSrcRoot)

            const target = join(dist, newDtsRoot)

            if (generated.has(target)) return Promise.resolve(null)
            generated.add(target)

            const dtsName = replaceExt(basename(input), '.d.ts')
            const declFile = join(declDir, dtsName)

            if (verbose > 1) console.log(name, 'is exists', declFile)
            if (verbose > 1) console.log(name, 'try move', declDir, 'to', target)

            return fsExtra.stat(declFile)
                .then(stat => stat.isFile()
                    ? fsExtra.move(declDir, target, { overwrite: true })
                        .catch(error => {
                            console.error(name, 'error move', declDir, 'to', target)
                            throw error
                        })
                        .then(() => fsExtra.remove(declRoot)
                            .catch(error => {
                                console.error(name, 'error remove', declRoot)
                                throw error
                            })
                        )
                        .then(() => {
                            if (verbose) console.log(name, declDir, 'moved to', target)
                        })
                    : null
                )
                .then(() => null)
        }
    }
}
