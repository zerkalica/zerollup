import * as path from 'path'
import * as fsExtra from 'fs-extra'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg, Configs} from './getPackageJson'
import {cutExt, normalizeName, normalizeUmdName, Env, getEnv} from './nameHelpers'

export class GetSettingsConfigsError extends HelpersError {}

export interface SettingsConfig extends Config {
    t: 'config'
    env: Env
    baseUrl: string
    mainFiles: string[]
}

export function getSettingsConfigs({
    pkg: {
        json: {name, version, 'iife:main': iife, 'umd:main': umd},
        targets,
        configs: pkgConfigs,
        distDir, external
    },
    globals,
    oneOfHost
}: {
    pkg: NormalizedPkg
    globals: Record<string, string>
    oneOfHost: string[] | void
}): SettingsConfig[] {
    if (!pkgConfigs) throw new GetSettingsConfigsError(`No configs`)
    const {defaultConfig, configGlobalName, configs, configDir} = pkgConfigs
    if (!defaultConfig) throw new GetSettingsConfigsError(`No configs files found in ${configDir}`)
    const filtered = oneOfHost
        ? [configs.find(item => oneOfHost.indexOf(item.hostId) !== -1) || defaultConfig]
        : configs

    const ext = '.js'

    return filtered.map(item => {
        return <SettingsConfig>{
            t: 'config',
            baseUrl: item.baseUrl,
            env: item.env,
            mainFiles: [],
            input: item.file,
            external,
            output: [
                {
                    assetFileNames: '[name][extname]',
                    sourcemap: false,
                    file: (
                        filtered.length === 1
                            ? path.join(distDir, cutExt(path.basename(item.file)))
                            : path.join(distDir, 'hosts', item.hostId, cutExt(path.basename(item.file)))
                        ) + ext,
                    format: iife
                        ? 'iife'
                        : (umd ? 'umd' : targets[0].format),
                    globals: globals,
                    name: configGlobalName
                }
            ]
        }
    })
}
