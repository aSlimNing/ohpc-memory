const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "../..");

function findHoisted(name) {
  for (const dir of [path.join(root, "node_modules"), path.join(root, "apps/web/node_modules")]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return name;
}

module.exports = {
  mode: "production",
  target: "node",
  entry: path.join(root, "toolchecks/webpack/entry.ts"),
  output: {
    path: path.join(root, ".verify/webpack"),
    filename: "bundle.cjs",
    library: { type: "commonjs2" },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      "@lab/shared": path.join(root, "packages/shared/src/index.ts"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: findHoisted("ts-loader"),
            options: {
              configFile: path.join(root, "toolchecks/webpack/tsconfig.json"),
              compilerOptions: { strict: false, noEmit: false, declaration: false, sourceMap: true },
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        use: [
            {
              loader: findHoisted("css-loader"),
              options: {
              modules: { mode: "local", localIdentName: "wc_[name]__[local]" },
            },
            },
            findHoisted("sass-loader"),
          ],
      },
    ],
  },
  performance: { hints: false },
};
