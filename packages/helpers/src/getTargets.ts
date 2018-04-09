import {Pkg} from './interfaces'
import {ModuleFormat} from 'rollup'
import {dirname, basename} from 'path'
import {cutExt} from './nameHelpers'

export interface TargetFile {
    file: string
    format: ModuleFormat
    key: string
}

export const allSections: [string, ModuleFormat][] = [
    ['module', 'es'],
    ['main', 'cjs'],
    ['umd:main', 'umd'],
    ['iife:main', 'iife']
]

export function getDistDir(
    {targets, pkgPath}: {
        targets: TargetFile[]
        pkgPath: string
    }
): string {
    const targetDirs = targets.map(rec => dirname(rec.file))
    const distDir = targetDirs[0]
    if (targetDirs.indexOf(distDir) > 0) {
        const keysStr = `"${allSections.map(([key, format]) => key).join('", "')}"`
        throw new Error(
            `Some of target directories ${targets.map(rec => rec.file).join(', ')} differs in keys ${keysStr} in ${pkgPath}`
        )
    }

    return distDir
}

export function getTargets(
    {pkg, inputs, pkgPath}: {
        pkg: Pkg
        pkgPath: string
        inputs: string[]
    }
): TargetFile[] {
    const targets = allSections
        .map(([key, format]) => pkg[key] && {
            key,
            format,
            file: pkg[key]
        })
        .filter(Boolean)

    const inputNames = inputs.map(input => cutExt(basename(input)))
    const badOutputs = targets.filter(rec => inputNames.indexOf(cutExt(basename(rec.file))) === 0)

    if (badOutputs.length > 0) {
        const badEntries = badOutputs.map(rec => `"${rec.key}": "${rec.file}"`)
        throw new Error(
            `File names in values of ${badEntries.join(', ')} must be one of ${inputNames.join(', ')} in ${pkgPath}`
        )
    }

    return targets
}
