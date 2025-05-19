# vite-plugin-shader

Vite plugin for shader file (GLSL) support.

## Features

- Enables importing `.glsl` files into your project.
- Minifies GLSL code for smaller bundle sizes.

## Usage

```sh
npm install vite-plugin-shader --save-dev
```

```js
// vite.config.js (or vite.config.ts)
import { defineConfig } from 'vite';
import { shader } from 'vite-plugin-shader';
export default defineConfig({
  plugins: [shader({
    // Optional: Specify the shader file extensions to be processed
    extensions: ['.glsl', '.vert', '.frag'],
    minifyOptions: {
      // Optional: Specify whether to preserve external variable names
      preserveExternals: false, // Default is false
    },
  })],
});
```

```js
// In your code
import { shader, shaderVariables } from './your_shader.glsl';
// ...
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, shader);
// ...
const attribLocation = gl.getAttribLocation(program, shaderVariables.someAttrib);
const uniformLocation = gl.getUniformLocation(program, shaderVariables.someUniform);
```

### `shaderVariables`

The `shaderVariables` export provides a mapping to the minified variable names from your shader code.
This is useful when `minifyOptions.preserveExternals` is set to `false` (the default behavior), which minifies variable names.

If you prefer to keep original variable names, you can set `minifyOptions.preserveExternals` to `true` in the plugin options within your `vite.config.js`.

The `shaderVariables` object is consistent across all imported shader files within your project. This ensures that varying variables (passed between vertex and fragment shaders, for example) retain consistent minified names.

```js
import { shaderVariables as fragShaderVariables } from './your_shader.frag.glsl';
import { shaderVariables as vertShaderVariables } from './your_shader.vert.glsl';

console.log(fragShaderVariables === vertShaderVariables); // true
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
