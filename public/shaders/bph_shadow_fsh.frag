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

uniform sampler2D shadowMap; // Shadow map

uniform vec3 spotLightDir;
uniform float spotLightInnerLimit;
uniform float spotLightOuterLimit;


varying vec2 vUV;          // Texture coordinates from vertex shader
varying vec3 vNormal;      // Normal vector from vertex shader
varying vec3 vTangent;     // Tangent vector from vertex shader 

varying vec3 vViewDir;     // View direction from vertex shader
varying vec3 vLightDir; // Vector going from surface to light position

varying vec4 vLightSpacePos; // Position of the fragment in the light space


// const vec3 lightIntensity = vec3(1, 1, 1);
const vec3 lightIntensity = vec3(1.0, 0.7294, 0.1412);
const float ambientLight = 0.3;



float calculateShadow(vec4 lightSpacePos) {
   vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
   projCoords = projCoords * 0.5 + 0.5;
   float closestDepth = texture2D(shadowMap, projCoords.xy).z;
   float currentDepth = projCoords.z;
   float bias = 0.00005;
   // float shadow = currentDepth - bias > closestDepth ? 0.5 : 1.0;
   float shadow = step(currentDepth - bias, closestDepth);
   return shadow;
}


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
   vec3 effectiveLight = lightIntensity * smoothstep(spotLightOuterLimit, spotLightInnerLimit, spotLightEffect);

    // Blinn-Phong shading
   float cosTheta = max(dot(N, L), 0.0);
   float cosPhi = max(dot(N, H), 0.0);
   vec3 ambient = ambientColor;

   vec3 blinPhongShade = effectiveLight * cosTheta * (diffuseColor + specularColor * pow(cosPhi, shininess)/cosTheta);


   float shadow = calculateShadow(vLightSpacePos);
   // Combine results
   // vec3 color = ambient + blinPhongShade + emissiveColor;
   vec3 color = ambient + shadow * (blinPhongShade + emissiveColor);
   // vec3 color = shadow * (blinPhongShade + emissiveColor);
   // vec3 color = shadow * (vec3 + emissiveColor);

   

   // vec3 h = normalize(toLightRay.dir + view);
   // float cosTheta = dot(toLightRay.dir, normal);
   // float cosPhi = dot(h, normal);
   // color += lights[i].intensity * max(0.0, cosTheta) *(mtl.k_d + mtl.k_s * (pow(max(cosPhi, 0.0), mtl.n)/cosTheta));
   // Combine results

   // vec3 color = ambient + blinPhongShade;
   // vec3 color = vec3(0.7922, 0.1882, 0.1882);

   // Output the final color with transparency
   gl_FragColor = vec4(color, alpha);
   // gl_FragColor = vec4(1.0, 0.6824, 0.0, 1.0);

}