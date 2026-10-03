// Plain browser JavaScript; no Vue or build step required.
(() => {
  const element = document.getElementById('dither');
  const palette = document.getElementById('palette');
  const playback = document.getElementById('playback');
  const status = document.getElementById('status');
  const fail = (message) => {
    status.textContent = message;
    status.hidden = false;
    palette.disabled = true;
    playback.disabled = true;
  };
  const gl = element.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) {
    fail('WebGL is unavailable. Enable hardware acceleration or try another browser.');
    return;
  }

  const presets = {
    network: { base: [0.03, 0.15, 0.24], glow: [0.53, 0.99, 0.38] },
    directory: { base: [0.12, 0.08, 0.32], glow: [0.47, 0.78, 1] },
    control: { base: [0.29, 0.08, 0.12], glow: [1, 0.67, 0.32] },
  }

  const vertexSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

  const fragmentSource = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pixel_ratio;
uniform vec3 u_base;
uniform vec3 u_glow;

float bayer4(vec2 position) {
  vec2 cell = mod(floor(position), 4.0);
  float row0 = cell.x < 1.0 ? 0.0 : cell.x < 2.0 ? 8.0 : cell.x < 3.0 ? 2.0 : 10.0;
  float row1 = cell.x < 1.0 ? 12.0 : cell.x < 2.0 ? 4.0 : cell.x < 3.0 ? 14.0 : 6.0;
  float row2 = cell.x < 1.0 ? 3.0 : cell.x < 2.0 ? 11.0 : cell.x < 3.0 ? 1.0 : 9.0;
  float row3 = cell.x < 1.0 ? 15.0 : cell.x < 2.0 ? 7.0 : cell.x < 3.0 ? 13.0 : 5.0;
  return (cell.y < 1.0 ? row0 : cell.y < 2.0 ? row1 : cell.y < 3.0 ? row2 : row3) / 16.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 drift = vec2(u_time * 0.28, -u_time * 0.17);
  float broad = sin(p.x * 3.4 + sin(p.y * 4.1 + drift.y) * 1.2 + drift.x);
  float clouds = broad * cos(p.y * 6.2 - sin(p.x * 2.7 - drift.x) + drift.y);
  float detail = sin(p.x * 8.3 - p.y * 5.1 + drift.x) *
    cos(p.y * 7.7 + p.x * 2.4 - drift.y);
  float light = clamp(0.33 + (1.0 - uv.y) * 0.18 + clouds * 0.3 + detail * 0.11, 0.0, 1.0);

  vec2 pixel = floor(gl_FragCoord.xy / (4.0 * u_pixel_ratio));
  float threshold = bayer4(pixel);
  float dither = step(threshold, light);
  vec3 color = mix(u_base * 0.35, mix(u_base, u_glow, light), dither);
  gl_FragColor = vec4(color, 1.0);
}`

  const compile = (type, source) => {
    const shader = gl.createShader(type)
    if (!shader) {
      fail('WebGL could not allocate a shader. Try reloading the preview.')
      return null
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader
    }
    console.error('Dither shader:', gl.getShaderInfoLog(shader))
    fail('The shader could not compile. Try another browser or check the console for details.')
    gl.deleteShader(shader)
    return null
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!(vertex && fragment)) {
    if (vertex) {
      gl.deleteShader(vertex)
    }
    if (fragment) {
      gl.deleteShader(fragment)
    }
    return
  }

  const program = gl.createProgram()
  if (!program) {
    fail('WebGL could not allocate a program. Try reloading the preview.')
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Dither program:', gl.getProgramInfoLog(program))
    fail('The shader could not start. Try reloading the preview.')
    gl.deleteProgram(program)
    return
  }

  const buffer = gl.createBuffer()
  if (!buffer) {
    fail('WebGL could not allocate a buffer. Try reloading the preview.')
    gl.deleteProgram(program)
    return
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
    gl.STATIC_DRAW,
  )
  gl.useProgram(program)
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const resolution = gl.getUniformLocation(program, 'u_resolution')
  const time = gl.getUniformLocation(program, 'u_time')
  const ratio = gl.getUniformLocation(program, 'u_pixel_ratio')
  const base = gl.getUniformLocation(program, 'u_base')
  const glow = gl.getUniformLocation(program, 'u_glow')
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let paused = motion.matches
  let disposed = false
  let frame = 0
  let running = false
  let visible = true
  let elapsed = 0
  let started = 0
  const initial = presets[palette.value]
  const currentBase = new Float32Array(initial.base)
  const currentGlow = new Float32Array(initial.glow)
  let startBase = [...initial.base]
  let startGlow = [...initial.glow]
  let targetBase = initial.base
  let targetGlow = initial.glow
  let transitionStarted = 0
  const transitionDuration = 600

  const blendPalette = (now) => {
    const progress = Math.min(
      1,
      Math.max(0, (now - transitionStarted) / transitionDuration),
    )
    const eased = progress * progress * (3 - 2 * progress)
    for (let index = 0; index < 3; index += 1) {
      currentBase[index] =
        startBase[index] + (targetBase[index] - startBase[index]) * eased
      currentGlow[index] =
        startGlow[index] + (targetGlow[index] - startGlow[index]) * eased
    }
  }

  const render = (now) => {
    blendPalette(now)
    gl.uniform3fv(base, currentBase)
    gl.uniform3fv(glow, currentGlow)
    let seconds = elapsed
    if (running) {
      seconds += (now - started) / 1000
    }
    gl.uniform1f(time, seconds * 0.18)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const paint = (now) => {
    if (!running) {
      return
    }
    render(now)
    frame = requestAnimationFrame(paint)
  }

  const syncSize = () => {
    const bounds = element.getBoundingClientRect()
    const pixelRatio = Math.min(
      devicePixelRatio || 1,
      2,
      Math.sqrt(1_000_000 / Math.max(1, bounds.width * bounds.height)),
    )
    const width = Math.round(bounds.width * pixelRatio)
    const height = Math.round(bounds.height * pixelRatio)
    if (!(width && height)) {
      return
    }
    if (element.width !== width || element.height !== height) {
      element.width = width
      element.height = height
      gl.viewport(0, 0, width, height)
    }
    gl.uniform2f(resolution, width, height)
    gl.uniform1f(ratio, pixelRatio)
    render(performance.now())
  }

  const updatePlayback = () => {
    const shouldRun = visible && !document.hidden && !paused && !disposed
    if (shouldRun === running) {
      return
    }
    const now = performance.now()
    if (running) {
      elapsed += (now - started) / 1000
    }
    running = shouldRun
    if (running) {
      started = now
      frame = requestAnimationFrame(paint)
    } else {
      cancelAnimationFrame(frame)
      transitionStarted = now - transitionDuration
      render(now)
    }
  }

  const sizeObserver = new ResizeObserver(syncSize)
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    updatePlayback()
  })
  sizeObserver.observe(element)
  visibilityObserver.observe(element)
  document.addEventListener('visibilitychange', updatePlayback)
  const changePalette = () => {
    const variant = palette.value
      const now = performance.now()
      blendPalette(now)
      startBase = [...currentBase]
      startGlow = [...currentGlow]
      targetBase = presets[variant].base
      targetGlow = presets[variant].glow
      transitionStarted = now
      if (!running) {
        transitionStarted = now - transitionDuration
        render(now)
      }
  }
  const changeMotion = () => {
    paused = motion.matches
    playback.textContent = paused ? 'Play' : 'Pause'
    updatePlayback()
  }
  const togglePlayback = () => {
    paused = !paused
    playback.textContent = paused ? 'Play' : 'Pause'
    updatePlayback()
  }
  palette.addEventListener('change', changePalette)
  playback.addEventListener('click', togglePlayback)
  playback.textContent = paused ? 'Play' : 'Pause'
  motion.addEventListener('change', changeMotion)
  syncSize()
  updatePlayback()

  const stop = () => {
    if (disposed) return
    disposed = true
    running = false
    cancelAnimationFrame(frame)
    palette.removeEventListener('change', changePalette)
    playback.removeEventListener('click', togglePlayback)
    sizeObserver.disconnect()
    visibilityObserver.disconnect()
    motion.removeEventListener('change', changeMotion)
    document.removeEventListener('visibilitychange', updatePlayback)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
  element.addEventListener('webglcontextlost', () => {
    stop()
    fail('The WebGL context was lost. Reload the preview to restart it.')
  }, { once: true })
  window.addEventListener('pagehide', stop, { once: true })
  window.addEventListener('pageshow', event => {
    if (event.persisted) window.location.reload()
  })
})();
