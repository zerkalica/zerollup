import {ModuleFormat, Pkg} from './interfaces'
import {dirname, join} from 'path'
import {getName} from './nameHelpers'
import {HelpersError} from './interfaces'

export class GetTargetsError extends HelpersError {}

export interface SectionRec {
    key: string
    format: ModuleFormat
    ext: string
}

export interface TargetFile extends SectionRec {
    file: string
}

const allSections: SectionRec[] = [
    {key: 'module', format: 'es', ext: 'mjs'},
    {key: 'main', format: 'cjs', ext: 'cjs.js'},
    {key: 'umd:main', format: 'umd', ext: 'umd.js'},
    {key: 'iife:main', format: 'iife', ext: 'js'}
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
        const keysStr = `"${allSections.map(rec => rec.key).join('", "')}"`
        throw new GetTargetsError(
            `getDistDir: Some of target directories ${targets.map(rec => rec.file).join(', ')} differs in keys ${keysStr} in ${pkgPath}`
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
        .map(({key, format, ext}) => pkg[key] && {
            key,
            format,
            file: join(dirname(pkgPath), pkg[key]),
            ext
        })
        .filter(Boolean)

    const inputNames = inputs.map(input => getName(input))
    const badOutputs = targets.filter(rec =>
        inputNames.indexOf(getName(rec.file)) === -1
    )

    if (badOutputs.length > 0) {
        const badEntries = badOutputs.map(rec => `"${rec.key}": "${rec.file}"`)
        throw new GetTargetsError(
            `getTargets: File names in values of {${badEntries.join(', ')}} must be one of "${inputNames.join('", "')}" in ${pkgPath}`
        )
    }

    return targets
}
