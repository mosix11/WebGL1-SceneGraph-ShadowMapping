
precision mediump float;

uniform vec3 Ka; // Ambient reflectivity
uniform vec3 Kd; // Diffuse reflectivity
uniform vec3 Ks; // Specular reflectivity
uniform vec3 Ke;  // Emissive reflectivity
uniform float Ns; // Specular exponent
uniform float Ni; // Optical Density
uniform float d; // Transparency

uniform sampler2D map_Ka; // Ambient texture map
uniform sampler2D map_Kd; // Diffuse texture map
uniform sampler2D map_Ks; // Specular texture map
uniform sampler2D map_d; // Alpha texture map
uniform sampler2D map_bump; // Bump map
uniform sampler2D map_Ke; // Emissive Map
uniform sampler2D map_Ns; // Shininess Map
uniform sampler2D disp; // Displacement Map
uniform sampler2D map_ao; // Ambient Occlusion Map
uniform sampler2D map_metalness; // Metalness Map
uniform sampler2D map_normal; // Normal Map
uniform sampler2D map_roughness; // Roughness Map

uniform vec3 lightDir;    // Light direction
const vec3 lightIntensity = vec3(1.0, 1.0, 1.0);
const float ambientLight = 0.1;
const float PI = 3.14159265359;
const float EPSILON = 0.0001;

varying vec2 vUV;          // Texture coordinates from vertex shader
varying vec3 vNormal;      // Normal vector from vertex shader
varying vec3 vTangent;     // Tangent vector from vertex shader 
varying vec3 vViewDir;     // View direction from vertex shader



vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

float distributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom + EPSILON);
}

float geometrySchlickGGX(float NdotV, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k + EPSILON);
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = geometrySchlickGGX(NdotV, roughness);
    float ggx1 = geometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 BT = normalize(cross(N, T));
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(-lightDir); // TODO maybe negate the light direction

    mat3 tbn = mat3(T, BT, N);
    N = texture2D(map_normal, vUV).rgb * 2.0 - 1.0;
    N = normalize(tbn * N);

    vec3 H = normalize(L + V);

    Debugging output for normal
    gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);
    return;

    vec3 baseColor = texture2D(map_Kd, vUV).rgb;
    float roughness = texture2D(map_roughness, vUV).r;
    float metalness = texture2D(map_metalness, vUV).r;

    vec3 F0 = mix(vec3(0.04), baseColor, metalness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

    float NDF = distributionGGX(N, H, roughness);
    float G = geometrySmith(N, V, L, roughness);

    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + EPSILON;
    vec3 specular = numerator / denominator;

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metalness;
    vec3 diffuse = kD * baseColor / PI;

    vec3 color = (diffuse + specular) * lightIntensity * max(dot(N, L), 0.0);

    gl_FragColor = vec4(color, 1.0);
}