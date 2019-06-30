import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { VimWasm, ScreenDrawer } from 'vim-wasm';

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
    onVimCreated?: (vim: VimWasm) => void;
}

export function useVim({
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
    onVimCreated,
}: VimProps): [
    React.MutableRefObject<HTMLCanvasElement | null> | null,
    React.MutableRefObject<HTMLInputElement | null> | null,
    VimWasm | null,
] {
    const canvas = useRef<HTMLCanvasElement | null>(null);
    const input = useRef<HTMLInputElement | null>(null);
    const [vim, setVim] = useState(null as null | VimWasm);

    useEffect(() => {
        // componentDidMount
        const opts =
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

        if (canvas.current !== null) {
            canvas.current.addEventListener(
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
            canvas.current.addEventListener(
                'drop',
                (e: DragEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (e.dataTransfer) {
                        vim.dropFiles(e.dataTransfer.files).catch(onError);
                    }
                },
                false,
            );
        }

        if (onVimCreated !== undefined) {
            onVimCreated(vim);
        }

        vim.start({ debug, perf });
        setVim(vim);

        return () => {
            // componentWillUnmount
            if (vim.isRunning()) {
                vim.cmdline('qall!');
            }
        };
    }, []);

    if (drawer !== undefined) {
        return [null, null, vim];
    }

    return [canvas, input, vim];
}

const INPUT_STYLE = {
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

export const Vim: React.SFC<VimProps> = props => {
    const [canvasRef, inputRef] = useVim(props);
    if (canvasRef === null || inputRef === null) {
        // This component has no responsibility to render screen and handle inputs.
        return <></>;
    }

    return (
        <>
            <canvas ref={canvasRef} style={props.style} className={props.className} />
            <input ref={inputRef} style={INPUT_STYLE} autoComplete="off" autoFocus />
        </>
    );
};
