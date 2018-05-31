import {TSOptions, ImportPathsResolver} from '../src/ImportPathsResolver'

function createResolver(opts?: TSOptions) {
    return new ImportPathsResolver({
        paths: {
            'someRoot/*': ['lib/*/src'],
        },
        baseUrl: '.',
        ...opts,
    })
}

describe('ImportPathsResolver', () => {
    it('should resolve relative file', () => {
        const resolver = createResolver()
        expect(resolver.getImportSuggestions(
            'someRoot/some',
            './bla/index.ts',
        )).toEqual([
            '../../lib/some/src'
        ])

        expect(resolver.getImportSuggestions(
            'someRoot/some',
            './index.ts',
        )).toEqual([
            '../lib/some/src'
        ])
    })
})
