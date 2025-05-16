import { render } from "preact";
import { App } from "./app.tsx";

const parent = document.getElementById("app");
if (parent) render(<App />, parent);
