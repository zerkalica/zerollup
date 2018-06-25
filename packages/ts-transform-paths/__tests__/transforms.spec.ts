import {transpile} from './helpers'
import * as ts from 'typescript'
import transformPathPlugin from '../src'

describe('transforms', () => {
    const interfaceLib = {
        path: './lib/Some.ts',
        content: `export interface Some { self: string }`,
    }

    const files = [
        {
            title: 'double import',
            files: [
                {
                    path: 'index.ts',
                    content: `import {Some} from "someRoot/Some"
import A from "someRoot/Some"
const a = new A()
export default Some`,
                },
                {
                    path: './lib/Some.ts',
                    content: `export interface Some { self: string }
export default class A {}
`,
                },
            ],
            esnext: `import A from "./lib/Some";
const a = new A();`,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Some_1 = require("./lib/Some");
const a = new Some_1.default();`,
            declaration: `import { Some } from "./lib/Some";
export default Some;`,
        },

        {
            title: 'd.ts generated dynamic import',
            compilerOptions: {
                paths: {
                    'app/*': ['src/app/*'],
                },
            },
            files: [
                {
                    path: 'index.ts',
                    content: `
import {a} from 'app/a'
export class B {
    morning = a()
}
`,
                },
                {
                    path: './src/app/a.ts',
                    content: `
import { Data } from 'app/type'
export function a(): Data {
    return {some: '123'}
}
`,
                },
                {
                    path: './src/app/type.ts',
                    content: `export type Data = {some: string}`,
                }
            ],
            esnext: `import { a } from "./src/app/a";
export class B {
    constructor() {
        this.morning = a();
    }
}`,
            commonjs: `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const a_1 = require("./src/app/a");
class B {
    constructor() {
        this.morning = a_1.a();
    }
}
exports.B = B;`,
            declaration: `export declare class B {
    morning: import("./src/app/type").Data;
}`,
        },

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
        },

        {
            title: 'only dts',
            files: [
                {
                    path: 'index.ts',
                    content: `export {Some} from "someRoot/Some"`,
                },
                interfaceLib,
            ],
            emitOnlyDtsFiles: true,
            esnext: `export { Some } from "./lib/Some";`,
            commonjs: 'export { Some } from "./lib/Some";'
        },

        {
            title: 'same modules',
            compilerOptions: {
                paths: {
                    'app/*': ['src/app/*'],
                    app: ['src/app/index'],
                },
            },
            files: [
                {
                    path: 'index.ts',
                    content: `import app from 'app'
import appRootPath from 'app-root-path'
import application from 'application'
export {app, appRootPath, application}
`,
                },
                {path: 'node_modules/application.ts', content: `export default 'test'`,},
                {path: 'node_modules/app-root-path.ts', content: `export default 'test'`,},
                {path: 'node_modules/app.ts', content: `export default 'test'`,},
            ],
            esnext: `import app from "./src/app/index";
import appRootPath from 'app-root-path';
import application from 'application';
export { app, appRootPath, application };`,
            commonjs: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./src/app/index");
exports.app = app_1.default;
const app_root_path_1 = require("app-root-path");
exports.appRootPath = app_root_path_1.default;
const application_1 = require("application");
exports.application = application_1.default;`,
        },
    ]

    const opts = {
        transformers: () => ({
            before: [transformPathPlugin().before],
            afterDeclarations: [transformPathPlugin().afterDeclarations],
        }),
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            paths: {
                'someRoot/*': ['lib/*'],
            },
        },
    }

    files.forEach(item => {
        it(`${item.title} esnext`, () => {
            const data = transpile({
                ...opts,
                compilerOptions: {...opts.compilerOptions, ...item.compilerOptions},
                files: item.files,
                emitOnlyDtsFiles: item.emitOnlyDtsFiles,
            })

            expect(data.outputFiles[0].text.trim()).toEqual(item.esnext.trim())
            if (item.declaration) {
                expect(data.outputFiles[1].text.trim()).toEqual(item.declaration.trim())
            }
        })

        it(`${item.title} commonjs`, () => {
            const data = transpile({
                ...opts,
                files: item.files,
                emitOnlyDtsFiles: item.emitOnlyDtsFiles,
                compilerOptions: {...opts.compilerOptions, ...item.compilerOptions, module: ts.ModuleKind.CommonJS},
            })

            expect(data.outputFiles[0].text.trim()).toEqual(item.commonjs.trim())
        })
    })
})
