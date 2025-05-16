import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { shader } from "vite-plugin-shader";

// https://vite.dev/config/
export default defineConfig({
	plugins: [preact(), shader()],
});
