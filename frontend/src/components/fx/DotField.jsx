// frontend/src/components/fx/DotField.jsx
//
// A living dot-matrix field drawn by one fragment shader: a grid of dots
// whose size and brightness follow slow travelling waves, with a ripple that
// follows the pointer. Raw WebGL (no library, ~2 KB).
//
// Performance rules:
//   - renders only while on screen (IntersectionObserver) and the tab is
//     visible; zero cost once scrolled past
//   - device pixel ratio capped at 1.5
//   - prefers-reduced-motion: draws a single still frame
//   - each mount creates its own <canvas>: React StrictMode (and any
//     remount) runs cleanup -> effect again, and a canvas whose context was
//     released with loseContext() hands back that same dead context forever
//     (Chrome then paints its grey "sad canvas" placeholder)
//   - if WebGL is unavailable or the context is lost, a static CSS dot grid
//     shows instead

import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uCell;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uIntensity;

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 cellId = floor(frag / uCell);
  vec2 local = fract(frag / uCell) - 0.5;
  vec2 uv = (cellId * uCell + 0.5 * uCell) / uRes;     // 0..1, y up
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 3.2;
  float t = uTime * 0.22;

  // Two interfering travelling waves -> soft terrain.
  float w = sin(p.x * 1.25 + t * 2.1 + sin(p.y * 1.6 - t * 1.1) * 1.4) * 0.5
          + sin(p.y * 2.05 - t * 1.4 + sin(p.x * 0.85 + t * 0.8) * 1.2) * 0.5;
  w = w * 0.5 + 0.5;

  // Mass settles toward the bottom of the frame, like a horizon.
  float horizon = smoothstep(1.02, 0.18, uv.y);
  float v = w * horizon;

  // Pointer ripple.
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float d = distance(vec2(uv.x * aspect, uv.y), m);
  v += 0.45 * exp(-d * 5.5) * (0.55 + 0.45 * sin(d * 38.0 - uTime * 3.2));

  v = clamp(v * uIntensity, 0.0, 1.0);
  float radius = mix(0.04, 0.40, v);
  float dotMask = smoothstep(radius, radius - 0.09, length(local));
  vec3 col = mix(uColA, uColB, v);
  float a = dotMask * (0.10 + 0.9 * v) * smoothstep(0.0, 0.12, uv.y);
  gl_FragColor = vec4(col * a, a);
}
`;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function DotField({ className, cell = 10, colorA = "#4f46e5", colorB = "#c7d2fe", intensity = 1 }) {
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 block h-full w-full";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) {
      canvas.remove();
      setFailed(true);
      return undefined;
    }
    const onLost = (e) => {
      e.preventDefault();
      canvas.style.display = "none";
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.remove(); setFailed(true); return undefined; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); setFailed(true); return undefined; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uMouse = u("uMouse");
    const uCell = u("uCell");
    gl.uniform3fv(u("uColA"), hexToRgb(colorA));
    gl.uniform3fv(u("uColB"), hexToRgb(colorB));
    gl.uniform1f(u("uIntensity"), intensity);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uCell, cell * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer, eased toward its target each frame (default: off-canvas).
    const mouse = { x: 0.5, y: -1, tx: 0.5, ty: -1 };
    const parent = host.parentElement;
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    const onLeave = () => { mouse.ty = -1; };
    parent?.addEventListener("pointermove", onMove);
    parent?.addEventListener("pointerleave", onLeave);

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    let visible = false;
    const draw = (now) => {
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now) => {
      draw(now);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const kick = () => {
      if (reduced) { draw(performance.now() + 4000); return; }
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", kick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", kick);
      parent?.removeEventListener("pointermove", onMove);
      parent?.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [cell, colorA, colorB, intensity]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn("pointer-events-none relative h-full w-full", className)}
      style={failed ? {
        backgroundImage: `radial-gradient(circle, ${colorA}66 1px, transparent 1.6px)`,
        backgroundSize: `${cell}px ${cell}px`,
        maskImage: "linear-gradient(to top, black, transparent 85%)",
        WebkitMaskImage: "linear-gradient(to top, black, transparent 85%)",
      } : undefined}
    />
  );
}
