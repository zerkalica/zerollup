import * as fsExtra from 'fs-extra'
import {basename, join} from 'path'

export function getInputs(
    {srcDir, target, watch}: {
        srcDir: string
        target?: string
        watch?: boolean
    }
): Promise<string[]> {
    return fsExtra.stat(srcDir)
        .then(stat => {
            if (!stat.isDirectory()) throw new Error(`Sources mast be in ${srcDir} directory`)
            return fsExtra.readdir(srcDir)
        })
        .then(srcFiles => {
            const rawInputs = srcFiles
                .filter(file => file.indexOf('index.') === 0)
                .map(file => join(srcDir, file))
            if (rawInputs.length === 0) throw new Error(`No index.* files found in ${srcDir}`)
            let inputs = rawInputs
            if (target) {
                let input = rawInputs.find(input => basename(input).indexOf(target) === 0)
                if (!input) throw new Error(`Need target ${target}.* file in ${srcDir}`)
                inputs = [input]
            } else if (watch) {
                let input = rawInputs.find(input => basename(input).indexOf('index.local.') === 0)
                if (!input) input = rawInputs.find(input => basename(input).indexOf('index.dev.') === 0)
                if (!input) throw new Error(`Watch mode, need index.local.* or index.dev.* files in ${srcDir}`)
                inputs = [input]
            }

            return inputs
        })
}

