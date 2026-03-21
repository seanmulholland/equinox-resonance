// Particle vertex shader — Simplex noise wind displacement
// uConstellationMode: 0.0 = fallback sacred geometry, 1.0 = face constellation

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uRms;
uniform float uSize;
uniform float uConstellationMode; // 0 or 1

attribute float aScale;

varying vec3  vColor;
varying float vAlpha;
varying float vMode;

// ── Simplex noise 3D ──────────────────────────────────────────────────
vec3 mod289(vec3 x) { return x - floor(x*(1./289.))*289.; }
vec4 mod289(vec4 x) { return x - floor(x*(1./289.))*289.; }
vec4 permute(vec4 x) { return mod289(((x*34.)+1.)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291 - 0.85373472*r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1./6., 1./3.);
  const vec4 D = vec4(0., .5, 1., 2.);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.,i1.z,i2.z,1.))
    + i.y + vec4(0.,i1.y,i2.y,1.))
    + i.x + vec4(0.,i1.x,i2.x,1.));
  float n_ = .142857142857;
  vec3 ns = n_*D.wyz - D.xzx;
  vec4 j  = p - 49.*floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.*x_);
  vec4 x  = x_*ns.x + ns.yyyy;
  vec4 y  = y_*ns.x + ns.yyyy;
  vec4 h  = 1. - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.+1.;
  vec4 s1 = floor(b1)*2.+1.;
  vec4 sh = -step(h, vec4(0.));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m = m*m;
  return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

// ── Palettes ─────────────────────────────────────────────────────────
// Retro warm palette — mustard, orange, olive, warm red
vec3 sunsetPalette(float t) {
  vec3 a = vec3(.72,.55,.32);
  vec3 b = vec3(.28,.22,.18);
  vec3 c = vec3(.85,.55,.35);
  vec3 d = vec3(.10,.25,.15);
  return a + b*cos(6.28318*(c*t+d));
}

// Constellation palette — warm gold/cream for face dots
vec3 constellationPalette(float t) {
  vec3 a = vec3(.85,.70,.40);
  vec3 b = vec3(.15,.20,.25);
  vec3 c = vec3(.9,.7,.5);
  vec3 d = vec3(.05,.10,.20);
  return a + b*cos(6.28318*(c*t+d));
}

void main() {
  // Wind displacement — skip expensive noise for constellation (face stays still)
  float windMult = mix(1.0, 0.08, uConstellationMode);
  vec3 displaced = position;
  if (windMult > 0.1) {
    float slowTime = uTime * 0.18;
    float noiseScale = 0.6 + uBass * 0.4;
    // Single noise sample, derive xyz from swizzle — 3x cheaper
    float n = snoise(vec3(position.xy * noiseScale, slowTime));
    float windStr = (0.25 + uRms * 0.8) * windMult;
    displaced += vec3(n, n * 0.7, -n * 0.5) * windStr;
  }

  // Color — blend between palettes based on mode
  float baseT = fract(uTime * 0.04 + length(position) * 0.06 + uMid * 0.2);
  vec3 sunsetCol = sunsetPalette(baseT);
  vec3 constCol  = constellationPalette(baseT);
  vColor = mix(sunsetCol * 0.4, constCol, uConstellationMode);

  vAlpha = mix(0.2 + uRms * 0.15, 0.85 + uRms * 0.15, uConstellationMode);
  vMode  = uConstellationMode;

  vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Constellation particles: big, bloomy dots for glowing face look
  float bassSwell = mix(1.0 + uBass * 1.2, 1.0 + uBass * 0.5, uConstellationMode);
  float dist = max(-mvPos.z, 0.1);
  float sizeScale = mix(220.0, 500.0, uConstellationMode);
  gl_PointSize = uSize * aScale * bassSwell * (sizeScale / dist);
  gl_PointSize = clamp(gl_PointSize, 1.0, mix(18.0, 40.0, uConstellationMode));
}
