import {InputOptions, OutputOptions, WatcherOptions} from 'rollup'

export type Config = OutputOptions & InputOptions & WatcherOptions
export type Env = 'production' | 'development'

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
