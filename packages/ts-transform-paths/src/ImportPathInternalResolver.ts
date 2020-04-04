import path from 'path'
import { ImportPathsResolver } from '@zerollup/ts-helpers'
import { Config, EmitHost, Program, TransformationContext } from './Types'

const fileExistsParts = ['.min.js', '.js'] as const

const tsParts = ['.ts', '.d.ts', '.tsx', '/index.ts', '/index.tsx', '/index.d.ts', ''] as const

export class ImportPathInternalResolver {
  protected resolver: ImportPathsResolver
  protected emitHost: EmitHost | undefined

  constructor(
    protected program: Program | undefined,
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

  fileExists(file: string) {
    const { program, emitHost } = this
    if (program?.fileExists) return program.fileExists(file)
    if (emitHost?.fileExists) return emitHost.fileExists(file)

    return true
  }

  resolveImport(oldImport: string, currentDir: string): string | undefined {
    const config = this.config
    const newImports = this.resolver.getImportSuggestions(oldImport, currentDir)

    if (!newImports) return

    for (let newImport of newImports) {
      const newImportPath = path.join(currentDir, newImport)

      for (let part of tsParts) {
        if (this.fileExists(`${newImportPath}${part}`)) return newImport
      }

      if (config.tryLoadJs) {
        for (let ext of fileExistsParts) {
          if (this.fileExists(`${newImportPath}${ext}`))
            return `${newImport}${ext}`
        }
      }

    }
  }
}
