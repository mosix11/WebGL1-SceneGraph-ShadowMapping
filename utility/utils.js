import {mat3, mat4, vec2, vec3, vec4} from 'gl-matrix';


export async function loadFile(filePath){
    const response = await fetch(filePath);
    return response;
}

export async function loadShaderSource(shaderName){
    const shaderFile = await loadFile("/shaders/".concat(shaderName)); 
    return shaderFile.text();
}

export async function loadShader(gl, shaderName, shaderType){
    let shader = null;
    if (shaderType.includes("VERTEX")){
        shader = gl.createShader(gl.VERTEX_SHADER);
    }else if (shaderType.includes("FRAGMENT")){
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }else{
        throw new Error("Invalid Shader Type")
    }
    let shaderSource = await loadShaderSource(shaderName);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    shaderCompileCheck(gl, shader)
    return shader
}

export function linkShaders(gl, program, shaderList){
    if (shaderList == null || shaderList.length == 0){
        throw new Error("Shader List is Empty");
    }
    for (let i = 0; i < shaderList.length; i++){
        gl.attachShader(program, shaderList[i])
    }
    gl.linkProgram(program);
    programLinkCheck(gl, program);
}

export async function createProgram(gl, vertShaderName, fragShaderName){
    var program = gl.createProgram();
    const vertSahder = await loadShader(gl, vertShaderName, 'VERTEX');
    const fragShader = await loadShader(gl, fragShaderName, 'FRAGMENT');
    linkShaders(gl, program, [vertSahder, fragShader]);
    return program;
}

export function changeProgramShader(gl, program, vertShader, fragShader){
    linkShaders(gl, program, [vertShader, fragShader]);
    return program;
}


export function assignVertexAttributeData(gl, program, buffer, atrName, atrData, numComponents, drawType){
    if (buffer == null){
        var buffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (drawType.includes("STATIC")){
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(atrData), gl.STATIC_DRAW)
    }else if (drawType.includes("DYNAMIC")){
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(atrData), gl.DYNAMIC_DRAW)
    }else {
        throw new Error("Invalid Draw Type")
    }
    let atrLoc = gl.getAttribLocation(program, atrName);
    gl.enableVertexAttribArray(atrLoc);
    gl.vertexAttribPointer(atrLoc, numComponents, gl.FLOAT, false, 0, 0);
    return buffer;
}

export function assignUniformData(gl, program, atrName, atrData){
    gl.useProgram(program);

}


export async function loadImage(URL){
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (error) => {console.log(error)};
        img.src = URL;
    });
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

export async function loadTexture(gl, imgin){
    let img = null;
    if (typeof imgin === 'string') {
        // console.log('The argument is a string:', arg);
        img = await loadImage(imgin);
    } else if (imgin instanceof ImageBitmap) {
        // console.log('The argument is an ImageBitmap:', arg);
        img = imgin;
    } else {
        console.log('The argument is neither a string nor an ImageBitmap:', imgin);
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    return texture;
}

// export async function activeTextures(gl, textures){
//     for 
// }

export function create1PixelTexture(gl, pixel) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array(pixel));
    return texture;
}

export function createCheckerTexture(gl){
    const checkerboardTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,                // mip level
        gl.LUMINANCE,     // internal format
        8,                // width
        8,                // height
        0,                // border
        gl.LUMINANCE,     // format
        gl.UNSIGNED_BYTE, // type
        new Uint8Array([  // data
            0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
            0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
            0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
            0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
            0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
            0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
            0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
            0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
        ]));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return checkerboardTexture;
}

// uniform vec3 Ka; // Ambient reflectivity
// uniform vec3 Kd; // Diffuse reflectivity
// uniform vec3 Ks; // Specular reflectivity
// uniform vec3 Ke;  // Emissive reflectivity
// uniform float Ns; // Specular exponent
// uniform float Ni; // Optical Density
// uniform float d; // Transparency
export async function loadMaterialTextures(gl, material){
    // const filtered = Object.keys(material)
    // .filter(key => key.toLowerCase().includes('map'));
    let uniforms = material;
    const filteredKeys = Object.keys(material)
    .filter(key => key.toLowerCase().includes('map'));
    for (let ii = 0; ii < filteredKeys.length; ii++){
        let key = filteredKeys[ii];
        let img = material[key];
        
        // if (url){
        if (typeof img === 'string' || img instanceof String || img instanceof ImageBitmap){
            let texture = await loadTexture(gl, img);
            uniforms[key] = texture;
        }else if (img instanceof WebGLTexture){
            uniforms[key] = img;
        }
        
    }
    return uniforms;
}





export function createDepthTextureAndDepthFrameBuffer(gl, textureSize=1024){
    const depthTexture = gl.createTexture();
    const depthTextureSize = textureSize;
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,      // target
        0,                  // mip level
        gl.DEPTH_COMPONENT, // internal format // NOT Sure about 16
        depthTextureSize,   // width
        depthTextureSize,   // height
        0,                  // border
        gl.DEPTH_COMPONENT, // format
        gl.UNSIGNED_INT,    // type
        // gl.FLOAT,    // type
        null);              // data
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,       // target
        gl.DEPTH_ATTACHMENT,  // attachment point
        gl.TEXTURE_2D,        // texture target
        depthTexture,         // texture
        0);                   // mip level

    const unusedTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, unusedTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        depthTextureSize,
        depthTextureSize,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
    // attach it to the framebuffer
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,        // target
        gl.COLOR_ATTACHMENT0,  // attachment point
        gl.TEXTURE_2D,         // texture target
        unusedTexture,         // texture
        0);                    // mip level

    return {depthTexture, depthFramebuffer};
}

export function shaderCompileCheck(gl, shader){
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
}


export function programLinkCheck(gl, prog){
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
        console.log(gl.getProgramInfoLog(prog));
    }
}

export function generateTangents(position, texcoord, indices) {
    // TODO change it in a way so if texcoords is null it puts value: [1, 0, 0] for each vertex
    function makeIndexIterator(indices) {
        let ndx = 0;
        const fn = () => indices[ndx++];
        fn.reset = () => { ndx = 0; };
        fn.numElements = indices.length;
        return fn;
    }
      
    function makeUnindexedIterator(positions) {
        let ndx = 0;
        const fn = () => ndx++;
        fn.reset = () => { ndx = 0; };
        fn.numElements = positions.length / 3;
        return fn;
    }
      
    const getNextIndex = indices ? makeIndexIterator(indices) : makeUnindexedIterator(position);
    const numFaceVerts = getNextIndex.numElements;
    const numFaces = numFaceVerts / 3;
  
    const tangents = [];
    for (let i = 0; i < numFaces; ++i) {
        const n1 = getNextIndex();
        const n2 = getNextIndex();
        const n3 = getNextIndex();
  
        const p1 = vec3.fromValues(position[n1 * 3], position[n1 * 3 + 1], position[n1 * 3 + 2]);
        const p2 = vec3.fromValues(position[n2 * 3], position[n2 * 3 + 1], position[n2 * 3 + 2]);
        const p3 = vec3.fromValues(position[n3 * 3], position[n3 * 3 + 1], position[n3 * 3 + 2]);
  
        const uv1 = vec2.fromValues(texcoord[n1 * 2], texcoord[n1 * 2 + 1]);
        const uv2 = vec2.fromValues(texcoord[n2 * 2], texcoord[n2 * 2 + 1]);
        const uv3 = vec2.fromValues(texcoord[n3 * 2], texcoord[n3 * 2 + 1]);
  
        const dp12 = vec3.create();
        vec3.subtract(dp12, p2, p1);
        const dp13 = vec3.create();
        vec3.subtract(dp13, p3, p1);
  
        const duv12 = vec2.subtract(vec2.create(), uv2, uv1);
        const duv13 = vec2.subtract(vec2.create(), uv3, uv1);
  
        const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
        let tangent = vec3.create();

        if (Number.isFinite(f)) {
            const scaled_dp12 = vec3.create();
            vec3.scale(scaled_dp12, dp12, duv13[1]);
            const scaled_dp13 = vec3.create();
            vec3.scale(scaled_dp13, dp13, duv12[1]);
            vec3.subtract(tangent, scaled_dp12, scaled_dp13);
            vec3.scale(tangent, tangent, f);
            vec3.normalize(tangent, tangent);
        } else {
            tangent = vec3.fromValues(1, 0, 0);
        }
  
        tangents.push(...tangent, ...tangent, ...tangent);
    }
  
    return tangents;
}

export function radToDeg(r) {
    return r * 180 / Math.PI;
}

export function degToRad(d) {
    return d * Math.PI / 180;
}

export function randomColor() {
    return [Math.random(), Math.random(), Math.random(), 1];
    // return [Math.random(), Math.random(), 1, 1];

}

// Construct an Array by repeating `pattern` n times
export function arrRepeat(n, pattern) {
    return [...Array(n)].reduce(sum => sum.concat(pattern), []);
}


function containsObject(list, obj) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }

    return false;
}

function removeItemOnce(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
}
  
function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i] === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
}
export function computeVertexNormalsNonIndexed(vertices) {
    const normals = [];

    // Assume vertices.length % 3 === 0
    for (let i = 0; i < vertices.length; i += 9) { // Each triangle: 3 vertices * 3 coords
        const v0 = [vertices[i], vertices[i + 1], vertices[i + 2]];
        const v1 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
        const v2 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        const normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ];

        // Normalize the normal
        const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        normal[0] /= len;
        normal[1] /= len;
        normal[2] /= len;

        // Apply the same normal to each vertex of the triangle
        for (let j = 0; j < 3; j++) {
            normals.push(normal[0], normal[1], normal[2]);
        }
    }

    return normals;
}


export function computeVertexNormalsForIndexedGeometry(vertices, indices) {
    const normals = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        const v1 = [vertices[i1] - vertices[i0], vertices[i1 + 1] - vertices[i0 + 1], vertices[i1 + 2] - vertices[i0 + 2]];
        const v2 = [vertices[i2] - vertices[i0], vertices[i2 + 1] - vertices[i0 + 1], vertices[i2 + 2] - vertices[i0 + 2]];

        const normal = [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];

        for (let j = 0; j < 3; j++) {
            const idx = indices[i + j] * 3;
            normals[idx] += normal[0];
            normals[idx + 1] += normal[1];
            normals[idx + 2] += normal[2];
        }
    }

    // Normalize each normal
    for (let i = 0; i < normals.length; i += 3) {
        const len = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
        normals[i] /= len;
        normals[i + 1] /= len;
        normals[i + 2] /= len;
    }

    return normals;
}


export function generatePlanarUVs(vertices) {
    const uvs = [];
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        uvs.push((x + 1) / 2, (z + 1) / 2);
    }
    return uvs;
}

export async function showImageBitmapInAlert(imageBitmap) {
    // Convert ImageBitmap to a Blob
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    
    canvas.toBlob(blob => {
        // Create an Object URL from the Blob
        const url = URL.createObjectURL(blob);
        
        // Open a new window and check if it's properly created
        const newWindow = window.open("", "_blank", "width=400,height=400");
        if (newWindow) {
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Image Preview</title>
                </head>
                <body>
                    <img src="${url}" style="max-width: 100%; height: auto;">
                </body>
                </html>
            `);

            // Release the Object URL after the image is loaded
            newWindow.document.querySelector('img').onload = () => {
                URL.revokeObjectURL(url);
            };
        } else {
            alert("Pop-up blocked. Please allow pop-ups and try again.");
        }
    }, 'image/png');
}