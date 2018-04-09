import {InputOptions, OutputOptions, WatcherOptions, ModuleFormat} from 'rollup'
import {basename, join, dirname} from 'path'
import * as fsExtra from 'fs-extra'
import nodeEval from 'node-eval'
import {camelCase} from 'change-case'
import globby from 'globby'

export type Config = OutputOptions & InputOptions & WatcherOptions

export type Env = 'production' | 'development'

export interface CmdOptions {
    config: string
    watch: boolean
    cwd: string
    env: Env
    target?: string
}

export interface Pkg {
    name: string
    main?: string
    module?: string
    'iife:main'?: string
    'umd:main'?: string

    rollup: {
        bundledDependencies?: string[]
        productionStubs?: string[]
        namedExportsFrom?: string[]
    }
    peerDependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    dependencies?: Record<string, string>
}

function getModuleExports(moduleId: string): Promise<string[]> {
    const id = require.resolve(moduleId)

    return fsExtra.readFile(id)
        .then(data => {
            const moduleOut = nodeEval(data.toString(), id)
            let result = []
            const excludeExports = /^(default|__)/
            if (moduleOut && typeof moduleOut === 'object') {
                result = Object.keys(moduleOut)
                    .filter(name => name && !excludeExports.test(name))
            }

            return result
        })
}

function getNamedExports(moduleIds?: string[]): Promise<Record<string, string[]>> {
    return Promise.all((moduleIds || []).map(id => 
        getModuleExports(id).then(moduleExports => ({id, moduleExports}))
    ))
        .then(recs => recs.reduce((acc, rec) => ({
            ...acc,
            [rec.id]: rec.moduleExports
        }), {}))
}

function isJsExt(name?: string, ext: string = '.js'): boolean {
    return name && name.indexOf(ext) === name.length - ext.length
}

export function normalizeName(name: string): string {
    return name
        .replace(/@/g, '')
        .replace(/[^\w\d_]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase()
}

export function regExpEscape(s: string): string {
    return s.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')
}

function normalizeUmdName(name: string): string {
    return camelCase(normalizeName(name))
}

export function cutExt(input: string): string {
    return input.substring(0, input.lastIndexOf('.'))
}

const allSections: [string, ModuleFormat][] = [
    ['module', 'es'],
    ['main', 'cjs'],
    ['umd:main', 'umd'],
    ['iife:main', 'iife']
]

function isLib(pkg: Pkg): boolean {
    return !pkg['iife:main'] || isJsExt(pkg.main) || isJsExt(pkg.module)
}

function getAliases(
    {srcDir, lernaAliases, pkg: {name, rollup}, env}: {
        srcDir: string
        pkg: Pkg
        env: Env
        lernaAliases: Record<string, string>
    }
): Record<string, string> {
    const aliases = {
        ...lernaAliases,
        [name]: srcDir
    }

    const stubs = rollup.productionStubs
    if (stubs && env === 'production') stubs.forEach(stub => aliases[stub] = 'empty/object')

    return aliases
}

function getExternals(
    {devDependencies, peerDependencies, dependencies, rollup}: Pkg
): string[] {
    const deps = Object.assign({}, devDependencies, peerDependencies, dependencies)
    const bundled: string[] = rollup.bundledDependencies || []

    return Object.keys(deps).filter(name => !bundled.includes(name))
}

export interface ConfigOutput {
    sourcemap: boolean
    file: string
    format: ModuleFormat
    globals?: string[]
    name?: string
}

export interface BaseRollupConfig {
    input: string
    output: ConfigOutput[]
}

function getDistDir(
    {targets, pkgPath}: {
        targets: TargetFile[]
        pkgPath: string
    }
): string {
    const targetDirs = targets.map(rec => dirname(rec.file))
    const distDir = targetDirs[0]
    if (targetDirs.indexOf(distDir) > 0) {
        const keysStr = `"${allSections.map(([key, format]) => key).join('", "')}"`
        throw new Error(
            `Some of target directories ${targets.map(rec => rec.file).join(', ')} differs in keys ${keysStr} in ${pkgPath}`
        )
    }

    return distDir
}

function getBaseConfig(
    {pkg, externals, inputs, pkgPath, targets, distDir}: {
        pkg: Pkg
        distDir: string
        targets: TargetFile[]
        externals: string[]
        inputs: string[]
        pkgPath: string
    }
): BaseRollupConfig[] {

    const config = inputs.map(input => ({
        input,
        externals,
        output: targets.map(({format}) => ({
            sourcemap: true,
            file: join(
                distDir,
                `${cutExt(basename(input))}${format && format !== 'iife' ? `.${format}` : ''}.js`
            ),
            format,
            globals: format === 'umd' && externals.map(normalizeUmdName),
            name: format === 'umd' && normalizeUmdName(cutExt(input))
        }))
    }))

    const files: string[] = config.reduce(
        (acc, cfg) => acc.concat(cfg.output.map(sec => sec.file)),
        []
    )

    const badTargets = targets.filter(rec => files.indexOf(rec.file) === -1).map(rec => `"${rec.key}": "${rec.file}"`)

    if (badTargets.length > 0) {
        throw new Error(
            `Not a valid value of {${badTargets.join(' and ')}}, need one of "${files.join('", "')}" in ${pkgPath}`
        )
    }

    return config
}

function getInputs(srcDir: string): Promise<string[]> {
    return fsExtra.stat(srcDir)
        .then(stat => {
            if (!stat.isDirectory()) throw new Error(`Sources mast be in ${srcDir} directory`)
            return fsExtra.readdir(srcDir)
        })
        .then(srcFiles => {
            const inputs = srcFiles
                .filter(file => file.indexOf('index.') === 0)
                .map(file => join(srcDir, file))
            if (inputs.length === 0) throw new Error(`No index.* files found in ${srcDir}`)
            return inputs
        })
}

interface PkgFileRec {
    file: string
    pkg: Pkg
}

interface LernaJson {
    packages: string[]
}

function getLernaPackages(lernaRootDir: string): Promise<PkgFileRec[]> {
    const lernaConfigPath = join(lernaRootDir, 'lerna.json')
    return fsExtra.stat(lernaConfigPath)
        .then(stat => stat.isFile() ? fsExtra.readJson(lernaConfigPath): null)
        .then((lernaConfig?: LernaJson) => lernaConfig && lernaConfig.packages
            ? globby(lernaConfig.packages + '/package.json', {absolute: true}) as Promise<string[]>
            : [] as string[]
        )
        .then(pkgFiles => pkgFiles
            ? Promise.all(pkgFiles.map((file: string) =>
                fsExtra.readJson(file)
                    .then((pkg: Pkg) => ({pkg, file}))
            ))
            : []
        )
}

function getLernaAliases(lernaRootDir: string): Promise<Record<string, string>> {
    return getLernaPackages(lernaRootDir)
        .then(recs => recs.reduce(
            (acc, {pkg, file}) => {
                const modPath = pkg.module || pkg.main
                return modPath
                    ? {
                        ...acc,
                        [pkg.name]: join(dirname(file), modPath)
                    }
                    : acc
            },
            {}
        ))
}


export interface TargetFile {
    file: string
    format: ModuleFormat
    key: string
}

export interface RollupConfig {
    pkg: Pkg
    cmd: CmdOptions
    pkgPath: string
    lernaRootDir: string
    srcDir: string
    distDir: string
    inputs: string[]
    namedExports: Record<string, string[]>
    targets: TargetFile[]
    aliases: Record<string, string>
    isLib: boolean
    baseConfig: BaseRollupConfig[]
}

export function getRollupConfig(
    {
        cwd = process.cwd(),
        watch = false,
        config = join(process.cwd(), 'rollup.config.js'),
        target,
        env = (process.env.NODE_ENV || 'production') as Env
    }: Partial<CmdOptions> = {}
): Promise<RollupConfig> {
    if (env !== 'production' && env !== 'development') {
        throw new Error(`NODE_ENV mast be only production or development, not ${env}, use separate entry point for different targets`)
    }
    const lernaRootDir = dirname(config)
    const pkgPath = join(cwd, 'package.json')
    const srcDir = join(cwd, 'src')

    return Promise.all([fsExtra.readJson(pkgPath) as Promise<Pkg>, getInputs(srcDir), getLernaAliases(lernaRootDir)])
        .then(([pkg, rawInputs, lernaAliases]) => {
            if (!pkg.name) throw new Error(`No "name" key in ${pkgPath}`)
            if (!pkg.module && !pkg['iife:main']) throw new Error(`No "module" or "iife:main" key in ${pkgPath}`)
            if (!pkg.main && !pkg['iife:main']) throw new Error(`No "main" or "iife:main" key in ${pkgPath}`)
            if (!pkg.rollup) pkg.rollup = {}
            const targets = allSections
                .map(([key, format]) => pkg[key] && {
                    key,
                    format,
                    file: pkg[key]
                })
                .filter(Boolean)

            const inputNames = rawInputs.map(input => cutExt(basename(input)))
            const badOutputs = targets.filter(rec => inputNames.indexOf(cutExt(basename(rec.file))) === 0)
            if (badOutputs.length > 0) {
                const badEntries = badOutputs.map(rec => `"${rec.key}": "${rec.file}"`)
                throw new Error(`File names in values of ${badEntries.join(', ')} must be one of ${inputNames.join(', ')} in ${pkgPath}`)
            }

            let inputs = rawInputs
            if (target) {
                let input = rawInputs.find(input => basename(input).indexOf(target) === 0)
                if (!input) throw new Error(`Need target ${target}.* file in ${srcDir}`)
                inputs = [input]
            } else if (watch) {
                let input = rawInputs.find(input => basename(input).indexOf('index.local.') === 0)
                if (!input) input = rawInputs.find(input => basename(input).indexOf('index.dev.') === 0)
                if (!input) throw new Error(`Watch mode, need index.local.* or index.dev.* files in ${srcDir}`)
                inputs = [input]
            }

            const externals = getExternals(pkg)
            const aliases = getAliases({srcDir, lernaAliases, pkg, env})
            const distDir = getDistDir({targets, pkgPath})
            const baseConfig = getBaseConfig({pkg, externals, inputs, pkgPath, targets, distDir})

            return getNamedExports(pkg.rollup.namedExportsFrom)
                .then(namedExports => ({
                    pkg,
                    cmd: {watch, config, cwd, env},
                    pkgPath,
                    distDir,
                    lernaRootDir,
                    srcDir,
                    inputs,
                    namedExports,
                    targets,
                    aliases,
                    isLib: isLib(pkg),
                    baseConfig
                }))
        })
}
