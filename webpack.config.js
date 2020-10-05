module.exports = {
    mode: 'development',
    entry: {
        'dist/html-chohyo': './src/js/html-chohyo.js',
        'demo/dist/js/demo': './demo/src/js/demo.js'
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
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env'
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: false
                        }
                    }
                ]
            }
        ]
    }
};
