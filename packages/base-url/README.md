# Assets base url

Configure assets base url in runtime. Modularized [__webpack_public_path__](https://webpack.js.org/guides/public-path/#on-the-fly) analog.

How to configure:

./my-module-name/src/bootstrap.ts

```ts
import bu from '@zerollup/base-url'

bu.assets = 'https://my-statics.com/assets/'

```

./my-module-name/src/index.ts

```ts
import './bootstrap'
import svg from './my-pic.svg'
console.log(svg)
```

Rollup [plugin-assets](../plugin-assets) transpile it into

./my-module-name/src/index.js
```ts
bu.assets = 'https://my-statics.com/assets/'

console.log(bu.assets + 'my-module-name/my-pic.svg')
```

First set baseUrl.assets value, place setup code to separate bootstrap file and import it first in index.js.

Example [zerollup demo site](https://github.com/zerkalica/zerollup-demo/blob/master/packages/site1/dist/index.js) bundle.

## For typescript

Install typescript asset module resolver fix:

``` cp -rf ./node_modules/@zerollup/base-url/@types/assets-fix ./node_modules/@types ```
