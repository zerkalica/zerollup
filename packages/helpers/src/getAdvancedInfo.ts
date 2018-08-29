import * as path from 'path'
import {NormalizedPkg} from './getPackageJson'
import {getMainConfig, MainConfig} from './getMainConfig'
import {getSettingsConfigs, SettingsConfig} from './getSettingsConfigs'
import {getNamedExports} from './getNamedExports'
import {Env} from './nameHelpers'

export interface AdvancedInfo {
    pkg: NormalizedPkg
    configs: (SettingsConfig | MainConfig)[]
    aliases: Record<string, string>
    namedExports: Record<string, string[]>
}

export function getAdvancedInfo(
    {pkg, aliases, globals, oneOfHost}: {
        pkg: NormalizedPkg
        oneOfHost?: string[] | void
        aliases: Record<string, string>
        globals: Record<string, string>
    }
): Promise<AdvancedInfo> {
    const {json: {rollup}, configs} = pkg

    return getNamedExports(rollup.namedExports)
        .then(namedExports => {
            const rawConfigs: SettingsConfig[] = configs
                ? getSettingsConfigs({pkg, oneOfHost, globals})
                : []

            const inputs = getMainConfig({
                pkg,
                globals,
                envs: configs && configs.envs,
            })
    
            const mixedConfigs: (SettingsConfig | MainConfig)[] = []

            for (let main of inputs) {
                mixedConfigs.push(main)
            }

            for (let main of inputs) {
                const mainFile = path.basename(main.output[0].file)
                for (let config of rawConfigs) {
                    mixedConfigs.push(config)
                    if (main.env === config.env)
                        config.mainFiles.push(mainFile)
                }
            }

            return <AdvancedInfo> {
                pkg,
                aliases,
                namedExports,
                configs: mixedConfigs
            }
        })
}
