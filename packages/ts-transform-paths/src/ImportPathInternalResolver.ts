import ts from 'typescript'
import path from 'path'
import { ImportPathsResolver } from '@zerollup/ts-helpers'
import { Config, EmitHost, TransformationContext } from './Types'

const fileExistsParts = ['.min.js', '.js', ''] as const

const tsParts = ['.d.ts','.ts', '.tsx', '/index.ts', '/index.tsx', '/index.d.ts', ''] as const

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
    const { emitHost, config } = this
    const newImports = this.resolver.getImportSuggestions(oldImport, currentDir)
    if (!newImports) return
    for (let newImport of newImports) {
      const host = this.program ?? emitHost

      if (host) {
        let newImportPath = path.join(currentDir, newImport)
        if (newImportPath[0] === '.') newImportPath = newImportPath.substring(2)
        for (let part of tsParts) {
          if (!config.fileCkeckExists) return newImport;
          if (host.fileExists(`${newImportPath}${part}`)) return newImport
        }
      }

      if (emitHost && emitHost.fileExists) {
        if (config.tryLoadJs) {
          for (let ext of fileExistsParts) {
            const importWithExtension = `${newImport}${ext}`
            if (emitHost.fileExists(path.join(currentDir, importWithExtension)))
              return importWithExtension
          }
        }
        if (config.fileCkeckExists) {
          if (emitHost.fileExists(path.join(currentDir, newImport))) return newImport
        }
      }

      if (!host) return newImport

    }
  }
}
