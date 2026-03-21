// Particle fragment — glowing point sprite
// Constellation mode: bright white/cyan core with teal halo

varying vec3  vColor;
varying float vAlpha;
varying float vMode;

void main() {
  vec2 uv   = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  // Sharp bright core for constellation, softer for background
  float coreSharpness = mix(1.4, 2.2, vMode);
  float alpha = pow(1.0 - smoothstep(0.0, 0.5, dist), coreSharpness);

  // Constellation: white/cyan core bleeds into teal
  // Fallback: colored glow
  vec3 core  = mix(vColor, vec3(0.9, 1.0, 1.0), vMode * (1.0 - dist * 2.0));
  vec3 color = core * (1.0 + (1.0 - dist * 2.0) * mix(0.5, 1.2, vMode));

  gl_FragColor = vec4(color, alpha * vAlpha);
}
