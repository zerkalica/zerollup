import {NormalizedPkg} from './getPackageJson'
import {getInputs, MainEnv} from './getInputs'
import {getPages, Page} from './getPages'
import {getConfigs, Configs, SettingsConfig} from './getConfigs'
import {getNamedExports} from './getNamedExports'
import {Env} from './nameHelpers'

export interface AdvancedInfo {
    pkg: NormalizedPkg
    configs: (SettingsConfig | MainEnv)[]
    pages: Page[]
    aliases: Record<string, string>
    namedExports: Record<string, string[]>
}

export function getAdvancedInfo(
    {pkg, aliases, env, globals, oneOfHost}: {
        pkg: NormalizedPkg
        oneOfHost?: string[] | void
        env?: Env | void
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
            getInputs({
                pkg,
                globals,
                aliases,
                configs
            }),
            getNamedExports(rollup.namedExports)
        ]))
        .then(([configs, inputs, namedExports]) => {
            return Promise.all(inputs.map(input =>
                getPages({
                    input,
                    configs,
                    pkg
                })
            ))
                .then(pageSets => {
                    return <AdvancedInfo> {
                        pages: pageSets.reduce((acc, pages) => ([...acc, ...pages]), <Page[]>[]),
                        pkg,
                        aliases,
                        namedExports,
                        configs: [
                            ...inputs.reduce((acc, rec) => ([...acc, ...rec.envs]), <MainEnv[]>[]),
                            ...configs
                        ]
                    }
                })
        })
}
