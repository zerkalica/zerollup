import * as path from 'path'
import * as ts from 'typescript'
import {ImportPathsResolver, createTraverseVisitor} from '@zerollup/ts-helpers'

interface ModifiedExpression {
    target: ts.Expression
    oldPos: number
    oldEnd: number
}

interface ImportPathVisitorContext {
    resolver: ImportPathsResolver
    posMap: Map<string, number>
    expressions: ModifiedExpression[]
}

const importPathRegex = /^(['"\s]+)(.+)(['"\s]+)$/
const commentPrefix = '\n// ###'

function importPathVisitor(node: ts.Node, {expressions, posMap, resolver}: ImportPathVisitorContext): ts.Node | void {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) return

    const moduleSpecifier = node.moduleSpecifier
    if (!moduleSpecifier) return

    const matches = moduleSpecifier.getFullText().match(importPathRegex)
    if (!matches) return

    const [, prefix, oldImport, suffix] = matches
    const sf = node.getSourceFile()
    const newImports = resolver.getImportSuggestions(oldImport, path.dirname(sf.fileName))
    if (!newImports) return
    const newImport = newImports[0]

    /**
     * TS plugin api still not a production ready.
     * 
     * This hack needed for properly d.ts paths rewrite.
     * In d.ts moduleSpecifier value is obtained by moduleSpecifier.pos from original source file text.
     * See emitExternalModuleSpecifier -> writeTextOfNode -> getTextOfNodeFromSourceText.
     *
     * We need to add new import path to the end of source file text and adjust moduleSpecifier.pos
     */
    const newStr = prefix + newImport + suffix
    let cachedPos = posMap.get(newStr)
    if (cachedPos === undefined) {
        cachedPos = sf.text.length + commentPrefix.length
        posMap.set(newStr, cachedPos)

        const strToAdd = commentPrefix + newStr
        sf.text += strToAdd
        sf.end += strToAdd.length
    }
    expressions.push({
        target: moduleSpecifier,
        oldPos: moduleSpecifier.pos,
        oldEnd: moduleSpecifier.end
    })

    moduleSpecifier.pos = cachedPos
    moduleSpecifier.end = moduleSpecifier.pos + newStr.length
}

interface CacheRec {
    originalText: string
    expressions: ModifiedExpression[]
}

export default function transformPaths(ls: ts.LanguageService) {
    const cache = new Map <string, CacheRec>()

    return {
        before(transformationContext: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
            const resolver = new ImportPathsResolver(transformationContext.getCompilerOptions())

            return (sf: ts.SourceFile) => {
                const expressions: ModifiedExpression[] = []
                const originalText = sf.text
                const ctx: ImportPathVisitorContext = {
                    resolver,
                    posMap: new Map<string, number>(),
                    expressions
                }

                const visitor = createTraverseVisitor(
                    importPathVisitor,
                    ctx,
                    transformationContext
                )

                const newSf = ts.visitNode(sf, visitor)
                if (ctx.expressions.length === 0) return sf

                cache.set(sf.fileName, {originalText, expressions})

                return newSf
            }
        },
        after(transformationContext: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
            return (sf: ts.SourceFile) => {
                const rec = cache.get(sf.fileName)
                if (!rec) return sf
                for (let expr of rec.expressions) {
                    expr.target.pos = expr.oldPos
                    expr.target.end = expr.oldEnd
                }

                sf.text = rec.originalText

                cache.delete(sf.fileName)

                return sf
            }
        }
    }
}
