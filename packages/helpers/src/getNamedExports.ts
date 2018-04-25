import * as fsExtra from 'fs-extra'
import nodeEval from 'node-eval'

function getModuleExports(moduleId: string): Promise<string[]> {
    const id = require.resolve(moduleId)

    return fsExtra.readFile(id)
        .then(data => {
            const moduleOut = nodeEval(data.toString(), id)
            let result: string[] = []
            const excludeExports = /^(default|__)/
            if (moduleOut && typeof moduleOut === 'object') {
                result = Object.keys(moduleOut)
                    .filter(name => name && !excludeExports.test(name))
            }

            return result
        })
}

export function getNamedExports(
    rawModuleIds?: string[] | Record<string, string[] | string>
): Promise<Record<string, string[]>> {
    const moduleIds = rawModuleIds instanceof Array
        ? rawModuleIds.reduce(
            (acc, item) => ({...acc, [item]: '*'}),
            {}
        )
        : <Record<string, string[] | string>>(rawModuleIds || {})

    return Promise.all(Object.keys(moduleIds).map(id => {
        const val = moduleIds[id]
        return val instanceof Array
            ? {id, moduleExports: val}
            : getModuleExports(id).then(moduleExports => {
                return {id, moduleExports}
            })
    }))
        .then(recs => recs.reduce((acc, rec) => ({
            ...acc,
            [rec.id]: rec.moduleExports
        }), <Record<string, string[]>>{}))
}
