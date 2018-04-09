import * as fsExtra from 'fs-extra'
import nodeEval from 'node-eval'

function getModuleExports(moduleId: string): Promise<string[]> {
    const id = require.resolve(moduleId)

    return fsExtra.readFile(id)
        .then(data => {
            const moduleOut = nodeEval(data.toString(), id)
            let result = []
            const excludeExports = /^(default|__)/
            if (moduleOut && typeof moduleOut === 'object') {
                result = Object.keys(moduleOut)
                    .filter(name => name && !excludeExports.test(name))
            }

            return result
        })
}

export function getNamedExports(moduleIds?: string[]): Promise<Record<string, string[]>> {
    return Promise.all((moduleIds || []).map(id => 
        getModuleExports(id).then(moduleExports => ({id, moduleExports}))
    ))
        .then(recs => recs.reduce((acc, rec) => ({
            ...acc,
            [rec.id]: rec.moduleExports
        }), {}))
}
