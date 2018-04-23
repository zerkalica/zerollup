# Rollup assets plugin

The best assets (fonts and images) management for rollup. Automatically gather assets from all packages/libraries.

1. Detect asset in import ``` import faceAngel from './face-angel.png' ```
2. Generate human-friendly unique asset path: ``` config.assetsUrl + 'my-package/face-angel.png' ```
3. Base url for all assets configurable in runtime, see [zerollup/injector](../injector)
4. Copy resources to ``` dist/i/<pkg.name>/* ``` directory of package
5. When building application - extracts assets from packages and copy them to ``` dist/i/<pkg.names>/ ```

Example [zerollup demo site](https://github.com/zerkalica/zerollup-demo/tree/master/packages/site1).

## Library

my-unique-lib/src/index.ts

```ts
import faceAngel from './face-angel.png'

export {faceAngel}
```

Transpiled my-unique-lib/dist/index.js

```js
import { config } from '@zerollup/injector';

var faceAngel = config.assetsUrl + "my-unique-lib/face_angel.png"

export { faceAngel };
```

ls my-unique-lib/dist/i:

```
my-unique-lib/
    face_angel.png
```

## Application

my-unique-app/src/index.ts

```ts
import {faceAngel} from 'my-unique-lib'

console.log(faceAngel)
```

my-unique-app/dist/index.js
```js
var myUniqueApp = (function () {
    'use strict';

    var baseUrl = {
        assets: '/'
    };

    var faceAngel = baseUrl.assets + "my-unique-lib/face_angel.png";

    console.log(faceAngel);

}());
```

ls my-unique-app/dist/i:

```
my-unique-lib/
    face_angel.png
```

## Setup

Example rollup.config.js

```ts
const pkg = require('./package.json')

export default {
    plugins: [
        // ...
        assets({
            name: pkg.name,
            pkgRoot: process.cwd(),
            isLib: true
        })
    ]
}
```

For complex usage see zerollup [preset-ts](../preset-ts)

## For typescript

Install typescript asset module resolver fix:

``` cp -rf ./node_modules/@zerollup/base-url/@types/assets-fix ./node_modules/@types ```
