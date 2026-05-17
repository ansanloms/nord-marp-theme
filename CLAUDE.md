# CLAUDE.md

## リポジトリ概要

Marp 用 Nord テーマ。`nord.css` が `@import "default"` で Marp 標準テーマを継承し、`:root` に Nord パレット 16 色を Custom Properties で定義した上で配色を上書きする単一 CSS テーマ。esbuild で minify した `dist/nord.css` を成果物として配布する。利用側は `dist/nord.css` を直接参照する。

## ファイル構成

- `nord.css` — テーマ本体 (`@theme nord` ヘッダ + パレット + 配色)
- `build.ts` — esbuild ラッパ。`nord.css` → `dist/nord.css`
- `deno.json` — ルートの Deno タスクと依存 (ビルドツールのみ)
- `examples/` — 独立した Deno プロジェクト。Marp スライドのサンプル (Mermaid / Shiki / GitHub Alerts 統合)。Marp 関連の依存はここに集約
- `dist/` — ビルド成果物 (生成物だがコミット対象)

## 主要コマンド

- `deno task build` — `nord.css` をバンドル & minify
- `deno task lint` — `deno lint && deno fmt --check`
- `deno task fix` — `deno lint --fix && deno fmt`
- `deno task check` — TypeScript 型チェック

## ビルド時の注意

- esbuild の `external` に `"default"`, `"gaia"`, `"uncover"` を登録済み。これらは Marp 組込テーマ名で実ファイルではないので esbuild からは解決できない。新たに別の組込テーマを継承する場合はここに追加すること。

## Lint / フォーマット

- TS / 設定ファイルは `deno fmt` + `deno lint` のみ。
- 除外: `dist/`, `examples/` (`deno.json` の `exclude`)。
- CSS 用 stylelint は使っていない (旧 `.stylelintrc.js` は削除済み)。

## 動作確認

`examples/` はルートとは独立した Deno プロジェクト (独自の `deno.json` / `marp.config.mjs` を持つ)。`dist/nord.css` を読み込んで Marp スライドを 4 形式で生成できる。

```sh
deno task build                       # まずルートで dist/nord.css を更新
deno task --cwd ./examples build      # examples/dist/ に HTML/PDF/PPTX 出力
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
- `@import "default"` 行は HTML 出力には残らない (Marp が展開済みのため)。

## デザイン検証

`nord.css` の配色変更や `examples/marp.config.mjs` の設定変更を行ったときは、必ず実出力を視覚的に検証する。CSS の構文エラーが出ないこととスライド上で意図通りに見えることは別問題で、特に暗背景上では「コントラスト不足」「色相衝突」「elevation 階層の崩れ」が型チェック / lint で検出できない。

### 手順

1. `examples/slides.md` に検証対象の記述パターンがあることを確認する。無ければ追加する。網羅対象は最低限:
   - 見出し階層 (h1 〜 h6 + 本文)
   - インライン要素混在 (リンク / inline code / bold / italic / strikethrough / kbd)
   - blockquote, table, ordered / unordered list, task list
   - 画像, KaTeX 数式, 水平線 (`<hr>`)
   - GitHub-style alerts (Note / Tip / Important / Warning / Caution)
   - Mermaid (Flowchart / Sequence / Class)
2. ルートで `deno task build` を実行して `dist/nord.css` を最新化する。
3. `examples/` で `deno task build:image` を実行し、各スライドを PNG 化する。
4. `examples/dist/png/slide.NNN.png` を 1 枚ずつ確認し、以下を見る:
   - スライド背景 (nord0) と elevated 要素 (nord1) のコントラスト差
   - リンク (nord8) と inline code (nord7) の区別
   - 見出し階層の明度・サイズ差
   - alerts 5 種のボーダー色 (Aurora の semantic 役割)
   - Mermaid 各 diagram の Nord 化が破綻していないか
5. 配色問題があれば `nord.css` を修正し、ルートで再ビルド (`deno task build`) → 画像再生成 (`build:image`) のサイクルを回す。

### Nord 公式階層のチェックリスト

公式ドキュメント (<https://www.nordtheme.com/docs/colors-and-palettes>) との整合をテーマ変更時に確認する:

- **Polar Night** (nord0 〜 3): 背景 = nord0 が原点、elevated UI (panel / card / table cell) = nord1、active line / selection = nord2、subtle guide / comment = nord3。背景階層を逆転させない。
- **Snow Storm** (nord4 〜 6): nord6 が dark designs の prominent UI text、nord5 は subtle text、nord4 は caret や弱めのテキスト。
- **Frost** (nord7 〜 10): nord8 が primary accent、nord9 が secondary。装飾色として使い、semantic な意味づけ (エラー / 警告 等) には使わない。
- **Aurora** (nord11 〜 15): semantic 役割が固定。nord11 = error (赤)、nord12 = annotation (橙)、nord13 = warning (黄)、nord14 = success (緑)、nord15 = numeric (紫)。装飾用途で流用しない。

## パレット出典

<https://www.nordtheme.com/docs/colors-and-palettes>

公式の 16 色 hex 値を `:root` に直接定義する。`npm:nord` パッケージへの依存は持たない (パッケージが SCSS / Less / デザインツール用パレットしか配布しておらず、CSS から利用可能な形式が無い為)。
