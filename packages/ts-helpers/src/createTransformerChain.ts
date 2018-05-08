import * as ts from 'typescript'
import compareVersions from 'compare-versions'
import * as resolve from 'resolve'

export interface Plugin {
    before?: ts.TransformerFactory<ts.SourceFile>
    after?: ts.TransformerFactory<ts.SourceFile>
    afterDeclaration?: ts.TransformerFactory<ts.SourceFile>
}

export type PluginOptions = Object | void
export type PluginFactory = {
    type: 'ls'
    (ls: ts.LanguageService, options?: PluginOptions): Plugin
} | {
    type?: 'program'
    (program: ts.Program, options?: PluginOptions): Plugin
} | {
    type: 'opts'
    (opts: ts.CompilerOptions, options?: PluginOptions): Plugin
}

export type RawPluginFactory = string | [string, PluginOptions] | PluginFactory | [PluginFactory, PluginOptions]

export type TsMain = ts.LanguageService | ts.Program | ts.CompilerOptions

function patchEmitFiles(): ts.TransformerFactory<ts.SourceFile>[] {
    let a: any = ts
    if (a.emitFiles.__patched) return a.emitFiles.__patched
    const dtsTransformers: ts.TransformerFactory<ts.SourceFile>[] = a.emitFiles.__patched = []

    const oldEmitFiles = a.emitFiles
    /**
     * Hack
     * Typescript 2.8 does not support transforms for declaration emit
     * see https://github.com/Microsoft/TypeScript/issues/23701
     */
    a.emitFiles = function newEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        let newTransformers = transformers
        if (emitOnlyDtsFiles && !transformers || transformers.length === 0) {
            newTransformers = dtsTransformers
        }

        return oldEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, newTransformers)
    }

    return dtsTransformers
}

export class PluginCollector {
    private ls: ts.LanguageService | void
    private program: ts.Program

    constructor(main: TsMain, private isOldVersion: boolean, private basedir: string) {
        this.ls = typeof (main as any).getProgram === 'function'
            ? main as ts.LanguageService
            : undefined
        if (this.ls) this.program = this.ls.getProgram()
    }

    createPlugin(factory: PluginFactory, options: PluginOptions): Plugin {
        switch (factory.type) {
            case 'ls':
                if (!this.ls) throw new Error(`Plugin ${String(factory)} need a LanguageService`)
                return factory(this.ls, options)

            case 'opts':
                return factory(this.program.getCompilerOptions(), options)

            case 'program':
            default:
                return factory(this.program, options)
        }
    }

    private resolveFactory(factory: string): PluginFactory {
        const pos = factory.indexOf(':')
        const type = factory.substring(0, pos)
        const name = factory.substring(pos + 1)
        const modulePath = resolve.sync(name, {basedir: this.basedir})
        const module: PluginFactory | {default: PluginFactory} = require(modulePath)

        let result: PluginFactory = typeof (module as any).default === 'function'
            ? (module as any).default
            : module

        if (type) result.type = type as any;

        return result
    }

    createTransformers(rawFactories: RawPluginFactory[]): ts.CustomTransformers {
        const chain: {
            before: ts.TransformerFactory<ts.SourceFile>[]
            after: ts.TransformerFactory<ts.SourceFile>[]
            afterDeclaration: ts.TransformerFactory<ts.SourceFile>[]
        } = {
            before: [],
            after: [],
            afterDeclaration: this.isOldVersion ? patchEmitFiles() : []
        }
    
        for(let raw of rawFactories) {
            const factory = raw instanceof Array ? raw[0] : raw

            const plugin = this.createPlugin(
                typeof factory === 'string' ? this.resolveFactory(factory) : factory,
                raw instanceof Array ? raw[1] : undefined
            )
    
            if (plugin.before) chain.before.push(plugin.before)
            if (plugin.after) chain.after.push(plugin.after)
            if (plugin.afterDeclaration) chain.afterDeclaration.push(plugin.afterDeclaration)
        }

        return chain
    }
}

/**
 * @example
 * 
 * createTransformerChain([
 *   ['ls:@zerollup/ts-transform-paths', {someOption: '123'}],
 *   'ls:@zerollup/ts-transform-paths',
 *   'program-ts-plugin'
 * ])
 */
export function createTransformerChain(
    factories: RawPluginFactory[]
): (program: TsMain) => ts.CustomTransformers {
    const isOldVersion = compareVersions('2.9', ts.versionMajorMinor) < 0
    const basedir = process.cwd()

    return (main: TsMain) => {
        return new PluginCollector(main, isOldVersion, basedir)
            .createTransformers(factories)
    }
}
