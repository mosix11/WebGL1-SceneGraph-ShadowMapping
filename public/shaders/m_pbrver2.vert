attribute vec4 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 uv;
// attribute vec4 color;

uniform mat4 M; // Model matrix
uniform mat4 MV; // Model-view matrix
uniform mat4 MVP;
// uniform mat4 V;    // View matrix
// uniform mat4 P; // Projection matrix
uniform mat4 N; // Normal matrix (the inverse transpose of the MV matrix)

uniform vec3 C;

// this one can be used for point lighting
// uniform vec3 lightPos; // Position of the light source in world space

varying vec3 vNormal;      // Normal vector from vertex shader
varying vec3 vViewDir;     // View direction from vertex shader
// varying vec3 vLightDir;   
varying vec2 vUV;          // Texture coordinates from vertex shader
varying vec3 vTangent;
varying mat3 vTBN;
varying vec3 vWorldPos;

void main() {
    vec3 worldPos = (M * position).xyz;

    // Transform normal and tangent to world space
    vNormal = mat3(N) * normal;
    vTangent = mat3(N) * tangent;

    // Construct TBN matrix
    vec3 T = normalize(mat3(M) * tangent);
    vec3 N = normalize(mat3(M) * normal);
    T = normalize(T - dot(T, N) * N);
    vec3 B = cross(N, T);
    vTBN = mat3(T, B, N);

    // Calculate view direction
    vViewDir = normalize(C - worldPos);
    vWorldPos = vWorldPos;
    // Pass through UV coordinates
    vUV = uv;

    // Set the final position
    gl_Position = MVP * position;
}

