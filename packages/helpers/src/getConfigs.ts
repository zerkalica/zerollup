import * as path from 'path'
import * as fsExtra from 'fs-extra'
import {Config, HelpersError} from './interfaces'
import {NormalizedPkg} from './getPackageJson'
import {cutExt, normalizeName, Env, getEnv} from './nameHelpers'

export class GetConfigsError extends HelpersError {}

export interface SettingsConfig extends Config {
    t: 'config'
    env: Env
    baseUrl: string
    mainFiles: string[]
}

export interface Configs {
    defaultConfigPath: string
    configs: SettingsConfig[]
}

const baseUrlMask = new RegExp('ZEROLLUP_CONFIG_BASE_URL\\s*[=\:]+\\s*([^\\s\'\*]+).*')
const envMask = new RegExp('ZEROLLUP_ENV\\s*[=\:]+\\s*([\\w\\d]+)')

export function getConfigs(
    {
        env: defaultEnv,
        pkg: {
            json: {name, version, 'iife:main': iife, 'umd:main': umd},
            targets,
            configGlobalName, distDir, configDir, globalName, external
        },
        globals,
        oneOfHost,
    }: {
        env: Env
        pkg: NormalizedPkg
        globals: Record<string, string>
        oneOfHost: string[] | void
    }
): Promise<Configs> {
    const defaultHosts = ['default', 'index']
    return fsExtra.pathExists(configDir)
        .then(exists => exists ? fsExtra.readdir(configDir) : [])
        .then(fileNames => {
            if (fileNames.length === 0) throw new GetConfigsError(`No configs files found in ${configDir}`)

            const defaultConfig = fileNames.find(name => defaultHosts.indexOf(cutExt(name)) !== -1) || fileNames[0]
            const defaultConfigPath = path.join(configDir, defaultConfig)

            const filtered = oneOfHost
                ? [fileNames.find(name => oneOfHost.indexOf(cutExt(name)) !== -1) || defaultConfig]
                : fileNames

            return Promise.all(filtered.sort().map(fileName => {
                const input = path.join(configDir, fileName)
    
                return fsExtra.readFile(input)
                    .then(dataBuf => {
                        const data = dataBuf.toString()
                        const baseUrlMatch = data.match(baseUrlMask)

                        const envMatch = data.match(envMask)
                        const env = envMatch ? getEnv(envMatch[1]) : defaultEnv
                        const hostId = cutExt(fileName)
                        const configFileName = `config.${hostId}.js`
                        return <SettingsConfig> {
                            t: 'config',
                            baseUrl: ((baseUrlMatch ? baseUrlMatch[1] : null) || '/')
                                .replace(/PKG_VERSION/g, version)
                                .replace(/PKG_NAME/g, normalizeName(name)),
                            env,
                            mainFiles: [],
                            input,
                            external,
                            output: [
                                {
                                    assetFileNames: '[name][extname]',
                                    sourcemap: false,
                                    file: filtered.length === 1
                                        ? path.join(distDir, configFileName)
                                        : path.join(distDir, 'hosts', hostId, configFileName),
                                    format: iife
                                        ? 'iife'
                                        : (umd ? 'umd' : targets[0].format),
                                    globals: globals,
                                    name: configGlobalName
                                }
                            ]
                        }
                    })
            }))
            .then((configs: SettingsConfig[]) => ({
                defaultConfigPath,
                configs
            }))
        })
}
