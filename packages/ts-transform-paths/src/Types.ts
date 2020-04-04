import ts from 'typescript'

export interface Config {
  /**
    Disable plugin path resolving for given paths keys
    @default undefined
  */
  exclude?: string[] | undefined

  /**
   * Disable path rewriting for generated d.ts
   *
   * @default false
   */
  disableForDeclarations?: boolean;

  /**
   * Try to load min.js and .js versions of each mapped import: for use ts without bundler
   * @default false
   */
  tryLoadJs?: boolean
}

export const defaultConfig: Config = {}

type FileExists = Partial<Pick<ts.ModuleResolutionHost, 'fileExists'>>

export type EmitHost = FileExists

export type Program = ts.Program & FileExists

export type TransformationContext = ts.TransformationContext & {
  getEmitHost?: () => EmitHost
}

type ExtractElement<T> = T extends Array<unknown> ? T[number] : T

export type CustomTransformer = {
  [Key in keyof ts.CustomTransformers]: ExtractElement<ts.CustomTransformers[Key]>
}
