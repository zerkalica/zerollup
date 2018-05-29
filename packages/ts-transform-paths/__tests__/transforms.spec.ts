import {transpile} from './helpers'
import * as ts from 'typescript'

describe('transforms', () => {
    const files = [
        {
            title: 'non-default import',
            path: 'index.ts',
            content: `import {some} from 'someRoot/lib'
export default some
`,
            esnext: `import { some } from './some/lib';
export default some;
`,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("./some/lib");
exports.default = lib_1.some;
`,
            declaration: `import { some } from './some/lib';
export default some;
`,
        },

        {
            title: 'interface import',
            path: 'index.ts',
            content: `import {Some} from 'someRoot/lib'
export const some: Some = { self: 'test' }
`,
            esnext: `export const some = { self: 'test' };
`,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.some = { self: 'test' };
`,
            declaration: `import { Some } from './some/lib';
export declare const some: Some;
`,
        },
    ]

    ;files.forEach(item => {
        it(`${item.title} transform to esnext`, () => {
            const data = transpile([item], { module: ts.ModuleKind.ESNext })
            expect(data.outputFiles[0].text).toEqual(item.esnext)
        })

        if (item.commonjs)
            it(`${item.title} transform to commonjs`, () => {
                const data = transpile([item], { module: ts.ModuleKind.CommonJS })
                expect(data.outputFiles[0].text).toEqual(item.commonjs)
            })

        if (item.declaration)
            it(`${item.title} declaration`, () => {
                const data = transpile([item], { module: ts.ModuleKind.CommonJS })
                expect(data.outputFiles[1].text).toEqual(item.declaration)
            })
    })
})
