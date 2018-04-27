import * as fsExtra from 'fs-extra'
import * as path from 'path'
import {Page} from './getPages'

export function writePages(
    {pages, distDir}: {
        pages: Page[]
        distDir: string
    }
): Promise<void> {
    return Promise.all(
        pages.map(page => {
            const templateFile = path.join(distDir, page.file)
            return fsExtra.ensureDir(path.dirname(templateFile))
                .then(() => fsExtra.writeFile(templateFile, page.data))
        })
    )
    .then(() => undefined)
}
