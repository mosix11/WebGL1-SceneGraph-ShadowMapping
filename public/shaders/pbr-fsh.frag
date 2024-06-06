precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec3 vViewPosition;
varying vec3 vPosition;

uniform vec3 color; // Kd (diffuse color)
uniform float roughness;
uniform float metalness;
uniform vec3 emissive;
uniform float emissiveIntensity;
uniform float aoMapIntensity;
uniform float bumpScale;
uniform float displacementScale;
uniform float displacementBias;
uniform vec2 normalScale;

uniform sampler2D map; // map_Kd (diffuse map)
uniform sampler2D roughnessMap;
uniform sampler2D metalnessMap;
uniform sampler2D normalMap;
uniform sampler2D bumpMap;
uniform sampler2D displacementMap;
uniform sampler2D emissiveMap;
uniform sampler2D alphaMap;
uniform sampler2D aoMap;
uniform sampler2D envMap;
uniform sampler2D lightMap;

uniform float envMapIntensity;
uniform float lightMapIntensity;

uniform bool flatShading;
uniform bool wireframe;
uniform float wireframeLinewidth;

uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];
uniform vec3 ambientLight;

const float PI = 3.14159265359;

vec3 getNormal() {
    vec3 tangentNormal = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    tangentNormal.xy *= normalScale;

    mat3 TBN = mat3(vTangent, vBitangent, vNormal);
    return normalize(TBN * tangentNormal);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;

    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return num / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx1 = GeometrySchlickGGX(NdotV, roughness);
    float ggx2 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
    vec3 albedo = texture2D(map, vUv).rgb * color;
    float metallic = texture2D(metalnessMap, vUv).b * metalness;
    float rough = texture2D(roughnessMap, vUv).g * roughness;
    vec3 emissiveColor = texture2D(emissiveMap, vUv).rgb * emissive * emissiveIntensity;
    float ao = texture2D(aoMap, vUv).r * aoMapIntensity;

    vec3 N = getNormal();
    vec3 V = normalize(vViewPosition);

    // Default PBR values
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);

    // Lighting calculations
    vec3 Lo = vec3(0.0);
    for (int i = 0; i < 1; ++i) {
        vec3 L = normalize(lightPositions[i] - vPosition);
        // vec3 L = normalize(-lightPositions[i]);
        vec3 H = normalize(V + L);
        float distance = length(lightPositions[i] - vPosition);
        float attenuation = 1.0 / (distance * distance);
        vec3 radiance = lightColors[i] * attenuation;

        // Cook-Torrance BRDF
        float NDF = DistributionGGX(N, H, rough);   
        float G = GeometrySmith(N, V, L, rough);      
        vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
        
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;	  
        
        vec3 numerator    = NDF * G * F;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
        vec3 specular = numerator / max(denominator, 0.001);  
            
        // Add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);        
        Lo += (kD * albedo / PI + specular) * radiance * NdotL; 
    }

    // Ambient lighting (environment lighting)
    vec3 ambient = ambientLight * albedo * ao;
    vec3 color = ambient + Lo + emissiveColor;

    // Gamma correction
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2)); 

    gl_FragColor = vec4(color, 1.0);
}
