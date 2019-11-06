import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {normalizeName, normalizeUmdName, fixPath} from '../nameHelpers'
import {HelpersError} from '../interfaces'
import {getConfigs, Configs} from './getConfigs'
import {detectInputs} from './detectInputs'

//@ts-ignore
import getBuiltins from 'builtins'

export class GetPackageJsonError extends HelpersError {}

export type ModuleFormat = 'amd' | 'cjs' | 'system' | 'es' | 'es6' | 'iife' | 'umd'

export interface Pkg {
    version: string
    name: string
    description?: string
    main?: string
    module?: string
    typings?: string
    'iife:main'?: string
    'umd:main'?: string

    rollup: {
        app?: boolean
        inputs?: string[]
        srcDir?: string
        configDir?: string
        bundledDependencies?: string[]
        productionStubs?: string[]
        namedExports?: string[] | Record<string, string[] | string>
        templateFile?: string
        moduleContext?: Record<string, string>
        context?: string
    }

    peerDependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    dependencies?: Record<string, string>
}

export interface SectionRec {
    key: string
    format: ModuleFormat
    ext: string
}

export interface Target extends SectionRec {
    file: string
}

export interface NormalizedPkg {
    json: Pkg
    pkgRoot: string
    pkgPath: string
    lib: boolean
    distDir: string
    urlName: string
    declarationDir: string
    globalName: string
    srcDir: string
    configs?: Configs | undefined
    inputs: string[]
    targets: Target[]
    external: string[]
}

const allSections = [
    {key: 'module', format: 'es', ext: 'mjs'},
    {key: 'main', format: 'cjs', ext: 'cjs.js'},
    {key: 'umd:main', format: 'umd', ext: 'js'},
    {key: 'iife:main', format: 'iife', ext: 'js'}
] as const

const builtins = getBuiltins()

function normalizePkg(pkg: Pkg, pkgPath: string): Promise<NormalizedPkg> {
    const pkgRoot = path.dirname(pkgPath)
    const targets: Target[] = allSections
        .filter(sec => !!pkg[sec.key])
        .map(({key, format, ext}) => {
            const val = pkg[key]!
            return <Target> {
                key,
                format,
                file: path.join(pkgRoot, fixPath(val)),
                ext: val.substring(val.indexOf('.'))
            }
        })

    if (targets.length === 0) {
        throw new GetPackageJsonError(`normalizePkg: No ${allSections.map(rec => rec.key).join(', ')} sections found in ${pkgPath}`)
    }

    const targetDirs = targets.map(rec => path.dirname(rec.file))
    const distDir = targetDirs[0]
    if (targetDirs.indexOf(distDir) > 0) {
        const keysStr = `"${allSections.map(rec => rec.key).join('", "')}"`
        throw new GetPackageJsonError(
            `normalizePkg: Some of target directories ${targets.map(rec => rec.file).join(', ')} differs in keys ${keysStr} in ${pkgPath}`
        )
    }

    const rp = pkg.rollup = pkg.rollup || {}
    const srcDir = rp.srcDir
        ? path.join(pkgRoot, fixPath(rp.srcDir))
        : path.join(pkgRoot, 'src')

    const configDir = rp.configDir
        ? path.join(pkgRoot, fixPath(rp.configDir))
        : path.join(srcDir, 'config')

    let lib = true
    if (rp.app || pkg['iife:main'] || !pkg.main) lib = false

    const deps = Object.assign({}, pkg.devDependencies, pkg.peerDependencies, pkg.dependencies)
    const bundled: string[] = rp.bundledDependencies || []

    const external = lib
        ? Object.keys(deps).concat(builtins)
            .filter(name => !bundled.includes(name))
        : []

    const inputMatch = new RegExp('.*index\..+$')
    const urlName = normalizeName(pkg.name)
    return Promise.all([
        lib ? undefined : getConfigs({
            name: urlName,
            version: pkg.version,
            configDir,
        }),
        pkg.rollup.inputs ? Promise.resolve(pkg.rollup.inputs) : detectInputs(srcDir, inputMatch),
    ])
        .then(([configs, inputs]) => {
            return <NormalizedPkg>{
                json: pkg,
                pkgRoot,
                pkgPath,
                lib,
                declarationDir: pkg.typings ? path.join(pkgRoot, path.dirname(pkg.typings)) : distDir,
                external,
                distDir,
                targets,
                urlName,
                globalName: normalizeUmdName(pkg.name),
                srcDir,
                configs,
                inputs,
            }
        })
}

export function getPackageJson(pkgPath: string): Promise<NormalizedPkg> {
    return fsExtra.readJson(pkgPath).then(pkg => normalizePkg(pkg, pkgPath))
}
