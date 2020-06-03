/// <reference path="common.d.ts" />
export interface ScreenDrawer {
    draw(msg: DrawEventMessage): void;
    onVimInit(): void;
    onVimExit(): void;
    getDomSize(): {
        width: number;
        height: number;
    };
    setPerf(enabled: boolean): void;
    focus(): void;
}
export interface KeyModifiers {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}
export declare const VIM_VERSION = "8.2.0055";
export declare function checkBrowserCompatibility(): string | undefined;
export declare class VimWorker {
    debug: boolean;
    readonly sharedBuffer: Int32Array;
    private readonly worker;
    private readonly onMessage;
    private readonly onError;
    private readonly onOneshotMessage;
    private readonly pendingEvents;
    constructor(scriptPath: string, onMessage: (msg: MessageFromWorker) => void, onError: (err: Error) => void);
    terminate(): void;
    sendStartMessage(msg: StartMessageFromMain): void;
    notifyOpenFileBufComplete(filename: string, bufId: number): void;
    notifyClipboardWriteComplete(cannotSend: boolean, bufId: number): void;
    notifyKeyEvent(key: string, keyCode: number, ctrl: boolean, shift: boolean, alt: boolean, meta: boolean): void;
    notifyResizeEvent(width: number, height: number): void;
    requestSharedBuffer(byteLength: number): Promise<[number, SharedArrayBuffer]>;
    notifyClipboardError(): void;
    responseClipboardText(text: string): Promise<void>;
    requestCmdline(cmdline: string): Promise<void>;
    notifyErrorOutput(message: string): Promise<void>;
    notifyEvalFuncRet(ret: string): Promise<void>;
    notifyEvalFuncError(msg: string, err: Error, dontReply: boolean): Promise<void>;
    onEventDone(doneStatus: EventStatusFromMain): void;
    private enqueueEvent;
    private sendEvent;
    private waitForOneshotMessage;
    private encodeStringToBuffer;
    private recvMessage;
    private recvError;
}
export declare class ResizeHandler {
    elemHeight: number;
    elemWidth: number;
    private bounceTimerToken;
    private readonly canvas;
    private readonly worker;
    constructor(domWidth: number, domHeight: number, canvas: HTMLCanvasElement, worker: VimWorker);
    onVimInit(): void;
    onVimExit(): void;
    private doResize;
    private onResize;
}
export declare class InputHandler {
    private readonly worker;
    private readonly elem;
    constructor(worker: VimWorker, input: HTMLInputElement);
    setFont(name: string, size: number): void;
    focus(): void;
    onVimInit(): void;
    onVimExit(): void;
    private onKeydown;
    private onFocus;
    private onBlur;
}
export declare class ScreenCanvas implements DrawEventHandler, ScreenDrawer {
    private readonly worker;
    private readonly canvas;
    private readonly ctx;
    private readonly input;
    private readonly queue;
    private readonly resizer;
    private perf;
    private fgColor;
    private spColor;
    private fontName;
    private rafScheduled;
    constructor(worker: VimWorker, canvas: HTMLCanvasElement, input: HTMLInputElement);
    onVimInit(): void;
    onVimExit(): void;
    draw(msg: DrawEventMessage): void;
    focus(): void;
    getDomSize(): {
        width: number;
        height: number;
    };
    setPerf(enabled: boolean): void;
    setColorFG(name: string): void;
    setColorBG(_name: string): void;
    setColorSP(name: string): void;
    setFont(name: string, size: number): void;
    drawRect(x: number, y: number, w: number, h: number, color: string, filled: boolean): void;
    drawText(text: string, ch: number, lh: number, cw: number, x: number, y: number, bold: boolean, underline: boolean, undercurl: boolean, strike: boolean): void;
    invertRect(x: number, y: number, w: number, h: number): void;
    imageScroll(x: number, sy: number, dy: number, w: number, h: number): void;
    private onClick;
    private onAnimationFrame;
    private perfMark;
    private perfMeasure;
}
export interface StartOptions {
    debug?: boolean;
    perf?: boolean;
    clipboard?: boolean;
    persistentDirs?: string[];
    dirs?: string[];
    files?: {
        [fpath: string]: string;
    };
    fetchFiles?: {
        [fpath: string]: string;
    };
    cmdArgs?: string[];
}
export interface OptionsRenderToDOM {
    canvas: HTMLCanvasElement;
    input: HTMLInputElement;
    workerScriptPath: string;
}
export interface OptionsUserRenderer {
    screen: ScreenDrawer;
    workerScriptPath: string;
}
export declare type VimWasmConstructOptions = OptionsRenderToDOM | OptionsUserRenderer;
export declare class VimWasm {
    onVimInit?: () => void;
    onVimExit?: (status: number) => void;
    onFileExport?: (fullpath: string, contents: ArrayBuffer) => void;
    onError?: (err: Error) => void;
    readClipboard?: () => Promise<string>;
    onWriteClipboard?: (text: string) => void;
    onTitleUpdate?: (title: string) => void;
    private readonly worker;
    private readonly screen;
    private perf;
    private debug;
    private perfMessages;
    private running;
    private end;
    constructor(opts: VimWasmConstructOptions);
    start(opts?: StartOptions): void;
    dropFile(name: string, contents: ArrayBuffer): Promise<void>;
    dropFiles(files: FileList): Promise<void>;
    resize(pixelWidth: number, pixelHeight: number): void;
    sendKeydown(key: string, keyCode: number, modifiers?: KeyModifiers): void;
    cmdline(cmdline: string): Promise<void>;
    isRunning(): boolean;
    focus(): void;
    showError(message: string): Promise<void>;
    private readFile;
    private evalJS;
    private evalFunc;
    private onMessage;
    private handleError;
    private printPerfs;
    private perfMark;
    private perfMeasure;
}
