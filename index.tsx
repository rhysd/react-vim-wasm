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

        if (vim !== null && vim.isRunning()) {
            vim.cmdline('qall!');
        }

        /* eslint-disable @typescript-eslint/no-non-null-assertion */
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
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        const v = new VimWasm(opts);

        v.onVimInit = onVimInit;
        v.onVimExit = onVimExit;
        v.onFileExport = onFileExport;
        v.readClipboard = readClipboard;
        v.onWriteClipboard = onWriteClipboard;
        v.onError = onError;

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
                        v.dropFiles(e.dataTransfer.files).catch(onError);
                    }
                },
                false,
            );
        }

        if (onVimCreated !== undefined) {
            onVimCreated(v);
        }

        v.start({ debug, perf });
        setVim(v);

        return () => {
            // componentWillUnmount
            if (v.isRunning()) {
                v.cmdline('qall!');
            }
        };
    }, [
        debug,
        drawer,
        onError,
        onFileExport,
        onVimCreated,
        onVimExit,
        onVimInit,
        onWriteClipboard,
        perf,
        readClipboard,
        vim,
        worker,
    ]);

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
