/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ok, strictEqual as eq } from 'assert';
import * as sinon from 'sinon';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { VimWasm } from 'vim-wasm';
import { Vim } from '..';

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('react-vim-wasm', function() {
    let reactRoot: HTMLDivElement;

    before(function() {
        reactRoot = document.createElement('div');
        document.body.appendChild(reactRoot);
    });

    after(function() {
        document.body.removeChild(reactRoot);
    });

    it('manages vim.wasm worker lifecycle', function() {
        const onVimInit = sinon.spy();
        const onVimExit = sinon.spy();
        const onError = sinon.spy();
        const onFileExport = sinon.spy();
        let vim: VimWasm | null = null;

        ReactDOM.render(
            <Vim
                worker="/base/node_modules/vim-wasm/vim.js"
                onVimInit={onVimInit}
                onVimExit={onVimExit}
                onError={onError}
                onFileExport={onFileExport}
                onVimCreated={v => {
                    vim = v;
                }}
                debug={true}
            />,
            reactRoot,
        );

        // Note: I didn't use async/await because babel (run by parcel) transpiles async/await
        // and babel runtime is necessary to run the transpiled code.
        // To avoid unnecessary complexity by transpiling async/await, here only Promise is used.

        // Wait for Vim rendering first screen
        return wait(1000)
            .then(() => {
                ok(vim, 'Vim did not start');
                ok(onVimInit.called, 'onVimInit was not called');

                const lines = ['hello!', 'this is', 'test for dropFiles!'];
                const text = lines.join('\n') + '\n';
                const filename = 'hello.txt';
                const encoder = new TextEncoder();
                const array = encoder.encode(text);

                return vim!.dropFile(filename, array.buffer);
            })
            .then(() => wait(500))
            .then(() => vim!.cmdline('export /hello.txt'))
            .then(() => wait(500))
            .then(() => {
                ok(onFileExport, 'onFileExport was not called');
                const [f, a] = onFileExport.args[0];
                eq(f, '/hello.txt');
                ok(a instanceof ArrayBuffer, 'file content is not arrray buffer: ' + ArrayBuffer.toString());
            })
            .then(() => {
                vim!.cmdline('qall!');
                // Wait for Vim shutting down
                return wait(500);
            })
            .then(() => {
                ok(onVimExit.called, 'onVimExit was not called');
            });
    });
});
