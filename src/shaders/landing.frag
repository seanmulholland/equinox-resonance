// Pacific Sunset gradient — the landing backdrop
// Deep Pacific blue (bottom) → azul → soft pink → golden orange (top horizon) → haze above

uniform float uTime;
varying vec2 vUv;

void main() {
  float y = vUv.y;

  // Color stops (bottom → top)
  vec3 deepBlue   = vec3(0.02, 0.05, 0.20);   // deep ocean
  vec3 azul       = vec3(0.08, 0.22, 0.55);   // bay water
  vec3 softPink   = vec3(0.75, 0.35, 0.45);   // horizon blush
  vec3 gold       = vec3(0.95, 0.65, 0.15);   // golden sun
  vec3 hazyBlue   = vec3(0.45, 0.60, 0.85);   // sky above

  vec3 col;
  if (y < 0.25) {
    col = mix(deepBlue, azul, y / 0.25);
  } else if (y < 0.50) {
    col = mix(azul, softPink, (y - 0.25) / 0.25);
  } else if (y < 0.65) {
    col = mix(softPink, gold, (y - 0.50) / 0.15);
  } else {
    col = mix(gold, hazyBlue, (y - 0.65) / 0.35);
  }

  // Subtle breathing shimmer
  float shimmer = sin(uTime * 0.3 + vUv.x * 4.0) * 0.015;
  col += shimmer;

  gl_FragColor = vec4(col, 1.0);
}
