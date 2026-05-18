import { defineConfig } from "@marp-team/marp-cli";
import * as path from "@std/path";
import { contentType } from "@std/media-types";
import { encodeBase64 } from "@std/encoding";
import { escape as escapeHtml } from "@std/html";
import Shiki from "@shikijs/markdown-it";
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationFocus,
} from "@shikijs/transformers";
import MarkdownItGitHubAlerts from "markdown-it-github-alerts";
import MarkdownItTaskLists from "markdown-it-task-lists";
import MarkdownItFootnote from "markdown-it-footnote";
import markdownItFootnotePerSlide from "./plugins/markdown-it-footnote-per-slide.mjs";
// 出力 HTML 末尾に <script> として inline 注入するソースと @ansanloms/nord-marp-theme
// の CSS をすべて text import で取り込む。実行可能な .mjs / .min.js も含めて
// `with { type: "text" }` を付けることで Deno が中身をパースせず文字列として
// 渡すため、Deno のモジュール解決とキャッシュに乗る。
//   - mermaid 公式 UMD bundle (dynamic chunk 込みの単一ファイル)。これにより
//     PNG/PDF 化を担う Chromium がブラウザ実 DOM 上で mermaid を render するため、
//     SSR (jsdom/svgdom) 由来のレイアウト計算ズレを根本回避できる
//   - ブラウザ側で mermaid を制御するスクリプト (Nord パレット / MermaidConfig /
//     sandbox 経由 render を内包)
import mermaidBundleSource from "mermaid/dist/mermaid.min.js" with {
  type: "text",
};
import mermaidScriptSource from "./assets/scripts/mermaid.mjs" with {
  type: "text",
};

export default defineConfig({
  theme: "../dist/nord.css",
  html: true,
  // 第 1 引数は Marpit constructor options に加えて `marp` getter を持つ
  // 拡張オブジェクト。`marp` は Marp CLI が defineConfig (html: true 等) を
  // 反映済みで構築した Marp Core インスタンスを返すため、こちらで new せず
  // pre-configured 版にそのまま乗る。
  engine: async ({ marp }) => {
    // Marp.render が返す { html, css, comments } の html に 2 つの <script>
    // を append し、ブラウザ側で mermaid を render させる。markdown-it の
    // core.ruler だと 1 変換中に Marpit が内部で何度も parse pass を回す都合で
    // 注入が複数回走るため、render() 戻り値レベルで 1 回 wrap するのが素直。
    //   1. mermaid 本体 (UMD bundle、globalThis.mermaid を設定)
    //   2. assets/scripts/mermaid.mjs (Nord パレット / MermaidConfig /
    //      sandbox 経由 render を内包)
    const baseRender = marp.render.bind(marp);
    marp.render = (markdown, env) => {
      const result = baseRender(markdown, env);
      result.html += `<script>${mermaidBundleSource}</script>` +
        `<script>${mermaidScriptSource}</script>`;
      return result;
    };

    return marp
      .use(
        await Shiki({
          theme: "nord",
          // @shikijs/transformers の組み込み transformer:
          //   - transformerMetaHighlight: ```ts {1,3-4} で行ハイライト
          //   - transformerMetaWordHighlight: ```ts /word/ で語ハイライト
          //   - transformerNotationFocus: // [!code focus] で行フォーカス
          // 装飾 (.highlighted / .highlighted-word / .focused / .has-focused)
          // は nord.css 側に閉じる。
          transformers: [
            transformerMetaHighlight(),
            transformerMetaWordHighlight(),
            transformerNotationFocus(),
          ],
        }),
      )
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

          // mermaid は <div class="mermaid"> として出力する。HTML 末尾に
          // inline 注入される mermaid.run() がこの class を走査して SVG に
          // 置換する。<pre> ではなく <div> なのは、Marp テーマの pre 装飾
          // (背景色 / padding / 枠) が乗らないようにするため。
          if (lang === "mermaid") {
            return `<div class="mermaid">${escapeHtml(token.content)}</div>\n`;
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

          // src は markdown 内に書かれた相対パス。cwd 基準で解決する
          // (絶対パスならそのまま使われる)。これで本 config を外部から
          // import しても、画像は呼び出し元プロジェクトの slides.md 配下
          // から自然に拾える。
          const content = encodeBase64(Deno.readFileSync(path.resolve(src)));
          const dataUri = `data:${
            contentType(path.extname(src))
          };base64,${content}`;

          token.attrs[srcIndex][1] = dataUri;

          return defaultRender(tokens, idx, options, env, renderer);
        };
      })
      .use(MarkdownItGitHubAlerts)
      .use(MarkdownItTaskLists)
      .use(MarkdownItFootnote)
      .use(markdownItFootnotePerSlide);
  },
});
