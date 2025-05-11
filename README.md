# vite-plugin-shader

Vite plugin for shader file (GLSL) support.

## Features

- Support glsl files import
- Minify glsl files

## Usage

```sh
npm install vite-plugin-shader --save-dev
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import { shader } from 'vite-plugin-shader'
export default defineConfig({
  plugins: [shader()],
});
```

## License

MIT
