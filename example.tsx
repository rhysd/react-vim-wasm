import * as React from 'react';
import { useRef, useState, useCallback } from 'react';
import { render } from 'react-dom';
import { saveAs } from 'file-saver';
import { VimWasm } from 'vim-wasm';
import { Vim } from '.';

function downloadFile(fullpath: string, contents: ArrayBuffer) {
    const slashIdx = fullpath.lastIndexOf('/');
    const filename = slashIdx !== -1 ? fullpath.slice(slashIdx + 1) : fullpath;
    const blob = new Blob([contents], { type: 'application/octet-stream' });
    saveAs(blob, filename);
}

const Commandline: React.SFC<{ vim: VimWasm | null }> = ({ vim }) => {
    const input = useRef<HTMLInputElement | null>(null);
    const onClick = useCallback(() => {
        if (vim !== null && input.current !== null && input.current.value.length > 0) {
            vim.cmdline(input.current.value);
        }
    }, [vim]);

    return (
        <div className="control">
            :<input ref={input} className="cmdline" />
            <button onClick={onClick}>Run Command</button>
        </div>
    );
};

const DownloadBuffer: React.SFC<{ vim: VimWasm | null }> = ({ vim }) => {
    const onClick = useCallback(() => {
        if (vim !== null) {
            vim.cmdline('export');
        }
    }, [vim]);

    return (
        <div className="control">
            <button onClick={onClick}>Download Buffer as File</button>
        </div>
    );
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
                onFileExport={downloadFile}
                readClipboard={navigator.clipboard && navigator.clipboard.readText}
                onWriteClipboard={navigator.clipboard && navigator.clipboard.writeText}
                onError={e => alert(`Error! ${e.message}`)}
                onVimCreated={onVim}
            />
            <Commandline vim={vim} />
            <DownloadBuffer vim={vim} />
        </>
    );
};

render(<VimWasmExample />, document.getElementById('react-root'));
