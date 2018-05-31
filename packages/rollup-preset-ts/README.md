# Rollup configuration preset for typescript

Zero setup rollup preset for typescripted libraries, and applications.

For example see [zerollup demo](https://github.com/zerkalica/zerollup-demo) project.

## Setup

``` npm install --save-dev @zerollup/rollup-preset-ts rollup typescript lerna ```

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

