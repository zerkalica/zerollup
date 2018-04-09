import {OutputOptions, Plugin, SourceDescription} from 'rollup'
import MagicString from 'magic-string'
import * as fsExtra from 'fs-extra'
import * as path from 'path'

export interface MultiConfigOptions {
    configRoot?: string
    verbose?: number
    searchPattern?: RegExp
}

export interface ConfigItem<Config extends Object> {
    data: Config
    file: string
    space: string
}

export default function multiconfig(
    {
        configRoot = 'src/configs',
        verbose = 3,
        searchPattern = new RegExp('MULTICONFIG([\\s\\S]*)MULTICONFIG')
    }: MultiConfigOptions = {}
): Plugin {
    const name = 'multiconfig'
    let cachedConfigs: Promise<ConfigItem<{}>[]> = null
    const spaceMask = /(?:.+\.)?(.+)\..+/

    return {
        name,
        transformBundle<Config extends Object>(code: string, outputOptions: OutputOptions): Promise<null | SourceDescription> {
            if (!cachedConfigs) {
                cachedConfigs = fsExtra.readdir(configRoot)
                    .then(files =>
                        Promise.all(files.map(file => {
                            const configPath = path.join(configRoot, file)

                            return fsExtra.readFile(configPath)
                                .then(rawConfig => {
                                    const match = rawConfig.toString().match(searchPattern)
                                    const configData = match ? match[1] : null
                                    if (!configData) throw new Error(`Can't match ${searchPattern} in ${configPath} raw config: ${rawConfig}`)
                                    let data: Config
                                    const body = `return {\n${configData}\n}`
                                    try {
                                        data = (new Function(body))()
                                    } catch (error) {
                                        error.message += ` error parsing ${configPath} body: ${body}`  
                                        throw error
                                    }

                                    const matchedSpaces = file.match(spaceMask)
                                    const space = matchedSpaces ? matchedSpaces[1] : null
                                    if (!space) throw new Error(`Can't match ${spaceMask} in ${file}`)

                                    return {data, file, space}
                                })
                        }))
                    )
            }

            const matchedSpaces = outputOptions.file.match(spaceMask)
            const targetSpace = matchedSpaces ? matchedSpaces[1] : null
            if (verbose && !targetSpace) console.warn(name, `no space mask (${spaceMask}) found in`, outputOptions.file)

            return cachedConfigs .then(configs => {
                let config = configs.find(item => item.space === 'local')
                if (!config && targetSpace) config = configs.find(item => item.space === targetSpace)

                if (!config) {
                    if (verbose) console.warn(name, `space (${targetSpace}) not in ${configs.map(item => item.space).join(', ')}`)

                    return null
                }

                const source = new MagicString(code)
                const match = code.match(searchPattern)
                if (!match) return null
                const start = match.index
                const src = match[1]
                const end = start + src.length
                let oldConfig: Config

                const body = `return {\n${src}\n}`

                try {
                    oldConfig = (new Function(body))()
                } catch (error) {
                    console.error(name, `error parsing bundled config body:`, body, error)
                    throw error
                }

                const newConfig = Object.assign({}, oldConfig, config.data)

                if (verbose > 1) console.log(name, 'loading config', config.file, 'for output.file', outputOptions.file)
                if (verbose > 2) console.log(name, 'replacing old data', oldConfig, 'to new data')

                const replacement = JSON.stringify(newConfig, null, '  ')
                source.overwrite(start, end, replacement.substring(1, replacement.length - 1))

                return {
                    code: source.toString(),
                    map: source.generateMap({ hires: true })
                }
            })
        }
    }
}
