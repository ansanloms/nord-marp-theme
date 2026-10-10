import path from "node:path";
import { build } from "esbuild";

const __dirname = import.meta.dirname;

try {
  await build({
    entryPoints: [path.resolve(path.join(__dirname, "./nord.css"))],
    outdir: path.resolve(path.join(__dirname, "./dist")),
    bundle: true,
    minify: true,
    loader: {
      ".png": "dataurl",
      ".svg": "dataurl",
    },
  });

  console.log("Build complete!");
} catch (err) {
  console.error(err);
  process.exit(1);
}
