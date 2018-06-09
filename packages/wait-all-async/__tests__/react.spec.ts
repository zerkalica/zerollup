import {createJsDomRender} from '../src'
import * as jsdom from 'jsdom'
import {setupBrowser, setup, teardown, template, url, urlError, testObject, testString, load} from './fetchHelper'

const reactBundle = load('react') + load('react-dom')

describe('react', () => {
    beforeEach(setup)
    afterEach(teardown)

    it('should handle fetch in componentDidMount', done => {
        const bundle = `
        ${reactBundle}
        const h = React.createElement
        class MyComponent extends React.Component {
            constructor(props) {
                super(props)
                this.state = {data: 'loading...'}
            }

            componentDidMount() {
                fetch('${url}')
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
        const result = template.replace('{PLACEHOLDER}', `<div>${testString}</div>`)
        createJsDomRender(jsdom)({template, bundle, setup: setupBrowser})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })
})
