import { type Options, createMinifier as internal } from "shader-minifier-wasm";
const minifier = internal();

export type MinifyResult = {
	mappings: Record<string, string>;
	shaders: Record<string, string>;
};

export type MinifyOptions = Omit<Options, "format">;
export function createMinifier(options: MinifyOptions = {}) {
	const mergedOptions = { ...options, format: "json" } as const;

	return async (sources: Record<string, string>): Promise<MinifyResult> => {
		const minify = await minifier;
		const result = minify(sources, mergedOptions);
		return JSON.parse(result);
	};
}
