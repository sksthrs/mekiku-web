const path = require('path')

const renderer = (env,argv) => ({
  mode: (argv.mode === 'production') ? 'production' : 'development',
  target: 'web',
  entry: path.join(__dirname, 'src', 'index'),
  output: {
    filename: 'mekiku.js',
    path: (argv.mode === 'production')
      ? path.resolve(__dirname, 'dist')
      : path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  module: {
    rules: [{
      test: /.ts?$/,
      use: [
        'ts-loader'
      ],
      include: [
        path.resolve(__dirname, 'src'),
      ],
    }]
  },
  devServer: {
    host: '0.0.0.0',
    port: 8888,
    static: {
      directory: path.resolve(__dirname, 'dist'),
    }
  }
});

module.exports = renderer
