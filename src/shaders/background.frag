// Fractal background — emanating rings + morphing color palettes
// Audio-reactive: bass drives ring pulse, rms drives brightness
// Optimized: 2-octave fBm, fewer palette calls

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uRms;
uniform float uAudioEnergy;  // sustained energy accumulator — keeps phasing alive
varying vec2 vUv;

// ── Noise ────────────────────────────────────────────────────────────
vec3 mod289v(vec3 x) { return x - floor(x*(1./289.))*289.; }
vec2 mod289v(vec2 x) { return x - floor(x*(1./289.))*289.; }
vec3 permute3(vec3 x) { return mod289v(((x*34.)+1.)*x); }

float snoise2(vec2 v) {
  const vec4 C = vec4(0.211324865, 0.366025404, -0.577350269, 0.024390244);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = x0.x > x0.y ? vec2(1.,0.) : vec2(0.,1.);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v(i);
  vec3 p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
  vec3 m = max(.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.);
  m = m*m; m = m*m;
  vec3 x = 2.*fract(p*C.www) - 1.;
  vec3 h = abs(x) - .5;
  vec3 ox = floor(x+.5);
  vec3 a0 = x - ox;
  m *= 1.79284291 - 0.85373472*(a0*a0+h*h);
  vec3 g;
  g.x  = a0.x*x0.x    + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.*dot(m,g);
}

// fBm — 2 octaves
float fbm(vec2 p) {
  float v = 0.;
  v += 0.5 * snoise2(p);
  p  = p * 2.1 + vec2(1.7, 9.2);
  v += 0.25 * snoise2(p);
  return v;
}

// ── Color palette ────────────────────────────────────────────────────
vec3 palette(float t, float phase) {
  float p = fract(phase);
  float idx = floor(mod(phase, 4.0));

  vec3 a, b, c, d;
  vec3 a0 = vec3(.5,.3,.4); vec3 b0 = vec3(.5,.4,.3);
  vec3 c0 = vec3(.8,.6,.5); vec3 d0 = vec3(.60,.40,.20);
  vec3 a1 = vec3(.1,.2,.5); vec3 b1 = vec3(.4,.4,.4);
  vec3 c1 = vec3(1.,.8,.6); vec3 d1 = vec3(.00,.20,.50);
  vec3 a2 = vec3(.1,.4,.5); vec3 b2 = vec3(.3,.4,.3);
  vec3 c2 = vec3(.9,1.,.7); vec3 d2 = vec3(.10,.60,.80);
  vec3 a3 = vec3(.4,.1,.5); vec3 b3 = vec3(.4,.3,.4);
  vec3 c3 = vec3(.7,.5,.9); vec3 d3 = vec3(.80,.10,.40);

  if (idx < 1.0) {
    a = mix(a0, a1, p); b = mix(b0, b1, p);
    c = mix(c0, c1, p); d = mix(d0, d1, p);
  } else if (idx < 2.0) {
    a = mix(a1, a2, p); b = mix(b1, b2, p);
    c = mix(c1, c2, p); d = mix(d1, d2, p);
  } else if (idx < 3.0) {
    a = mix(a2, a3, p); b = mix(b2, b3, p);
    c = mix(c2, c3, p); d = mix(d2, d3, p);
  } else {
    a = mix(a3, a0, p); b = mix(b3, b0, p);
    c = mix(c3, c0, p); d = mix(d3, d0, p);
  }
  return a + b * cos(6.28318 * (c * t + d));
}

// ── Main ─────────────────────────────────────────────────────────────
void main() {
  vec2 uv = vUv;
  vec2 centered = uv - .5;
  float dist = length(centered);

  // Palette phase — starts on Pacific Sunset, slow drift + audio shifts
  float audioPhaseShift = uBass * 0.6 + uRms * 0.3 + uAudioEnergy * 0.4;
  float palPhase = uTime * 0.008 + audioPhaseShift;

  // Pacific sunset gradient — matches the landing page
  vec3 sky0 = vec3(0.012, 0.014, 0.047);  // deep navy (bottom)
  vec3 sky1 = vec3(0.031, 0.047, 0.12);   // dark blue
  vec3 sky2 = vec3(0.047, 0.13, 0.33);    // medium blue
  vec3 sky3 = vec3(0.45, 0.21, 0.28);     // coral pink (horizon)
  vec3 sky4 = vec3(0.57, 0.36, 0.15);     // warm orange
  vec3 sky5 = vec3(0.27, 0.39, 0.51);     // soft blue
  vec3 sky6 = vec3(0.42, 0.48, 0.56);     // pale blue (top)

  float y = uv.y;
  vec3 skyGrad = mix(sky0, sky1, smoothstep(0.0, 0.18, y));
  skyGrad = mix(skyGrad, sky2, smoothstep(0.18, 0.32, y));
  skyGrad = mix(skyGrad, sky3, smoothstep(0.32, 0.50, y));
  skyGrad = mix(skyGrad, sky4, smoothstep(0.50, 0.62, y));
  skyGrad = mix(skyGrad, sky5, smoothstep(0.62, 0.80, y));
  skyGrad = mix(skyGrad, sky6, smoothstep(0.80, 1.0, y));

  // Palette tints the gradient
  float centerGlow = 1.0 - smoothstep(0.0, 0.7, dist);
  float colorT = dist * 0.8 + uTime * 0.04 + uBass * 0.12 - uMid * 0.08;
  vec3 palColor = palette(colorT, palPhase);

  float palStr = centerGlow * 0.15 + 0.02 + uRms * 0.03;
  vec3 baseColor = skyGrad * (1.0 + palColor * palStr);

  // ── Emanating rings ─────────────────────────────────────────────
  float ringSpeed  = 0.9 + uBass * 1.2 + uAudioEnergy * 0.3;
  float ringPhase  = dist * 18.0 - uTime * ringSpeed;
  float rings      = sin(ringPhase) * 0.5 + 0.5;
  rings = pow(rings, 6.0);

  float rings2     = sin(dist * 30.0 - uTime * ringSpeed * 0.7 + uBass * 3.0) * 0.5 + 0.5;
  rings2 = pow(rings2, 10.0);

  float ringT = fract(colorT + 0.3 + uMid * 0.2);
  vec3 ringColor = palette(ringT, palPhase);

  float ringBrightness = 0.6 + uBass * 0.8 + uRms * 0.3;
  baseColor += rings  * ringColor * ringBrightness * 0.7;
  baseColor += rings2 * ringColor * ringBrightness * 0.4;

  // ── Fractal noise overlay ────────────────────────────────────────
  float noiseSpeed = 0.06;
  float n1 = fbm(centered * 2.5 + uTime * noiseSpeed);
  float fractal = n1 * 0.5 + 0.5;

  float fractalT = fractal + uTime * 0.03 + uMid * 0.15;
  vec3 fractalColor = palette(fractalT, palPhase);

  float fractalIntensity = 0.12 + uMid * 0.1 + uAudioEnergy * 0.08;
  baseColor += fractalColor * fractal * fractalIntensity;

  // ── Spiral arms ─────────────────────────────────────────────────
  float angle = atan(centered.y, centered.x);
  float spiral = sin(angle * 3.0 + log(dist * 8.0 + 0.01) * 4.0 - uTime * 0.4) * 0.5 + 0.5;
  spiral *= (1.0 - smoothstep(0.0, 0.55, dist));
  spiral = pow(spiral, 5.0);
  baseColor += spiral * palette(fract(colorT + 0.6), palPhase) * (0.3 + uBass * 0.25);

  // ── Edge vignette ────────────────────────────────────────────────
  float vignette = 1.0 - smoothstep(0.3, 0.8, dist);
  baseColor *= vignette;

  // Global brightness from RMS
  baseColor *= 1.0 + uRms * 0.4;

  gl_FragColor = vec4(baseColor, 1.0);
}
