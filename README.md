React component for vim.wasm
============================
[![npm version](https://badge.fury.io/js/react-vim-wasm.svg)][npm]
[![Build Status](https://travis-ci.org/rhysd/react-vim-wasm.svg?branch=master)](https://travis-ci.org/rhysd/react-vim-wasm)

[`react-vim-wasm` npm package][npm] provides [React](https://github.com/facebook/react) component for
[vim.wasm](https://github.com/rhysd/vim.wasm). Vim editor can be easily embedded into your React
web application.

Please visit [demo][] to see a live example.

## Installation

Install the package via [npm](https://www.npmjs.com) package manager. Please note that this component
supports React 16.8.0 or later.

```
npm install --save react react-vim-wasm
```

## Usage

### `<Vim/>` component

```javascript
import * as React from 'react';
import { useCallback } from 'react';
import { Vim } from 'react-vim-wasm';

const onVimExit = useCallback(s => alert(`Vim exited with status ${s}`), []);
const onFileExport = useCallback((f, buf) => console.log('file exported:', f, buf), []);
const onError = useCallback(e => alert(`Error! ${e.message}`), []);

<Vim
    worker="/path/to/vim-wasm/vim.js"
    onVimExit={onVimExit}
    onFileExport={onFileExport}
    readClipboard={navigator.clipboard && navigator.clipboard.readText}
    onWriteClipboard={navigator.clipboard && navigator.clipboard.writeText}
    onError={onError}
/>
```

By using this component, all setup is done in the component lifecycle; Prepare `<canvas/>` and `<input/>`,
load and start Vim editor instance in Web Worker, clean up the worker on Vim ends.

For real example, please read [example code](./example).

Properties of `<Vim/>` are as follows:

| Property Name      | Description                                                       | Type                            | Default Value |
|--------------------|-------------------------------------------------------------------|---------------------------------|---------------|
| `worker`           | File path to worker script `vim.js` in `vim-wasm` package.        | `string`                        | `"vim.js"`    |
| `className`        | Class name added to underlying `<canvas/>` DOM element.           | `string`                        | `undefined`   |
| `style`            | `style` attribute value of underlying `<canvas/>` dom element.    | `Object`                        | `undefined`   |
| `debug`            | Enable JavaScript debug logging to console.                       | `boolean`                       | `false`       |
| `perf`             | Enable performance tracing and dump result at Vim exiting.        | `boolean`                       | `false`       |
| `clipboard`        | Explicitly enable/disable clipboard register support.             | `boolean`                       | `true`        |
| `onVimCreated`     | Callback called at creating a `VimWasm` instance.                 | `(VimWasm) => void`             | `undefined`   |
| `onError`          | Callback called when an error is thrown in worker.                | `(Error) => void`               | `undefined`   |
| `onVimInit`        | Callback called at initializing Vim worker instance.              | `() => void`                    | `undefined`   |
| `onVimExit`        | Callback called at Vim exiting.                                   | `(number) => void`              | `undefined`   |
| `onFileExport`     | Callback when `:export` is run.                                   | `(string, ArrayBuffer) => void` | `undefined`   |
| `readClipboard`    | Async function to read a clipboard text.                          | `async () => string`            | `undefined`   |
| `onWriteClipboard` | Async function to write a clipboard text.                         | `async (string) => void`        | `undefined`   |
| `drawer`           | User-defined screen drawer instance (see below section).          | `ScreenDrawer`                  | `undefined`   |

All properties are optional.

### `useVim()` hook

This package provides `useVim()` React hook function. Thanks to [React Hooks architecture](https://reactjs.org/docs/hooks-intro.html),
Vim instance management logic can be integrated into your component easily.

```javascript
import * as React from 'react';
import { useVim } from 'react-vim-wasm';

const YourComponent = props => {
    const [canvasRef, inputRef, vim] = useVim({
        worker: '/path/to/vim-wasm/vim.js',
        // The same as <Vim/> props...
    });

    // Access to `vim` instance if you want

    // Set refs to render screen and handle key inputs
    return <>
        <canvas ref={canvasRef} />
        <input ref={inputRef} />
    </>;
};
```

`useVim()` returns 3-elements array.

The first element is a ref to a canvas element to render Vim screen. You must put it to `<canvas/>`
element in your component. This value is set to `null` if `drawer` property is set.

The second element is a ref to a input element to catch key input. You must put it to `<input/>` element
in your component. This value is set to `null` if `drawer` property is set.

The third element is a `VimWasm` instance. Some operations (such as calling `.cmdline()` method) can be done
via this instance. Please read [vim.wasm document](https://github.com/rhysd/vim.wasm/tree/wasm/wasm#readme)
for more details.

### `checkVimWasmIsAvailable()` utility

[vim.wasm](https://github.com/rhysd/vim.wasm) requires `Worker`, `SharedArrayBuffer` and `Atomics`
and some browsers don't meet the requirements.

This package provides `checkVimWasmIsAvailable` utility function to check browser compatibility.
It returns an error message as `string` when the current browser is incompatible, otherwise `undefined`.

```js
import { checkVimWasmIsAvailable } from 'react-vim-wasm';

const errmsg = checkVimWasmIsAvailable();
if (errmsg) {
    alert(errmsg);
}
```

### Custom Screen Drawer

User-defined custom renderer can be defined through `drawer` property of `<Vim/>` component or
`useVim()` hook.

The `drawer` property is an instance which implements `ScreenDrawer` interface defined in `vim-wasm/vimwasm.d.ts`.
Please read [this code](https://github.com/rhysd/vim.wasm/blob/wasm/wasm/vimwasm.ts) to know the interface.

By defining your class implementing the interface, your class can render Vim screen instead of `<canvas/>`.

Note that key down must be handled by your implementation using `VimWasm.sendKeydown()` method and
resize event also must be handled using `VimWasm.resize()` method.

For a real example, please read [`DummyDrawer` class](https://github.com/rhysd/vim.wasm/blob/wasm/wasm/test/helper.ts)
which is used for testing draw events.

### TypeScript Support

This package provides complete [TypeScript](https://www.typescriptlang.org) support.
Please read `index.d.ts` type definitions file put in installed package directory.

## Development

Some scripts are defined in `package.json`.

```sh
# Start TypeScript compiler and parcel bundler with watch mode.
# Example site is hosted at http://localhost:1234 and enables hot-reload.
$ npm run watch

# Release build
$ npm run build

# Check lint and formatter
$ npm run lint

# Check lint and formatter with automatic fixes
$ npm run fix

# Deploy to gh-pages
$ npm run gh-pages
```

## License

This repository is licensed under [MIT License](./LICENSE.txt).

[npm]: https://www.npmjs.com/package/react-vim-wasm
[demo]: https://rhysd.github.io/react-vim-wasm

