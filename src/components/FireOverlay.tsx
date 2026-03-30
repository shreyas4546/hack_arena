"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const VERT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  attribute vec2 a_position;
  void main() {
    vUv = a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform vec2 u_resolution;
  uniform float u_progress;
  uniform float u_time;
  uniform sampler2D u_text;

  float rand(vec2 n) {
    return fract(cos(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }
  float noise(vec2 n) {
    const vec2 d = vec2(0., 1.);
    vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
    return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
  }
  float fbm(vec2 n) {
    float total = 0.0, amplitude = .4;
    for (int i = 0; i < 4; i++) {
      total += noise(n) * amplitude;
      n += n;
      amplitude *= 0.6;
    }
    return total;
  }

  void main() {
    vec2 uv = vUv;
    uv.x *= min(1., u_resolution.x / u_resolution.y);
    uv.y *= min(1., u_resolution.y / u_resolution.x);

    vec2 screenUv = vUv * 0.5 + 0.5;
    screenUv.y = 1.0 - screenUv.y;

    float t = u_progress;
    vec4 textColor = texture2D(u_text, screenUv);
    vec3 color = textColor.rgb;

    float main_noise = 1. - fbm(.75 * uv + 10. - vec2(.3, .9 * t));
    float paper_darkness = smoothstep(main_noise - .1, main_noise, t);
    color *= 1.0 - paper_darkness;

    vec3 fire_color = fbm(6. * uv - vec2(0., .005 * u_time)) * vec3(6., 1.4, .0);
    float show_fire = smoothstep(.4, .9, fbm(10. * uv + 2. - vec2(0., .005 * u_time)));
    show_fire += smoothstep(.7, .8, fbm(.5 * uv + 5. - vec2(0., .001 * u_time)));

    float fire_border = .02 * show_fire;
    float fire_edge = smoothstep(main_noise - fire_border, main_noise - .5 * fire_border, t);
    fire_edge *= (1. - smoothstep(main_noise - .5 * fire_border, main_noise, t));
    color += fire_color * fire_edge;

    float opacity = 1. - smoothstep(main_noise - .0005, main_noise, t);
    gl_FragColor = vec4(color, opacity);
  }
`;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createShader(gl: WebGLRenderingContext, source: string, type: number) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function FireOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setTimeout(() => setVisible(false), 2000);
      return;
    }
    const glCtx = gl as WebGLRenderingContext;

    const vs = createShader(glCtx, VERT_SHADER, glCtx.VERTEX_SHADER);
    const fs = createShader(glCtx, FRAG_SHADER, glCtx.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = glCtx.createProgram()!;
    glCtx.attachShader(program, vs);
    glCtx.attachShader(program, fs);
    glCtx.linkProgram(program);
    if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
      console.error(glCtx.getProgramInfoLog(program));
      return;
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = glCtx.getProgramParameter(program, glCtx.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = glCtx.getActiveUniform(program, i)!.name;
      uniforms[name] = glCtx.getUniformLocation(program, name);
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buf);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, vertices, glCtx.STATIC_DRAW);
    glCtx.useProgram(program);
    const posLoc = glCtx.getAttribLocation(program, "a_position");
    glCtx.enableVertexAttribArray(posLoc);
    glCtx.vertexAttribPointer(posLoc, 2, glCtx.FLOAT, false, 0, 0);

    glCtx.enable(glCtx.BLEND);
    glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);

    // Create texture canvas immediately with black background (zero delay)
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 2048;
    textCanvas.height = 1024;
    const ctx = textCanvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 2048, 1024);

    // Create and upload initial black texture right away
    const tex = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, glCtx.RGBA, glCtx.UNSIGNED_BYTE, textCanvas);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);

    // Load logo async and hot-swap into existing texture
    const logoImg = new Image();
    logoImg.src = "/hackarena-logo.png";
    logoImg.onload = () => {
      const logoSize = 850;
      const aspect = logoImg.width / logoImg.height;
      const drawW = aspect >= 1 ? logoSize : logoSize * aspect;
      const drawH = aspect >= 1 ? logoSize / aspect : logoSize;
      const x = (2048 - drawW) / 2;
      const y = (1024 - drawH) / 2;
      ctx.drawImage(logoImg, x, y, drawW, drawH);
      // Re-upload texture with logo drawn
      glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
      glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, glCtx.RGBA, glCtx.UNSIGNED_BYTE, textCanvas);
    };

    // Resize handler
    // OPTIMIZATION: Drastically scale down the render resolution.
    // The FBM shader is extremely heavy. Running it at 2x native res causes massive GPU lag.
    // 0.75 ratio gives a great fire aesthetic while keeping FPS high.
    const renderingScale = 0.75;
    function resize() {
      canvas!.width = Math.floor(window.innerWidth * renderingScale);
      canvas!.height = Math.floor(window.innerHeight * renderingScale);
      
      // Force CSS scaling so it still covers the full screen
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      
      glCtx.viewport(0, 0, canvas!.width, canvas!.height);
      glCtx.uniform2f(uniforms.u_resolution, canvas!.width, canvas!.height);
    }
    window.addEventListener("resize", resize);
    resize();

    // Animation — 3.5 seconds total
    const startTime = performance.now();
    let rafId: number;

    let firstFrameRendered = false;

    function render() {
      // Remove HTML pre-cover cleanly on the very first frame of WebGL
      if (!firstFrameRendered) {
        const precover = document.getElementById("fire-precover");
        if (precover) {
          precover.style.transition = "opacity 0.2s ease-out";
          precover.style.opacity = "0";
          setTimeout(() => precover.remove(), 250);
        }
        firstFrameRendered = true;
      }

      const elapsed = (performance.now() - startTime) / 3500;

      if (elapsed <= 1) {
        const progress = 0.3 + 0.7 * easeInOut(elapsed);
        glCtx.uniform1f(uniforms.u_time, performance.now());
        glCtx.uniform1f(uniforms.u_progress, progress);
        glCtx.activeTexture(glCtx.TEXTURE0);
        glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
        glCtx.uniform1i(uniforms.u_text, 0);
        glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);
        rafId = requestAnimationFrame(render);
      } else {
        setVisible(false);
      }
    }

    render();

    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = "unset";
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="fire-overlay-container"
          key="fire-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
