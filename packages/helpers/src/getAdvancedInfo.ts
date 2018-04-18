import * as path from 'path'
import {NormalizedPkg} from './getPackageJson'
import {getInputs, MainConfig} from './getInputs'
import {getPages, Page} from './getPages'
import {getConfigs, Configs, SettingsConfig} from './getConfigs'
import {getNamedExports} from './getNamedExports'

export interface AdvancedInfo {
    pkg: NormalizedPkg
    configs: (SettingsConfig | MainConfig)[]
    pages: Page[]
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
    const {lib, json: {rollup}} = pkg
    return (lib
        ? Promise.resolve(<Configs | void>undefined)
        : getConfigs({pkg, globals, oneOfHost})
    )
        .then(cfg => Promise.all([
            cfg ? cfg.configs : [],
            getInputs({
                pkg,
                globals,
                aliases,
                configPath: cfg && cfg.configPath,
                configs: cfg && cfg.configs
            }),
            getNamedExports(rollup.namedExportsFrom)
        ]))
        .then(([configs, inputs, namedExports]) => {
            return Promise.all(
                configs.length > 0
                    ? inputs.map(input =>
                        getPages({
                            templateFile: input.templateFile,
                            mainFile: path.basename(input.ios.output[0].file),
                            configs,
                            pkg
                        })
                    )
                    : []
            )
                .then(pageSets => {
                    return <AdvancedInfo> {
                        pages: pageSets.reduce((acc, pages) => acc.concat(pages), []),
                        pkg,
                        aliases,
                        namedExports,
                        configs: [...inputs, ...configs]
                    }
                })
        })
}
