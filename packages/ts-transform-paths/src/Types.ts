import ts from 'typescript'

export interface Config {
  /**
    Disable plugin path resolving for given paths keys
    @default undefined
  */
  exclude?: string[] | undefined

  /**
   * Try to load min.js and .js versions of each mapped import: for use ts without bundler
   * @default false
   */
  tryLoadJs?: boolean

  /**
   * Use emitHost.fileExists to detect if import file exists. Usable for imports like some/Button.css
   * @default true
   */
  fileCkeckExists?: boolean
}

export const defaultConfig: Config = {
  fileCkeckExists: true
}

export type EmitHost = ts.ModuleResolutionHost & Pick<ts.Program, 'getSourceFile'>

export type TransformationContext = ts.TransformationContext & {
  getEmitHost?: () => EmitHost
}
