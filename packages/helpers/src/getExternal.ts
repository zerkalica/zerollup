import {Pkg} from './interfaces'
import getBuiltins from 'builtins'

export function getExternal(
    {devDependencies, peerDependencies, dependencies, rollup}: Pkg
): string[] {
    const deps = Object.assign({}, devDependencies, peerDependencies, dependencies)
    const bundled: string[] = rollup.bundledDependencies || []

    return Object.keys(deps).concat(getBuiltins()).filter(name => !bundled.includes(name))
}
