import * as ts from 'typescript'
import * as path from 'path'
import * as fs from 'fs'

export interface VFile {
    path: string;
    content: string;
}

export interface Options {
    compilerOptions?: ts.CompilerOptions
    emitOnlyDtsFiles?: boolean
    transformers: () => ts.CustomTransformers
    files: VFile[]
}

export function transpile(opts: Options) {
    const compilerOptions: ts.CompilerOptions = {
        declaration: true,
        newLine: ts.NewLineKind.LineFeed,
        target: ts.ScriptTarget.ES2015,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        baseUrl: '.',
        lib: ['lib.dom', 'lib.esnext'],
        types: ['node'],
        paths: {},
        ...opts.compilerOptions,
    }

    const host = new TestHost(
        compilerOptions,
        opts.transformers(),
        opts.files,
    )

    const service = ts.createLanguageService(host, ts.createDocumentRegistry())

    const id = opts.files[0].path
    const data = service.getEmitOutput(id, opts.emitOnlyDtsFiles)
    const diags = [
        ...service.getSyntacticDiagnostics(id),
        ...service.getSemanticDiagnostics(id)
    ].map(diags => JSON.stringify(diags.messageText, null, '  '))

    if (diags.length) throw new Error(`${diags.join('\n')}`)

    return data
}

export class TestHost implements ts.LanguageServiceHost {
    constructor(
        private compilerOptions: ts.CompilerOptions,
        private transformers: ts.CustomTransformers,
        private files: VFile[]
    ) {}

    private cache = new Map()

    public getScriptSnapshot(
        fileName: string
    ): ts.IScriptSnapshot | undefined {
        if (this.cache.has(fileName)) return this.cache.get(fileName)
        const file = this.files.find(file => file.path === fileName)
        const content = file
            ? file.content
            : (
                fs.existsSync(fileName)
                    ? fs.readFileSync(fileName).toString()
                    : ''
            )

        const snap = ts.ScriptSnapshot.fromString(content)
        this.cache.set(fileName, snap)

        return snap
    }

    public getCurrentDirectory() {
        return '.'
    }

    public getScriptVersion(fileName: string) {
        return '1.0.0'
    }

    public getScriptFileNames() {
        const files = this.files.map(file => file.path)
        return files
    }

    public getCompilationSettings(): ts.CompilerOptions {
        return this.compilerOptions
    }

    public getDefaultLibFileName(opts: ts.CompilerOptions) {
        return ts.getDefaultLibFilePath(opts)
    }

    public useCaseSensitiveFileNames(): boolean {
        return ts.sys.useCaseSensitiveFileNames
    }

    public readDirectory(
        path: string,
        extensions?: string[],
        exclude?: string[],
        include?: string[]
    ): string[] {
        return this.files.map(file => file.path)
    }

    public readFile(path: string, encoding?: string): string | undefined {
        const file = this.files
            .find(file => file.path === path)

        return file ? file.content : undefined
    }

    public fileExists(path: string): boolean {
        const exists = !!this.files.find(file => file.path === path)
        return exists || ts.sys.fileExists(path)
    }

    public getTypeRootsVersion(): number {
        return 0
    }

    public directoryExists(directoryName: string): boolean {
        const exists = !!this.files.find(file => path.dirname(file.path) === './' + directoryName)

        return exists || ts.sys.directoryExists(directoryName)
    }

    public getDirectories(directoryName: string): string[] {
        return []
    }

    public getCustomTransformers(): ts.CustomTransformers | undefined {
        return this.transformers
    }
}
