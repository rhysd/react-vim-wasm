export interface DrawEvents {
    setColorFG: [/*code*/ string];
    setColorBG: [/*code*/ string];
    setColorSP: [/*code*/ string];
    setFont: [/*name*/ string, /*size*/ number];
    drawRect: [/*x*/ number, /*y*/ number, /*w*/ number, /*h*/ number, /*color*/ string, /*filled*/ boolean];
    drawText: [string, number, number, number, number, number, boolean, boolean, boolean, boolean];
    invertRect: [/*x*/ number, /*y*/ number, /*w*/ number, /*h*/ number];
    imageScroll: [/*x*/ number, /*sy*/ number, /*dy*/ number, /*w*/ number, /*h*/ number];
}
export declare type DrawEventMethod = keyof DrawEvents;
export declare type DrawEventMessage = {
    [K in DrawEventMethod]: [K, DrawEvents[K]];
}[DrawEventMethod];
export declare type DrawEventHandler = {
    [Name in DrawEventMethod]: (...args: DrawEvents[Name]) => void;
};
export interface StartMessageFromMain {
    readonly kind: 'start';
    readonly debug: boolean;
    readonly perf: boolean;
    readonly buffer: Int32Array;
    readonly clipboard: boolean;
    readonly canvasDomHeight: number;
    readonly canvasDomWidth: number;
}
export interface FileBufferMessageFromWorker {
    readonly kind: 'open-file-buf:response';
    readonly name: string;
    readonly buffer: SharedArrayBuffer;
    timestamp?: number;
}
export interface ClipboardBufMessageFromWorker {
    readonly kind: 'clipboard-buf:response';
    readonly buffer: SharedArrayBuffer;
    timestamp?: number;
}
export interface CmdlineResultFromWorker {
    readonly kind: 'cmdline:response';
    readonly success: boolean;
    timestamp?: number;
}
export declare type MessageFromWorker = {
    readonly kind: 'draw';
    readonly event: DrawEventMessage;
    timestamp?: number;
} | {
    readonly kind: 'error';
    readonly message: string;
    timestamp?: number;
} | {
    readonly kind: 'started';
    timestamp?: number;
} | {
    readonly kind: 'exit';
    readonly status: number;
    timestamp?: number;
} | FileBufferMessageFromWorker | {
    readonly kind: 'export';
    readonly path: string;
    readonly contents: ArrayBuffer;
    timestamp?: number;
} | {
    readonly kind: 'read-clipboard:request';
    timestamp?: number;
} | ClipboardBufMessageFromWorker | {
    readonly kind: 'write-clipboard';
    readonly text: string;
    timestamp?: number;
} | CmdlineResultFromWorker;
export declare type MessageKindFromWorker = MessageFromWorker['kind'];
export declare type EventStatusFromMain = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
