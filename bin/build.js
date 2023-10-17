const { build } = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");
const path = require("path");

build({
  entryPoints: [path.join(__dirname, "../src/nord.scss")],
  outdir: path.join(__dirname, "../dist"),
  bundle: true,
  minify: true,
  loader: {
    ".png": "dataurl",
  },
  plugins: [sassPlugin()],
})
  .then(() => console.log("Build complete!"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
