/**
 * marp の出力 HTML に inline で埋め込むブラウザ側 mermaid 制御スクリプト。
 * marp.config.mjs の postprocess で:
 *   1. mermaid の UMD bundle (globalThis.mermaid を設定する) を先に <script> で注入
 *   2. このスクリプトを <script> で注入
 * の順に並ぶ前提。
 *
 * mermaid は render 時に container の getBoundingClientRect を見て内部 dagre
 * レイアウトのサイズを決める。Marp の bespoke template が <section> に
 * transform: scale を当てているため、ブラウザ viewport の大小で container 幅が
 * 変化し、box の縦間延びや内部余白のバラつきが viewport ごとに発生する。
 * これを回避するため、render 前に <pre class="mermaid"> を bespoke 外の固定幅
 * sandbox に一時移動して描画し、終わったら元の位置に戻す。
 */

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

/** @type {import("mermaid").MermaidConfig} */
const config = {
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    darkMode: true,
    background: nord.nord0,
    fontFamily: "var(--font-default)",
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
    actorBkg: nord.nord1,
    actorBorder: nord.nord10,
    actorTextColor: nord.nord6,
    actorLineColor: nord.nord8,
    signalColor: nord.nord6,
    signalTextColor: nord.nord6,
    noteBkgColor: nord.nord13,
    noteTextColor: nord.nord0,
    noteBorderColor: nord.nord11,
  },
};

mermaid.initialize(config);

globalThis.addEventListener("load", async () => {
  const pres = [...document.querySelectorAll("div.mermaid")];
  if (!pres.length) {
    return;
  }

  const sandbox = document.createElement("div");
  sandbox.style.cssText =
    "position:fixed;left:-99999px;top:0;width:1100px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(sandbox);

  const slots = pres.map((p) => {
    const ph = document.createComment("");
    p.parentNode.insertBefore(ph, p);
    sandbox.appendChild(p);
    return { p, ph };
  });

  await mermaid.run({ nodes: pres });

  for (const { p, ph } of slots) {
    ph.parentNode.replaceChild(p, ph);
  }
  sandbox.remove();
});
