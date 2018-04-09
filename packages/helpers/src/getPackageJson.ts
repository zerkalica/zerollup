import {Pkg} from './interfaces'
import * as fsExtra from 'fs-extra'
import {isJsExt} from './nameHelpers'

export function isLib(pkg: Pkg): boolean {
    return !pkg['iife:main'] || isJsExt(pkg.main) || isJsExt(pkg.module)
}

export function getPackageJson(pkgPath: string): Promise<Pkg> {
    return fsExtra.readJson(pkgPath)
        .then((pkg: Pkg) => {
            if (!pkg.name) throw new Error(`No "name" key in ${pkgPath}`)
            if (!pkg.module && !pkg['iife:main']) throw new Error(`No "module" or "iife:main" key in ${pkgPath}`)
            if (!pkg.main && !pkg['iife:main']) throw new Error(`No "main" or "iife:main" key in ${pkgPath}`)
            if (!pkg.rollup) pkg.rollup = {}

            return pkg
        })
}
