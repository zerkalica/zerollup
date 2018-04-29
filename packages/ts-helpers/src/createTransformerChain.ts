import * as ts from 'typescript'
import {addDtsPlugin} from './addDtsPlugin'

export interface CustomTransformer {
    dts?: boolean
    before?: ts.TransformerFactory<ts.SourceFile>
    after?: ts.TransformerFactory<ts.SourceFile>
}

export type TsPlugin = (ls: ts.LanguageService) => CustomTransformer

export type Chain = (program: ts.LanguageService) => ts.CustomTransformers

export function createTransformerChain(
    plugins: TsPlugin[]
): Chain {
    return (ls: ts.LanguageService) => {
        const result = {
            before: <ts.TransformerFactory<ts.SourceFile>[]>[],
            after: <ts.TransformerFactory<ts.SourceFile>[]>[]
        }

        for(let plugin of plugins) {
            const factory = plugin(ls)
            if (factory.before) {
                result.before.push(factory.before)
                if (factory.dts) addDtsPlugin(factory.before)
            }
            if (factory.after) result.after.push(factory.after)
        }
        return result
    }
}
