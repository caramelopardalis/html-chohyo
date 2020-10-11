module.exports = {
    mode: 'development',
    entry: {
        'dist/html-chohyo': './src/js/html-chohyo.js'
    },
    output: {
        path: __dirname,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader'
                    }
                ]
            }
        ]
    }
};
