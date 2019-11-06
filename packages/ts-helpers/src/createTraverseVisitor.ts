import ts from 'typescript'

export type TraverseVisitor<VisitorContext> = (
    node: ts.Node,
    visitorContext: VisitorContext
) => ts.VisitResult<ts.Node> | undefined

export function createTraverseVisitor<VisitorContext>(
    traverseVisitor: TraverseVisitor<VisitorContext>,
    visitorContext: VisitorContext,
    ctx: ts.TransformationContext
): ts.Visitor {
    return function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
        return traverseVisitor(node, visitorContext) || ts.visitEachChild(node, visitor, ctx)
    }
}
