import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {cutExt, getExt} from './nameHelpers'

export class GetInputsError extends HelpersError {}

export interface MainConfig {
    ios: Config
    templateFile?: string
    baseUrl: void
}

function getRawInputs(srcDir: string, inputMatch: RegExp): Promise<string[]> {
    return fsExtra.pathExists(srcDir)
        .then(exists => {
            if (!exists) throw new GetInputsError(`getInputs: Sources must be in ${srcDir} directory`)
            return fsExtra.readdir(srcDir)
        })
        .then(dirList => Promise.all(dirList.sort().map(entry => {
            const file = path.join(srcDir, entry)
            return fsExtra.stat(file)
                .then(stat => stat.isFile() && inputMatch.test(entry) ? file : undefined)
        })))
        .then(files => <string[]>files.filter(Boolean))
}

export function getInputs(
    {json: {rollup}, configGlobalName, globalName, external: rExternal, targets, lib, srcDir}: NormalizedPkg,
    rGlobals: Record<string, string>,
    configPath?: string | void
): Promise<MainConfig[]> {
    const inputMatch = new RegExp('.*index\..+')

    const external = configPath ? [...rExternal, configPath] : rExternal
    const globals = configPath ? {...rGlobals, [configPath]: configGlobalName} : rGlobals

    return (rollup.inputs ? Promise.resolve(rollup.inputs) : getRawInputs(srcDir, inputMatch))
        .then(files => {
            const file = files[0]
            const defaultTemplate = file ? path.dirname(file) + 'default.html' + getExt(file) : undefined
            return (defaultTemplate ? fsExtra.pathExists(defaultTemplate) : Promise.resolve(false))
                .then(defaultTemplateExists => Promise.all(files.map(file => {
                    const extPos = file.lastIndexOf('.')
                    const templateFile = file.substring(0, extPos) + '.html' + file.substring(extPos)

                    return fsExtra.pathExists(templateFile)
                        .then(templateExists => <MainConfig>({
                            templateFile: templateExists
                                ? templateFile
                                : (defaultTemplateExists ? defaultTemplate : undefined),
                            ios: {
                                input: file,
                                external,
                                output: targets.map(({file: outFile, format, ext}) => ({
                                    sourcemap: true,
                                    file: path.join(path.dirname(outFile), cutExt(path.basename(file))) + ext,
                                    format,
                                    globals,
                                    name: globalName
                                }))
                            }
                        }))
                })))
        })
        .then(inputs => {
            if (inputs.length === 0)
                throw new GetInputsError(`getInputs: No one ${inputMatch} file found in ${srcDir}`)
            return inputs
        })
}
