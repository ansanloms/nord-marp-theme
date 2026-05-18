import { build } from "esbuild";
import * as path from "@std/path";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

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
  Deno.exit(1);
}
