---
lang: en
title: nord-marp-theme
author: ansanloms
---

# nord-marp-theme

[Nord](https://www.nordtheme.com/) theme for [Marp](https://marp.app/).

---

# h1

## h2

### h3

#### h4

##### h5

###### h6

---

# Paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

**This is bold text.**

_This is italic text._

---

# Blockquote

> blockquote.
>
> > Nested blockquote.

---

# List

- Lorem ipsum dolor sit amet
- Consectetur adipiscing elit
  - Integer molestie lorem at massa

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa

---

## Table

| Option | Description                     |
| ------ | ------------------------------- |
| hoge   | Lorem ipsum dolor sit amet      |
| fuga   | Consectetur adipiscing elit     |
| piyo   | Integer molestie lorem at massa |

---

# Code

This is `inline code` .

```javascript
const sayHello = (name) => {
  console.log(`Hello ${name}`.);
}

sayHello("John");
```

---

## Prism.js

You can use [Prism.js](https://prismjs.com/) by writing the following in `marp.config.js` .

```javascript
const Prism = require("prismjs");
const loadLanguages = require("prismjs/components/");

loadLanguages(["jsx", "php", "markdown"]);

module.exports = {
  engine: ({ marp }) => {
    marp.highlighter = (code, lang) =>
      Prism.highlight(code, Prism.languages[lang], lang);

    return marp;
  },
};
```

<!--

Reference:

<https://github.com/highlightjs/highlightjs-structured-text/issues/9#issuecomment-686326994>

-->

---

# Note

You can use Note by writing the following in `marp.config.js` .

```javascript
module.exports = {
  engine: ({ marp }) => {
    marp.use(require("markdown-it-container"), "note", {
      render: (tokens, idx) => {
        const className = tokens[idx].info.trim().slice("note".length + 1);
        return tokens[idx].nesting === 1
          ? `<div class="note ${className}">`
          : "</div>";
      },
    });

    return marp;
  },
};
```

---

::: note

### Tip (Default)

:::

```markdown
::: note

### Tip (Default)

:::
```

::: note info

### Info

:::

```markdown
::: note info

### Info

:::
```

---

::: note warning

### Warning

:::

```markdown
::: note warning

### Warning

:::
```

::: note danger

### Danger

:::

```markdown
::: note danger

### Danger

:::
```
