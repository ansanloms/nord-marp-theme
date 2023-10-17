import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

try {
  await build({
    entryPoints: [path.join(__dirname, "../src/nord.scss")],
    outdir: path.join(__dirname, "../dist"),
    bundle: true,
    minify: true,
    loader: {
      ".png": "dataurl",
    },
    plugins: [sassPlugin()],
  });

  console.log("Build complete!");
} catch (err) {
  console.error(err);
  process.exit(1);
}
