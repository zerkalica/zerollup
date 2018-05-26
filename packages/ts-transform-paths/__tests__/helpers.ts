import transformPathPlugin from '../src'
import * as ts from 'typescript'

function fixCompilerOptions(
    factory: ts.TransformerFactory<ts.SourceFile>,
    paths: ts.MapLike<string[]>
): ts.TransformerFactory<ts.SourceFile> {
    return (ctx: ts.TransformationContext) => {
        const oldMethod = ctx.getCompilerOptions

        ctx.getCompilerOptions = function() {
            const result = oldMethod.call(this)
            return {...result, paths}
        }

        return factory(ctx)
    }
}

export function createOptions(opts?: ts.TranspileOptions): ts.TranspileOptions {
    const compilerOptions = {
        target: ts.ScriptTarget.ES2015,
        module: ts.ModuleKind.ESNext,
        declarations: true,
        baseUrl: '.',
        paths: {
            'someRoot/*': ['some/*']
        }
    }

    return {
        ...opts,
        compilerOptions: {
            ...compilerOptions,
            ...(opts && opts.compilerOptions)
        },
        transformers: {
            before: [
                fixCompilerOptions(
                    transformPathPlugin().before,
                    compilerOptions.paths
                )
            ]
        }
    }
}

export interface VFile {
    path: string;
    content: string;
}

export function transpile(files: VFile[], raw?: ts.CompilerOptions) {
    const compilerOptions: ts.CompilerOptions = {
        declaration: true,
        newLine: ts.NewLineKind.LineFeed,
        target: ts.ScriptTarget.ES2015,
        module: ts.ModuleKind.ESNext,
        baseUrl: '.',
        paths: {
            'someRoot/*': ['some/*']
        },
        ...raw,
    }

    const transformers = {
        before: [transformPathPlugin().before],
    }

    const host = new TestHost(
        compilerOptions,
        transformers,
        files,
    )

    const service = ts.createLanguageService(host, ts.createDocumentRegistry())

    return service.getEmitOutput(files[0].path)
}

export class TestHost implements ts.LanguageServiceHost {
    constructor(
        private compilerOptions: ts.CompilerOptions,
        private transformers: ts.CustomTransformers,
        private files: VFile[]
    ) {}

    public getScriptSnapshot(
        fileName: string
    ): ts.IScriptSnapshot | undefined {
        const file = this.files.find(file => file.path === fileName)
        if (!file) return undefined
        return ts.ScriptSnapshot.fromString(file.content)
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
        return []
    }

    public readFile(path: string, encoding?: string): string | undefined {
        return this.files
            .map(file => file.path)
            .find(filePath => filePath === path)
    }

    public fileExists(path: string): boolean {
        return !!this.files.find(file => file.path === path)
    }

    public getTypeRootsVersion(): number {
        return 0
    }

    public directoryExists(directoryName: string): boolean {
        return false
    }

    public getDirectories(directoryName: string): string[] {
        return []
    }

    public getCustomTransformers(): ts.CustomTransformers | undefined {
        return this.transformers
    }
}
