import * as ts from 'typescript'

function patchEmitFiles(dtsTransformers: ts.TransformerFactory<ts.SourceFile>[]) {
    let a: any = ts
    if (a.emitFiles.__patched) return

    const oldEmitFiles = a.emitFiles
    /**
     * Hack
     * Typescript 2.8 does not support transforms for declaration emit
     * see https://github.com/Microsoft/TypeScript/issues/23701
     */
    a.emitFiles = function newEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, transformers) {
        let newTransformers = transformers
        if (emitOnlyDtsFiles && !transformers || transformers.length === 0) {
            newTransformers = dtsTransformers
        }

        return oldEmitFiles(resolver, host, targetSourceFile, emitOnlyDtsFiles, newTransformers)
    }

    a.emitFiles.__patched = true
}

function createDtsChain() {
    const dtsTransformers: ts.TransformerFactory<ts.SourceFile>[] = []
    patchEmitFiles(dtsTransformers)

    return (transformer: ts.TransformerFactory<ts.SourceFile>) => {
        dtsTransformers.push(transformer)
    }
}

export const addDtsPlugin = createDtsChain()
