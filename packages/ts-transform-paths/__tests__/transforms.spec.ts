import {transpile} from './helpers'
import * as ts from 'typescript'

describe('transforms', () => {
    const interfaceLib = {
        path: './lib/Some.ts',
        content: `export interface Some { self: string }`,
    }

    const files = [
        {
            title: 'non-default import',
            files: [
                {
                    path: 'index.ts',
                    content: `import {Some} from "someRoot/Some"
export default Some`,
                },
                interfaceLib,
            ],
            esnext: ``,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });`,
            declaration: `import { Some } from "./lib/Some";
export default Some;`,
        },

        {
            title: 'interface import',
            files: [
                {
                    path: 'index.ts',
                    content: `import {Some} from "someRoot/Some"
export const some: Some = { self: 'test' }`,
                },
                interfaceLib,
            ],
            esnext: `export const some = { self: 'test' };`,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.some = { self: 'test' };`,
            declaration: `import { Some } from "./lib/Some";
export declare const some: Some;`,
        },

        {
            title: 'require',
            files: [
                {
                    path: 'index.ts',
                    content: `const some = require("someRoot/Some")`,
                },
                interfaceLib,
            ],
            esnext: `const some = require("./lib/Some");`,
            commonjs: `const some = require("./lib/Some");`,
            declaration: `declare const some: any;`,
        },

        {
            title: 'non-default export',
            files: [
                {
                    path: 'index.ts',
                    content: `export {Some} from "someRoot/Some"`,
                },
                interfaceLib,
            ],
            esnext: ``,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });`,
            declaration: `export { Some } from "./lib/Some";`,
        },

        {
            title: 'mixed non-default export',
            files: [
                {
                    path: 'index.ts',
                    content: `export {Some, SomeImpl} from "someRoot/Some"`,
                },
                {
                    path: './lib/Some.ts',
                    content: `export interface Some { self: string }
export class SomeImpl implements Some {
    self: string = '123'
}`,
                },
            ],
            esnext: `export { SomeImpl } from "./lib/Some";`,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Some_1 = require("./lib/Some");
exports.SomeImpl = Some_1.SomeImpl;`,
            declaration: `export { Some, SomeImpl } from "./lib/Some";`,
        },

        {
            title: 'star export',
            files: [
                {
                    path: 'index.ts',
                    content: `export * from "someRoot/Some2"`,
                },
                interfaceLib,
                {
                    path: './lib/Some2.ts',
                    content: `import {Some} from "someRoot/Some"
export const some: Some = {self: 'test'}`,
                },
            ],
            esnext: `export * from "./lib/Some2";`,
            commonjs: `"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./lib/Some2"));`,
        }
    ]

    const paths = {
        'someRoot/*': ['lib/*']
    }

    ;files.forEach(item => {
        it(`${item.title} esnext`, () => {
            const data = transpile(item.files, { module: ts.ModuleKind.ESNext, paths })
            expect(data.outputFiles[0].text.trim()).toEqual(item.esnext.trim())
        })

        if (item.commonjs)
            it(`${item.title} commonjs`, () => {
                const data = transpile(item.files, { module: ts.ModuleKind.CommonJS, paths })
                expect(data.outputFiles[0].text.trim()).toEqual(item.commonjs.trim())
            })

        if (item.declaration)
            it(`${item.title} declaration`, () => {
                const data = transpile(item.files, { module: ts.ModuleKind.CommonJS, paths })
                expect(data.outputFiles[1].text.trim()).toEqual(item.declaration.trim())
            })
    })
})
