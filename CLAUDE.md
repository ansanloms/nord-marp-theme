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

`examples/` はルートとは独立した Deno プロジェクト (独自の `deno.json` / `marp.config.mjs` を持つ)。`dist/nord.css` を読み込んで Marp スライドを 3 形式 (HTML / PDF / PPTX) で生成する。

```sh
deno task build                       # まずルートで dist/nord.css を更新
deno task --cwd ./examples build      # examples/dist/ に HTML/PDF/PPTX 出力
```

確認ポイント:

- `examples/dist/slides.html` をブラウザで開いて視覚的に確認する。
- HTML 内に `@theme nord` ヘッダと `:root { --nord0: #...; ... }` のパレット展開、`var(--nordN)` 参照が含まれていれば CSS 統合は成功。
- `@import "default"` 行は HTML 出力には残らない (Marp が展開済みのため)。

## パレット出典

<https://www.nordtheme.com/docs/colors-and-palettes>

公式の 16 色 hex 値を `:root` に直接定義する。`npm:nord` パッケージへの依存は持たない (パッケージが SCSS / Less / デザインツール用パレットしか配布しておらず、CSS から利用可能な形式が無い為)。
