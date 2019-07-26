import * as React from 'react';
import { useRef, useState, useCallback } from 'react';
import { render } from 'react-dom';
import { saveAs } from 'file-saver';
import { VimWasm } from 'vim-wasm';
import { Vim, checkVimWasmIsAvailable } from '..';

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
        <div className="horizontal">
            <div className="colon">:</div>
            <input ref={input} className="input text" type="text" placeholder="Vim command" />
            <button className="button is-link" onClick={onClick}>
                Run
            </button>
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
        <div className="horizontal">
            <button className="button is-link" onClick={onClick}>
                Download Buffer as File
            </button>
        </div>
    );
};

const Control: React.SFC<{ vim: VimWasm | null }> = ({ vim }) => {
    return (
        <div className="box">
            <h3 className="title is-3">Controls</h3>
            <div className="field">
                <label className="label">Vim command</label>
                <div className="control">
                    <Commandline vim={vim} />
                </div>
            </div>
            <div className="field">
                <label className="label">File Access</label>
                <div className="control">
                    <DownloadBuffer vim={vim} />
                </div>
            </div>
        </div>
    );
};

const VIM_WASM_AVAILABLITY_MESSAGE = checkVimWasmIsAvailable();
const DOT_VIM_DIRS = ['/home/web_user/.vim'];

const VimWasmExample: React.SFC = () => {
    const [vim, setVim] = useState<VimWasm | null>(null);
    const onVim = useCallback(v => {
        setVim(v);
    }, []);
    const onError = useCallback((e: Error) => {
        alert(`Error! ${e.message}`);
    }, []);
    const onVimExit = useCallback((status: number) => {
        alert(`Vim exited with status ${status}`);
    }, []);
    const onTitleUpdate = useCallback((title: string) => {
        document.title = title;
    }, []);

    if (VIM_WASM_AVAILABLITY_MESSAGE !== undefined) {
        const style = { color: 'red', fontWeight: 'bold' } as const;
        return <div style={style}>{VIM_WASM_AVAILABLITY_MESSAGE}</div>;
    }

    // Note: vim-screen must not have border
    return (
        <>
            <div className="screen-wrapper">
                <Vim
                    worker="./static/vim-wasm/vim.js"
                    className="vim-screen"
                    persistentDirs={DOT_VIM_DIRS}
                    onVimExit={onVimExit}
                    onFileExport={downloadFile}
                    readClipboard={navigator.clipboard && navigator.clipboard.readText}
                    onWriteClipboard={navigator.clipboard && navigator.clipboard.writeText}
                    onError={onError}
                    onVimCreated={onVim}
                    onTitleUpdate={onTitleUpdate}
                />
            </div>
            <Control vim={vim} />
        </>
    );
};

render(<VimWasmExample />, document.getElementById('react-root'));
