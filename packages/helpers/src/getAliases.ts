import {Pkg, Env} from './interfaces'
import {dirname, join} from 'path'
import {PkgFileRec} from './getPackageJson'

export function getAliases(
    {srcDir, repoPkgs, pkg: {name, rollup}, env, tildaRoot = true}: {
        srcDir?: string
        pkg: Pkg
        env: Env
        tildaRoot?: boolean
        repoPkgs?: PkgFileRec[]
    }
): Record<string, string> {
    const aliases: Record<string, string> = (repoPkgs || []).reduce(
        (acc, {pkg, file}) => {
            const modPath = pkg.module || pkg.main
            return modPath
                ? {
                    ...acc,
                    [pkg.name]: join(dirname(file), modPath)
                }
                : acc
        },
        {}
    )
    if (srcDir) {
        aliases[name] = srcDir
        if (tildaRoot) aliases['~'] = srcDir
    }

    const stubs = rollup.productionStubs
    if (stubs && env === 'production') stubs.forEach(stub => aliases[stub] = 'empty/object')

    return aliases
}
