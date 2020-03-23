# Typescript transform paths plugin

Heavily tested and most complete import/require path rewriter for typescript.

tsconfig baseUrl + paths alias rewriting in bundles and declaration files. You can use absolute paths in libraries. All them will be rewritted to relative in transpiled js and in d.ts files.

Works everywhere, no more [tspath](https://github.com/duffman/tspath), [rollup-plugin-alias](https://github.com/rollup/rollup-plugin-alias) or [webpack resolve alias](https://webpack.js.org/configuration/resolve/#resolvealias) and other workarounds.

Why? Problem described [here](https://github.com/Microsoft/TypeScript/issues/23701): d.ts files not working, if absolute paths used in npm-packaged library.

## Similar libraries

[ts-transform-import-path-rewrite](https://github.com/dropbox/ts-transform-import-path-rewrite) does't support compilerOptions.paths config, doesn't support require function, weak tested.

[ts-transformer-imports](https://github.com/grrowl/ts-transformer-imports) doesn't support dynamic import and require function. It doesn't support d.ts:  `"transform": "ts-transformer-imports", "afterDeclarations" true, "before": "true"}` rewrites paths only in d.ts, `"transform": "ts-transformer-imports", "afterDeclarations" true, "after": "true"}` rewrites paths only in js.

## External packages

Since 1.7.4 plugin rewrites paths only in internal project files, not for packages in node_modules.

```ts
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "src"
    "plugins": [{ "transform": "@zerollup/ts-transform-paths" }],
    "paths": { "*": ["*"] },
  }
}

// main.ts
import { app } from "electron";  // a module in node_modules
import { setMenu } from "main/menu";  // a module in the current dir

// main.js
const electron_1 = require("electron");
const menu_1 = require("./main/menu");
```

## Setup For [ttypescript](https://github.com/cevek/ttypescript)

[ttypescript](https://github.com/cevek/ttypescript) is a wrapper around typescript with transformer plugin support in tsconfig.json.

my-lib/tsconfig.json:

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "my-lib/*": ["src/*"]
        },
        "plugins": [
            {
                "transform": "@zerollup/ts-transform-paths",
                "exclude": ["*"]
            }
        ]
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

## Setup For [rollup-plugin-typescript2](https://github.com/ezolenko/rollup-plugin-typescript2)

install:
```shell
$ npm i -D @zerollup/ts-transform-paths ttypescript
```

add to configure file rollup.config.js
```js
import ttypescript from 'ttypescript'
import tsPlugin from 'rollup-plugin-typescript2'

export default {
    input: 'src/lib.ts',
    output: [{ file : 'dist/lib.js', name : 'mylib', format : 'iife', sourcemap : true }],
    plugins: [
        tsPlugin({
            typescript: ttypescript
        })
    ]
}
```

And setup tsconfig.json

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "my-lib/*": ["src/*"]
        },
        "plugins": [
            {
                "transform": "@zerollup/ts-transform-paths",
                "exclude": ["*"]
            }
        ]
    }
}
```

## Setup For webpack [ts-loader](https://github.com/TypeStrong/ts-loader)

```js
const tsTransformPaths = require('@zerollup/ts-transform-paths');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
        options: {
          getCustomTransformers: (program) => {
            const transformer = tsTransformPaths(program);
 
            return {
              before: [transformer.before], // for updating paths in generated code
              afterDeclarations: [transformer.afterDeclarations] // for updating paths in declaration files
            };
          }
        }
      }
    ]
  }
};
```

## Plugin options

```ts
interface Config {
    /**
        Disable plugin path resolving for given paths keys
     */
    exclude?: string[] | void
}
```
