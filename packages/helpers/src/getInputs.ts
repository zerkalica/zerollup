import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {Env, cutExt} from './nameHelpers'
import {Configs} from './getConfigs'

export class GetInputsError extends HelpersError {}

export interface MainConfig extends Config {
    t: 'main'
    env: Env
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
        .then(files => {
            const filtered = <string[]>files.filter(Boolean)
            if (filtered.length === 0) throw new GetInputsError(`getInputs: No one ${inputMatch} file found in ${srcDir}`)
            return filtered
        })
}

export function getInputs(
    {
        pkg: {json: {rollup}, configGlobalName, globalName, external: rExternal, targets, lib, srcDir},
        globals: rGlobals,
        configs
    } : {
        globals : Record<string, string>
        pkg: NormalizedPkg
        configs?: Configs | void
        envs?: Env[]
    }
): Promise<MainConfig[]> {
    const inputMatch = new RegExp('.*index\..+$')

    const external = configs ? [...rExternal, configs.defaultConfigPath] : rExternal
    const globals = configs ? {...rGlobals, [configs.defaultConfigPath]: configGlobalName} : rGlobals

    const envs: Env[] = configs
        ? configs.configs.reduce((acc, config) => {
            if (acc.indexOf(config.env) === -1) acc.push(config.env)
            return acc
        }, <Env[]>[])
        : ['production']

    return (rollup.inputs ? Promise.resolve(rollup.inputs) : getRawInputs(srcDir, inputMatch))
        .then(files => {
            const result: MainConfig[] = []
            for (let file of files) {
                for (let env of envs) {
                    result.push({
                        t: 'main',
                        env,
                        input: file,
                        external,
                        output: targets.map(({file: outFile, format, ext}) => ({
                            sourcemap: true,
                            file: path.join(path.dirname(outFile), cutExt(path.basename(file)))
                                + (!env || env === 'production' ? '' : `.${env}`)
                                + ext,
                            format,
                            globals,
                            name: globalName
                        }))
                    })
                }
            }
            return result
        })
}
