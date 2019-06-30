/* vi:set ts=4 sts=4 sw=4 et:
 *
 * VIM - Vi IMproved		by Bram Moolenaar
 *				Wasm support by rhysd <https://github.com/rhysd>
 *
 * Do ":help uganda"  in Vim to read copying and usage conditions.
 * Do ":help credits" in Vim to see a list of people who contributed.
 * See README.txt for an overview of the Vim source code.
 */
var VimWasmLibrary = {
    $VW__postset: 'VW.init()',
    $VW: {
        init: function () {
            var STATUS_NOT_SET = 0;
            var STATUS_NOTIFY_KEY = 1;
            var STATUS_NOTIFY_RESIZE = 2;
            var STATUS_REQUEST_OPEN_FILE_BUF = 3;
            var STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE = 4;
            var STATUS_REQUEST_CLIPBOARD_BUF = 5;
            var STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE = 6;
            var STATUS_REQUEST_CMDLINE = 7;
            var guiWasmResizeShell;
            var guiWasmHandleKeydown;
            var guiWasmHandleDrop;
            var guiWasmSetClipAvail;
            var guiWasmDoCmdline;
            var wasmMain;
            // Setup C function bridges.
            // Since Module.cwrap() and Module.ccall() are set in runtime initialization, it must wait
            // until runtime is initialized.
            emscriptenRuntimeInitialized.then(function () {
                guiWasmResizeShell = Module.cwrap('gui_wasm_resize_shell', null, [
                    'number',
                    'number',
                ]);
                guiWasmHandleKeydown = Module.cwrap('gui_wasm_handle_keydown', null, [
                    'string',
                    'number',
                    'boolean',
                    'boolean',
                    'boolean',
                    'boolean',
                ]);
                guiWasmHandleDrop = Module.cwrap('gui_wasm_handle_drop', null, ['string' /* filepath */]);
                guiWasmSetClipAvail = Module.cwrap('gui_wasm_set_clip_avail', null, ['boolean' /* avail */]);
                guiWasmDoCmdline = Module.cwrap('gui_wasm_do_cmdline', 'boolean', ['string' /* cmdline */]);
                wasmMain = Module.cwrap('wasm_main', null, []);
            });
            var VimWasmRuntime = /** @class */ (function () {
                function VimWasmRuntime() {
                    var _this = this;
                    onmessage = function (e) { return _this.onMessage(e.data); };
                    this.domWidth = 0;
                    this.domHeight = 0;
                    this.openFileContext = null;
                    this.perf = false;
                    this.started = false;
                }
                VimWasmRuntime.prototype.draw = function () {
                    var event = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        event[_i] = arguments[_i];
                    }
                    // TODO: When setColor* sets the same color as previous one, skip sending it.
                    this.sendMessage({ kind: 'draw', event: event });
                };
                VimWasmRuntime.prototype.vimStarted = function () {
                    this.sendMessage({ kind: 'started' });
                };
                VimWasmRuntime.prototype.vimExit = function (status) {
                    this.sendMessage({ kind: 'exit', status: status });
                };
                VimWasmRuntime.prototype.onMessage = function (msg) {
                    var _this = this;
                    // Print here because debug() is not set before first 'start' message
                    debug('Received from main:', msg);
                    switch (msg.kind) {
                        case 'start':
                            emscriptenRuntimeInitialized
                                .then(function () { return _this.start(msg); })
                                .catch(function (e) {
                                switch (e.name) {
                                    case 'ExitStatus':
                                        debug('Program terminated with status', e.status);
                                        debug('Worker will terminate self');
                                        close(); // Terminate self since Vim completely exited
                                        break;
                                    default:
                                        _this.sendMessage({
                                            kind: 'error',
                                            message: e.message,
                                        });
                                        break;
                                }
                            });
                            break;
                        default:
                            throw new Error("Unhandled message from main thread: " + msg);
                    }
                };
                VimWasmRuntime.prototype.start = function (msg) {
                    if (this.started) {
                        throw new Error('Vim cannot start because it is already running');
                    }
                    this.domWidth = msg.canvasDomWidth;
                    this.domHeight = msg.canvasDomHeight;
                    this.buffer = msg.buffer;
                    if (msg.debug) {
                        debug = console.log.bind(console, 'worker:'); // eslint-disable-line no-console
                    }
                    this.perf = msg.perf;
                    if (!msg.clipboard) {
                        guiWasmSetClipAvail(false);
                    }
                    wasmMain();
                    this.started = true;
                };
                VimWasmRuntime.prototype.waitAndHandleEventFromMain = function (timeout) {
                    // Note: Should we use performance.now()?
                    var start = Date.now();
                    var status = this.waitForStatusChanged(timeout);
                    var elapsed = 0;
                    if (status === STATUS_NOT_SET) {
                        elapsed = Date.now() - start;
                        debug('No event happened after', timeout, 'ms timeout. Elapsed:', elapsed);
                        return elapsed;
                    }
                    this.handleEvent(status);
                    elapsed = Date.now() - start;
                    debug('Event', status, 'was handled with ms', elapsed);
                    return elapsed;
                };
                // Note: Returns 1 if success, otherwise 0
                VimWasmRuntime.prototype.exportFile = function (fullpath) {
                    try {
                        var contents = FS.readFile(fullpath).buffer; // encoding = binary
                        debug('Read', contents.byteLength, 'bytes contents from', fullpath);
                        this.sendMessage({ kind: 'export', path: fullpath, contents: contents }, [contents]);
                        return 1;
                    }
                    catch (err) {
                        debug('Could not export file', fullpath, 'due to error:', err);
                        return 0;
                    }
                };
                VimWasmRuntime.prototype.readClipboard = function () {
                    this.sendMessage({ kind: 'read-clipboard:request' });
                    this.waitUntilStatus(STATUS_REQUEST_CLIPBOARD_BUF);
                    // Read data and clear status
                    var isError = !!this.buffer[1];
                    if (isError) {
                        Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                        guiWasmSetClipAvail(false);
                        return 0; // NULL
                    }
                    var bytesLen = this.buffer[2];
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    var clipboardBuf = new SharedArrayBuffer(bytesLen + 1);
                    this.sendMessage({
                        kind: 'clipboard-buf:response',
                        buffer: clipboardBuf,
                    });
                    this.waitUntilStatus(STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE);
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    var clipboardArr = new Uint8Array(clipboardBuf);
                    clipboardArr[bytesLen] = 0; // Write '\0'
                    var ptr = Module._malloc(clipboardArr.byteLength);
                    if (ptr === 0) {
                        return 0; // NULL
                    }
                    Module.HEAPU8.set(clipboardArr, ptr);
                    debug('Malloced', clipboardArr.byteLength, 'bytes and wrote clipboard text');
                    return ptr;
                };
                VimWasmRuntime.prototype.writeClipboard = function (text) {
                    debug('Send clipboard text:', text);
                    this.sendMessage({
                        kind: 'write-clipboard',
                        text: text,
                    });
                };
                VimWasmRuntime.prototype.waitUntilStatus = function (status) {
                    while (true) {
                        var s = this.waitForStatusChanged(undefined);
                        if (s === status) {
                            return;
                        }
                        if (s === STATUS_NOT_SET) {
                            // Note: Should be unreachable
                            continue;
                        }
                        this.handleEvent(s);
                        debug('Event', s, 'was handled in waitUntilStatus()', status);
                    }
                };
                // Note: You MUST clear the status byte after hanlde the event
                VimWasmRuntime.prototype.waitForStatusChanged = function (timeout) {
                    debug('Waiting for event from main with timeout', timeout);
                    var status = this.eventStatus();
                    if (status !== STATUS_NOT_SET) {
                        // Already some result came
                        return status;
                    }
                    if (Atomics.wait(this.buffer, 0, STATUS_NOT_SET, timeout) === 'timed-out') {
                        // Nothing happened
                        debug('No event happened after', timeout, 'ms timeout');
                        return STATUS_NOT_SET;
                    }
                    // Status was changed. Load it.
                    return this.eventStatus();
                };
                VimWasmRuntime.prototype.eventStatus = function () {
                    return Atomics.load(this.buffer, 0);
                };
                VimWasmRuntime.prototype.handleEvent = function (status) {
                    switch (status) {
                        case STATUS_NOTIFY_KEY:
                            this.handleKeyEvent();
                            return;
                        case STATUS_NOTIFY_RESIZE:
                            this.handleResizeEvent();
                            return;
                        case STATUS_REQUEST_OPEN_FILE_BUF:
                            this.handleOpenFileRequest();
                            return;
                        case STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE:
                            this.handleOpenFileWriteComplete();
                            return;
                        case STATUS_REQUEST_CMDLINE:
                            this.handleRunCommand();
                            return;
                        default:
                            throw new Error("Unknown event status " + status);
                    }
                };
                VimWasmRuntime.prototype.handleRunCommand = function () {
                    var _a = this.decodeStringFromBuffer(1), idx = _a[0], cmdline = _a[1];
                    // Note: Status must be cleared here because guiWasmDoCmdline() may cause additional inter
                    // threads communication.
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    debug('Read cmdline request payload with', idx * 4, 'bytes');
                    var success = guiWasmDoCmdline(cmdline);
                    this.sendMessage({ kind: 'cmdline:response', success: success });
                };
                VimWasmRuntime.prototype.handleOpenFileRequest = function () {
                    var fileSize = this.buffer[1];
                    var _a = this.decodeStringFromBuffer(2), idx = _a[0], fileName = _a[1];
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    debug('Read open file request event payload with', idx * 4, 'bytes');
                    var buffer = new SharedArrayBuffer(fileSize);
                    this.sendMessage({
                        kind: 'open-file-buf:response',
                        name: fileName,
                        buffer: buffer,
                    });
                    this.openFileContext = { fileName: fileName, buffer: buffer };
                };
                VimWasmRuntime.prototype.handleOpenFileWriteComplete = function () {
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    if (this.openFileContext === null) {
                        throw new Error('Received FILE_WRITE_COMPLETE event but context does not exist');
                    }
                    var _a = this.openFileContext, fileName = _a.fileName, buffer = _a.buffer;
                    debug('Handle file', fileName, 'open with', buffer.byteLength, 'bytes buffer on file write complete event');
                    var filePath = '/' + fileName;
                    FS.writeFile(filePath, new Uint8Array(buffer));
                    debug('Created file', filePath, 'on in-memory filesystem');
                    guiWasmHandleDrop(filePath);
                    this.openFileContext = null;
                };
                VimWasmRuntime.prototype.handleResizeEvent = function () {
                    var idx = 1;
                    var width = this.buffer[idx++];
                    var height = this.buffer[idx++];
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    this.domWidth = width;
                    this.domHeight = height;
                    guiWasmResizeShell(width, height);
                    debug('Resize event was handled', width, height);
                };
                VimWasmRuntime.prototype.handleKeyEvent = function () {
                    var idx = 1;
                    var keyCode = this.buffer[idx++];
                    var ctrl = !!this.buffer[idx++];
                    var shift = !!this.buffer[idx++];
                    var alt = !!this.buffer[idx++];
                    var meta = !!this.buffer[idx++];
                    var read = this.decodeStringFromBuffer(idx);
                    idx = read[0];
                    var key = read[1];
                    Atomics.store(this.buffer, 0, STATUS_NOT_SET);
                    debug('Read key event payload with', idx * 4, 'bytes');
                    // TODO: Passing string to C causes extra memory allocation to convert JavaScript
                    // string to UTF-8 byte sequence. It can be avoided by writing string in this.buffer
                    // to Wasm memory (Module.HEAPU8) directly with Module._malloc().
                    // Though it must be clarified whether this overhead should be removed.
                    guiWasmHandleKeydown(key, keyCode, ctrl, shift, alt, meta);
                    debug('Key event was handled', key, keyCode, ctrl, shift, alt, meta);
                };
                VimWasmRuntime.prototype.decodeStringFromBuffer = function (idx) {
                    var len = this.buffer[idx++];
                    var chars = [];
                    for (var i = 0; i < len; i++) {
                        chars.push(this.buffer[idx++]);
                    }
                    var s = String.fromCharCode.apply(String, chars);
                    return [idx, s];
                };
                VimWasmRuntime.prototype.sendMessage = function (msg, transfer) {
                    if (this.perf) {
                        // performance.now() is not available because time origin is different between
                        // Window and Worker
                        msg.timestamp = Date.now();
                    }
                    postMessage(msg, transfer);
                };
                return VimWasmRuntime;
            }());
            VW.runtime = new VimWasmRuntime();
        },
    },
    /*
     * C bridge
     */
    // int vimwasm_call_shell(char *);
    vimwasm_call_shell: function (command) {
        var c = UTF8ToString(command);
        debug('call_shell:', c);
        // Shell command may be passed here. Catch the exception
        // eval(c);
    },
    // void vimwasm_will_init(void);
    vimwasm_will_init: function () {
        VW.runtime.vimStarted(); // TODO
    },
    // void vimwasm_will_exit(int);
    vimwasm_will_exit: function (status) {
        VW.runtime.vimExit(status);
    },
    // int vimwasm_resize(int, int);
    vimwasm_resize: function (width, height) {
        debug('resize:', width, height);
    },
    // int vimwasm_is_font(char *);
    vimwasm_is_font: function (font_name) {
        font_name = UTF8ToString(font_name);
        debug('is_font:', font_name);
        // TODO: Check the font name is available. Currently font name is fixed to monospace
        return 1;
    },
    // int vimwasm_is_supported_key(char *);
    vimwasm_is_supported_key: function (key_name) {
        key_name = UTF8ToString(key_name);
        debug('is_supported_key:', key_name);
        // TODO: Check the key is supported in the browser
        return 1;
    },
    // int vimwasm_open_dialog(int, char *, char *, char *, int, char *);
    vimwasm_open_dialog: function (type, title, message, buttons, default_button_idx, textfield) {
        title = UTF8ToString(title);
        message = UTF8ToString(message);
        buttons = UTF8ToString(buttons);
        textfield = UTF8ToString(textfield);
        debug('open_dialog:', type, title, message, buttons, default_button_idx, textfield);
        // TODO: Show dialog and return which button was pressed
    },
    // int vimwasm_get_mouse_x();
    vimwasm_get_mouse_x: function () {
        debug('get_mouse_x:');
        // TODO: Get mouse position. But currently it is hard because mouse position cannot be
        // obtained from worker thread with blocking.
        return 0;
    },
    // int vimwasm_get_mouse_y();
    vimwasm_get_mouse_y: function () {
        debug('get_mouse_y:');
        // TODO: Get mouse position. But currently it is hard because mouse position cannot be
        // obtained from worker thread with blocking.
        return 0;
    },
    // void vimwasm_set_title(char *);
    vimwasm_set_title: function (ptr) {
        var title = UTF8ToString(ptr);
        debug('set_title: TODO:', title);
        // TODO: Send title to main thread and set document.title
    },
    // void vimwasm_set_fg_color(char *);
    vimwasm_set_fg_color: function (name) {
        VW.runtime.draw('setColorFG', [UTF8ToString(name)]);
    },
    // void vimwasm_set_bg_color(char *);
    vimwasm_set_bg_color: function (name) {
        VW.runtime.draw('setColorBG', [UTF8ToString(name)]);
    },
    // void vimwasm_set_sp_color(char *);
    vimwasm_set_sp_color: function (name) {
        VW.runtime.draw('setColorSP', [UTF8ToString(name)]);
    },
    // int vimwasm_get_dom_width()
    vimwasm_get_dom_width: function () {
        debug('get_dom_width:', VW.runtime.domWidth);
        return VW.runtime.domWidth;
    },
    // int vimwasm_get_dom_height()
    vimwasm_get_dom_height: function () {
        debug('get_dom_height:', VW.runtime.domHeight);
        return VW.runtime.domHeight;
    },
    // void vimwasm_draw_rect(int, int, int, int, char *, int);
    vimwasm_draw_rect: function (x, y, w, h, color, filled) {
        VW.runtime.draw('drawRect', [x, y, w, h, UTF8ToString(color), !!filled]);
    },
    // void vimwasm_draw_text(int, int, int, int, int, char *, int, int, int, int, int);
    vimwasm_draw_text: function (charHeight, lineHeight, charWidth, x, y, str, len, bold, underline, undercurl, strike) {
        var text = UTF8ToString(str, len);
        VW.runtime.draw('drawText', [
            text,
            charHeight,
            lineHeight,
            charWidth,
            x,
            y,
            !!bold,
            !!underline,
            !!undercurl,
            !!strike,
        ]);
    },
    // void vimwasm_set_font(char const*, int);
    vimwasm_set_font: function (font_name, font_size) {
        VW.runtime.draw('setFont', [UTF8ToString(font_name), font_size]);
    },
    // void vimwasm_invert_rect(int, int, int, int);
    vimwasm_invert_rect: function (x, y, w, h) {
        VW.runtime.draw('invertRect', [x, y, w, h]);
    },
    // void vimwasm_image_scroll(int, int, int, int, int);
    vimwasm_image_scroll: function (x, sy, dy, w, h) {
        VW.runtime.draw('imageScroll', [x, sy, dy, w, h]);
    },
    // int vimwasm_wait_for_input(int);
    vimwasm_wait_for_event: function (timeout) {
        return VW.runtime.waitAndHandleEventFromMain(timeout > 0 ? timeout : undefined);
    },
    // int vimwasm_export_file(char *);
    vimwasm_export_file: function (fullpath) {
        return VW.runtime.exportFile(UTF8ToString(fullpath));
    },
    // char *vimwasm_read_clipboard();
    vimwasm_read_clipboard: function () {
        return VW.runtime.readClipboard();
    },
    // void vimwasm_write_clipboard(char *);
    vimwasm_write_clipboard: function (textPtr, size) {
        var text = UTF8ToString(textPtr, size);
        VW.runtime.writeClipboard(text);
    },
};
autoAddDeps(VimWasmLibrary, '$VW');
mergeInto(LibraryManager.library, VimWasmLibrary);
//# sourceMappingURL=runtime.js.map