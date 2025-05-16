import { type Options, createMinifier } from "shader-minifier-wasm";
const minifier = createMinifier();

export type TransformResult = {
	mappings: Record<string, string>;
	shaders: Record<string, string>;
};

export type TransformerOptions = Omit<Options, "format">;
export function createTransformer(options: TransformerOptions = {}) {
	const mergedOptions = { ...options, format: "json" } as const;

	return async (sources: Record<string, string>): Promise<TransformResult> => {
		const minify = await minifier;
		const result = minify(sources, mergedOptions);
		return JSON.parse(result);
	};
}
