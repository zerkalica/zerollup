import {camelCase} from 'change-case'
import {sep, basename} from 'path'

export function isJsExt(name?: string, ext: string = '.js'): boolean {
    return name
        ? name.indexOf(ext) === name.length - ext.length
        : false
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

export function normalizeUmdName(name: string): string {
    return camelCase(normalizeName(name))
}

const slash = /\//g

export function fixPath(name: string): string {
    return name.replace(slash, sep)
}

export function packagesToGlobalNames(
    external: string[],
    excludeMap: {[pkgName: string]: string} = {}
): {[pkgName: string]: string} {
    return external.reduce((globalsMap, pkgName) => {
        globalsMap[pkgName] = excludeMap[pkgName] || normalizeUmdName(pkgName)
        return globalsMap
    }, {})
}

export function cutExt(input: string): string {
    return input.substring(0, input.lastIndexOf('.'))
}

export function getExt(input: string): string {
    return input.substring(input.lastIndexOf('.'))
}

export function getName(rawInput: string): string {
    const input = basename(rawInput)
    return input.substring(0, input.indexOf('.'))
}
