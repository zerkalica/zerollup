# Zero setup rollup

Zero configuration web application or library bundler, built on top of rollup (But some packages can be used without rollup).

* Out of the box support for ts and file assets in application and libraries
* Gather assets from all application dependencies
* Allow to configure base assets url in runtime 
* No plugins to install. Automatically modules using rollup and typescript
* Lerna friendly. Bundle or dev all packages or pick one of them
* Builds configured bundles per each configuration
* Asynchronously prerenders templates from ts-modules per each configuration

## Packages

Zerollup is the set of packages. All of them used in preset-ts.

* [helpers](./tree/master/packages/helpers) - Set of helpers for fast rollup bundler config building. Core of zerollup.
* [injector](./tree/master/packages/injector) - Modularized [__webpack_public_path__](https://webpack.js.org/guides/public-path/#on-the-fly) analog.
* [plugin-assets](./tree/master/packages/plugin-assets) - Automatically gather assets from all packages/libraries, when building application.
* [preset-ts](./tree/master/packages/preset-ts) - Zero setup rollup preset for typescripted libraries, and applications.
* [ts-helpers](./tree/master/packages/ts-helpers) - Helper for fast ts-plugins building.
* [ts-transform-paths](./tree/master/packages/ts-transform-paths) - tsconfig baseUrl + paths alias rewriting in bundles and declaration files.


## Setup

``` npm install --dev @zerollup/preset-ts ```

package.json:
```json
{
  "name": "zerollup-demo",
  "scripts": {
    "build": "rollup -c node:@zerollup/preset-ts",
    "dev": "rollup -w -c node:@zerollup/preset-ts"
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

For more info see [@zerollup/preset-ts](../preset-ts)

For examples see [zerollup demo](https://github.com/zerkalica/zerollup-demo).

