import path from 'path'
import ts from 'typescript'
import {
  ImportPathsResolver,
  createTraverseVisitor,
} from '@zerollup/ts-helpers'

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

export type FixNode = (fixNode: ts.Node, newImport: string) => ts.Node

interface ImportPathVisitorContext {
  resolver: ImportPathsResolver
  sf: SourceFile
  fixNode: FixNode
  normalizeImport?(fileName: string): string | undefined
}

function stripQuotes(quoted: string): string {
  if (quoted[0] !== '"' && quoted[0] !== '\'') return quoted
  return quoted.substring(1, quoted.length - 1)
}

function importPathVisitor(
  node: ts.Node,
  { resolver, fixNode, sf, normalizeImport }: ImportPathVisitorContext
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
    // importValue = stripQuotes(node.moduleSpecifier.getText(sf))
    nodeToFix = node.moduleSpecifier
  } else if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal)
  ) {
    importValue = node.argument.literal.getText(sf)
  } else if (ts.isModuleDeclaration(node)) {
    if (!ts.isStringLiteral(node.name)) return
    importValue = stripQuotes(node.name.getText(sf))
    nodeToFix = node.name
  } else {
    return
  }

  const newImports = resolver.getImportSuggestions(
    importValue,
    path.dirname(sf.fileName)
  )
  if (!newImports || newImports.length === 0) return
  let newImport: string | undefined = newImports[0]
  if (normalizeImport) {
    newImport = normalizeImport(newImport)
    if (!newImport) return
  }
  if (newImport === importValue) return

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

function normalizeHostImport(
  emitHost:
    | ts.ModuleResolutionHost & Pick<ts.Program, 'getSourceFile'>
    | undefined,
  program: ts.Program | undefined,
  tryLoadJs: boolean,
  moduleName: string,
): string | undefined {
  if (!emitHost) return moduleName
  if (tryLoadJs && emitHost && emitHost.fileExists)
    for (let ext of exts)
      if (emitHost.fileExists(`${moduleName}.${ext}`))
        return `${moduleName}.${ext}`

  const mod = moduleName[0] === '.' ? moduleName.substring(2) : moduleName
  const host = program || emitHost
  if (!host) return
  if (host.getSourceFile(`${mod}.ts`) || host.getSourceFile(`${mod}.tsx`))
    return moduleName
}

export default function transformPaths(
  program?: ts.Program,
  { exclude = undefined, tryLoadJs = false }: Config = {}
) {
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
        transformationContext.getEmitHost
          ? transformationContext.getEmitHost()
          : undefined

      const normalizeImport = normalizeHostImport.bind(null, emitHost, program, tryLoadJs)

      return function transformer(sf: SourceFile) {
        const visitorContext: ImportPathVisitorContext = {
          fixNode: createFixNode(sf),
          sf,
          resolver,
          normalizeImport,
        }

        return ts.visitNode(
          sf,
          createTraverseVisitor(
            importPathVisitor,
            visitorContext,
            transformationContext
          )
        )
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

function createFixNode(sf: SourceFile) {
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
