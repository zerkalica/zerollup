import * as path from 'path'
import * as fsExtra from 'fs-extra'
import {cutExt, normalizeName, normalizeUmdName, Env, getEnv} from '../nameHelpers'

const baseUrlMask = new RegExp('ZEROLLUP_CONFIG_BASE_URL\\s*[=\:]+\\s*([^\\s\'\*]+).*')
const envMask = new RegExp('ZEROLLUP_ENV\\s*[=\:]+\\s*([\\w\\d]+)')

export interface ConfigItem {
    env: Env
    hostId: string
    baseUrl: string
    file: string
}

export interface Configs {
    configs: ConfigItem[]
    envs: Env[]
    configDir: string
    defaultConfig?: ConfigItem | void
    configGlobalName: string
}

export function getConfigs(
    {
        name,
        version,
        configDir,
        defaultEnv = 'production'
    }: {
        name: string,
        version: string,
        configDir: string
        defaultEnv?: Env
    }
): Promise<Configs> {
    const configGlobalName = normalizeUmdName(name + '_config')
    const defaultHosts = ['index', 'default']

    return fsExtra.pathExists(configDir)
        .then(exists => exists ? fsExtra.readdir(configDir) : [])
        .then(fileNames => {
            const hasDefault = !!fileNames.find(name => name.indexOf('default.') === 0)
            if (hasDefault) fileNames = fileNames.filter(name => name.indexOf('index.') !== 0)

            return Promise.all(fileNames.sort().map(fileName => {
                const file = path.join(configDir, fileName)

                return fsExtra.readFile(file)
                    .then(dataBuf => {
                        const data = dataBuf.toString()
                        const baseUrlMatch = data.match(baseUrlMask)

                        const envMatch = data.match(envMask)
                        const env = envMatch ? getEnv(envMatch[1]) : defaultEnv
                        const hostId = cutExt(fileName)

                        return <ConfigItem> {
                            baseUrl: ((baseUrlMatch ? baseUrlMatch[1] : null) || '/')
                                .replace(/PKG_VERSION/g, version)
                                .replace(/PKG_NAME/g, normalizeName(name)),
                            hostId,
                            env,
                            file,
                        }
                    })
            }))
        })
        .then((configs: ConfigItem[]) => ({
            defaultConfig: configs.find(config => defaultHosts.indexOf(config.hostId) !== -1) || configs[0],
            configGlobalName,
            configs,
            configDir,
            envs: configs
                ? configs.reduce((acc, config) => {
                    if (acc.indexOf(config.env) === -1) acc.push(config.env)
                    return acc
                }, <Env[]>[])
                : [defaultEnv]
        }))
}
