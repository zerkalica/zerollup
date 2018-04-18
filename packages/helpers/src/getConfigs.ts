import * as path from 'path'
import * as fsExtra from 'fs-extra'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {cutExt, normalizeName} from './nameHelpers'

export class GetConfigsError extends HelpersError {}

export interface SettingsConfig {
    ios: Config
    hostId: string
    baseUrl: string
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
        baseUrlMask = defaultUrlMask,
    }: {
        pkg: NormalizedPkg
        globals: Record<string, string>
        oneOfHost: string[] | void
        baseUrlMask?: RegExp
    }
): Promise<Configs> {
    const defaultHosts = ['default', 'index']
    return fsExtra.pathExists(configDir)
        .then(exists => exists ? fsExtra.readdir(configDir) : [])
        .then(fileNames => {
            if (fileNames.length === 0) throw new GetConfigsError(`No configs files found in ${configDir}`)

            const defaultConfig = fileNames.find(name => defaultHosts.indexOf(cutExt(name)) !== -1) || fileNames[0]
            const configPath = path.join(configDir, defaultConfig)

            const filtered = oneOfHost
                ? [fileNames.find(name => oneOfHost.indexOf(cutExt(name)) !== -1) || defaultConfig]
                : fileNames

            return Promise.all(filtered.sort().map(fileName => {
                const input = path.join(configDir, fileName)
    
                return fsExtra.readFile(input)
                    .then(data => {
                        const matches = data.toString().match(baseUrlMask)
                        const hostId = cutExt(fileName)
                        const configFileName = `config.${hostId}.js`
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
                                        file: filtered.length === 1
                                            ? path.join(distDir, configFileName)
                                            : path.join(distDir, 'hosts', hostId, configFileName),
                                        format: iife
                                            ? 'iife'
                                            : (umd
                                                ? 'umd'
                                                : targets[0].format
                                            ),
                                        globals: globals,
                                        name: configGlobalName
                                    }
                                ]
                            }
                        }
                    })
            }))
            .then((configs: SettingsConfig[]) => ({configPath, configs}))
        })
}
