import * as fsExtra from 'fs-extra'
import {basename, join} from 'path'
import {HelpersError} from './interfaces'
import {cutExt} from './nameHelpers'

export class GetInputsError extends HelpersError {}

const defaultResolveFiles = ['index.local', 'index.dev', 'index']

export function filterInputs(
    {
        inputs,
        srcDir,
        resolveFiles = defaultResolveFiles
    }: {
        inputs: string[]
        resolveFiles?: string[]
        srcDir: string
    }
): string[] {
    let targetInput = ''
    for (let file of resolveFiles) {
        for (let input of inputs) {
            const inp = basename(cutExt(input))
            if (file === inp) {
                targetInput = input
                break
            }
        }
        if (targetInput) break
    }

    if (!targetInput) {
        throw new GetInputsError(`filterInputs: No one index.* file found in "${inputs.join('", "')}" in ${srcDir}`)
    }

    return [targetInput]
}

export function getInputs(
    {
        srcDir,
        resolveFiles = defaultResolveFiles
    }: {
        resolveFiles?: string[]
        srcDir: string
    }
): Promise<string[]> {
    return fsExtra.pathExists(srcDir)
        .then(exists => {
            if (!exists) throw new GetInputsError(`getInputs: Sources must be in ${srcDir} directory`)
            return fsExtra.readdir(srcDir)
        })
        .then(srcFiles => {
            const rawInputs = srcFiles
                .sort()
                .filter(file => file.indexOf('index.') === 0)
                .map(file => join(srcDir, file))

            if (rawInputs.length === 0)
                throw new GetInputsError(`getInputs: No one of ${resolveFiles.join('.*, ')}.* file found in ${srcDir}`)
            return rawInputs
        })
}

