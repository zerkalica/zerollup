import * as ts from 'typescript'

export interface CustomTransformer {
    dts?: boolean
    before?: ts.TransformerFactory<ts.SourceFile>
    after?: ts.TransformerFactory<ts.SourceFile>
}

export type TsPlugin = (ls: ts.LanguageService) => CustomTransformer

export function createTransformerChain(plugins: TsPlugin[]): (program: ts.LanguageService) => ts.CustomTransformers {
    let a: any = ts
    const dtsTransformers: ts.TransformerFactory<ts.SourceFile>[] = []
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

    return (ls: ts.LanguageService) => {
        const result = {
            before: <ts.TransformerFactory<ts.SourceFile>[]>[],
            after: <ts.TransformerFactory<ts.SourceFile>[]>[]
        }

        for(let plugin of plugins) {
            const factory = plugin(ls)
            if (factory.before) {
                result.before.push(factory.before)
                if (factory.dts) dtsTransformers.push(factory.before)
            }
            if (factory.after) result.after.push(factory.after)
        }
        return result
    }
}
