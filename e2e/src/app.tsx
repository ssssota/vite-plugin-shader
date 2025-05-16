import {
	createShaderWithSource as createFragShader,
	getAttribLocation,
} from "./sample.frag";
import { createShaderWithSource as createVertShader } from "./sample.vert";
export function App() {
	return (
		<>
			<h1>vite-plugin-shader</h1>
			<canvas
				width="512"
				height="512"
				ref={(c) => {
					if (!c) return console.log("no canvas");
					const gl = c.getContext("webgl2");
					if (!gl) return console.log("no webgl2");

					const vertShader = createVertShader(gl, gl.VERTEX_SHADER);
					if (!vertShader) return console.log("no vertShader");
					gl.compileShader(vertShader);
					const fragShader = createFragShader(gl, gl.FRAGMENT_SHADER);
					if (!fragShader) return console.log("no fragShader");
					gl.compileShader(fragShader);

					const program = gl.createProgram();
					if (!program) return console.log("no program");
					gl.attachShader(program, vertShader);
					gl.attachShader(program, fragShader);
					gl.linkProgram(program);

					const positionLocation = getAttribLocation(gl, program, "a_position");
					const positionBuffer = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

					const positions = [0, 0, 0, 0.5, 0.7, 0];
					gl.bufferData(
						gl.ARRAY_BUFFER,
						new Float32Array(positions),
						gl.STATIC_DRAW,
					);

					const vao = gl.createVertexArray();
					gl.bindVertexArray(vao);
					gl.enableVertexAttribArray(positionLocation);

					gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
					gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);

					gl.useProgram(program);

					gl.bindVertexArray(vao);

					gl.drawArrays(gl.TRIANGLES, 0, 3);
				}}
			/>
		</>
	);
}
