import * as fsExtra from 'fs-extra'
import * as path from 'path'

export interface Page {
    file: string
    data: string
}

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
