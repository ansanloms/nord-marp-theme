const { build } = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");
const path = require("path");

const watch = process.argv[2] === "watch";

build({
  entryPoints: [path.join(__dirname, "../src/nord.scss")],
  outdir: path.join(__dirname, "../dist"),
  bundle: true,
  minify: true,
  watch: watch,
  loader: {
    ".png": "dataurl",
  },
  plugins: [sassPlugin()],
})
  .then(() => console.log(watch ? "watching..." : "Build complete!"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
