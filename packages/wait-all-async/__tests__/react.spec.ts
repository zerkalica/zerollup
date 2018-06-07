import {jsDomRender} from '../src'
import * as jsdom from 'jsdom'
import fetchMock from 'fetch-mock'
import * as fs from 'fs'
import * as path from 'path'

function load(pkgName: string, suffix: string = 'production.min', dir: string = 'umd'): string {
    return fs.readFileSync(path.join(
        path.dirname(require.resolve(pkgName)),
        dir,
        `${pkgName}.${suffix}.js`
    )).toString() + ';\n'
}

const reactBundle = load('react') + load('react-dom')

describe('react', () => {
    const template = `<html><head></head><body><div id="app"><div>{PLACEHOLDER}</div></div></body></html>`
    const url = '/testapi'
    const testString = 'TEST_STRING'
    beforeEach(() => {
        fetchMock.get('*', testString)
    })

    afterEach(() => {
        fetchMock.restore()
    })

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
        const result = template.replace('{PLACEHOLDER}', testString)
        jsDomRender({jsdom, template, bundle})
            .then(page => {
                expect(page).toEqual(result)
                done()
            })
    })
})
