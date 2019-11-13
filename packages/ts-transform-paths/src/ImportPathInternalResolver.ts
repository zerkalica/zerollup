import ts from 'typescript'
import path from 'path'
import { ImportPathsResolver } from '@zerollup/ts-helpers'
import { Config, EmitHost, TransformationContext } from './Types'

const jsExts = ['min.js', 'js'] as const

const tsParts = ['.ts', '.tsx', '/index.ts', '/index.tsx'] as const

export class ImportPathInternalResolver {
  protected resolver: ImportPathsResolver
  protected emitHost: EmitHost | undefined

  constructor(
    protected program: ts.Program | undefined,
    transformationContext: TransformationContext,
    protected config: Config
  ) {
    const { paths, baseUrl } = transformationContext.getCompilerOptions()
    this.resolver = new ImportPathsResolver({
      paths,
      baseUrl,
      exclude: config.exclude,
    })
    this.emitHost = transformationContext.getEmitHost
      ? transformationContext.getEmitHost()
      : undefined
  }

  resolveImport(oldImport: string, currentDir: string): string | undefined {
    const { emitHost } = this
    const newImports = this.resolver.getImportSuggestions(oldImport, currentDir)
    if (!newImports || newImports.length === 0) return
    const newImport = newImports[0]
    if (this.config.tryLoadJs && emitHost && emitHost.fileExists) {
      for (let ext of jsExts) {
        const importWithExtension = `${newImport}.${ext}`
        if (emitHost.fileExists(path.join(currentDir, importWithExtension))) {
          return importWithExtension
        }
      }
    }

    let newImportPath = path.join(currentDir, newImport)
    if (newImportPath[0] === '.') newImportPath = newImportPath.substring(2)

    const host = this.program || emitHost
    if (!host) return newImport
    for (let part of tsParts) {
      if (host.getSourceFile(`${newImportPath}${part}`)) return newImport
    }
  }
}

