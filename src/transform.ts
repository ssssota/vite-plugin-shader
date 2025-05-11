import { createMinifier } from "shader-minifier-wasm";
const minifier = createMinifier();
export async function transform(code: string): Promise<string> {
  const minify = await minifier;
  const result = minify(code, { format: "json" });
  const res: {
    mappings: Record<string, string>;
    shaders: { glsl: string };
  } = JSON.parse(result);
  return [
    `export const glsl = ${JSON.stringify(res.shaders.glsl)} as const;`,
    `export const mappings = ${JSON.stringify(res.mappings)} as const;`,
    "export const createShaderWithSource = (gl: WebGLRenderingContextBase, type: 'vert' | 'frag'): WebGLShader | null => {",
    "  const shader = gl.createShader(type === 'vert' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);",
    "  if (!shader) return null;",
    "  gl.shaderSource(shader, glsl);",
    "}",
    "export const getAttribLocation = (gl: WebGLRenderingContextBase, program: WebGLProgram, name: keyof typeof mappings): GLint => {",
    "  return gl.getAttribLocation(program, mappings[name]);",
    "}",
    "export const getUniformLocation = (gl: WebGLRenderingContextBase, program: WebGLProgram, name: keyof typeof mappings): WebGLUniformLocation | null => {",
    "  return gl.getUniformLocation(program, mappings[name]);",
    "}",
    "",
  ].join("\n");
}
