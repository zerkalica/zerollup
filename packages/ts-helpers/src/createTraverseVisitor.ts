import * as ts from 'typescript'

export type TraverseVisitor = (node: ts.Node) => ts.VisitResult<ts.Node> | void

export function createTraverseVisitor(rawVisitor: TraverseVisitor, ctx: ts.TransformationContext): ts.Visitor {
    const visitor = (node: ts.Node) => rawVisitor(node) || ts.visitEachChild(node, visitor, ctx)

    return visitor
}
