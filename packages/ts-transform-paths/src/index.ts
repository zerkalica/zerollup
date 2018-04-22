import * as path from 'path'
import * as ts from 'typescript'
import {Replacer, ImportPathsResolver, createTraverseVisitor, TraverseVisitor} from '@zerollup/ts-helpers'

interface ImportPathsVisitorArgs {
    resolver: ImportPathsResolver
    replacer: Replacer
}

function createImportPathsVisitor({replacer, resolver}: ImportPathsVisitorArgs): TraverseVisitor {
    return (node: ts.Node) => {
        let newNode: ts.ExportDeclaration | void = undefined
        switch(node.kind) {
            case ts.SyntaxKind.ExportDeclaration: {
                const n = node as ts.ExportDeclaration
                const moduleSpecifier = n.moduleSpecifier
                if (!moduleSpecifier) break
                const matches = moduleSpecifier.getText().match(/^(['"\s]+)?(.*)(['"\s]+)?$/)
                if (!matches) break
                const [prefix, oldImport, suffix] = matches
                const sf = n.getSourceFile()
                const newImports = resolver.getImportSuggestions(oldImport, path.dirname(sf.fileName))
                const replacement = newImports ? `${prefix}${newImports[0]}${suffix}` : null
                if (!replacement) break
                replacer.push({
                    start: moduleSpecifier.pos,
                    length: moduleSpecifier.end - moduleSpecifier.pos,
                    replacement
                })
               break
            }
            case ts.SyntaxKind.ImportDeclaration: {
                const n = node as ts.ImportDeclaration
                const some = n.getText()
                console.log(some)
                break
            }
            default: break
        }

        return newNode
    }
}

export default function transformPaths(ls: ts.LanguageService) {
    return {
        before(ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
            const resolver = new ImportPathsResolver(ctx.getCompilerOptions())
            return (sf: ts.SourceFile) => {
                const args: ImportPathsVisitorArgs = {
                    replacer: new Replacer(sf.text),
                    resolver
                }
                ts.visitNode(sf, createTraverseVisitor(createImportPathsVisitor(args), ctx))
                const newText = args.replacer.getReplaced()
                if (!newText) return sf
                const newFile = ts.updateSourceFile(sf, newText, {
                    span: {
                        start: 0,
                        length: sf.text.length
                    },
                    newLength: newText.length
                })
                return newFile
            }
        }
    }
}
