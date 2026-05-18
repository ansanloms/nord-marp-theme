/**
 * markdown-it-footnote の出力をスライド単位に再配置する plugin。
 *
 * markdown-it-footnote はドキュメント末尾に集約された
 * `footnote_block_open ... footnote_block_close` を 1 つだけ生成するが、
 * Marp の `---` 区切りスライドでは各スライド内で脚注を完結させたいので、
 * 末尾の集約 block を分解して各スライド (markdown-it の `hr` token で
 * 区切られた token 区間) でその区間内の参照に対応する
 * `footnote_open ... footnote_close` だけを再配置する。
 *
 * 同じ脚注 id が複数スライドで参照される場合は、最初に登場するスライドに
 * のみ配置する (重複出力による HTML id 衝突を避けるため)。
 *
 * 加えて footnote_block_open の renderer を上書きし、
 *   - `<hr class="footnotes-sep">` を `<section class="footnotes">` の内側に
 *     畳む (CSS で `position: absolute` による下寄せを単一コンテナで
 *     扱えるようにするため)
 *   - 本文の参照番号 `[N]` と脚注リストの `<ol>` 番号を一致させるため、
 *     各スライドの最小 fn id を `<ol start="N">` に渡す
 * を行う。
 *
 * markdown-it-footnote の `.use()` の後に呼ぶ前提。
 */
export default function markdownItFootnotePerSlide(md) {
  md.core.ruler.after("footnote_tail", "footnote_per_slide", (state) => {
    const tokens = state.tokens;
    const Token = state.Token;

    let openIdx = -1;
    let closeIdx = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (closeIdx < 0 && tokens[i].type === "footnote_block_close") {
        closeIdx = i;
      } else if (tokens[i].type === "footnote_block_open") {
        openIdx = i;
        break;
      }
    }
    if (openIdx < 0 || closeIdx < 0) {
      return;
    }

    const itemsById = new Map();
    let currentId = null;
    let currentTokens = null;
    for (let i = openIdx + 1; i < closeIdx; i++) {
      const tok = tokens[i];
      if (tok.type === "footnote_open") {
        currentId = tok.meta.id;
        currentTokens = [tok];
      } else if (tok.type === "footnote_close") {
        if (currentTokens) {
          currentTokens.push(tok);
          itemsById.set(currentId, currentTokens);
          currentId = null;
          currentTokens = null;
        }
      } else if (currentTokens) {
        currentTokens.push(tok);
      }
    }

    tokens.splice(openIdx, closeIdx - openIdx + 1);

    const segments = [];
    let segStart = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "hr") {
        segments.push({ start: segStart, end: i });
        segStart = i + 1;
      }
    }
    segments.push({ start: segStart, end: tokens.length });

    const globalSeen = new Set();
    const plans = [];
    for (const seg of segments) {
      const refIds = [];
      for (let i = seg.start; i < seg.end; i++) {
        const tok = tokens[i];
        if (!tok.children) {
          continue;
        }
        for (const child of tok.children) {
          if (child.type !== "footnote_ref") {
            continue;
          }
          const id = child.meta.id;
          if (globalSeen.has(id)) {
            continue;
          }
          globalSeen.add(id);
          refIds.push(id);
        }
      }
      if (refIds.length === 0) {
        continue;
      }
      refIds.sort((a, b) => a - b);

      const insert = [];
      const blockOpen = new Token("footnote_block_open", "", 1);
      blockOpen.meta = { start: refIds[0] + 1 };
      insert.push(blockOpen);
      for (const id of refIds) {
        const itemTokens = itemsById.get(id);
        if (itemTokens) {
          insert.push(...itemTokens);
        }
      }
      const blockClose = new Token("footnote_block_close", "", -1);
      insert.push(blockClose);

      plans.push({ endIdx: seg.end, insertTokens: insert });
    }

    for (let i = plans.length - 1; i >= 0; i--) {
      tokens.splice(plans[i].endIdx, 0, ...plans[i].insertTokens);
    }
  });

  md.renderer.rules.footnote_block_open = (tokens, idx, options) => {
    const start = tokens[idx].meta?.start ?? 1;
    const startAttr = start > 1 ? ` start="${start}"` : "";
    const hr = options.xhtmlOut
      ? '<hr class="footnotes-sep" />'
      : '<hr class="footnotes-sep">';
    return `<section class="footnotes">\n${hr}\n` +
      `<ol class="footnotes-list"${startAttr}>\n`;
  };
}
