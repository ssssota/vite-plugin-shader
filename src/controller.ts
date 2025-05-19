import { readFile, rm, writeFile } from "node:fs/promises";
import type { MinifyResult, createMinifier } from "./minify.js";

type PromiseOr<T> = T | Promise<T>;
type FS = {
	writeFile: (path: string, data: string) => PromiseOr<void>;
	readFile: (path: string) => PromiseOr<string | null>;
	rm: (path: string) => PromiseOr<void>;
};
const defaultFS: FS = {
	writeFile,
	readFile: (path: string) => readFile(path, "utf8").catch(() => null),
	rm,
};

type ControllerOptions = {
	minify: ReturnType<typeof createMinifier>;
	onMappingsChange?: (this: ShadersController) => void;
	virtualModuleId?: string;
	fs?: FS;
};
export class ShadersController {
	static readonly runtimeModuleId = "vite-plugin-shader/runtime";
	static readonly resolvedRuntimeModuleId: string =
		`\0${ShadersController.runtimeModuleId}`;

	#shaderCache: Record<string, string> = Object.create(null);
	#dtsCache: Record<string, string> = Object.create(null);
	#minifyResult: MinifyResult = { shaders: {}, mappings: {} };
	#minify: ReturnType<typeof createMinifier>;
	#onMappingsChange?: (this: ShadersController) => void;
	#fs: FS;

	constructor(options: ControllerOptions) {
		this.#minify = options.minify;
		this.#onMappingsChange = options.onMappingsChange;
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
		await this.#delete(id);
		await this.#emit();
	}
	async #delete(id: string) {
		delete this.#shaderCache[id];
		delete this.#dtsCache[id];
		const dtsPath = ShadersController.#dtsPath(id);
		await this.#fs.rm(dtsPath);
	}

	#getDts(id: string): string | null {
		const res = this.#minifyResult;
		if (id in res.shaders) {
			return [
				`import { mappings } from ${stringify(ShadersController.runtimeModuleId)};`,
				`export const shader = ${stringify(res.shaders[id])} as const;`,
				`export const shaderVariables: ${stringify(res.mappings)} = mappings;\n`,
			].join("\n");
		}
		return null;
	}
	getVirtualModule(): string {
		return `export const mappings = ${stringify(this.#minifyResult.mappings)};\n`;
	}

	async #emit() {
		const prevMappings = this.#minifyResult.mappings;
		this.#minifyResult = await this.#minify(this.#shaderCache);
		const newMappings = this.#minifyResult.mappings;
		if (hasDiff(prevMappings, newMappings)) this.#onMappingsChange?.call(this);

		await Promise.allSettled(
			Object.entries(this.#shaderCache).map(async ([id, code]) => {
				const dtsPath = ShadersController.#dtsPath(id);
				const dtsCode = this.#getDts(id);
				if (dtsCode === code) return;
				if (dtsCode === null) {
					await this.#delete(id);
					return;
				}
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
