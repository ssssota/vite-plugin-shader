import { expect, it, vi } from "vitest";
import { ShadersController } from "./controller.js";

const createVirtualFS = (init: [filepath: string, data: string][]) => {
	const fs = new Map<string, string>(init);
	return {
		readFile: vi.fn((id: string) => {
			return fs.get(id) ?? null;
		}),
		writeFile: vi.fn((id: string, code: string) => {
			fs.set(id, code);
		}),
		rm: vi.fn((id: string) => {
			fs.delete(id);
		}),
	};
};
const createMockedMinify = () => {
	return vi.fn((obj: Record<string, string>) => {
		return Promise.resolve({
			mappings: Object.fromEntries(
				Array.from(
					new Set(
						Object.values(obj).flatMap((code) => {
							const matches = code.matchAll(/(?:in|out|uniform) \w+ (\w+);/g);
							return Array.from(matches, (a) => a[1]);
						}),
					),
				).map((name) => [name, name]),
			),
			shaders: obj,
		});
	});
};

it("should", async () => {
	const fs = createVirtualFS([
		["/test/vertex.glsl", "in vec4 a;void main() {}"],
		["/test/fragment.glsl", "out vec4 color;void main() {}"],
	]);
	const minify = createMockedMinify();
	const onMappingsChange = vi.fn();
	const controller = new ShadersController({ minify, onMappingsChange, fs });
	await controller.update("/test/vertex.glsl");
	expect(onMappingsChange).toBeCalledTimes(1);
	expect(fs.readFile("/test/vertex.glsl.d.ts")).toMatchInlineSnapshot(`
		"import { mappings } from "vite-plugin-shader/runtime";
		export const shader = "in vec4 a;void main() {}" as const;
		export const shaderVariables: {"a":"a"} = mappings;
		"
	`);
	expect(controller.getVirtualModule()).toMatchInlineSnapshot(`
		"export const mappings = {"a":"a"};
		"
	`);
	expect(fs.readFile("/test/fragment.glsl.d.ts")).toBe(null);
	await controller.update("/test/fragment.glsl");
	expect(onMappingsChange).toBeCalledTimes(2);

	expect(fs.readFile("/test/vertex.glsl.d.ts")).toMatchInlineSnapshot(`
		"import { mappings } from "vite-plugin-shader/runtime";
		export const shader = "in vec4 a;void main() {}" as const;
		export const shaderVariables: {"a":"a","color":"color"} = mappings;
		"
	`);
	expect(fs.readFile("/test/fragment.glsl.d.ts")).toMatchInlineSnapshot(`
		"import { mappings } from "vite-plugin-shader/runtime";
		export const shader = "out vec4 color;void main() {}" as const;
		export const shaderVariables: {"a":"a","color":"color"} = mappings;
		"
	`);

	expect(controller.getVirtualModule()).toMatchInlineSnapshot(`
		"export const mappings = {"a":"a","color":"color"};
		"
	`);
});
