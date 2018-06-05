# wait-all-async

Wait all async tasks. Usable for page prerender. Patches fetch, xhr, setTimeout.

```js
import {waitAllAsync} from '@zerollup/wait-all-async'

waitAllAsync().then(() => {
    // after all async tasks
})

fetch().then()
setTimeout(() => ...)
```
