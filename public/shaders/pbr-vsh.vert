attribute vec4 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 uv;

uniform mat4 M; // Model matrix
uniform mat4 MV; // Model-view matrix
uniform mat4 MVP;
uniform mat4 N; // Normal matrix (the inverse transpose of the MV matrix)

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec3 vViewPosition;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vNormal = mat3(N) * normal;
    vTangent = mat3(N) * tangent;
    vBitangent = cross(vNormal, vTangent);
    vViewPosition = -vec3(MV * position);
    vPosition = vec3(M * position);

    gl_Position = MVP * position;
}
