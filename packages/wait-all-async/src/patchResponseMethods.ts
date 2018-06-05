const responseMethods: string[] = [
    'arrayBuffer',
    'blob',
    'formData',
    'json',
    'text',
]

function patchResponseMethod(r: Response, name: string, decrement: () => void, increment: () => void) {
    const oldMethod = r[name]
    r[name] = function newMethod() {
        increment()
        return oldMethod.apply(this, arguments)
            .then(data => {
                decrement()
                return data
            })
            .catch(error => {
                decrement()
                throw error
            })
    }
}

export function patchResponseMethods(r: Response, decrement: () => void, increment: () => void): Response {
    for (let name of responseMethods) {
        patchResponseMethod(r, name, decrement, increment)
    }

    return r
}
