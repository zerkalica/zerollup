import * as path from 'path'
import * as fsExtra from 'fs-extra'
import {Config} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {cutExt, normalizeName} from './nameHelpers'

export interface SettingsConfig {
    ios: Config
    hostId: string
    baseUrl: string
}

function filterConfigs(allConfigs: SettingsConfig[], oneOfHost?: string[] | void): SettingsConfig[] | void {
    if (!oneOfHost) return
    for (let hostId of oneOfHost) {
        const conf = allConfigs.find(config => config.hostId === hostId)
        if (conf) {
            return [conf]
        }
    }
}

export interface Configs {
    configPath?: string
    configs: SettingsConfig[]
}

const defaultUrlMask = new RegExp('ZEROLLUP_CONFIG_BASE_URL\\s*[=\:]+\\s*([^\\s\'\*]+).*')

export function getConfigs(
    {
        pkg: {
            json: {name, version, 'iife:main': iife, 'umd:main': umd},
            targets,
            configGlobalName, distDir, configDir, globalName, external
        },
        globals,
        oneOfHost,
        separateDirPerHost,
        baseUrlMask = defaultUrlMask
    }: {
        pkg: NormalizedPkg
        globals: Record<string, string>
        oneOfHost: string[] | void
        separateDirPerHost: boolean
        baseUrlMask?: RegExp
    }
): Promise<Configs> {
    return fsExtra.pathExists(configDir)
        .then(exists => exists ? fsExtra.readdir(configDir) : [])
        .then(fileNames => Promise.all(fileNames.map(fileName => {
            const input = path.join(configDir, fileName)

            return fsExtra.readFile(input)
                .then(data => {
                    const matches = data.toString().match(baseUrlMask)
                    const hostId = cutExt(fileName)
                    return <SettingsConfig> {
                        hostId,
                        baseUrl: ((matches ? matches[1] : null) || '/')
                            .replace(/PKG_VERSION/g, version)
                            .replace(/PKG_NAME/g, normalizeName(name)),
                        ios: {
                            input,
                            external,
                            output: [
                                {
                                    sourcemap: false,
                                    file: separateDirPerHost
                                        ? path.join(distDir, hostId, 'config.js')
                                        : path.join(distDir, `config.${hostId}.js`),
                                    format: iife
                                        ? 'iife'
                                        : (umd
                                            ? 'umd'
                                            : targets.map(target => target.format)[0]
                                        ),
                                    globals: globals,
                                    name: configGlobalName
                                }
                            ]
                        }
                    }
                })
        })))
        .then((configs: SettingsConfig[]) => {
            const defaultConfig = configs.find(config => config.hostId === 'index')
            return {
                configPath: defaultConfig ? defaultConfig.ios.input : undefined,
                configs: oneOfHost 
                    ? filterConfigs(configs, oneOfHost) || (defaultConfig ? [defaultConfig] : [])
                    :configs
            }
        })
}
