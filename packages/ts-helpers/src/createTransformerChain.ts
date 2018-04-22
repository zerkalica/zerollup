import * as ts from 'typescript'

export interface CustomTransformer {
    before?: ts.TransformerFactory<ts.SourceFile>
    after?: ts.TransformerFactory<ts.SourceFile>
}

export type TsPlugin = (ls: ts.LanguageService) => CustomTransformer

export function createTransformerChain(plugins: TsPlugin[]): (program: ts.LanguageService) => ts.CustomTransformers {
    return (ls: ts.LanguageService) => {
        const result = {
            before: <ts.TransformerFactory<ts.SourceFile>[]>[],
            after: <ts.TransformerFactory<ts.SourceFile>[]>[]
        }

        for(let plugin of plugins) {
            const factory = plugin(ls)
            if (factory.before) result.before.push(factory.before)
            if (factory.after) result.after.push(factory.after)
        }
        return result
    }
}
