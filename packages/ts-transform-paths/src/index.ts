import * as path from 'path'
import * as ts from 'typescript'
import {ImportPathsResolver, createTraverseVisitor} from '@zerollup/ts-helpers'

interface ImportPathVisitorContext {
    resolver: ImportPathsResolver
    posMap: Map<string, number>
}

const importPathRegex = /^(['"\s]+)(.+)(['"\s]+)$/
const commentPrefix = '\n// ###'

function importPathVisitor(node: ts.Node, {posMap, resolver}: ImportPathVisitorContext): ts.Node | void {
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
    moduleSpecifier.pos = cachedPos
    moduleSpecifier.end = moduleSpecifier.pos + newStr.length
}

export default function transformPaths(ls: ts.LanguageService) {
    return {
        before(transformationContext: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
            const resolver = new ImportPathsResolver(transformationContext.getCompilerOptions())

            return (sf: ts.SourceFile) => {
                const ctx: ImportPathVisitorContext = {
                    resolver,
                    posMap: new Map<string, number>()
                }

                const visitor = createTraverseVisitor(
                    importPathVisitor,
                    ctx,
                    transformationContext
                )

                return ts.visitNode(sf, visitor)
            }
        }
    }
}
