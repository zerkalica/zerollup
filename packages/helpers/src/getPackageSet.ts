import * as fsExtra from 'fs-extra'
import * as path from 'path'
import globby from 'globby'
import {NormalizedPkg, getPackageJson} from './getPackageJson'
import {HelpersError} from './interfaces'
import {getAdvancedInfo, AdvancedInfo} from './getAdvancedInfo'
import {Env, getEnv} from './nameHelpers'

export class GetPackageSetError extends HelpersError {}

export interface LernaJson {
    packages: string[]
}

function pathExistsUpLoop([config, exists, step]) {
    if (exists) return config
    const newStep = step - 1
    if (newStep <= 0) return
    const newConfig = path.join(path.dirname(path.dirname(config)), path.basename(config))

    return pathExistsUp(newConfig, newStep)
}

function pathExistsUp(config: string, step: number = 3): Promise<string | void> {
    return Promise.all([config, fsExtra.pathExists(config), step])
        .then(pathExistsUpLoop)
}

function getLernaPackages(repoRoot: string): Promise<{pkgFiles: string[], repoRoot: string} | void> {
    return pathExistsUp(path.join(repoRoot, 'lerna.json'))
        .then(configFile => configFile
            ? fsExtra.readJson(configFile)
                .then((data: LernaJson) => globby(
                    path.dirname(configFile) + '/' + (data.packages || 'packages/*') + '/package.json',
                    {absolute: true}
                ))
                .then((pkgFiles: string[]) => ({pkgFiles, repoRoot: path.dirname(configFile)}))
            : undefined as any
        )
}

function getGlobals(pkgs: NormalizedPkg[]): Record<string, string> {
    return pkgs.reduce((acc, {json: {name}, globalName}) => {
        acc[name] = globalName
        return acc
    }, {})
}

function getAliases(
    {packages, pkg: {json: {name, rollup}, srcDir}, env}: {
        pkg: NormalizedPkg
        env: Env
        packages?: NormalizedPkg[]
    }
): Record<string, string> {
    const aliases: Record<string, string> = (packages || []).reduce(
        (acc, {json: {module, name, main}, pkgPath}) => {
            const modPath = module || main
            return modPath
                ? {
                    ...acc,
                    [name]: path.join(path.dirname(pkgPath), modPath)
                }
                : acc
        },
        {}
    )
    if (srcDir) {
        aliases[name] = srcDir
        aliases['~'] = srcDir
    }

    if (env === 'production') (rollup.productionStubs || []).forEach(stub => aliases[stub] = 'empty/object')

    return aliases
}

export function sortPackages({json: p1}: NormalizedPkg, {json: p2}: NormalizedPkg): number {
    const deps1 = {...p1.dependencies, ...p1.devDependencies, ...p1.peerDependencies}
    const deps2 = {...p2.dependencies, ...p2.devDependencies, ...p2.peerDependencies}
    if (deps1[p2.name] || p1.name > p2.name) return 1
    if (deps2[p1.name] || p1.name < p2.name) return -1
    return 0
}

export interface PackageSetInfo {
    packageSet: AdvancedInfo[]
    repoRoot: string
    namedExports: Record<string, string[]>
    paths: Record<string, string[]>
}

export function getPackageSet(
    {pkgRoot, selectedNames: selNames, oneOfHost, env: rawEnv}: {
        pkgRoot: string
        env: string
        oneOfHost?: string[] | void
        selectedNames?: string[] | void
    }
): Promise<PackageSetInfo> {
    const env: Env = getEnv(rawEnv)
    return getLernaPackages(pkgRoot)
        .then(rec => Promise.all([
            rec ? rec.repoRoot : pkgRoot,
            Promise.all((rec ? rec.pkgFiles : [pkgRoot]).map(getPackageJson))
        ]))
        .then(([repoRoot, rawPackages]) => {
            const selectedNames: string[] | void = selNames || (
                repoRoot === pkgRoot
                    ? undefined
                    : [path.basename(pkgRoot)]
                )

            const packages = rawPackages.sort(sortPackages)
            const selectedPackages = selectedNames
                ? packages.filter(pkg =>
                    selectedNames.indexOf(path.basename(pkg.pkgRoot)) !== -1
                )
                : packages
            const globals = getGlobals(packages)

            console.log('repoRoot', repoRoot)
            // console.log('selectedNames', selectedNames)
            console.log('Build', selectedPackages.map(pkg => pkg.json.name).join(', '))

            return Promise.all(selectedPackages.map(pkg =>
                getAdvancedInfo({
                    pkg,
                    aliases: getAliases({packages, env, pkg}),
                    globals: pkg.lib ? globals : {},
                    oneOfHost
                })
            ))
                .then(packageSet => packageSet.reduce(
                    (acc, {pkg, namedExports}) => {
                        acc.namedExports = {...acc.namedExports, ...namedExports}
                        acc.paths[pkg.json.name + '/*'] = [`${pkg.srcDir.substring(repoRoot.length + 1)}/*`]
                        return acc
                    },
                    <PackageSetInfo> {
                        packageSet,
                        repoRoot,
                        namedExports: {},
                        paths: {}
                    }
                )
            )
        })
}
