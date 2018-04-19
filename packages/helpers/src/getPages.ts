import {NormalizedPkg} from './getPackageJson'
import {SettingsConfig} from './getConfigs'
import {MainConfig, MainEnv} from './getInputs'
import {HelpersError} from './interfaces'

export class GetPagesError extends HelpersError {}

export interface Page {
    pkg: NormalizedPkg
    main: MainEnv
    config: SettingsConfig
}

export function getPages(
    {input: {input, envs}, configs, pkg}: {
        input: MainConfig
        configs: SettingsConfig[]
        pkg: NormalizedPkg
    }
): Page[] {
    return configs.map(config => {
        const main = envs.find(rec => rec.env === config.env)
        if (!main) throw new GetPagesError(
            `Given envs ${envs.map(rec => rec.env).join(', ')}, needed ${config.env}`
        )
        return <Page> {
            pkg,
            config,
            main
        }
    })
}
