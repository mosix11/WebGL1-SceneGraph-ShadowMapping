attribute vec4 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 uv;

uniform mat4 MVP; // Moder View Projection matrix

varying vec2 vUV;

void main() {
  gl_Position = MVP * position;
  vUV = uv;
}