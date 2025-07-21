const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  context: __dirname, 
  devtool: 'cheap-module-source-map',
  entry: [
    "@babel/polyfill",
    'webpack-hot-middleware/client',
    './src/index'
  ],
  output: {
    path: path.join(__dirname, 'devel'),
    filename: 'bundle.js',
    publicPath: '/dist/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    // NODE_ENV is automatically set by webpack 5 based on mode
    new webpack.NoEmitOnErrorsPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        include: path.join(__dirname, 'src')
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: "file-loader",
        include: path.join(__dirname, "src")
      }
    ]
  },
  devServer: {
    hot: true,
    contentBase:'./'
  },
};
