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

/**
 * 文字列に対する正規表現置換を非同期関数で行うユーティリティ。
 * 各マッチごとに asyncFn を Promise として並列に走らせ、それぞれの解決値で
 * 元の位置を書き戻す。
 * @param {string} str - 入力文字列
 * @param {RegExp} regex - マッチ用の正規表現 (g フラグ前提)
 * @param {(...args: any[]) => Promise<string>} asyncFn - マッチごとに置換文字列を返す非同期関数。引数は String.prototype.replace の replacer と同じ
 * @returns {Promise<string>}
 */
const replaceAsync = async (str, regex, asyncFn) => {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    promises.push(asyncFn(match, ...args));
    return match;
  });

  const replacements = await Promise.all(promises);

  return str.replace(regex, () => replacements.shift());
};

/**
 * Marpit の render() が返す結果。@marp-team/marpit の RenderResult をそのまま参照する。
 * @typedef {import("@marp-team/marpit").RenderResult} RenderResult
 */

/**
 * {@link Preprocess} が返すべき結果。書き換え後の Markdown と env をまとめて返す。
 * @typedef {object} PreprocessResult
 * @property {string} markdown - 書き換え後の Markdown
 * @property {any} env - 後続の処理に渡す env (Marpit の render が受ける env と同じ)
 */

/**
 * Marpit が render() する前に Markdown 文字列に手を入れるためのコールバック。
 * env も合わせて受け取り、書き換え後の Markdown と env を {@link PreprocessResult}
 * として返す。Promise を返してもよく、mermaid SVG レンダリングのような
 * コードブロック単位の async 処理を仕込むのに使う。
 * @callback Preprocess
 * @param {string} markdown - 入力 Markdown
 * @param {any} env - Marpit に渡される env
 * @returns {Promise<PreprocessResult> | PreprocessResult}
 */

/**
 * Marpit が render() した後の html / css / comments を加工するためのコールバック。
 * 加工後の値を {@link RenderResult} として返す。Promise を返してもよい。
 * @callback Postprocess
 * @param {string} markdown - preprocess を通した後の Markdown
 * @param {any} env - 同じく preprocess 後の env
 * @param {RenderResult["html"]} html - Marpit が生成した HTML
 * @param {RenderResult["css"]} css - Marpit が生成した CSS
 * @param {RenderResult["comments"]} comments - Marpit が抽出したコメント
 * @returns {Promise<RenderResult> | RenderResult}
 */

/**
 * Marp を継承して、Marpit の render の前後に独自の async 処理を差し込めるよう
 * にした engine。preprocess / postprocess を任意個チェーンで登録でき、登録順に
 * 順次適用される。
 */
class PostprocessMarpitEngine extends Marp {
  /** @type {Preprocess[]} */
  preprocesses = [];

  /** @type {Postprocess[]} */
  postprocesses = [];

  /**
   * Preprocess を末尾に追加する。複数回呼ぶと登録順に連鎖適用される。
   * @param {Preprocess} preprocess
   * @returns {this}
   */
  withPreprocess(preprocess) {
    this.preprocesses.push(preprocess);
    return this;
  }

  /**
   * Postprocess を末尾に追加する。複数回呼ぶと登録順に連鎖適用される。
   * @param {Postprocess} postprocess
   * @returns {this}
   */
  withPostprocess(postprocess) {
    this.postprocesses.push(postprocess);
    return this;
  }

  /**
   * 登録された preprocess を順に適用してから super.render() で Marpit に
   * 委譲し、得られた結果を postprocess に順に通して最終的な
   * {@link RenderResult} を返す。
   * @param {string} markdown
   * @param {any} [env={}]
   * @returns {Promise<RenderResult>}
   */
  async render(markdown, env = {}) {
    let processed = { markdown, env };
    for (const fn of this.preprocesses) {
      processed = await fn(processed.markdown, processed.env);
    }

    /** @type {RenderResult} */
    let result = super.render(processed.markdown, processed.env);

    for (const fn of this.postprocesses) {
      result = await fn(
        processed.markdown,
        processed.env,
        result.html,
        result.css,
        result.comments,
      );
    }

    return result;
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
