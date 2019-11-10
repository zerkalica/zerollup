import ts from 'typescript'

export interface Config {
  /**
        Disable plugin path resolving for given paths keys
     */
  exclude?: string[] | undefined

  /**
   * Try to load min.js and .js versions of each mapped import: for use ts without bundler
   */
  tryLoadJs?: boolean
}

export type EmitHost = ts.ModuleResolutionHost & Pick<ts.Program, 'getSourceFile'>

export type TransformationContext = ts.TransformationContext & {
  getEmitHost?: () => EmitHost
}
