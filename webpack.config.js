'use strict';

const webpack = require('webpack');

module.exports = {
    context: __dirname,
    entry: {
        sync: [
            './src_electron/lib/broadcast-channel.js',
            './src_electron/ui/js/sync.js'
        ],
        ui: [
            './src_electron/lib/broadcast-channel.js',
            './src_electron/ui/js/main.js'
        ]
    },
    output: {
        filename: 'entrypoint.[name].js',
        path: `${__dirname}/src_electron/ui/js`
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel',
                query: {
                    plugins: [
                        'transform-async-to-generator',
                        'transform-object-rest-spread'
                    ]
                }
            },
            {
                test: /\.json$/,
                loader: 'json'
            }
        ]
    },
    modules: false,
    target: 'electron',
    devtool: 'inline-source-map',
    watch: (process.env.WATCH === '1'),
    watchOptions: {
        aggregateTimeout: 100
    },

    plugins: [
        new webpack.NoErrorsPlugin()
    ]
};
