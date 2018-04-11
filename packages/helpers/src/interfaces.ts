export type Env = 'production' | 'development'

export type ModuleFormat = 'amd' | 'cjs' | 'system' | 'es' | 'es6' | 'iife' | 'umd';

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

export class HelpersError extends Error {
    constructor(message: string) {
        super(`@zerollup/helpers: ${new.target.name}: ${message}`)
    }
}
