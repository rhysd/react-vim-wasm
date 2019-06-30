import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { VimWasm, VimWasmConstructOptions, ScreenDrawer } from 'vim-wasm';

export interface VimProps {
    worker?: string;
    drawer?: ScreenDrawer;
    debug?: boolean;
    perf?: boolean;
    onVimExit?: (status: number) => void;
    onVimInit?: () => void;
    onFileExport?: (fullpath: string, contents: ArrayBuffer) => void;
    readClipboard?: () => Promise<string>;
    onWriteClipboard?: (text: string) => Promise<void>;
    onError?: (err: Error) => void;
    className?: string;
    style?: React.CSSProperties;
    autoFocus?: boolean;
}

export const Vim: React.SFC<VimProps> = ({
    worker,
    drawer,
    debug,
    perf,
    onVimExit,
    onVimInit,
    onFileExport,
    readClipboard,
    onWriteClipboard,
    onError,
    className,
    style,
}) => {
    const canvas = useRef(null);
    const input = useRef(null);
    const [vim, setVim] = useState(null as null | VimWasm);

    useEffect(() => {
        const opts: VimWasmConstructOptions =
            drawer !== undefined
                ? {
                      workerScriptPath: worker,
                      screen: drawer,
                  }
                : {
                      workerScriptPath: worker,
                      canvas: canvas.current!,
                      input: input.current!,
                  };
        const vim = new VimWasm(opts);

        vim.onVimInit = onVimInit;
        vim.onVimExit = onVimExit;
        vim.onFileExport = onFileExport;
        vim.readClipboard = readClipboard;
        vim.onWriteClipboard = onWriteClipboard;
        vim.onError = onError;

        vim.start({ debug, perf });
        setVim(vim);

        return () => {
            if (vim.isRunning()) {
                vim.cmdline('qall!');
            }
        };
    }, []);

    if (drawer !== undefined) {
        return <></>;
    }

    const onCanvas = useCallback(
        node => {
            if (vim !== null) {
                node.addEventListener(
                    'dragover',
                    (e: DragEvent) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (e.dataTransfer) {
                            e.dataTransfer.dropEffect = 'copy';
                        }
                    },
                    false,
                );
                node.addEventListener(
                    'drop',
                    (e: DragEvent) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (e.dataTransfer) {
                            vim.dropFiles(e.dataTransfer.files).catch(console.error);
                        }
                    },
                    false,
                );
            }
            canvas.current = node;
        },
        [vim],
    );

    const inputStyle = {
        width: '1px',
        color: 'transparent',
        backgroundColor: 'transparent',
        padding: '0px',
        border: '0px',
        outline: 'none',
        position: 'relative',
        top: '0px',
        left: '0px',
    } as const;

    return (
        <>
            <canvas ref={onCanvas} style={style} className={className} />
            <input ref={input} style={inputStyle} autoComplete="off" autoFocus />
        </>
    );
};
