require('webpack');
var path = require('path');
require('uglifyjs-webpack-plugin');
var WebpackSweetEntry = require('webpack-sweet-entry');

var sourcePath = path.join(__dirname, 'src');
var buildPath = path.join(__dirname, 'dist');

module.exports = [{
    node: {
      fs: 'empty'
    },
    entry: WebpackSweetEntry(path.resolve(sourcePath, 'assets/js/**/*.js*'), 'js', 'js'),
    output: {
      path: path.resolve(buildPath, 'assets/js'),
      filename: '[name].js'
    },
    module: {
      rules: [{
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|gif)$/,
          use: [
            'file-loader'
          ]
        },
        {
          test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: [
            'file-loader'
          ]
        },
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: [
            'url-loader?limit=10000&mimetype=application/font-woff'
          ]
        },
        {
          test: /\.(csv|tsv)$/,
          use: [
            'csv-loader'
          ]
        },
        {
          test: /\.xml$/,
          use: [
            'xml-loader'
          ]
        }
      ]
    }
  },

  {
    entry: WebpackSweetEntry(path.resolve(sourcePath, 'assets/scss/**/*.scss'), 'scss', 'scss'),
    output: {
      path: path.resolve(buildPath, 'assets/scss'),
      filename: '[name].js' //scss file created acts like a js file
    },
    module: {
      rules: [{
          test: /\.(scss)$/,
          use: [{
            loader: 'style-loader', // inject CSS to page
          }, {
            loader: 'css-loader', // translates CSS into CommonJS modules
          }, {
            loader: 'postcss-loader', // Run post css actions
            options: {
              plugins: function () { // post css plugins, can be exported to postcss.config.js
                return [
                  require('precss'),
                  require('autoprefixer')
                ];
              }
            }
          }, {
            loader: 'sass-loader' // compiles Sass to CSS
          }]
        },
        {
          test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
          use: [{
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: '../fonts/', // where the fonts will go,
              publicPath: '../'       // override the default path
            }
          }]
        },
      ]
    }
  }
];