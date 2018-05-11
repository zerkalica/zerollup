import * as path from 'path'
import * as ts from 'typescript'
import {ImportPathsResolver, createTraverseVisitor} from '@zerollup/ts-helpers'

interface ImportPathVisitorContext {
    resolver: ImportPathsResolver
    posMap: Map<string, number>
}

const importPathRegex = /^(['"\s]+)(.+)(['"\s]+)$/

function importPathVisitor(
    node: ts.Node,
    {posMap, resolver}: ImportPathVisitorContext
): ts.Node | void {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) return

    const moduleSpecifier = node.moduleSpecifier
    if (!moduleSpecifier) return

    const matches = moduleSpecifier.getFullText().match(importPathRegex)
    if (!matches) return

    const [, prefix, oldImport, suffix] = matches
    const sf = node.getSourceFile()
    const newImports = resolver.getImportSuggestions(
        oldImport,
        path.dirname(sf.fileName)
    )
    if (!newImports) return
    const newImport = newImports[0]

    /**
     * This hack needed for properly d.ts paths rewrite.
     * moduleSpecifier value obtained by moduleSpecifier.pos from original source file text.
     * See emitExternalModuleSpecifier -> writeTextOfNode -> getTextOfNodeFromSourceText.
     *
     * We need to add new import path to the end of source file text and adjust moduleSpecifier.pos
     *
     * ts remove quoted string from output
     */
    const newStr = prefix + newImport + suffix
    let cachedPos = posMap.get(newImport)
    if (cachedPos === undefined) {
        cachedPos = sf.text.length
        posMap.set(newImport, cachedPos)
        sf.text += newStr
        sf.end += newStr.length
    }
    moduleSpecifier.pos = cachedPos
    moduleSpecifier.end = cachedPos + newStr.length

    // const newSpec = ts.createLiteral(newImport)

    // if (ts.isImportDeclaration(node)) return ts.updateImportDeclaration(
    //     node, undefined, undefined, undefined, newSpec
    // )

    // if (ts.isExportDeclaration(node)) return ts.updateExportDeclaration(
    //     node, undefined, undefined, undefined, newSpec
    // )
}

export default function transformPaths(program: ts.Program) {
    const processed = new Set<string>()
    const plugin = {
        before(
            transformationContext: ts.TransformationContext
        ): ts.Transformer<ts.SourceFile> {
            const resolver = new ImportPathsResolver(
                transformationContext.getCompilerOptions()
            )

            return (sf: ts.SourceFile) => {
                if (processed.has(sf.fileName)) return sf
                processed.add(sf.fileName)
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
        },
        afterDeclaration(
            transformationContext: ts.TransformationContext            
        ): ts.Transformer<ts.SourceFile> {
            return plugin.before(transformationContext)
        }
    }

    return plugin
}
