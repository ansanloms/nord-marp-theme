# CLAUDE.md

## リポジトリ概要

Marp 用 Nord テーマ。`nord.css` は Marp 組込テーマ (`default` / `gaia` / `uncover`) を継承せず、Marpit プリミティブの上に section / heading / paragraph / list / table / code / pre / blockquote / hr / kbd / 画像 / GFM alerts を直接定義する単一 CSS テーマ。`:root` に Nord パレット 16 色を Custom Properties で展開し、`section` 上で役割トークン (`--bg` / `--surface` / `--line` / `--text` / `--text-faint` / `--accent` / `--alert-*` 等) に割り当てて配色する。装飾ルールは役割トークンだけを参照し、`--nordN` を直接参照しない (例外: `.highlighted-word` の nord13 wash)。`section.light` (`<!-- class: light -->`) は同じ役割を Snow Storm 側へ写像する light テーマ。esbuild で minify した `dist/nord.css` を成果物として配布する。利用側は `dist/nord.css` を直接参照する。

組込テーマを継承しない理由は、light-first な GitHub markdown 由来の CSS (`--bgColor-default` / `--fgColor-default` 等の light/dark 切替変数や h1 / h2 の `border-bottom`) が Nord (ミニマル / 寒色 / dark-first) と方向性衝突するため、および default の heading font-size 階層 (h5 = 本文サイズ / h6 < 本文サイズ) と Nord の階層が整合しないため。

## ファイル構成

- `nord.css` — テーマ本体 (`@theme nord` ヘッダ + Nord パレット + 配色 + Marpit raw 上の装飾定義)
- `build.mjs` — esbuild ラッパ。`nord.css` → `dist/nord.css`
- `package.json` — ルートの npm scripts と devDependencies (esbuild / oxlint / oxfmt。ビルド・lint・format ツールのみ)
- `.oxlintrc.json` — oxlint の lint 設定 (correctness + curly)
- `.oxfmtrc.json` — oxfmt の format 設定
- `examples/` — 独立した npm プロジェクト (`package.json`)。Marp スライドのサンプル (Mermaid / Shiki / GitHub Alerts 統合)。Marp 関連の依存はここに集約。**mermaid のような theme 範囲外の機能** (公式 UMD bundle の inline 注入や `pre.mermaid` の装飾打ち消し) はすべて `examples/marp.config.mjs` 側に閉じる。`nord.css` は配色提供のみ
- `dist/` — ビルド成果物 (生成物だがコミット対象)

## 主要コマンド

- `npm run build` — `nord.css` をバンドル & minify
- `npm run lint` — `oxlint --deny-warnings && oxfmt --check`
- `npm run fix` — `oxlint --fix && oxfmt`

## ビルド時の注意

- 組込テーマを継承しないため `@import` を持たない。新たに `@import "default"` 等を導入する場合は、esbuild が解決できない仮想モジュール名なので `build.mjs` の `external` に登録する必要がある (例: `external: ["default", "gaia", "uncover"]`)。

## Lint / フォーマット

- lint は oxlint (`oxlint --deny-warnings`)、format は oxfmt (JS / TS / JSON / CSS / Markdown) で行う。設定は `.oxlintrc.json` と `.oxfmtrc.json`。
- 除外: 各設定の `ignorePatterns` で指定する (`dist/`, `examples/dist/` 等)。`examples/` はルートの設定で対象になる。
- `examples/slides.md` は oxfmt の対象外。デザイン検証のフィクスチャで、Markdown の書き方そのものが検証対象になる為。
- CSS 用 stylelint は使っていない (旧 `.stylelintrc.js` は削除済み)。

## 動作確認

`examples/` はルートとは独立した npm プロジェクト (独自の `package.json` / `marp.config.mjs` を持つ)。`dist/nord.css` を読み込んで Marp スライドを 4 形式で生成できる。

```sh
npm run build                         # まずルートで dist/nord.css を更新
npm --prefix ./examples run build     # examples/dist/ に HTML/PDF/PPTX 出力
```

出力形式:

- `build:html` — `examples/dist/slides.html` (ブラウザ確認用)
- `build:pdf` — `examples/dist/slides.pdf` (印刷物相当のレンダリング)
- `build:pptx` — `examples/dist/slides.pptx` (PowerPoint 互換)
- `build:image` — `examples/dist/png/slide.NNN.png` (各スライドを PNG 化、デザイン検証用)
- `build` — 上記 4 形式を一括生成

確認ポイント:

- `examples/dist/slides.html` をブラウザで開いて視覚的に確認する。
- HTML 内に `@theme nord` ヘッダと `:root { --nord0: #...; ... }` のパレット展開、`var(--nordN)` 参照が含まれていれば CSS 統合は成功。

## デザイン検証

`nord.css` の配色変更や `examples/marp.config.mjs` の設定変更を行ったときは、必ず実出力を視覚的に検証する。CSS の構文エラーが出ないこととスライド上で意図通りに見えることは別問題で、特に暗背景上では「コントラスト不足」「色相衝突」「elevation 階層の崩れ」が型チェック / lint で検出できない。

### 手順

1. `examples/slides.md` に検証対象の記述パターンがあることを確認する。無ければ追加する。網羅対象は最低限:
   - 見出し階層 (h1 〜 h6 + 本文)
   - インライン要素混在 (リンク / inline code / bold / italic / strikethrough / kbd)
   - blockquote, table, ordered / unordered list, task list
   - 画像, KaTeX 数式, 水平線 (`<hr>`)
   - GitHub-style alerts (Note / Tip / Important / Warning / Caution)
   - Mermaid (Flowchart / Sequence / State / Class)
   - 日本語の自動改行処理 (`word-break: auto-phrase` / `text-wrap: balance` / `text-wrap: pretty`) — 折り返しが発生する長さの日本語 heading と paragraph
2. ルートで `npm run build` を実行して `dist/nord.css` を最新化する。
3. ルートで `npm --prefix ./examples run build:image` を実行し、各スライドを PNG 化する。
4. `examples/dist/png/slide.NNN.png` を 1 枚ずつ確認し、以下を見る:
   - スライド背景 (nord0) と elevated 要素 (nord1) のコントラスト差
   - リンク (`--accent` = nord8) と inline code (`--code` = nord7) の区別
   - 見出し階層: h1 〜 h6 はすべて `--text` (nord6)。階層はサイズ (1.8 / 1.4 / 1.2 / 1.1em) と weight 600 のみで表す。Frost を見出し色に使わない (h1 と link が同色になり、見出しが本文より暗くなる)。h6 が本文より小さくならないこと
   - header / footer / ページ番号 / footnote (`--text-faint` = nord4) が読めること。16px 前後のテキストには 4.5:1 が必要で、nord3 (1.69:1) や opacity による減光は使わない。chrome 内のリンクは chrome 色を継承する
   - `class: light` のスライドで地 / 文字 / surface / rule が反転し、link が nord10 になること。Frost は明背景で 4.5:1 に届かない (nord10 で 3.5:1) ため、29px 本文 (large text、3:1) でのみ許容する。Shiki の構文色は dark 用のままなので、light スライドにコードブロックを置く場合は examples 側で Shiki の light テーマを検討する
   - スライド領域の上下中央寄せ (`place-content: safe center center`) が機能していること
   - 日本語の長文 heading / paragraph が文節境界で折り返されていること
   - alerts 5 種のボーダー色 (`--alert-*`、Aurora の semantic 役割)。タイトル文字は `--text`、octicon は `currentColor` で塗られていること
   - Mermaid 各 diagram の Nord 化が破綻していないか
5. 配色問題があれば `nord.css` を修正し、ルートで再ビルド (`npm run build`) → 画像再生成 (`build:image`) のサイクルを回す。

### Nord 公式階層のチェックリスト

公式ドキュメント (<https://www.nordtheme.com/docs/colors-and-palettes>) との整合をテーマ変更時に確認する:

- **Polar Night** (nord0 〜 3): 背景 = nord0 が原点、elevated UI (panel / card / table cell) = nord1、active line / selection = nord2、subtle guide / comment = nord3。背景階層を逆転させない。
- **Snow Storm** (nord4 〜 6): nord6 が dark designs の prominent UI text、nord5 は subtle text、nord4 は caret や弱めのテキスト。
- **Frost** (nord7 〜 10): nord8 が primary accent、nord9 が secondary。このテーマでは文字色としての Frost を `--accent` (link / checked box / table header rule) と `--code` (inline code) に限定し、見出しの階層表現には使わない。semantic な意味づけ (エラー / 警告 等) にも使わない。
- **Aurora** (nord11 〜 15): semantic 役割が固定。nord11 = error (赤)、nord12 = annotation (橙)、nord13 = warning (黄)、nord14 = success (緑)、nord15 = numeric (紫)。装飾用途で流用しない。

## パレット出典

<https://www.nordtheme.com/docs/colors-and-palettes>

公式の 16 色 hex 値を `:root` に直接定義する。`npm:nord` パッケージへの依存は持たない (パッケージが SCSS / Less / デザインツール用パレットしか配布しておらず、CSS から利用可能な形式が無い為)。
