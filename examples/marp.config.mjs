import { defineConfig } from "@marp-team/marp-cli";
import { Marp } from "@marp-team/marp-core";
import * as path from "@std/path";
import { contentType } from "@std/media-types";
import { encodeBase64 } from "@std/encoding";
import { escape as escapeHtml } from "@std/html";
import Shiki from "@shikijs/markdown-it";
import MarkdownItGitHubAlerts from "markdown-it-github-alerts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

// 出力 HTML 末尾に <script> として inline 注入する 2 つのソースを並列読込:
//   - mermaid 公式 UMD bundle (dynamic chunk も含む単一ファイル)。これにより
//     PNG/PDF 化を担う Chromium がブラウザ実 DOM 上で mermaid を render する
//     ため、SSR (jsdom/svgdom) 由来のレイアウト計算ズレを根本回避できる
//   - ブラウザ側で mermaid を制御するスクリプト (Nord パレット / MermaidConfig /
//     sandbox 経由 render を内包)。lint / fmt 対象にするため別ファイルに切出
const [mermaidBundleSource, mermaidScriptSource] = await Promise.all([
  Deno.readTextFile(
    new URL(import.meta.resolve("mermaid/dist/mermaid.min.js")),
  ),
  Deno.readTextFile(path.join(__dirname, "assets/scripts/mermaid.mjs")),
]);

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
 * として返す。Promise を返してもよく、コードブロック単位の async 処理を
 * 仕込むのに使う。
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
  themeSet: "../dist",
  theme: "./assets/styles/custom.css",
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

          // mermaid は <pre class="mermaid"> として出力する。HTML 末尾に
          // inline 注入される mermaid.run() がこの class を走査して SVG に
          // 置換する。
          if (lang === "mermaid") {
            return `<pre class="mermaid">${escapeHtml(token.content)}</pre>\n`;
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
      .withPostprocess((_markdown, _env, html, css, comments) => ({
        // 2 つの <script> を HTML 末尾に inline 注入する:
        //   1. mermaid 本体 (UMD bundle、globalThis.mermaid を設定)
        //   2. assets/scripts/mermaid.mjs (Nord パレット / MermaidConfig /
        //      sandbox 経由 render を内包)
        // <pre class="mermaid"> の見た目は assets/styles/custom.css 側に閉じる。
        html: html + `
<script>${mermaidBundleSource}</script>
<script>${mermaidScriptSource}</script>`,
        css,
        comments,
      })),
});
