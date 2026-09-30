import path from 'node:path';
import { createRequire } from 'node:module';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default {
  mode: 'production',
  entry: './apps/web/src/main.tsx',
  output: { path: path.resolve('dist-webpack'), filename: 'main.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  plugins: [
    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(pkg.version),
      'import.meta.env.MODE': JSON.stringify('production'),
      'import.meta.env.DEV': 'false',
      'import.meta.env.PROD': 'true',
    }),
    {
      apply(compiler) {
        compiler.hooks.thisCompilation.tap('EmitHtml', (compilation) => {
          compilation.hooks.processAssets.tap(
            { name: 'EmitHtml', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
            () => {
              const html = [
                '<!doctype html>',
                '<html lang="zh-CN">',
                '  <head>',
                '    <meta charset="UTF-8" />',
                '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
                '    <title>Frontend Toolchain Lab</title>',
                '  </head>',
                '  <body>',
                '    <div id="root"></div>',
                '    <script src="main.js"></script>',
                '  </body>',
                '</html>',
                '',
              ].join('\n');
              compilation.emitAsset('index.html', new webpack.sources.RawSource(html));
            },
          );
        });
      },
    },
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              jsx: 'react-jsx',
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'node',
              esModuleInterop: true,
              skipLibCheck: true,
              noUnusedLocals: false,
              noUnusedParameters: false,
            },
          },
        },
      },
      {
        test: /\.module\.s?css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { esModule: true, modules: { namedExport: false, localIdentName: '[local]__[hash:base64:5]' } },
          },
          'sass-loader',
        ],
      },
      { test: /\.s?css$/, exclude: /\.module\.s?css$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
    ],
  },
  performance: { hints: false },
};
