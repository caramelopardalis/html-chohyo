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
                use: [
                    {
                        loader: 'babel-loader'
                    }
                ]
            }
        ]
    }
};
