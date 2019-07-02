process.env.CHROME_BIN = require('puppeteer').executablePath();

// Note: karma-typescript is not available because JavaScript test source compiled from TypeScript
// by karma-typescript causes weird 'SyntaxError: Unexpected number' error at running tests.
module.exports = function(config) {
    config.set({
        browsers: ['ChromeHeadless'],
        frameworks: ['mocha'],
        files: [
            {
                pattern: './test/bundle.js',
                watched: true,
            },
            {
                pattern: './test/bundle.js.map',
                included: false,
                watched: false,
                served: true,
            },
            {
                pattern: './test/smoke.*',
                included: false,
                watched: false,
                served: true,
            },
            {
                pattern: './node_modules/vim-wasm/vim.*',
                included: false,
                served: true,
            },
        ],
        client: {
            mocha: {
                timeout: 5000,
            },
        },
    });
};
