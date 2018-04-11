import * as fsExtra from 'fs-extra'
import {join} from 'path'
import globby from 'globby'
import {getPackageJson, PkgFileRec} from './getPackageJson'

export interface LernaJson {
    packages: string[]
}

export function getRepoPackages(repoRoot: string): Promise<PkgFileRec[]> {
    const lernaConfigPath = join(repoRoot, 'lerna.json')
    return fsExtra.pathExists(lernaConfigPath)
        .then(exists => exists ? fsExtra.readJson(lernaConfigPath): null)
        .then((lernaConfig?: LernaJson) => lernaConfig && lernaConfig.packages
            ? globby(lernaConfig.packages + '/package.json', {absolute: true})
            : []
        )
        .then((pkgFiles: string[]) => pkgFiles
            ? Promise.all(pkgFiles.map(getPackageJson))
            : []
        )
}
