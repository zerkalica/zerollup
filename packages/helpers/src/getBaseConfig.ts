import {basename, join} from 'path'
import {Pkg} from './interfaces'
import {TargetFile} from './getTargets'
import {cutExt, normalizeUmdName} from './nameHelpers';
import {HelpersError, ModuleFormat} from './interfaces'

export class GetBaseConfigError extends HelpersError {}

export interface ConfigOutput {
    sourcemap: boolean
    file: string
    format: ModuleFormat
    globals?: string[]
    name?: string
}

export interface BaseConfig {
    input: string
    output: ConfigOutput[]
    external: string[]
}

export interface GetBaseConfigOptions {
    pkg: Pkg
    distDir: string
    targets: TargetFile[]
    external: string[]
    inputs: string[]
    pkgPath: string
}

export function getBaseConfig(
    {pkg, external, inputs, pkgPath, targets, distDir}: GetBaseConfigOptions
): BaseConfig[] {
    const config = inputs.map(input => ({
        input,
        external,
        output: targets.map(({format, ext}) => {
            const inputName = cutExt(basename(input))
            const strippedName = inputName.indexOf('index.') === 0
                ? inputName.substring('index.'.length)
                : inputName
            const umdName = normalizeUmdName(pkg.name + (strippedName ? ('/' + strippedName) : ''))

            return {
                sourcemap: true,
                file: join(distDir, `${inputName}.${ext}`),
                format,
                globals: format === 'umd' ? external.map(normalizeUmdName) : undefined,
                name: format === 'umd' ? umdName : undefined
            }
        })
    }))

    const files: string[] = config.reduce(
        (acc, cfg) => acc.concat(cfg.output.map(sec => sec.file)),
        []
    )

    const badTargets = targets.filter(rec => files.indexOf(rec.file) === -1).map(rec => `"${rec.key}": "${rec.file}"`)

    if (badTargets.length > 0 && !pkg['iife:main']) {
        throw new GetBaseConfigError(
            `getBaseConfig: Not a valid value of {${badTargets.join(' and ')}}, need one of "${files.join('", "')}" in ${pkgPath}`
        )
    }

    return config
}
