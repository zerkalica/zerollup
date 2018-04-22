import * as ts from 'typescript'

export interface ReplacerItem extends ts.TextSpan {
    start: number
    length: number
    replacement: string
}

export class Replacer {
    private items: ReplacerItem[] = []
    constructor(private sourceText: string) {}

    push(item: ReplacerItem) {
        this.items.push(item)
    }

    getReplaced(): void | string {
        const {items, sourceText} = this
        if (items.length === 0) return
        let result = ''
        let pos = 0
        for (let item of items) {
            result += sourceText.substring(pos, item.start) + item.replacement
            pos = item.start + item.length
        }
        result += sourceText.substring(pos)

        return result
    }
}
