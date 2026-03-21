// Fractal background — emanating rings + morphing color palettes
// Audio-reactive: bass drives ring pulse, rms drives brightness

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uRms;
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

// fBm — 4 octaves
float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise2(p);
    p  = p * 2.1 + vec2(1.7, 9.2);
    a *= .5;
  }
  return v;
}

// ── Color palettes ────────────────────────────────────────────────────
// Each palette: cosine formula — a + b*cos(TAU*(c*t+d))
vec3 palette(float t, int idx) {
  vec3 a, b, c, d;
  if (idx == 0) {
    // Pacific Sunset — deep blue → pink → gold
    a = vec3(.5,.3,.4); b = vec3(.5,.4,.3);
    c = vec3(.8,.6,.5); d = vec3(.60,.40,.20);
  } else if (idx == 1) {
    // Deep Space — indigo → cyan → electric
    a = vec3(.1,.2,.5); b = vec3(.4,.4,.4);
    c = vec3(1.,.8,.6); d = vec3(.00,.20,.50);
  } else if (idx == 2) {
    // Bioluminescent — dark teal → bright aqua → violet
    a = vec3(.1,.4,.5); b = vec3(.3,.4,.3);
    c = vec3(.9,1.,.7); d = vec3(.10,.60,.80);
  } else {
    // Amethyst — deep purple → rose → lavender
    a = vec3(.4,.1,.5); b = vec3(.4,.3,.4);
    c = vec3(.7,.5,.9); d = vec3(.80,.10,.40);
  }
  return a + b * cos(6.28318 * (c * t + d));
}

// ── Main ─────────────────────────────────────────────────────────────
void main() {
  vec2 uv = vUv;
  vec2 centered = uv - .5;
  float dist = length(centered);

  // Slow palette phase — cycles through all 4 palettes over ~60s
  float palPhase = uTime * 0.016;
  float palIdx   = mod(palPhase, 4.0);
  int   pal0     = int(palIdx);
  int   pal1     = int(mod(palIdx + 1.0, 4.0));
  float palBlend = smoothstep(0.0, 1.0, fract(palIdx));

  // Base gradient: darker at edges, slightly warmer at center
  float centerGlow = 1.0 - smoothstep(0.0, 0.7, dist);
  float colorT = dist * 0.8 + uTime * 0.04;

  vec3 col0 = palette(colorT, pal0);
  vec3 col1 = palette(colorT, pal1);
  vec3 baseColor = mix(col0, col1, palBlend);

  // Dark the base significantly — let rings be the light
  baseColor *= centerGlow * 0.25 + 0.03;

  // ── Emanating rings ─────────────────────────────────────────────
  // Rings expand outward from center, pulsed by bass
  float ringSpeed  = 0.9 + uBass * 1.2;
  float ringPhase  = dist * 18.0 - uTime * ringSpeed;
  float rings      = sin(ringPhase) * 0.5 + 0.5;
  rings = pow(rings, 6.0);  // sharp bright rings, dark valleys

  // Second ring set — different frequency for interference pattern
  float rings2     = sin(dist * 30.0 - uTime * ringSpeed * 0.7 + uBass * 3.0) * 0.5 + 0.5;
  rings2 = pow(rings2, 10.0);

  // Ring color — from palette, shifted
  float ringT = fract(colorT + 0.3 + uMid * 0.2);
  vec3 ring0 = palette(ringT, pal0);
  vec3 ring1 = palette(ringT, pal1);
  vec3 ringColor = mix(ring0, ring1, palBlend);

  float ringBrightness = 0.6 + uBass * 0.8 + uRms * 0.3;
  baseColor += rings  * ringColor * ringBrightness * 0.7;
  baseColor += rings2 * ringColor * ringBrightness * 0.4;

  // ── Fractal noise overlay ────────────────────────────────────────
  // Slow-moving fBm — like aurora or ink in water
  float noiseSpeed = 0.06;
  float n1 = fbm(centered * 2.5 + uTime * noiseSpeed);
  float n2 = fbm(centered * 4.0 - uTime * noiseSpeed * 0.7 + n1 * 0.5);
  float fractal = n2 * 0.5 + 0.5;

  // Map fractal to color
  float fractalT = fractal + uTime * 0.03 + uMid * 0.15;
  vec3 fc0 = palette(fractalT, pal0);
  vec3 fc1 = palette(fractalT, pal1);
  vec3 fractalColor = mix(fc0, fc1, palBlend);

  float fractalIntensity = 0.12 + uMid * 0.1;
  baseColor += fractalColor * fractal * fractalIntensity;

  // ── Spiral arms ─────────────────────────────────────────────────
  // Logarithmic spiral that rotates with time
  float angle = atan(centered.y, centered.x);
  float spiral = sin(angle * 3.0 + log(dist * 8.0 + 0.01) * 4.0 - uTime * 0.4) * 0.5 + 0.5;
  spiral *= (1.0 - smoothstep(0.0, 0.55, dist));  // fade at edges
  spiral = pow(spiral, 5.0);
  float spiralT = fract(colorT + 0.6);
  vec3 sc0 = palette(spiralT, pal0);
  vec3 sc1 = palette(spiralT, pal1);
  baseColor += spiral * mix(sc0, sc1, palBlend) * (0.3 + uBass * 0.25);

  // ── Edge vignette ────────────────────────────────────────────────
  float vignette = 1.0 - smoothstep(0.3, 0.8, dist);
  baseColor *= vignette;

  // Subtle global brightness from RMS
  baseColor *= 1.0 + uRms * 0.4;

  gl_FragColor = vec4(baseColor, 1.0);
}
