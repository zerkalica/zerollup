import ts from 'typescript'
import { createTraverseVisitor } from '@zerollup/ts-helpers'
import {
  Config,
  defaultConfig,
  TransformationContext,
  CustomTransformer,
} from './Types'
import { ImportPathInternalResolver } from './ImportPathInternalResolver'
import { createFixNode } from './createFixNode'
import { importPathVisitor } from './importPathVisitor'

export function transformPaths(
  program?: ts.Program,
  configRaw: Config = defaultConfig
) {
  const config = { ...defaultConfig, ...configRaw }

  function createTransformer(transformationContext: TransformationContext) {
    const resolver = new ImportPathInternalResolver(
      program,
      transformationContext,
      config
    )

    return function transformer(sf: ts.SourceFile) {
      return ts.visitNode(
        sf,
        createTraverseVisitor(
          importPathVisitor,
          {
            fixNode: config.disableForDeclarations
              ? undefined
              : createFixNode(sf),
            sf,
            resolver,
          },
          transformationContext
        )
      )
    }
  }

  const plugin: CustomTransformer = {
    before: createTransformer,
    afterDeclarations: config.disableForDeclarations
      ? undefined
      : (createTransformer as CustomTransformer['afterDeclarations']),
  }

  return plugin
}
