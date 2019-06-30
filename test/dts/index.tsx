import * as React from 'react';
import { useState, useCallback } from 'react';
import { Vim } from 'react-vim-wasm';
import { VimWasm } from 'vim-wasm';

const Test: React.SFC<{ v: VimWasm | null }> = ({ v }) => {
    if (v === null) {
        return null;
    }
    return <div>{v.sendKeydown.toString()}</div>;
};

const VimWasmExample: React.SFC = () => {
    const [vim, setVim] = useState<VimWasm | null>(null);
    const onVim = useCallback(v => {
        setVim(v);
    }, []);

    return (
        <>
            <Vim
                worker="./node_modules/vim-wasm/vim.js"
                className="vim-screen"
                onVimExit={s => alert(`Vim exited with status ${s}`)}
                onFileExport={(f, b) => console.log(f, b)}
                readClipboard={navigator.clipboard && navigator.clipboard.readText}
                onWriteClipboard={navigator.clipboard && navigator.clipboard.writeText}
                onError={e => alert(`Error! ${e.message}`)}
                onVimCreated={onVim}
            />
            <Test v={vim} />
        </>
    );
};
console.log(VimWasmExample); // Use it to avoid compiler complaining unused variables
