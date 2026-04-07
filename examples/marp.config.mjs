import { defineConfig } from "@marp-team/marp-cli";
import { Marp } from "@marp-team/marp-core";
import * as path from "@std/path";
import { contentType } from "@std/media-types";
import { encodeBase64 } from "@std/encoding";
import Shiki from "@shikijs/markdown-it";
import MarkdownItGitHubAlerts from "markdown-it-github-alerts";
import mermaid from "isomorphic-mermaid";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  htmlLabels: false,
  theme: "dark",
});

class PostprocessMarpitEngine extends Marp {
  withPreprocess(preprocess) {
    this.preprocess = preprocess;
    return this;
  }

  withPostprocess(postprocess) {
    this.postprocess = postprocess;
    return this;
  }

  async render(markdown, env = {}) {
    const processed = this.preprocess
      ? await this.preprocess(markdown, env)
      : { markdown, env };

    const { html, css, comments } = super.render(
      processed.markdown,
      processed.env,
    );

    return this.postprocess
      ? await this.postprocess(
        processed.markdown,
        processed.env,
        html,
        css,
        comments,
      )
      : { html, css, comments };
  }
}

export default defineConfig({
  theme: "../dist/nord.css",
  html: true,
  engine: async (options) =>
    new PostprocessMarpitEngine(options)
      .use(await Shiki({ theme: "nord" }))
      .use((md) => {
        const defaultRender = md.renderer.rules.fence;

        md.renderer.rules.fence = (
          tokens,
          idx,
          options,
          env,
          renderer,
        ) => {
          const token = tokens[idx];
          const lang = token.info.trim();

          // 特定の言語に対する処理。
          if (lang === "mermaid") {
            return `<div class="mermaid">${token.content}</div>\n`;
          }

          // デフォルトの処理。
          return defaultRender(tokens, idx, options, env, renderer);
        };
      })
      .use((md) => {
        const defaultRender = md.renderer.rules.image;

        md.renderer.rules.image = (tokens, idx, options, env, renderer) => {
          const token = tokens[idx];
          const srcIndex = token.attrIndex("src");
          const src = token.attrs[srcIndex][1];

          const content = encodeBase64(Deno.readFileSync(
            path.resolve(path.join(__dirname, src)),
          ));
          const dataUri = `data:${
            contentType(path.extname(src))
          };base64,${content}`;

          token.attrs[srcIndex][1] = dataUri;

          return defaultRender(tokens, idx, options, env, renderer);
        };
      })
      .use(MarkdownItGitHubAlerts)
      .withPreprocess(async (markdown, env) => ({
        markdown: await replaceAsync(
          markdown,
          /```mermaid\n([\s\S]*?)\n```/g,
          async (_match, code) =>
            `<section class="mermaid">${
              (await mermaid.render("mermaid-diagram-id", code)).svg
            }</section>`,
        ),
        env,
      })),
});

const replaceAsync = async (str, regex, asyncFn) => {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    promises.push(asyncFn(match, ...args));
    return match;
  });

  const replacements = await Promise.all(promises);

  return str.replace(regex, () => replacements.shift());
};
