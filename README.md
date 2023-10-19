# nord-marp-theme

[Nord](https://www.nordtheme.com/) theme for [Marp](https://marp.app/).

## Demo

<https://ansanloms.github.io/nord-marp-theme/>

## Usage

```bash
npm i -D github:ansanloms/nord-marp-theme#v0.1.1
```

```javascript:marp.config.js
// marp.config.js

const path = require("path");

module.exports = {
  theme: path.join(__dirname, "/node_modules/nord-marp-theme/dist/marp.css"),
};
```
