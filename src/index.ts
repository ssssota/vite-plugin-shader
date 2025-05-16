import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PluginOption, ViteDevServer } from "vite";
import { ShadersController, virtualShaderMappingsId } from "./controller.js";
import { type TransformerOptions, createTransformer } from "./transform.js";

type Extension = `.${string}`;
type Arrayable<T> = T | T[];
type Options = {
	transformOptions?: TransformerOptions;
	/**
	 * The file extensions to watch for shader files. Defaults to [".vert", ".frag", ".glsl"].
	 * @default [".vert", ".frag", ".glsl"]
	 */
	extension?: Arrayable<Extension>;
	generatedSuffix?: string;
};

const pluginName = "vite-plugin-shader";
const defaultExtensions: Extension[] = [".vert", ".frag", ".glsl"];

export const shader = (options: Options = {}): PluginOption => {
	const suffix = options.generatedSuffix ?? ".d.ts";
	const extension = toArray(options.extension ?? defaultExtensions);

	let server: ViteDevServer;
	const resolvedVirtualShaderMappingsId = `\0${virtualShaderMappingsId}`;
	const controller = new ShadersController({
		transform: createTransformer(options.transformOptions),
		onMappingsChange() {
			if (!server) return;
			const mod = server.moduleGraph.getModuleById(
				resolvedVirtualShaderMappingsId,
			);
			if (!mod) return;
			server.moduleGraph.invalidateModule(mod);
		},
	});

	return {
		name: pluginName,
		enforce: "pre",
		configureServer(serv) {
			server = serv;
		},
		resolveId: {
			filter: {
				id: [
					...extensionFilter(extension),
					new RegExp(`^${virtualShaderMappingsId}$`),
				],
			},
			async handler(source, importer) {
				if (source === virtualShaderMappingsId) {
					return resolvedVirtualShaderMappingsId;
				}
				// Double-checking for the possibility that the filter property is not supported.
				if (extension.every((ext) => !source.endsWith(ext))) {
					return null;
				}
				const resolved = importer
					? path.resolve(importer, "..", source)
					: source;
				const code = await readFile(resolved);
				if (code === null) return null;
				this.addWatchFile(resolved);

				await controller.update(resolved, code);
				const generated = controller.getDts(resolved);
				if (generated === null) return null;
				const genPath = `${resolved}${suffix}`;
				await fs.writeFile(genPath, generated);
				return genPath;
			},
		},
		load: {
			filter: { id: new RegExp(`^${resolvedVirtualShaderMappingsId}$`) },
			async handler(id) {
				if (id !== resolvedVirtualShaderMappingsId) return;
				return { code: controller.getMappingsJs() };
			},
		},
		watchChange: {
			async handler(id, change) {
				if (extension.every((ext) => !id.endsWith(ext))) {
					return;
				}
				const genPath = `${id}${suffix}`;
				switch (change.event) {
					case "create":
						// noop
						break;
					case "update": {
						const code = await readFile(id);
						if (code === null) return;

						const generated = controller.getDts(id);
						if (generated === null) return;
						await fs.writeFile(genPath, generated);
						break;
					}
					case "delete":
						await Promise.allSettled([controller.delete(id), fs.rm(genPath)]);
						break;
				}
			},
		},
	};
};

function extensionFilter(extension: readonly Extension[]): RegExp[] {
	return extension.map((ext) => new RegExp(`\\${ext}$`));
}

function readFile(filePath: string): Promise<string | null> {
	return fs.readFile(filePath, "utf8").catch(() => null);
}

function toArray<T>(value: Arrayable<T>): T[] {
	return Array.isArray(value) ? value : [value];
}
