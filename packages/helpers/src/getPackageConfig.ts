import {dirname, join} from 'path'
import {Pkg, Env} from './interfaces'
import {TargetFile, getTargets, getDistDir} from './getTargets'
import {BaseConfig, getBaseConfig} from './getBaseConfig'
import {PkgFileRec, isLib} from './getPackageJson'
import {getInputs, filterInputs} from './getInputs'
import {getAliases} from './getAliases'
import {getNamedExports} from './getNamedExports'
import {getExternal} from './getExternal'
import {HelpersError} from './interfaces'

export class GetPackageConfigError extends HelpersError {}

export interface CmdOptions {
    config: string
    watch: boolean
    cwd: string
    env: string
    target?: string
    verbose?: number
}

export interface PackageConfig {
    pkg: Pkg
    pkgPath: string
    repoRoot: string
    srcDir: string
    distDir: string
    inputs: string[]
    namedExports: Record<string, string[]>
    targets: TargetFile[]
    aliases: Record<string, string>
    lib: boolean
    baseConfig: BaseConfig[]
}

export interface PackageConfigOptions {
    pkgRoot: string
    watch: boolean
    env: Env
    repoRoot: string
    repoPkgs: PkgFileRec[]
}

export function checkEnv(env: string = process.env.NODE_ENV || 'production'): Env {
    if (env !== 'production' && env !== 'development') {
        throw new GetPackageConfigError(
            `checkEnv: NODE_ENV mast be only production or development, not ${env}, use separate entry point for different targets`
        )
    }

    return env
}

export function getCurrentPackage(
    {pkgRoot, repoPkgs}: {
        pkgRoot: string
        repoPkgs: PkgFileRec[]
    }
): PkgFileRec {
    const pkgPath = join(pkgRoot, 'package.json')
    const pkgRec = repoPkgs.find(pkg => pkg.file === pkgPath)
    if (!pkgRec) throw new GetPackageConfigError(`getCurrentPackage: Not found ${pkgPath} in list of repository packages: ${repoPkgs.map(rec => rec.file).join(', ')}`)
    return pkgRec
}

export function getPackageConfig(
    {pkgRoot, repoRoot, repoPkgs, env, watch}: PackageConfigOptions
): Promise<PackageConfig> {
    const {pkg, file: pkgPath} = getCurrentPackage({pkgRoot, repoPkgs})
    const lib = isLib(pkg)
    const external = lib ? getExternal(pkg) : []
    const srcDir = join(dirname(pkgPath), 'src')
    const aliases = getAliases({srcDir, repoPkgs, pkg, env})

    return Promise.all([
        getInputs({srcDir}),
        getNamedExports(pkg.rollup.namedExportsFrom)
    ])
        .then(([rawInputs, namedExports]) => {
            const inputs = watch && !lib ? filterInputs({inputs: rawInputs, srcDir}) : rawInputs
            const targets = getTargets({pkg, inputs, pkgPath})
            const distDir = getDistDir({targets, pkgPath})
            const baseConfig = getBaseConfig({pkg, external, inputs, pkgPath, targets, distDir})
            const packageConfig = {
                pkg,
                pkgPath,
                distDir,
                repoRoot,
                srcDir,
                inputs,
                namedExports,
                targets,
                aliases,
                lib,
                baseConfig
            }
            return packageConfig
        })
}
