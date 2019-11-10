import ts from 'typescript'

export type FixNode = (fixNode: ts.Node, newImport: string) => ts.Node

export function createFixNode(sf: ts.SourceFile) {
  const posMap = new Map<string, number>()
  return function fixNode(fixNode: ts.Node, newImport: string): ts.Node {
    /**
     * This hack needed for properly d.ts paths rewrite.
     * moduleSpecifier value obtained by moduleSpecifier.pos from original source file text.
     * See emitExternalModuleSpecifier -> writeTextOfNode -> getTextOfNodeFromSourceText.
     *
     * We need to add new import path to the end of source file text and adjust moduleSpecifier.pos
     *
     * ts remove quoted string from output
     */
    const newStr = `"${newImport}"`
    let cachedPos = posMap.get(newImport)
    if (cachedPos === undefined) {
      cachedPos = sf.text.length
      posMap.set(newImport, cachedPos)
      sf.text += newStr
      sf.end += newStr.length
    }
    fixNode.pos = cachedPos
    fixNode.end = cachedPos + newStr.length

    return fixNode
  }
}
