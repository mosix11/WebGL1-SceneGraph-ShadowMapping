attribute vec4 position;

uniform mat4 lightMVP; 

void main() {
    gl_Position = lightMVP * position;
}