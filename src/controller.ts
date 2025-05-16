import type { TransformResult, createTransformer } from "./transform.js";
export const virtualShaderMappingsId = "virtual:shader-mappings";

const template = `
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
`;

type ControllerOptions = {
	transform: ReturnType<typeof createTransformer>;
	onMappingsChange?: () => void;
};
export class ShadersController {
	#cache: Record<string, string> = Object.create(null);
	#resCache: TransformResult = { shaders: {}, mappings: {} };
	#transform: ReturnType<typeof createTransformer>;
	#onMappingsChange?: () => void;

	constructor(options: ControllerOptions) {
		this.#transform = options.transform;
		this.#onMappingsChange = options.onMappingsChange;
	}

	async update(id: string, code: string): Promise<void> {
		this.#cache[id] = code;
		await this.#emit();
	}
	async delete(id: string): Promise<void> {
		delete this.#cache[id];
		await this.#emit();
	}
	getDts(id: string): string | null {
		const res = this.#resCache;
		if (id in res.shaders) {
			return [
				`import mappings from "${virtualShaderMappingsId}";`,
				`type Variables = ${Object.keys(res.mappings)
					.map(stringify)
					.join(" | ")};`,
				`export const glsl = ${stringify(res.shaders[id])} as const;`,
				template,
			].join("\n");
		}
		return null;
	}
	getMappingsJs(): string {
		return `export default ${stringify(this.#resCache.mappings)};`;
	}

	async #emit() {
		const prevMappings = this.#resCache.mappings;
		this.#resCache = await this.#transform(this.#cache);
		const newMappings = this.#resCache.mappings;
		if (!hasDiff(prevMappings, newMappings)) return;
		this.#onMappingsChange?.();
	}
}

function hasDiff(a: Record<string, string>, b: Record<string, string>) {
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return true;
	for (const key of aKeys) {
		if (a[key] !== b[key]) return true;
	}
	return false;
}

function stringify<T>(obj: T): string {
	return JSON.stringify(obj);
}
