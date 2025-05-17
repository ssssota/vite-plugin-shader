import * as path from "node:path";
import type { PluginOption, ViteDevServer } from "vite";
import { ShadersController } from "./controller.js";
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
};

const pluginName = "vite-plugin-shader";
const defaultExtensions: Extension[] = [".vert", ".frag", ".glsl"];

export const shader = (options: Options = {}): PluginOption => {
	const extension = toArray(options.extension ?? defaultExtensions);

	let server: ViteDevServer;
	const controller = new ShadersController({
		transform: createTransformer(options.transformOptions),
		onMappingsChange(this: ShadersController) {
			if (!server) return;
			const mod = server.moduleGraph.getModuleById(
				this.resolvedVirtualModuleId,
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
					new RegExp(`^${controller.virtualModuleId}$`),
				],
			},
			async handler(source, importer) {
				if (source === controller.virtualModuleId) {
					return controller.resolvedVirtualModuleId;
				}
				// Double-checking for the possibility that the filter property is not supported.
				if (extension.every((ext) => !source.endsWith(ext))) {
					return null;
				}
				const resolved = importer
					? path.resolve(importer, "..", source)
					: source;

				this.addWatchFile(resolved);
				const genPath = await controller.update(resolved);
				return genPath;
			},
		},
		load: {
			filter: { id: new RegExp(`^${controller.resolvedVirtualModuleId}$`) },
			async handler(id) {
				if (id !== controller.resolvedVirtualModuleId) return;
				return { code: controller.getVirtualModule() };
			},
		},
		watchChange: {
			async handler(id, change) {
				if (extension.every((ext) => !id.endsWith(ext))) {
					return;
				}
				switch (change.event) {
					case "create":
						// noop
						break;
					case "update":
						await controller.update(id);
						break;
					case "delete":
						await controller.delete(id);
						break;
				}
			},
		},
	};
};

function extensionFilter(extension: readonly Extension[]): RegExp[] {
	return extension.map((ext) => new RegExp(`\\${ext}$`));
}

function toArray<T>(value: Arrayable<T>): T[] {
	return Array.isArray(value) ? value : [value];
}
