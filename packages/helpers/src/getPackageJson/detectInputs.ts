import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {HelpersError} from '../interfaces'

export class DetectInputsError extends HelpersError {}

export function detectInputs(srcDir: string, inputMatch: RegExp): Promise<string[]> {
    return fsExtra.pathExists(srcDir)
        .then(exists => {
            if (!exists) throw new DetectInputsError(`Sources must be in ${srcDir} directory`)
            return fsExtra.readdir(srcDir)
        })
        .then(dirList => Promise.all(dirList.sort().map(entry => {
            const file = path.join(srcDir, entry)
            return fsExtra.stat(file)
                .then(stat => stat.isFile() && inputMatch.test(entry) ? file : undefined)
        })))
        .then(files => {
            const filtered = <string[]>files.filter(Boolean)
            if (filtered.length === 0) throw new DetectInputsError(`No one ${inputMatch} file found in ${srcDir}`)
            return filtered
        })
}
