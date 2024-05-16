import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export async function loadFile(filePath){
    const response = await fetch(filePath);
    return response
}

export async function loadOBJ(filePath){
    return new Promise((resolve, reject) => {
        const loader = new OBJLoader();
        loader.load(
            // resource URL
            'models/' + filePath,
            // called when resource is loaded
            function ( object ) {
                resolve(object);
            },
            // called when loading is in progresses
            function ( xhr ) {
                // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // called when loading has errors
            function ( error ) {
                console.log( 'An error happened' );
                reject(error);
            }
        );
    })
}

async function loadMTL(filePath){
    return new Promise((resolve, reject) => {
        const loader = new MTLLoader();
        loader.load(
            'models/' + filePath,
            function(material){
                resolve(material);
            },
            function(xhr){

            },
            function(error){
                console.log( 'An error happened' );
                reject(error);
            }
        )
    });
}

export async function loadOBJMTL(objPath, mtlPath){

    try {
        var loadedMTL = await loadMTL(mtlPath);
    } catch (error) {
        console.error(error);
    }
    return new Promise((resolve, reject) => {
        const loader = new OBJLoader();
        loader.setMaterials(loadedMTL);
        loader.load(
            'models/' + objPath,
            function ( object ) {
                resolve(object);
            },
            function ( xhr ) {
                // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            function ( error ) {
                console.log( 'An error happened' );
                reject(error);
            }
        );
    });
    
}

async function loadShaderSource(shaderName){
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


export function assignVertexAttributeData(gl, program, atrName, atrData, numComponents, drawType){
    let buffer = gl.createBuffer();
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
}


export async function loadImage(URL){
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = URL;
    });
}

export async function loadTexture(gl, imgURL){
    let img = await loadImage(imgURL);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;

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

export function randomColor() {
    return [Math.random(), Math.random(), Math.random(), 1];
    // return [Math.random(), Math.random(), 1, 1];

}

// Construct an Array by repeating `pattern` n times
export function arrRepeat(n, pattern) {
    return [...Array(n)].reduce(sum => sum.concat(pattern), []);
}

