import { defineConfig } from "@marp-team/marp-cli";
import { Marp } from "@marp-team/marp-core";
import * as path from "@std/path";
import { contentType } from "@std/media-types";
import { encodeBase64 } from "@std/encoding";
import Shiki from "@shikijs/markdown-it";
import MarkdownItGitHubAlerts from "markdown-it-github-alerts";
import mermaid from "isomorphic-mermaid";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

// Nord palette — https://www.nordtheme.com/docs/colors-and-palettes
const nord = {
  nord0: "#2e3440",
  nord1: "#3b4252",
  nord2: "#434c5e",
  nord3: "#4c566a",
  nord4: "#d8dee9",
  nord5: "#e5e9f0",
  nord6: "#eceff4",
  nord7: "#8fbcbb",
  nord8: "#88c0d0",
  nord9: "#81a1c1",
  nord10: "#5e81ac",
  nord11: "#bf616a",
  nord12: "#d08770",
  nord13: "#ebcb8b",
  nord14: "#a3be8c",
  nord15: "#b48ead",
};

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  htmlLabels: false,
  theme: "base",
  themeVariables: {
    darkMode: true,
    background: nord.nord0,
    primaryColor: nord.nord1,
    primaryTextColor: nord.nord6,
    primaryBorderColor: nord.nord10,
    secondaryColor: nord.nord2,
    secondaryTextColor: nord.nord6,
    secondaryBorderColor: nord.nord10,
    tertiaryColor: nord.nord3,
    tertiaryTextColor: nord.nord6,
    tertiaryBorderColor: nord.nord10,
    lineColor: nord.nord8,
    textColor: nord.nord6,
    mainBkg: nord.nord1,
    nodeBkg: nord.nord1,
    nodeBorder: nord.nord10,
    clusterBkg: nord.nord2,
    clusterBorder: nord.nord10,
    defaultLinkColor: nord.nord8,
    edgeLabelBackground: nord.nord1,
    titleColor: nord.nord8,
    // Sequence / actor
    actorBkg: nord.nord1,
    actorBorder: nord.nord10,
    actorTextColor: nord.nord6,
    actorLineColor: nord.nord8,
    signalColor: nord.nord6,
    signalTextColor: nord.nord6,
    // Notes
    noteBkgColor: nord.nord13,
    noteTextColor: nord.nord0,
    noteBorderColor: nord.nord11,
  },
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
          if (["mermaid"].includes(lang)) {
            return `<section class="${lang}">${token.content}</section>\n`;
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
          async (_match, code) => {
            const { svg } = await mermaid.render("mermaid-diagram-id", code);

            return svg;
          },
        ),
        env,
      })),
});
