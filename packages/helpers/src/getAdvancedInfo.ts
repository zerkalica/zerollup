import * as path from 'path'
import {NormalizedPkg} from './getPackageJson'
import {getInputs, MainConfig} from './getInputs'
import {getConfigs, Configs, SettingsConfig} from './getConfigs'
import {getNamedExports} from './getNamedExports'
import {Env} from './nameHelpers'

export interface AdvancedInfo {
    pkg: NormalizedPkg
    configs: (SettingsConfig | MainConfig)[]
    aliases: Record<string, string>
    namedExports: Record<string, string[]>
}

export function getAdvancedInfo(
    {pkg, aliases, env, globals, oneOfHost}: {
        pkg: NormalizedPkg
        oneOfHost?: string[] | void
        env: Env
        aliases: Record<string, string>
        globals: Record<string, string>
    }
): Promise<AdvancedInfo> {
    const {lib, json: {rollup}} = pkg
    return (lib
        ? Promise.resolve(<Configs | void>undefined)
        : getConfigs({pkg, globals, env, oneOfHost})
    )
        .then(configs => Promise.all([
            configs ? configs.configs : [],
            getInputs({pkg, globals, configs}),
            getNamedExports(rollup.namedExports)
        ]))
        .then(([rawConfigs, inputs, namedExports]) => {

            const configs: (SettingsConfig | MainConfig)[] = []

            for (let main of inputs) {
                configs.push(main)
                const mainFile = path.basename(main.output[0].file)
                for (let config of rawConfigs) {
                    configs.push(config)
                    if (main.env === config.env)
                        config.mainFiles.push(mainFile)
                }
            }

            return <AdvancedInfo> {
                pkg,
                aliases,
                namedExports,
                configs
            }
        })
}
