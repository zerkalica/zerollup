import {TSOptions, ImportPathsResolver} from '../src/ImportPathsResolver'

function createResolver(opts?: TSOptions) {
    return new ImportPathsResolver({
        paths: {
            'someRoot/*': ['lib/*/src'],
            '*': ['./types/*'],
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

    it('should not resolve relative paths to default alias', () => {
        const resolver = createResolver()
        expect(resolver.getImportSuggestions(
            './some',
            './bla/index.ts',
        )).toBeUndefined()
    })

    it('should not resolve relative paths to parent directory', () => {
      const resolver = createResolver()
      expect(resolver.getImportSuggestions(
          '../some',
          './bla/index.ts',
      )).toBeUndefined()
    })

  it('should exclude some paths tokens', () => {
        const resolver = createResolver({
            exclude: ['*'],
        })
        expect(resolver.getImportSuggestions(
            'pkg_test',
            './bla/index.ts',
        )).toEqual(['../../pkg_test'])
    })

    it('should parse *', () => {
        const resolver = createResolver()
        expect(resolver.getImportSuggestions(
            'pkg_test',
            './bla/index.ts',
        )).toEqual([
            '../../types/pkg_test'
        ])
    })
})
