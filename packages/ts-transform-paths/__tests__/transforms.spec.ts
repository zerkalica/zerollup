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
            esnext: `import { some } from "./some/lib";
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
    ]

    ;files.forEach(item => {
        it(`${item.title} transform to esnext`, () => {
            const data = transpile([item], { module: ts.ModuleKind.ESNext })
            expect(data.outputFiles[0].text).toEqual(item.esnext)
        })
        it(`${item.title} transform to commonjs`, () => {
            const data = transpile([item], { module: ts.ModuleKind.CommonJS })
            expect(data.outputFiles[0].text).toEqual(item.commonjs)
        })
        it(`${item.title} declaration`, () => {
            const data = transpile([item], { module: ts.ModuleKind.CommonJS })
            expect(data.outputFiles[1].text).toEqual(item.declaration)
        })
    })
})
