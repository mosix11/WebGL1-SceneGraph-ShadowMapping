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

varying vec2 vUV;

const vec3 lightIntensity = vec3(1, 1, 1);
// const vec3 lightIntensity = vec3(1.0, 0.6824, 0.0);
// const float ambientLight = 0.3;


void main() {
    // Texture maps
    vec3 diffuseColor = texture2D(map_Kd, vUV).rgb * Kd;

  
    vec3 color = lightIntensity * diffuseColor;

    gl_FragColor = vec4(color, 1);


}