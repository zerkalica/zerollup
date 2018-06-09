# wait-all-async

Framework and bundler agnostic SPA prerenderer.

## Cli usage

```
waa-prerender --template=app.html
```

```
prerender --help
Options:
  --version        Show version number                                 [boolean]
  --engine, -e     Prerendering engine     [choices: "jsdom"] [default: "jsdom"]
  --timeout, -T    Fallback timeout to prerender page. Used if can't autodetect
                   all async tasks endings              [number] [default: 4000]
  --id, -i         Id of main div in template to which render nodes
                                                                [default: "app"]
  --bootstrap, -B  Js bootstrap code
  --output, -o     Generated pages destination directory
  --template, -t   Html page template file                            [required]
  --bundle, -b     Path to js-bundle file, autodetects from template if empty
  --setup, -s      Setup environment script. Exports function, that receives
                   window sandbox
  --page, -p       Relative urls with filenames and query parameters. Html page
                   generates per each url                                [array]
  --config         Path to JSON config file
  --help           Show help                                           [boolean]

Examples:
  prerender --template app.html             Extracts js code from app.html, eval
                                            it, prerender index.html in current
                                            directory
  prerender --template app.html             Invokes app.js code in jsdom
  --bundle=app.js --id=app                  environment with app.html and
  --pages="index.html?q=main"               generate index.html in current
  --pages="second.html?q=second"            directory
```

## Using as low-level lib

Patches promises, xhr, timeout, animationFrame. Waits all async tasks and. Base helper for building SPA prerenders. 

```js
import {waitAllAsync} from '@zerollup/wait-all-async'

const run = () => {
fetch('https://github.com')
    .then(res => res.text())
    .then(text => {
        setTimeout(
            () => {
                document.body.innerHTML = text
            },
            100
        )
    })
}

waitAllAsync({run, timeout: 1000})
    .then(() => {
    // after fetch and timeout
    })
    .catch(error => {
        // timeout 1 sec
        console.log(error.page)
    })
```

```ts
export interface WaitAllAsyncOptions {
    /**
     * Throw exception after this timeout in ms, if not all async operations completed
     */
    timeout?: number

    /**
     * Sandbox, where to patch async functions. Window, if not set
     */
    sandbox?: any

    /**
     * Run code inside waitAllAsync and wait
     */
    run: () => void

    /**
     * Custom patchers to patch sandbox
     */
    patchers?: Patch[]
}
```

## Integrate with bundlers

```ts
export interface OutputPage {
    /**
     * Prerendered html page data
     */
    data: string

    /**
     * Source page url with query
     */
    url: string

    /**
     * Page filename
     */
    file: string
}

export interface EmitPagesOptions {
    /**
     * Array of urls with filenames and queries.
     * @example ['index.html?page=main', 'secondary.html?page=some', 'https://example.com?q=1']
     *
     * Default is 'index.html'
     */
    page?: string[]

    /**
     * Bundle js code
     */
    bundle: string

    /**
     * Html page template.
     */
    template: string
    /**
     * Rendering engine, jsdom is default.
     */
    engine?: RenderType

    /**
     * Fallback timeout to prerender page. Used if can't autodetect all async tasks endings. Default is 4000 ms.
     */
    timeout?: number

    /**
     * Setup environment function
     */
    setup?: SandboxSetup
}
```

```js
import {writeFile} from 'fs-extra'
import {emitPages} from '@zerollup/wait-all-async'

const template = `
<html>
    <head></head>
    <body>
        <div id="app"></div>
    </body>
</html>
`
const bundle = `
    ${reactBundle}
    const h = React.createElement
    class MyComponent extends React.Component {
        constructor(props) {
            super(props)
            this.state = {data: 'loading...'}
        }

        componentDidMount() {
            fetch('http://github.com')
                .then(r => r.text())
                .then(data => {
                    this.setState({data})
                })
        }

        render() {
            return h('div', null, this.state.data)
        }
    }

    ReactDOM.render(h(MyComponent), document.getElementById('app'))
`

emitPages({
    bundle,
    template,
})
.then(pages => pages.map(page =>
    writeFile(page.file, page.data)
        .catch(e => {
            e.message += '. Page url is ' + page.url
            throw e
        })
))
```
