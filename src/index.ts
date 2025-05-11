import { unknown } from "vite-plugin-unknown";
import { transform } from "./transform.js";
import type { PluginOption } from "vite";

type Options = {
  extension?: `.${string}`[];
}

export const shader = (options: Options = {}): PluginOption[] =>
  unknown({
    name: "vite-plugin-shader",
    extension: options.extension ?? [".vert", ".frag", ".glsl"],
    transform,
  });
