# Zero setup rollup

Zero configuration web application or library bundler, built on top of rollup (But some packages can be used without rollup).

Main idea of zerollup - generate deploy-ready configurations and templates for all host targets and environments at once.

* Out of the box support for ts and file assets in application and libraries
* Gather assets from all application dependencies
* Allow to configure base assets url in runtime 
* No plugins to install. Automatically modules using rollup and typescript
* Lerna friendly. Bundle or dev all packages or pick one of them
* Builds configured bundles per each configuration
* Asynchronously prerenders templates from ts-modules per each configuration

## Packages

Zerollup is the set of packages. All of them used in preset-ts.

* [helpers](./packages/helpers) - Set of helpers for fast rollup bundler config building. Core of zerollup.
* [base-url](./packages/base-url) - Configure assets base url in runtime.
* [rollup-plugin-assets](./packages/rollup-plugin-assets) - Automatically gather assets from all packages/libraries.
* [rollup-plugin-template](./packages/rollup-plugin-template) - Html pages generator.
* [rollup-preset-ts](./packages/rollup-preset-ts) - Zero setup rollup preset for typescripted libraries and applications.
* [ts-helpers](./packages/ts-helpers) - Helper for fast ts-plugins building.
* [ts-transform-paths](./packages/ts-transform-paths) - tsconfig baseUrl + paths alias rewriting in bundles and declaration files.
* [wait-all-async](./packages/wait-all-async) - framework and bundler agnostic SPA prerenderer.

## Setup

``` npm install --dev @zerollup/rollup-preset-ts ```

package.json:
```json
{
  "name": "zerollup-demo",
  "scripts": {
    "build": "rollup -c node:@zerollup/rollup-preset-ts",
    "dev": "rollup -w -c node:@zerollup/rollup-preset-ts"
  }
}
```

Build all packages:

```
npm run build
```

Build only lib1, lib2 packages in lerna packages directory:

```
BULD_PKG=lib1,lib2 npm run build
```

Build site with assets and templates. And run development server on 10001 port. 

```
BULD_PKG=site1 npm run dev
```

For examples see [zerollup demo](https://github.com/zerkalica/zerollup-demo).

## Why not parcel?

Look at the demo site1 [dist/hosts](https://github.com/zerkalica/zerollup-demo/tree/master/packages/site1/dist/hosts).
From one input source generated a lot of configurations and templates.

src/index.ts
```ts
import './bootstrap'
import config from './config'

export default function app(node) {
    console.log(node, config, faceAngel)
}
```

src/config/index.ts
```ts
/** ZEROLLUP_CONFIG_BASE_URL: / **/

// Will be replaced to defined above url
const configBaseUrl = 'ZEROLLUP_CONFIG_BASE_URL'

const config: Config = {
    some: 'index',
    configBaseUrl
}

export default config
```

src/config/host1.ts inherits default config and redefine ZEROLLUP_CONFIG_BASE_URL.
```ts
// ZEROLLUP_CONFIG_BASE_URL = https://my-host1-static.com/statics/PKG_NAME/PKG_VERSION/
import baseConfig, {Config} from '.'

export default Object.assign({}, baseConfig, <Config> {
    some: 'host1'
})
```

dist/hosts/host1/index.html
```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Zerollup site1</title>
    </head>
    <body>
        <div id="app"></div>
        <script src="https://my-host1-static.com/statics/zerollup_demo_site1/1.0.1/config.host1.js"></script>
        <script src="https://my-host1-static.com/statics/zerollup_demo_site1/1.0.1/index.js"></script>
        <script>zerollupDemoSite1(document.getElementById('app'))</script>
    </body>
</html>
```
