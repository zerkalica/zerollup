import { IOptions } from 'glob'

declare module 'globby' {
    declare function globby(patterns: string | string[], options?: IOptions): Promise<string[]>
    export default globby
    export function sync(patterns: string | string[], options?: IOptions): string[]
    export function generateGlobTasks(patterns: string | string[], options?: IOptions): Array<{pattern: string, options: IOptions}>
    export function hasMagic(patterns: string | string[], options?: IOptions): boolean
}
