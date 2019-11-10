import ts from 'typescript'
import { createTraverseVisitor } from '@zerollup/ts-helpers'
import { Config, TransformationContext } from './Types'
import { ImportPathInternalResolver } from './ImportPathInternalResolver'
import { createFixNode } from './createFixNode'
import { importPathVisitor } from './importPathVisitor'

export function transformPaths(program?: ts.Program, config: Config = {}) {
  const plugin = {
    before(
      transformationContext: TransformationContext
    ): ts.Transformer<ts.SourceFile> {
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
              fixNode: createFixNode(sf),
              sf,
              resolver,
            },
            transformationContext
          )
        )
      }
    },

    afterDeclarations(
      transformationContext: TransformationContext
    ): ts.Transformer<ts.SourceFile> {
      return plugin.before(transformationContext)
    },
  }

  return plugin
}
