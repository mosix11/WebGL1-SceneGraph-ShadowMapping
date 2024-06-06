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

uniform vec3 spotLightDir;
uniform float spotLightInnerLimit;
uniform float spotLightOuterLimit;

varying vec2 vUV;          // Texture coordinates from vertex shader
varying vec3 vNormal;      // Normal vector from vertex shader
varying vec3 vTangent;     // Tangent vector from vertex shader 

varying vec3 vViewDir;     // View direction from vertex shader
varying vec3 vLightDir; // Vector going from surface to light position

const vec3 lightIntensity = vec3(1, 1, 1);
// const vec3 lightIntensity = vec3(1.0, 0.6824, 0.0);
const float ambientLight = 0.3;


void main() {
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 BT = normalize(cross(N, T));
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(vLightDir);


    mat3 tbn = mat3(T, BT, N);
    N = texture2D(map_bump, vUV).rgb * 2.0 - 1.0;
    N = normalize(tbn * N);

    vec3 H = normalize(L + V);

    // Texture maps
    vec3 ambientColor = ambientLight * texture2D(map_Ka, vUV).rgb * Ka;
    vec3 diffuseColor = texture2D(map_Kd, vUV).rgb * Kd;
    vec3 specularColor = texture2D(map_Ks, vUV).rgb * Ks;
    float alpha = texture2D(map_d, vUV).a * d;
    vec3 emissiveColor = texture2D(map_Ke, vUV).rgb * Ke;
    float shininess = texture2D(map_Ns, vUV).r * Ns;


    float spotLightEffect = dot(normalize(-vLightDir), normalize(spotLightDir));
    float limitRange = spotLightInnerLimit - spotLightOuterLimit;
    vec3 effectiveLight = lightIntensity * clamp((spotLightEffect - spotLightOuterLimit) / limitRange, 0.0, 1.0);
    

    // Blinn-Phong shading
    float cosTheta = max(dot(N, L), 0.0);
    float cosPhi = max(dot(N, H), 0.0);
    vec3 ambient = ambientColor;

    vec3 blinPhongShade = effectiveLight * cosTheta * (diffuseColor + specularColor * pow(cosPhi, shininess)/cosTheta);

    // float spotEffect = dot(normalize(-vLightDir), normalize(spotLightDir));
    // float spotLightCutoff = spotLightInnerLimit - spotLightOuterLimit;
    // if (spotEffect > spotLightOuterLimit) {
    //     float spotFactor = pow(spotEffect, Ns);
    //     blinPhongShade *= spotFactor;
    // } else {
    //     blinPhongShade *= 0.0;
    // }
    // vec3 blinPhongShade = lightIntensity * cosTheta * (diffuseColor + specularColor * pow(cosPhi, shininess));
    //    vec3 blinPhongShade = lightIntensity * max(0.0, cosTheta) * (diffuseColor + specularColor * (pow(max(cosPhi, 0.0), shininess)/cosTheta));
    // vec3 blinPhongShade = lightIntensity * max(0.0, cosTheta) * (vec3(0.04, 0.6, 0.0) + specularColor * (pow(max(cosPhi, 0.0), shininess)/cosTheta));

    vec3 color = ambient + blinPhongShade + emissiveColor;
    // vec3 color = blinPhongShade + emissiveColor;


    gl_FragColor = vec4(color, alpha);


}