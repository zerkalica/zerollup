import {basename, join} from 'path'
import {Pkg} from './interfaces'
import {TargetFile} from './getTargets'
import {cutExt, normalizeUmdName} from './nameHelpers';
import {ModuleFormat} from 'rollup'

export interface ConfigOutput {
    sourcemap: boolean
    file: string
    format: ModuleFormat
    globals?: string[]
    name?: string
}

export interface BaseRollupConfig {
    input: string
    output: ConfigOutput[]
    externals: string[]
}

export function getBaseConfig(
    {pkg, externals, inputs, pkgPath, targets, distDir}: {
        pkg: Pkg
        distDir: string
        targets: TargetFile[]
        externals: string[]
        inputs: string[]
        pkgPath: string
    }
): BaseRollupConfig[] {
    const config = inputs.map(input => ({
        input,
        externals,
        output: targets.map(({format}) => ({
            sourcemap: true,
            file: join(
                distDir,
                `${cutExt(basename(input))}${format && format !== 'iife' ? `.${format}` : ''}.js`
            ),
            format,
            globals: format === 'umd' && externals.map(normalizeUmdName),
            name: format === 'umd' && normalizeUmdName(cutExt(input))
        }))
    }))

    const files: string[] = config.reduce(
        (acc, cfg) => acc.concat(cfg.output.map(sec => sec.file)),
        []
    )

    const badTargets = targets.filter(rec => files.indexOf(rec.file) === -1).map(rec => `"${rec.key}": "${rec.file}"`)

    if (badTargets.length > 0) {
        throw new Error(
            `Not a valid value of {${badTargets.join(' and ')}}, need one of "${files.join('", "')}" in ${pkgPath}`
        )
    }

    return config
}
