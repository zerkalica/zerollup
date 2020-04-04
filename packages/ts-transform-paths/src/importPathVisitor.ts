import path from 'path'
import ts from 'typescript'
import { FixNode } from './createFixNode'
import { ImportPathInternalResolver } from './ImportPathInternalResolver'

export interface ImportPathVisitorContext {
  sf: ts.SourceFile
  fixNode?: FixNode | undefined
  resolver: ImportPathInternalResolver
}

function stripQuotes(quoted: string): string {
  if (quoted[0] !== '"' && quoted[0] !== "'") return quoted
  return quoted.substring(1, quoted.length - 1)
}

export function importPathVisitor(
  node: ts.Node,
  { fixNode, sf, resolver }: ImportPathVisitorContext
): ts.Node | undefined {
  let importValue: string | undefined
  let nodeToFix: ts.Node | undefined

  // dynamic import or require()
  if (ts.isCallExpression(node)) {
    const expression = node.expression
    if (node.arguments.length === 0) return
    const arg = node.arguments[0]
    if (!ts.isStringLiteral(arg)) return
    if (
      // Can't call getText on after step
      expression.getText(sf) !== 'require' &&
      expression.kind !== ts.SyntaxKind.ImportKeyword
    )
      return
    importValue = stripQuotes(arg.getText(sf))
    nodeToFix = arg
    // import, export
  } else if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier))
      return
    // do not use getFullText() here, bug in watch mode, https://github.com/zerkalica/zerollup/issues/12
    importValue = node.moduleSpecifier.text
    nodeToFix = node.moduleSpecifier
  } else if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal)
  ) {
    importValue = node.argument.literal.text
  } else if (ts.isModuleDeclaration(node)) {
    if (!ts.isStringLiteral(node.name)) return
    importValue = node.name.text
    nodeToFix = node.name
  } else {
    return
  }

  const newImport = resolver.resolveImport(
    importValue,
    path.dirname(sf.fileName)
  )

  if (!newImport || newImport === importValue) return

  if (nodeToFix && fixNode) fixNode(nodeToFix, newImport)
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
