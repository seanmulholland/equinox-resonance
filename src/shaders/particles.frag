// Particle fragment — glowing point sprite
// Constellation mode: bright white/cyan core with teal halo

uniform float uAlpha;

varying vec3  vColor;
varying float vAlpha;
varying float vMode;

void main() {
  vec2 uv   = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  // Constellation: soft bloomy falloff for big glowing dots
  // Fallback: sharper, subtler
  float coreSharpness = mix(1.4, 1.0, vMode);
  float alpha = pow(1.0 - smoothstep(0.0, 0.5, dist), coreSharpness);

  // Constellation: warm gold/cream core
  vec3 core  = mix(vColor, vec3(0.95, 0.88, 0.65), vMode * smoothstep(0.3, 0.0, dist));
  float bloom = exp(-dist * 8.0) * vMode;
  vec3 color = core * (1.0 + bloom * 0.6 + (1.0 - dist * 2.0) * mix(0.3, 0.4, vMode));

  gl_FragColor = vec4(color, alpha * vAlpha * uAlpha);
}
