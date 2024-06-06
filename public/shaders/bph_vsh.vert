attribute vec4 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 uv;

uniform mat4 M; // Model matrix
uniform mat4 MV; // Model-view matrix
uniform mat4 MVP; // Moder View Projection matrix
uniform mat4 N; // Normal matrix (the inverse transpose of the MV matrix)

uniform vec3 lightPos;
uniform vec3 cameraPos;

varying vec3 vNormal;      // Normal vector from vertex shader
varying vec2 vUV;          // Texture coordinates from vertex shader
varying vec3 vTangent;

varying vec3 vViewDir;     // View direction from vertex shader
varying vec3 vLightDir; // Vector going from surface to light position

void main() {
  // Multiply the position by the matrix.
  vec4 surfaceWorldPosition = M * position;
  gl_Position = MVP * position;
  vUV = uv;
  vNormal = normalize( N * vec4(normal, 1)).xyz;
  vTangent = normalize( N * vec4(tangent, 1)).xyz;

  // vViewDir = - normalize(MV * position).xyz; 
  vViewDir = cameraPos - surfaceWorldPosition.xyz;
  vLightDir = lightPos - surfaceWorldPosition.xyz;
}