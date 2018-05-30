import * as path from 'path'
import * as ts from 'typescript'
import {ImportPathsResolver, createTraverseVisitor} from '@zerollup/ts-helpers'
import compareVersions from 'compare-versions'

interface ImportPathVisitorContext {
    resolver: ImportPathsResolver
    posMap: Map<string, number>
    sf: ts.SourceFile
}

const importPathRegex = /^(['"\s]+)(.+)(['"\s]+)$/

function importPathVisitor(
    node: ts.Node,
    {posMap, resolver, sf}: ImportPathVisitorContext
): ts.Node | void {
    let importValue: string
    let fixNode: ts.Node
    if (ts.isCallExpression(node)) {
        if (node.expression.getText() !== 'require' || node.arguments.length !== 1) return
        const arg = node.arguments[0]
        if (!ts.isStringLiteral(arg)) return
        importValue = arg.getText()
        fixNode = arg
    } else if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (!node.moduleSpecifier) return
        importValue = node.moduleSpecifier.getFullText()
        fixNode = node.moduleSpecifier
    } else {
        return
    }

    const matches = importValue.match(importPathRegex)
    if (!matches) return

    const [, prefix, oldImport, suffix] = matches
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
    fixNode.pos = cachedPos
    fixNode.end = cachedPos + newStr.length

    const newSpec = ts.createLiteral(newImport)

    let newNode: ts.Node | void
    if (ts.isImportDeclaration(node)) {
        newNode = ts.updateImportDeclaration(
            node, node.decorators, node.modifiers, node.importClause, newSpec
        )

        /**
         * Without this hack ts generates bad import of pure interface in output js,
         * this causes warning "module has no exports" in bundlers.
         *
         * index.ts
         * ```ts
         * import {Some} from './lib'
         * export const some: Some = { self: 'test' }
         * ```
         *
         * lib.ts
         * ```ts
         * export interface Some { self: string }
         * ```
         *
         * output: index.js
         * ```js
         * import { Some } from "./some/lib"
         * export const some = { self: 'test' }
         * ```
         */
        newNode.flags = node.flags
    }

    if (ts.isExportDeclaration(node)) {
        const exportNode = ts.updateExportDeclaration(
            node, node.decorators, node.modifiers, node.exportClause, newSpec
        )
        if (exportNode.flags !== node.flags) {
            /**
             * Additional hacks for exports. Without it ts throw exception, if flags changed in export node.
             */
            const ms = exportNode.moduleSpecifier
            const oms = node.moduleSpecifier
            ms.pos = oms.pos
            ms.end = oms.end
            ms.parent = oms.parent

            newNode = exportNode

            newNode.flags = node.flags
        }
    }

    if (ts.isCallExpression(node)) newNode = ts.updateCall(
        node, node.expression, node.typeArguments, [newSpec]
    )

    return newNode
}

function patchEmitFiles(host: any): ts.TransformerFactory<ts.SourceFile>[] {
    if (host.emitFiles.__patched) return host.emitFiles.__patched
    const dtsTransformers: ts.TransformerFactory<ts.SourceFile>[] = []

    const oldEmitFiles = host.emitFiles
    /**
     * Hack
     * Typescript 2.8 does not support transforms for declaration emit
     * see https://github.com/Microsoft/TypeScript/issues/23701
     */
    host.emitFiles = function newEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        let newTransformers = transformers
        if (emitOnlyDtsFiles && !transformers || transformers.length === 0) {
            newTransformers = dtsTransformers
        }

        return oldEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, newTransformers)
    }
    host.emitFiles.__patched = dtsTransformers

    return dtsTransformers
}

let isPatched = false

export default function transformPaths(program?: ts.Program) {
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
                    sf,
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
        afterDeclarations(
            transformationContext: ts.TransformationContext
        ): ts.Transformer<ts.SourceFile> {
            return plugin.before(transformationContext)
        }
    }

    if (!isPatched && compareVersions(ts.versionMajorMinor, '2.9') < 0) {
        isPatched = true
        patchEmitFiles(ts).push(plugin.afterDeclarations)
    }

    return plugin
}
