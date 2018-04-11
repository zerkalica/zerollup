import {Pkg} from './interfaces'
import * as fsExtra from 'fs-extra'
import {isJsExt} from './nameHelpers'
import {HelpersError} from './interfaces'

export class GetPackageJsonError extends HelpersError {}

export function isLib(pkg: Pkg): boolean {
    return !pkg['iife:main'] || isJsExt(pkg.main) || isJsExt(pkg.module)
}

export interface PkgFileRec {
    file: string
    pkg: Pkg
}

export function getPackageJson(pkgPath: string): Promise<PkgFileRec> {
    return fsExtra.readJson(pkgPath)
        .then((pkg: Pkg) => {
            if (!pkg.name) throw new GetPackageJsonError(`No "name" key in ${pkgPath}`)
            if (!pkg.module && !pkg['iife:main']) throw new GetPackageJsonError(`No "module" or "iife:main" key in ${pkgPath}`)
            if (!pkg.main && !pkg['iife:main']) throw new GetPackageJsonError(`No "main" or "iife:main" key in ${pkgPath}`)
            if (!pkg.rollup) pkg.rollup = {}

            return {pkg, file: pkgPath}
        })
}
