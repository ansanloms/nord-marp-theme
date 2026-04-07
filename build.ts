import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import * as path from "@std/path";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

try {
  await build({
    entryPoints: [path.resolve(path.join(__dirname, "./nord.scss"))],
    outdir: path.resolve(path.join(__dirname, "./dist")),
    bundle: true,
    minify: true,
    loader: {
      ".png": "dataurl",
      ".svg": "dataurl",
    },
    plugins: [sassPlugin()],
  });

  console.log("Build complete!");
} catch (err) {
  console.error(err);
  Deno.exit(1);
}
