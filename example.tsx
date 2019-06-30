import * as React from 'react';
import { render } from 'react-dom';
import { saveAs } from 'file-saver';
import { Vim } from '.';

function downloadFile(fullpath: string, contents: ArrayBuffer) {
    const slashIdx = fullpath.lastIndexOf('/');
    const filename = slashIdx !== -1 ? fullpath.slice(slashIdx + 1) : fullpath;
    const blob = new Blob([contents], { type: 'application/octet-stream' });
    saveAs(blob, filename);
}

render(
    <Vim
        worker="./node_modules/vim-wasm/vim.js"
        className="vim-screen"
        onVimExit={s => alert(`Vim exited with status ${s}`)}
        onFileExport={downloadFile}
        readClipboard={navigator.clipboard && navigator.clipboard.readText}
        onWriteClipboard={navigator.clipboard && navigator.clipboard.writeText}
        onError={e => alert(`Error! ${e.message}`)}
    />,
    document.getElementById('react-root'),
);
