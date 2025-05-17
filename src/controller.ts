import { readFile, rm, writeFile } from "node:fs/promises";
import type { TransformResult, createTransformer } from "./transform.js";
type FS = {
	writeFile: (path: string, data: string) => Promise<void>;
	readFile: (path: string) => Promise<string | null>;
	rm: (path: string) => Promise<void>;
};
const defaultFS: FS = {
	writeFile,
	readFile: (path: string) => readFile(path, "utf8").catch(() => null),
	rm,
};

const template = `
type ShaderType = WebGLRenderingContextBase["VERTEX_SHADER"] | WebGLRenderingContextBase["FRAGMENT_SHADER"];
export const createShaderWithSource = (gl: WebGLRenderingContextBase, type: ShaderType): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
	return shader;
}
type GetAttribLocation = (gl: WebGLRenderingContextBase, program: WebGLProgram, name: Variables) => GLint;
export const getAttribLocation: GetAttribLocation = _getAttribLocation;
type GetUniformLocation = (gl: WebGLRenderingContextBase, program: WebGLProgram, name: Variables) => WebGLUniformLocation | null;
export const getUniformLocation: GetUniformLocation = _getUniformLocation;
`;
const virtualModuleTemplate = `
export const _getAttribLocation = (gl, program, name) => gl.getAttribLocation(program, mappings[name]);
export const _getUniformLocation = (gl, program, name) => gl.getUniformLocation(program, mappings[name]);
`;

type ControllerOptions = {
	transform: ReturnType<typeof createTransformer>;
	onMappingsChange?: (this: ShadersController) => void;
	virtualModuleId?: string;
	fs?: FS;
};
export class ShadersController {
	virtualModuleId: string;
	#shaderCache: Record<string, string> = Object.create(null);
	#dtsCache: Record<string, string> = Object.create(null);
	#transformResult: TransformResult = { shaders: {}, mappings: {} };
	#transform: ReturnType<typeof createTransformer>;
	#onMappingsChange?: (this: ShadersController) => void;
	#fs: FS;
	get resolvedVirtualModuleId() {
		return `\0${this.virtualModuleId}`;
	}

	constructor(options: ControllerOptions) {
		this.#transform = options.transform;
		this.#onMappingsChange = options.onMappingsChange;
		this.virtualModuleId =
			options.virtualModuleId ?? "virtual:vite-plugin-shader/runtime";
		this.#fs = options.fs ?? defaultFS;
	}

	async update(id: string): Promise<string | null> {
		const code = await this.#fs.readFile(id);
		if (code === null) return null;
		this.#shaderCache[id] = code;
		await this.#emit();
		return ShadersController.#dtsPath(id);
	}
	async delete(id: string): Promise<void> {
		delete this.#shaderCache[id];
		await this.#emit();
	}
	getDts(id: string): string | null {
		const res = this.#transformResult;
		if (id in res.shaders) {
			return [
				`import { mappings, _getAttribLocation, _getUniformLocation } from ${stringify(this.virtualModuleId)};`,
				`type Variables = ${Object.keys(res.mappings)
					.map(stringify)
					.join(" | ")};`,
				`export const source = ${stringify(res.shaders[id])} as const;`,
				template,
			].join("\n");
		}
		return null;
	}
	getVirtualModule(): string {
		return [
			`export const mappings = ${stringify(this.#transformResult.mappings)};`,
			virtualModuleTemplate,
		].join("\n");
	}

	async #emit() {
		const prevMappings = this.#transformResult.mappings;
		this.#transformResult = await this.#transform(this.#shaderCache);
		const newMappings = this.#transformResult.mappings;
		if (!hasDiff(prevMappings, newMappings)) return;
		this.#onMappingsChange?.call(this);

		await Promise.allSettled(
			Object.entries(this.#shaderCache).map(async ([id, code]) => {
				const dtsPath = ShadersController.#dtsPath(id);
				const dtsCode = this.getDts(id);
				if (dtsCode === null) {
					await this.#fs.rm(dtsPath);
					delete this.#dtsCache[id];
					return;
				}
				if (code === dtsCode) return;
				await this.#fs.writeFile(dtsPath, dtsCode);
				this.#dtsCache[id] = dtsCode;
			}),
		);
	}

	static #dtsPath(id: string): string {
		return `${id}.d.ts`;
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
