import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {Env, cutExt} from './nameHelpers'
import {Configs} from './getConfigs'

export class GetInputsError extends HelpersError {}

export interface MainEnv {
    env: Env
    ios: Config
    baseUrl?: void
}

export interface MainConfig {
    input: string
    envs: MainEnv[]
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
        configs,
        aliases
    } : {
        aliases: Record<string, string>
        globals : Record<string, string>
        pkg: NormalizedPkg
        configs?: Configs | void
    }
): Promise<MainConfig[]> {
    const inputMatch = new RegExp('.*index\..+')

    const external = configs ? [...rExternal, configs.defaultConfigPath] : rExternal
    const globals = configs ? {...rGlobals, [configs.defaultConfigPath]: configGlobalName} : rGlobals
    const envs: Env[] = configs ? configs.envs : ['production']

    return (rollup.inputs ? Promise.resolve(rollup.inputs) : getRawInputs(srcDir, inputMatch))
        .then(files => files.map(file => <MainConfig>({
                input: file,
                envs: envs.map(env => <MainEnv>({
                    env,
                    ios: {
                        input: file,
                        external,
                        output: targets.map(({file: outFile, format, ext}) => ({
                            sourcemap: true,
                            file: path.join(path.dirname(outFile), cutExt(path.basename(file)))
                                + (env === 'production' ? '' : `.${env}`)
                                + ext,
                            format,
                            globals,
                            name: globalName
                        }))
                    }
                }))
            })
        ))
}
