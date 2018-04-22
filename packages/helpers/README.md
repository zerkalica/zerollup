# Zerollup package helpers

Set of helpers for fast rollup bundler config building. Usable for creating zero-setup bundlers, like [parcel](https://github.com/parcel-bundler/parcel).

1. Scan lerna packages in monorepository
2. Extract information about main/module/iife/umd exports
3. Scan project sources and grab info about entry points, configurations and templates
4. Scan src/config and generate bundled configurations for many hosts
5. Scan src/index.html.ts and prerenders html-templates for each configuration

For example usage see [@zerollup/preset-ts](../preset-ts)
