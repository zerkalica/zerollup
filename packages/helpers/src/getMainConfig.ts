import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {Env, cutExt} from './nameHelpers'

export class GetMainConfigError extends HelpersError {}

export interface MainConfig extends Config {
    t: 'main'
    env: Env
}

export function getMainConfig(
    {
        pkg: {json: {rollup}, inputs, configs, globalName, external: rExternal, targets, lib, srcDir},
        globals: rGlobals,
        envs = ['production'],
    } : {
        globals : Record<string, string>
        pkg: NormalizedPkg
        envs?: Env[]
    }
): MainConfig[] {
    const defaultConfigPath = configs && configs.defaultConfig && configs.defaultConfig.file
    const external = defaultConfigPath ? [...rExternal, defaultConfigPath] : rExternal
    const globals = defaultConfigPath && configs ? {...rGlobals, [defaultConfigPath]: configs.configGlobalName} : rGlobals

    const result: MainConfig[] = []

    for (let file of inputs) {
        for (let env of envs) {
            result.push({
                t: 'main',
                env,
                input: file,
                external,
                output: targets.map(({file: outFile, format, ext}) => ({
                    sourcemap: true,
                    assetFileNames: '[name][extname]',
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
}
