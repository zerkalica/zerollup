import * as ts from 'typescript'

export type TraverseVisitor<VisitorContext> = (
    node: ts.Node,
    visitorContext: VisitorContext
) => ts.VisitResult<ts.Node> | void

export function createTraverseVisitor<VisitorContext>(
    traverseVisitor: TraverseVisitor<VisitorContext>,
    visitorContext: VisitorContext,
    ctx: ts.TransformationContext
): ts.Visitor {
    const visitor = (node: ts.Node) => traverseVisitor(node, visitorContext) || ts.visitEachChild(node, visitor, ctx)

    return visitor
}
