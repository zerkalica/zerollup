# wait-all-async

## Wait page loading

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
     * Sandbox, where to patch async functions. global window, if not set
     */
    sandbox?: any

    /**
     * Run code inside waitAllAsync and wait
     */
    run?: () => void

    /**
     * Custom patchers to patch sandbox
     */
    patchers?: patchers.Patch[]
}
```

## Page prerendering

Helpers to setup dom emulation, eval bundle code and generate resulting html page string.

```ts
export interface BaseRenderOptions extends WaitAllAsyncOptions {
    /**
     * Html page template
     */
    template: string

    /**
     * Eval-able string with js code from bundlers
     */
    bundle: string

    /**
     * Console instance to log eval messages
     */
    console?: Console
}
```

```js
import jsdom from 'jsdom'
import {jsDomRender} from '@zerollup/wait-all-async'

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

jsDomRender({jsdom, template, bundle})
    .then((page: string) => {
        page
    })

```
