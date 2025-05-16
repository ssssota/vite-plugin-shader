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
  plugins: [shader({ /* options */ })],
});
```

### Optional: Toolchain integration

```
# .gitignore
*.glsl.d.ts
*.vert.d.ts
*.frag.d.ts
```

```jsonc
// .vscode/settings.json
{
  "explorer.fileNesting.enabled": true, // Collapse generated files
  "explorer.fileNesting.patterns": {
    "*.glsl": "*.glsl.d.ts",
    "*.vert": "*.vert.d.ts",
    "*.frag": "*.frag.d.ts"
  }
}
```

## License

MIT
