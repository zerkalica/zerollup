import {join, dirname} from 'path'
import {Pkg, Env} from './interfaces'
import {TargetFile, getTargets, getDistDir} from './getTargets'
import {BaseRollupConfig, getBaseConfig} from './getBaseConfig'
import {getPackageJson, isLib} from './getPackageJson'
import {getInputs} from './getInputs'
import {getAliases} from './getAliases'
import {getNamedExports} from './getNamedExports'
import {getExternals} from './getExternals'

export interface CmdOptions {
    config: string
    watch: boolean
    cwd: string
    env: Env
    target?: string
}

export interface RollupConfig {
    pkg: Pkg
    cmd: CmdOptions
    pkgPath: string
    repoRoot: string
    srcDir: string
    distDir: string
    inputs: string[]
    namedExports: Record<string, string[]>
    targets: TargetFile[]
    aliases: Record<string, string>
    isLib: boolean
    baseConfig: BaseRollupConfig[]
}

export function getRollupConfig(
    {
        cwd = process.cwd(),
        watch = false,
        config = join(process.cwd(), 'rollup.config.js'),
        target,
        env = (process.env.NODE_ENV || 'production') as Env
    }: Partial<CmdOptions> = {}
): Promise<RollupConfig> {
    if (env !== 'production' && env !== 'development') {
        throw new Error(`NODE_ENV mast be only production or development, not ${env}, use separate entry point for different targets`)
    }
    const repoRoot = dirname(config)
    const pkgPath = join(cwd, 'package.json')
    const srcDir = join(cwd, 'src')

    return getPackageJson(pkgPath)
        .then(pkg => Promise.all([
            pkg,
            getInputs({srcDir, target, watch}),
            getAliases({srcDir, repoRoot, pkg, env}),
            getNamedExports(pkg.rollup.namedExportsFrom)
        ]))
        .then(([pkg, inputs, aliases, namedExports]) => {
            const targets = getTargets({pkg, inputs, pkgPath})
            const externals = getExternals(pkg)
            const distDir = getDistDir({targets, pkgPath})
            const baseConfig = getBaseConfig({pkg, externals, inputs, pkgPath, targets, distDir})

            return {
                pkg,
                cmd: {watch, config, cwd, env},
                pkgPath,
                distDir,
                repoRoot,
                srcDir,
                inputs,
                namedExports,
                targets,
                aliases,
                isLib: isLib(pkg),
                baseConfig
            }
        })
}
