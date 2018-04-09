import { IOptions } from 'glob'

export default function globby(patterns: string | string[], options?: IOptions): Promise<string[]>
export function sync(patterns: string | string[], options?: IOptions): string[]
export function generateGlobTasks(patterns: string | string[], options?: IOptions): Array<{pattern: string, options: IOptions}>
export function hasMagic(patterns: string | string[], options?: IOptions): boolean
