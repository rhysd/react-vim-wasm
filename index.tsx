import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { VimWasm, ScreenDrawer } from 'vim-wasm';

export function checkVimWasmIsAvailable(): string | undefined {
    function notSupported(feat: string): string {
        return `${feat} is not supported by this browser. If you're using Firefox or Safari, please enable feature flag.`;
    }

    if (typeof SharedArrayBuffer === 'undefined') {
        return notSupported('SharedArrayBuffer');
    }
    if (typeof Atomics === 'undefined') {
        return notSupported('Atomics API');
    }

    return undefined;
}

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
        /* eslint-disable react-hooks/exhaustive-deps */
    }, [worker, debug, perf]);
    // Note: Vim worker should be started once at componentDidMount
    /* eslint-enable react-hooks/exhaustive-deps */

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
    const [canvasRef, inputRef, vim] = useVim(props);
    if (canvasRef === null || inputRef === null) {
        // When drawer prop is set, it has responsibility to render screen.
        // This component does not render screen and handle inputs.
        return null;
    }

    const { style, className, onVimExit, onVimInit, onFileExport, onWriteClipboard, onError, readClipboard } = props;
    if (vim !== null) {
        vim.onVimExit = onVimExit;
        vim.onVimInit = onVimInit;
        vim.onFileExport = onFileExport;
        vim.onWriteClipboard = onWriteClipboard;
        vim.onError = onError;
        vim.readClipboard = readClipboard;
    }

    return (
        <>
            <canvas ref={canvasRef} style={style} className={className} />
            <input ref={inputRef} style={INPUT_STYLE} autoComplete="off" autoFocus />
        </>
    );
};
