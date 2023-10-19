const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

module.exports = {
  html: true,

  engine: ({ marp }) => {
    marp
      .use(require("markdown-it-container"), "note", {
        render: (tokens, idx) => {
          const className = tokens[idx].info.trim().slice("note".length + 1);
          return tokens[idx].nesting === 1
            ? `<div class="note ${className}">`
            : `</div>`;
        },
      })
      .use((md) => {
        const defaultRender = md.renderer.rules.image;

        md.renderer.rules.image = (tokens, idx, options, env, self) => {
          const token = tokens[idx];
          const srcIndex = token.attrIndex("src");
          const src = token.attrs[srcIndex][1];

          const content = fs.readFileSync(path.join(__dirname, src));
          const dataUri = `data:${mime.lookup(src)};base64,${content.toString(
            "base64",
          )}`;

          token.attrs[srcIndex][1] = dataUri;

          return defaultRender(tokens, idx, options, env, self);
        };
      })
      .use((md) => {
        const defaultRender =
          md.renderer.rules.marpit_advanced_background_image_open;

        md.renderer.rules.marpit_advanced_background_image_open = (
          tokens,
          idx,
          options,
          env,
          self,
        ) => {
          const token = tokens[idx];
          const styleIndex = token.attrIndex("style");
          const style = token.attrs[styleIndex][1];

          token.attrs[styleIndex][1] = style.replace(
            /background-image:url\("(.*)"\);/g,
            (match, src) => {
              const content = fs.readFileSync(path.join(__dirname, src));
              const dataUri = `data:${mime.lookup(
                src,
              )};base64,${content.toString("base64")}`;

              return `background-image:url("${dataUri}");`;
            },
          );

          return defaultRender(tokens, idx, options, env, self);
        };
      });

    return marp;
  },
};
