import {
	_getAttribLocation,
	_getUniformLocation,
	mappings,
} from "virtual:vite-plugin-shader/runtime";
type Variables = "a_position" | "outColor";
export const source =
	"#version 300 es\nin vec4 v;void main(){gl_Position=v;}" as const;

type ShaderType =
	| WebGLRenderingContextBase["VERTEX_SHADER"]
	| WebGLRenderingContextBase["FRAGMENT_SHADER"];
export const createShaderWithSource = (
	gl: WebGLRenderingContextBase,
	type: ShaderType,
): WebGLShader | null => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	return shader;
};
type GetAttribLocation = (
	gl: WebGLRenderingContextBase,
	program: WebGLProgram,
	name: Variables,
) => GLint;
export const getAttribLocation: GetAttribLocation = _getAttribLocation;
type GetUniformLocation = (
	gl: WebGLRenderingContextBase,
	program: WebGLProgram,
	name: Variables,
) => WebGLUniformLocation | null;
export const getUniformLocation: GetUniformLocation = _getUniformLocation;
