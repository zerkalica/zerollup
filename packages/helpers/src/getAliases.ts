import {Pkg, Env} from './interfaces'
import * as fsExtra from 'fs-extra'
import {dirname, join} from 'path'
import globby from 'globby'

interface PkgFileRec {
    file: string
    pkg: Pkg
}

interface LernaJson {
    packages: string[]
}

function getLernaPackages(repoRoot: string): Promise<PkgFileRec[]> {
    const lernaConfigPath = join(repoRoot, 'lerna.json')
    return fsExtra.stat(lernaConfigPath)
        .then(stat => stat.isFile() ? fsExtra.readJson(lernaConfigPath): null)
        .then((lernaConfig?: LernaJson) => lernaConfig && lernaConfig.packages
            ? globby(lernaConfig.packages + '/package.json', {absolute: true}) as Promise<string[]>
            : [] as string[]
        )
        .then(pkgFiles => pkgFiles
            ? Promise.all(pkgFiles.map((file: string) =>
                fsExtra.readJson(file)
                    .then((pkg: Pkg) => ({pkg, file}))
            ))
            : []
        )
}

function getLernaAliases(repoRoot: string): Promise<Record<string, string>> {
    return getLernaPackages(repoRoot)
        .then(recs => recs.reduce(
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
        ))
}

export function getAliases(
    {srcDir, repoRoot, pkg: {name, rollup}, env, tildaRoot = true}: {
        srcDir: string
        pkg: Pkg
        env: Env
        tildaRoot?: boolean
        repoRoot: string
    }
): Promise<Record<string, string>> {
    return getLernaAliases(repoRoot)
        .then(lernaAliases => {
            const aliases: Record<string, string> = {
                ...lernaAliases,
                [name]: srcDir
            }
            if (tildaRoot) aliases['~'] = srcDir
        
            const stubs = rollup.productionStubs
            if (stubs && env === 'production') stubs.forEach(stub => aliases[stub] = 'empty/object')
            return aliases
        })
}
