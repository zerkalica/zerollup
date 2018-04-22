# Typescript transform paths plugin

tsconfig baseUrl + paths alias rewriting in bundles and declaration files. You can use absolute paths in libraries. All them will be rewritted to relative in transpiled js and in d.ts files.

Works everywhere, no more [tspath](https://github.com/duffman/tspath), [rollup-plugin-alias](https://github.com/rollup/rollup-plugin-alias) and other workarounds.

Why? Problem described [here](https://github.com/Microsoft/TypeScript/issues/18972): d.ts files not working, if absolute paths used in npm-packaged library.

## Usage

my-lib/tsconfig.json:
```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "my-lib/*": ["src/*"]
        }
    }
}
```

my-lib/src/index.ts
```ts
export * from 'my-lib/some'
```

my-lib/src/some.ts
```ts
export const some = '123'
```

Transpiled my-lib/dist/index.js

```ts
export * from './some'
```

Typings my-lib/dist/index.d.ts

```ts
export * from './some';
```

For more examples see [zerollup demo lib](https://github.com/zerkalica/zerollup-demo/tree/master/packages/lib1).

## Setup

[rollup-plugin-typescript2 >= 0.14](https://github.com/ezolenko/rollup-plugin-typescript2) supports ts-trasformers.

rollup.config.js
```js
import {createTransformerChain} from '@zerollup/ts-helpers'
import tsTransformPaths from '@zerollup/ts-transform-paths'

const transformers = createTransformerChain([tsTransformPaths])

export default {
    plugins: [
        typescript({
            tsconfig: path.join(repoRoot, 'tsconfig.base.json'),
            transformers
        })
    ]
}
```

## Limitations

TS plugin api not a production ready. Used some hack to modify d.ts imports/exports.

For path resolving used only first element in paths substitutions array, other elements will be ignored.

my-lib/tsconfig.json:
```json
{
    "compilerOptions": {
        "paths": {
            "my-lib/*": ["src/*", "ignored_paths/*"]
        }
    }
}
```

## Related issues

* [tsconfig paths break...](https://github.com/Microsoft/TypeScript/issues/18972)
* [Transpile to JS considering paths from tsconifg](https://github.com/Microsoft/TypeScript/issues/18951)
* [Module path mapping is not working in generated js files](https://github.com/Microsoft/TypeScript/issues/16640)
