import { ok } from 'assert';
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
        let vim: VimWasm | null = null;

        ReactDOM.render(
            <Vim
                worker="/base/node_modules/vim-wasm/vim.js"
                onVimInit={onVimInit}
                onVimExit={onVimExit}
                onError={onError}
                onVimCreated={v => {
                    vim = v;
                }}
                debug={true}
            />,
            reactRoot,
        );

        // Wait for
        return wait(1000)
            .then(() => {
                ok(vim, 'Vim did not start');
                ok(onVimInit.called, 'onVimInit was not called');
                vim!.cmdline('qall!');
                return wait(500);
            })
            .then(() => {
                ok(onVimExit.called, 'onVimExit was not called');
            });
    });
});
