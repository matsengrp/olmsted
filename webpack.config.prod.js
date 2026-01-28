const path = require("path");
const webpack = require("webpack");
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = {
  entry: [
    "./src/index"
  ],
  output: {
    path: path.join(__dirname, "_deploy/dist/"),
    filename: "bundle.js",
    publicPath: "dist/"
  },
  resolve: {
    alias: {
      'vega-lib': 'vega'
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
        /* we don't need to define env.PERF in production as babel strips out the function calls :) */
      }
    }),
    /* Note: console.log statements are not stripped out */
    new webpack.optimize.AggressiveMergingPlugin(), // merge chunks - https://github.com/webpack/docs/wiki/list-of-plugins#aggressivemergingplugin
    new CompressionPlugin({ // gzip everything - https://github.com/webpack-contrib/compression-webpack-plugin
      filename: "[path][base].gz",
      algorithm: "gzip",
      test: /\.js$|\.css$|\.html$/,
      threshold: 10240,
      minRatio: 0.8
    }),
    {
      // Custom plugin to replace WebpackShellPlugin functionality
      apply: (compiler) => {
        // Create directories before build
        if (!fs.existsSync('_deploy/dist')) {
          fs.mkdirSync('_deploy/dist', { recursive: true });
        }
        if (!fs.existsSync('_deploy/data')) {
          fs.mkdirSync('_deploy/data', { recursive: true });
        }
        
        // Run postbuild script after compilation
        compiler.hooks.done.tap('CustomPostBuildPlugin', () => {
          try {
            execSync('./bin/postbuild.sh', { stdio: 'inherit' });
          } catch (error) {
            console.warn('Postbuild script failed:', error.message);
          }
        });
      }
    }
  ],
  optimization: {
    minimizer: [new TerserPlugin()]},
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["babel-loader"],
        include: path.join(__dirname, "src")
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        type: "asset/resource",
        include: path.join(__dirname, "src")
      }
    ]
  }
};
