precision mediump float;

uniform vec3 Ka; // Ambient reflectivity
uniform vec3 Kd; // Diffuse reflectivity
uniform vec3 Ks; // Specular reflectivity
uniform vec3 Ke; // Emissive reflectivity
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

varying vec2 vUV;          // Texture coordinates from vertex shader
varying vec3 vNormal;      // Normal vector from vertex shader
varying vec3 vTangent;     // Tangent vector from vertex shader 
varying vec3 vViewDir;     // View direction from vertex shader
varying mat3 vTBN;
varying vec3 vWorldPos;

uniform vec3 lightDir;    // Light direction
const vec3 lightIntensity = vec3(1.0, 1.0, 1.0);
const float ambientLight = 0.1;
const float PI = 3.14159265359;
const float EPSILON = 0.0001;

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return nom / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

float D_GGX(float NoH, float linearRoughness) {
    float a = NoH * linearRoughness;
    float k = linearRoughness / (1.0 - NoH * NoH + a * a);
    return k * k * (1.0 / PI);
}

float V_SmithGGXCorrelated(float NoV, float NoL, float linearRoughness) {
    float a2 = linearRoughness * linearRoughness;
    float GGXV = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
    float GGXL = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
    return 0.5 / (GGXV + GGXL);
}

vec3 F_Schlick(float VoH, vec3 f0) {
    float f = pow(1.0 - VoH, 5.0);
    return f + f0 * (1.0 - f);
}

vec3 PositionalLight(vec3 worldPos, vec3 N, vec3 V, vec3 lightPos, vec3 lightColor, vec3 albedo, float metallic, float roughness, float scalarF0) {
    float distance = length(lightPos - worldPos);
    float attenuation = 1.0 / (distance * distance);
    vec3 L = normalize(lightPos - worldPos);
    vec3 H = normalize(V + L);
    vec3 radiance = lightColor * attenuation;
    vec3 F0 = vec3(scalarF0);
    F0 = mix(F0, albedo, metallic);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
    float NDF = DistributionGGX(N, H, roughness);
    float G = GeometrySmith(N, V, L, roughness);
    vec3 nominator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
    vec3 specular = nominator / denominator;
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    float NdotL = max(dot(N, L), 0.0);
    return (kD * albedo / PI + specular) * radiance * NdotL;
}

vec3 DirectionalLight(vec3 worldPos, vec3 N, vec3 V, vec3 lightDir, vec3 lightColor, vec3 albedo, float metallic, float roughness, float scalarF0) {
    vec3 L = normalize(lightDir);
    vec3 H = normalize(V + L);
    vec3 radiance = lightColor;
    vec3 F0 = vec3(scalarF0);
    F0 = mix(F0, albedo, metallic);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
    float NDF = DistributionGGX(N, H, roughness);
    float G = GeometrySmith(N, V, L, roughness);
    vec3 nominator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
    vec3 specular = nominator / denominator;
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    float NdotL = max(dot(N, L), 0.0);
    return (kD * albedo / PI + specular) * radiance * NdotL;
}

vec3 DirectionalLight2(vec3 worldPos, vec3 N, vec3 V, vec3 lightDir, vec3 lightColor, vec3 albedo, float metallic, float roughness, float scalarF0) {
    vec3 L = normalize(lightDir);
    vec3 H = normalize(V + L);
    vec3 F0 = vec3(scalarF0);
    F0 = mix(F0, albedo, metallic);
    float NoH = clamp(dot(N, H), 0.0, 1.0);
    float NoV = clamp(dot(N, V), 0.0, 1.0);
    float HoV = clamp(dot(H, V), 0.0, 1.0);
    float NoL = clamp(dot(N, L), 0.0, 1.0);
    float D = D_GGX(NoH, roughness * roughness);
    vec3 F = F_Schlick(HoV, F0);
    float Vis = V_SmithGGXCorrelated(NoV, NoL, roughness * roughness);
    vec3 specular = F * (D * Vis);
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    return (kD * albedo / PI + specular) * lightColor * NoL;
}



void main() {
    vec3 V = normalize(vViewDir);  

    vec3 col = Ke;

    vec3 objectAlbedo = Kd;
    float objectMetallic = texture2D(map_metalness, vUV).r;
    float objectRoughness = texture2D(map_roughness, vUV).r;
    float objectAO = texture2D(map_ao, vUV).r;

    vec3 texAlbedo = pow(texture2D(map_Kd, vUV).rgb, vec3(2.2));
    float texMetallic = texture2D(map_metalness, vUV).r;
    float texRoughness = texture2D(map_roughness, vUV).r;
    float texAO = texture2D(map_ao, vUV).r;

    vec3 texN = texture2D(map_normal, vUV).rgb * 2.0 - 1.0;

    objectAlbedo *= texAlbedo;
    objectAO *= texAO;

    vec3 N = normalize(vTBN * texN);
    vec3 R = reflect(-V, N); 

    if (objectMetallic <= 1.0)
        objectMetallic = mix(0.0, texMetallic, objectMetallic);
    else
        objectMetallic = mix(texMetallic, 1.0, objectMetallic - 1.0);

    if (objectRoughness <= 1.0)
        objectRoughness = mix(0.0, texRoughness, objectRoughness);
    else
        objectRoughness = mix(texRoughness, 1.0, objectRoughness - 1.0);

    objectRoughness = clamp(objectRoughness, 0.01, 0.9);

    col += DirectionalLight2(vWorldPos, N, V, lightDir, lightIntensity, objectAlbedo, objectMetallic, objectRoughness, Ns) * objectAO;

    col += ambientLight * objectAlbedo * objectAO;
    col = col / (col + vec3(1.0));

    gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}
