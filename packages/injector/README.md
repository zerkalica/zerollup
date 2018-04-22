# Zerollup injector

Modularized [__webpack_public_path__](https://webpack.js.org/guides/public-path/#on-the-fly) analog.
Usable, when need to set public url to images and assets in runtime.

How to configure:

./my-module-name/src/bootstrap.ts

```ts
import {config} from '@zerollup/config'

config.assetsUrl = 'https://my-statics.com/assets/'

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
config.assetsUrl = 'https://my-statics.com/assets/'

console.log(config.assetsPlugin + 'my-module-name/my-pic.svg')
```

Be carefull, setting config.assetsUrl must be first, so place it to separate bootstrap file

For example usage see generated [zerollup demo site](https://github.com/zerkalica/zerollup-demo/blob/master/packages/site1/dist/index.js) bundle.
