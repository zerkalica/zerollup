export function regExpEscape(s: string): string {
    return s.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')
}

export class Tokenizer {
    mask: RegExp
    tokens: RegExp[]
    subs: string[]

    constructor(
        pathKey: string,
        subs: string[],
        tokens: string[] = ['*']
    ) {
        this.subs = subs
        this.tokens = []
        const tokenMask = new RegExp(`(${tokens.map(regExpEscape).join('|')})`, 'g')
        const mask = pathKey.replace(tokenMask, token => {
            this.tokens.push(new RegExp(regExpEscape(token), 'g'))
            return '><'
        })

        this.mask = new RegExp('^' + regExpEscape(mask).replace(/\>\</g, '(.*)') + '$')
    }

    parse(str: string): string[] | void {
        const {mask, tokens, subs} = this
        const match = str.match(mask)
        if (match) {
            const parsedSubs: string[] = []
            for (let sub of subs) {
                for (let i = 1; i < match.length; i++) {
                    const token = tokens[i - 1]
                    const replacement = match[i]
                    sub = sub.replace(token, replacement)
                }
                parsedSubs.push(sub)
            }
            return parsedSubs
        }
    }
}
