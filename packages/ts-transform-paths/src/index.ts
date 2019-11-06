import path from 'path'
import ts from 'typescript'
import {
    ImportPathsResolver,
    createTraverseVisitor,
} from '@zerollup/ts-helpers'

const importPathRegex = /^(['"\s]+)(.+)(['"\s]+)$/

export type FixNode = (fixNode: ts.Node, newImport: string) => ts.Node

export type SourceFile = ts.SourceFile & {
    resolvedModules?: Map<
        string,
        { isExternalLibraryImport: boolean; resolvedFileName: string }
    >
}

type Host = Pick<ts.Program, 'getSourceFile'>

export type TransformationContext = ts.TransformationContext & {
    getEmitHost?: () => ts.ModuleResolutionHost & Host
}

function createFixNode(sf: SourceFile): FixNode {
    const posMap = new Map<string, number>()
    return function fixNode(fixNode: ts.Node, newImport: string): ts.Node {

        /**
         * This hack needed for properly d.ts paths rewrite.
         * moduleSpecifier value obtained by moduleSpecifier.pos from original source file text.
         * See emitExternalModuleSpecifier -> writeTextOfNode -> getTextOfNodeFromSourceText.
         *
         * We need to add new import path to the end of source file text and adjust moduleSpecifier.pos
         *
         * ts remove quoted string from output
         */
        const newStr = `"${newImport}"`
        let cachedPos = posMap.get(newImport)
        if (cachedPos === undefined) {
            cachedPos = sf.text.length
            posMap.set(newImport, cachedPos)
            sf.text += newStr
            sf.end += newStr.length
        }
        fixNode.pos = cachedPos
        fixNode.end = cachedPos + newStr.length

        return fixNode
    }
}

interface Config {
    /**
        Disable plugin path resolving for given paths keys
     */
    exclude?: string[] | undefined

    /**
     * Try to load min.js and .js versions of each mapped import: for use ts without bundler
     */
    tryLoadJs?: boolean
}

interface ImportPathVisitorContext {
    resolver: ImportPathsResolver
    fixNode: FixNode
    sf: SourceFile
    normalizeImport?(fileName: string): string | undefined
}

function importPathVisitor(
    node: ts.Node,
    { fixNode, resolver, sf, normalizeImport }: ImportPathVisitorContext
): ts.Node | undefined {
    let importValue: string
    let nodeToFix: ts.Node | undefined
    if (ts.isCallExpression(node)) {
        if (
            node.expression.getText() !== 'require' ||
            node.arguments.length !== 1
        )
            return
        const arg = node.arguments[0]
        if (!ts.isStringLiteral(arg)) return
        importValue = arg.getText()
        nodeToFix = arg
    } else if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier))
            return
        // do not use getFullText() here, bug in watch mode, https://github.com/zerkalica/zerollup/issues/12
        importValue = `"${node.moduleSpecifier.text}"`
        nodeToFix = node.moduleSpecifier
    } else if (ts.isImportTypeNode(node)) {
        importValue = `"${(node.argument as any).literal.text}"`
    } else if (ts.isModuleDeclaration(node)) {
        if (!ts.isStringLiteral(node.name)) return
        importValue = `"${node.name.text}"`
        nodeToFix = node.name
    } else {
        return
    }

    const matches = importValue.match(importPathRegex)
    if (!matches) return

    const [,,oldImport,] = matches
    const newImports = resolver.getImportSuggestions(
        oldImport,
        path.dirname(sf.fileName)
    )
    if (!newImports) return
    let newImport: string | undefined = newImports[0]

    if (normalizeImport) {
        newImport = normalizeImport(newImport)
        if (!newImport) return
    }

    if (nodeToFix) fixNode(nodeToFix, newImport)
    const newSpec = ts.createLiteral(newImport)

    let newNode: ts.Node | undefined

    if (ts.isImportTypeNode(node)) {
        newNode = ts.updateImportTypeNode(
            node,
            ts.createLiteralTypeNode(newSpec),
            node.qualifier,
            node.typeArguments,
            node.isTypeOf
        )
        newNode.flags = node.flags
    }

    if (ts.isImportDeclaration(node)) {
        newNode = ts.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.importClause,
            newSpec
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
            node,
            node.decorators,
            node.modifiers,
            node.exportClause,
            newSpec
        )
        if (exportNode.flags !== node.flags) {
            /**
             * Additional hacks for exports. Without it ts throw exception, if flags changed in export node.
             */
            const ms = exportNode.moduleSpecifier
            const oms = node.moduleSpecifier
            if (ms && oms) {
                ms.pos = oms.pos
                ms.end = oms.end
                ms.parent = oms.parent
            }

            newNode = exportNode

            newNode.flags = node.flags
        }
    }

    if (ts.isCallExpression(node))
        newNode = ts.updateCall(node, node.expression, node.typeArguments, [
            newSpec,
        ])

    if (ts.isModuleDeclaration(node)) {
        newNode = ts.updateModuleDeclaration(
            node,
            node.decorators,
            node.modifiers,
            newSpec,
            node.body
        )
    }

    return newNode
}

const exts = ['min.js', 'js'] as const

export default function transformPaths(
    program?: ts.Program,
    {exclude = undefined, tryLoadJs = false}: Config = {}
) {
    function normalizeHostImport(
        this: Host | undefined,
        fileExists: undefined | ((name: string) => boolean),
        moduleName: string
    ): string | undefined {
        if (!this) return moduleName
        if (fileExists && tryLoadJs)
            for (let ext of exts)
                if (fileExists(`${moduleName}.${ext}`)) return `${moduleName}.${ext}`

        const mod = moduleName[0] === '.' ? moduleName.substring(2) : moduleName
        if (this.getSourceFile(`${mod}.ts`) || this.getSourceFile(`${mod}.tsx`)) return moduleName    
    }

    const plugin = {
        before(
            transformationContext: TransformationContext
        ): ts.Transformer<SourceFile> {
            const options = transformationContext.getCompilerOptions()
            const resolver = new ImportPathsResolver({
                paths: options.paths,
                baseUrl: options.baseUrl,
                exclude,
            })
            const emitHost =
                transformationContext.getEmitHost &&
                transformationContext.getEmitHost()
            const fileExists = emitHost ? emitHost.fileExists.bind(emitHost) : undefined
            const normalizeImport = normalizeHostImport.bind(program || emitHost, fileExists)

            return function transformer(sf: SourceFile) {
                const ctx: ImportPathVisitorContext = {
                    sf,
                    resolver,
                    fixNode: createFixNode(sf),
                    normalizeImport,
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
            transformationContext: TransformationContext
        ): ts.Transformer<SourceFile> {
            return plugin.before(transformationContext)
        },
    }

    return plugin
}
