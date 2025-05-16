import mappings from "virtual:shader-mappings";
type Variables = "a_position" | "outColor";
export const glsl = "#version 300 es\nin vec4 v;void main(){gl_Position=v;}" as const;

type ShaderType = WebGLRenderingContextBase["VERTEX_SHADER"] | WebGLRenderingContextBase["FRAGMENT_SHADER"];
export const createShaderWithSource = (gl: WebGLRenderingContextBase, type: ShaderType): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, glsl);
	return shader;
}
export const getAttribLocation = (gl: WebGLRenderingContextBase, program: WebGLProgram, name: Variables): GLint => {
  return gl.getAttribLocation(program, mappings[name]);
}
export const getUniformLocation = (gl: WebGLRenderingContextBase, program: WebGLProgram, name: Variables): WebGLUniformLocation | null => {
  return gl.getUniformLocation(program, mappings[name]);
}
