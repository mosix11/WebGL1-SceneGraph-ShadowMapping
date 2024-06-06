import {mat3, mat4, vec3, vec4} from 'gl-matrix';
import { degToRad } from './utils';


export class Transformation {

    constructor(rotation, translation, scale){
        this.rotation = rotation ? rotation : vec3.fromValues(0, 0, 0);
        this.translation = translation ? translation: vec3.fromValues(0, 0, 0);
        this.scale = scale ? scale : vec3.fromValues(1, 1, 1);
    }

    getMatrix(src){
        let t = this.translation;
        let r = this.rotation;
        let s = this.scale;
        // dst = dst || mat4.create();
        let transformationMatrix = mat4.create();
        if (src){
            transformationMatrix = mat4.clone(src);
        }

        // mat4.multiply(dst, mat4.translate(mat4.create(), mat4.create(), t), dst);
        // mat4.multiply(dst, mat4.rotateX(mat4.create(), mat4.create(), r[0]), dst);
        // mat4.multiply(dst, mat4.rotateY(mat4.create(), mat4.create(), r[1]), dst);
        // mat4.multiply(dst, mat4.rotateZ(mat4.create(), mat4.create(), r[2]), dst);
        // mat4.multiply(dst, mat4.scale(mat4.create(), mat4.create(), s), dst);
        
        mat4.multiply(transformationMatrix, mat4.translate(mat4.create(), mat4.create(), t), transformationMatrix);
        mat4.multiply(transformationMatrix, mat4.rotateX(mat4.create(), mat4.create(), r[0]), transformationMatrix);
        mat4.multiply(transformationMatrix, mat4.rotateY(mat4.create(), mat4.create(), r[1]), transformationMatrix);
        mat4.multiply(transformationMatrix, mat4.rotateZ(mat4.create(), mat4.create(), r[2]), transformationMatrix);
        mat4.multiply(transformationMatrix, mat4.scale(mat4.create(), mat4.create(), s), transformationMatrix);

        // mat4.translate(transformationMatrix, transformationMatrix, t);
        // mat4.rotateX(transformationMatrix, transformationMatrix, r[0]);
        // mat4.rotateY(transformationMatrix, transformationMatrix, r[1]);
        // mat4.rotateZ(transformationMatrix, transformationMatrix, r[2]);
        // mat4.scale(transformationMatrix, transformationMatrix, s);
        return transformationMatrix;
    }
}

export class SceneNode{
    
    constructor(name, localMatrix, worldMatrix, parent, children, drawInfo, programInfo, isRootNode=false, renderingModel){
        this.name = (name) ? name : 'anonymosObj';
        this.localMatrix = (localMatrix) ? localMatrix : mat4.create();
        this.worldMatrix = (worldMatrix) ? worldMatrix : mat4.create();
        this.children = (children) ? children : [];
        this.parent = parent;
        this.programInfo = programInfo;
        this.drawInfo = drawInfo;
        this.isRootNode = isRootNode;
        this.boundingBox = null;
        this.transformation = new Transformation();
        this.renderingModel = renderingModel;
        this.multipleDrawInstance = false;
    }

    setParent(parent) {
        if (this.parent && this.parent !== parent) {
            const index = this.parent.children.indexOf(this);
            if (index >= 0) {
                this.parent.children.splice(index, 1);
            }
        }

        if (parent && parent !== this.parent) {
            parent.addChild(this);
        }

        this.parent = parent;
    }

    addChild(child) {
        if (child && !this.children.includes(child)) {
            this.children.push(child);
            child.setParent(this);
        }
    }

    removeChild(child){
        this.children = removeItemAll(this.children, child);
        child.children.forEach(function(cc){
            cc.setParnet(null);
        });
    }

    rename(name){
        this.name = name;
    }
    
    setRenderingModel(renderer){
        this.renderingModel = renderer;
    }

    getRenderingModel(){
        if (this.drawInfo){
            if (this.renderingModel) return this.renderingModel;
            else return null;
        }else return null;
    }

    setProgramInfo(programInfo){
        this.programInfo = programInfo;
    }

    getProgramInfo(){
        return this.programInfo;
    }

    setDrawInfo(drawInfo){
        this.drawInfo = drawInfo;
    }

    getDrawInfo(){
        return this.drawInfo;
    }

    setDrawInfo(drawInfo){
        this.drawInfo = drawInfo;
    }

    setDrawInfoBufferInfo(bufferInfo){
        if (!this.drawInfo){
            this.drawInfo = {};
        }
        this.drawInfo.bufferInfo = bufferInfo;
    }

    activateMultipleInstance(){
        this.multipleDrawInstance = true;
    }
    setInstancesLocalMatrices(localMatrices){
        this.localMatrices = localMatrices;
    }
    getInstancesLocalMatrices(){
        return this.localMatrices;
    }
    getInstancesWorldMatrices(){
        let arr = [];
        for (let ii = 0; ii < this.localMatrices.length; ii++){
            let trans = this.transformation.getMatrix(this.localMatrices[ii]);
            arr.push(mat4.multiply(mat4.create(), this.parent.getWorldMatrix(), trans));
        }
        return arr;
    }

    setWorldMatrix(mat){
        mat4.copy(this.worldMatrix, mat);
    }

    getWorldMatrix(){
        return this.worldMatrix;
    }

    setDrawInfoUniforms(uniforms){
        if (!this.drawInfo){
            this.drawInfo = {};
        }
        this.drawInfo.uniforms = uniforms;
    }

    setDrawInfoPragramInfo(programInfo){
        if (!this.drawInfo){
            this.drawInfo = {};
        }
        this.drawInfo.programInfo = programInfo;
    }

    updateWorldMatrix(parentWorldMatrix) {
        let trans = this.transformation.getMatrix(this.localMatrix);
        // mat4.copy(this.localMatrix, trans);

        if (parentWorldMatrix) {
          // a matrix was passed in so do the math and
          // store the result in `this.worldMatrix`.
        //   mat4.multiply(this.worldMatrix, parentWorldMatrix, this.localMatrix);
            mat4.multiply(this.worldMatrix, parentWorldMatrix, trans);
        } else {
          // no matrix was passed in so just copy localMatrix to worldMatrix
            // mat4.copy(this.worldMatrix, this.localMatrix);
            mat4.copy(this.worldMatrix, trans);
        }
       
        // now process all the children
        var worldMatrix = this.worldMatrix;
        this.children.forEach(function(child) {
          child.updateWorldMatrix(worldMatrix);
        });
    }

    setTransformation(transformation){
        this.transformation = transformation;
    }

    getTransformation(){
        return this.transformation;
    }

    applyTransformation(transformation){
        mat4.multiply(this.localMatrix, transformation, this.localMatrix);
        this.updateWorldMatrix();
        this.computeBoundingBox();
    }

    moveCenterTo(target){
        let displacement = vec3.subtract(vec3.create(), target, this.getBoundingBoxCenter());
        mat4.multiply(this.localMatrix, mat4.translate(mat4.create(), mat4.create(), displacement), this.localMatrix);
        this.updateWorldMatrix();
        this.computeBoundingBox();
    }

    scaleNode(scaleRatio){
        let scale = (Array.isArray(scaleRatio)) ? scaleRatio : [scaleRatio, scaleRatio, scaleRatio];
        mat4.multiply(this.localMatrix, mat4.scale(mat4.create(), mat4.create(), scale), this.localMatrix);
        this.updateWorldMatrix();
        this.computeBoundingBox();
    }

    computeBoundingBox(){
        computeBoundingBoxForSceneNode(this);
    }

    setBoundingBox(boundingBox) {
        this.boundingBox = boundingBox;
    }

    getBoundingBox() {
        return this.boundingBox;
    }

    getBoundingBoxCenter(){
        let bbox = this.boundingBox;
        // const center = [
        //     (bbox.min[0] + bbox.max[0]) / 2,
        //     (bbox.min[1] + bbox.max[1]) / 2,
        //     (bbox.min[2] + bbox.max[2]) / 2,
        // ];
        const center = vec3.create();
        vec3.add(center, bbox.min, bbox.max);
        vec3.scale(center, center, 0.5);
        return center;
    }

    getBoundingBoxSize(){
        let bbox = this.boundingBox;
        const size = vec3.create();
        vec3.subtract(size, bbox.max, bbox.min);
        return size;
    }

    getBoundingBoxExtent(){
        let bbox = this.boundingBox;
        const size = vec3.create();
        vec3.subtract(size, bbox.max, bbox.min);
        return vec3.length(size);
    }

}

export class SceneGraph {
    constructor(root) {
        this.root = root;
        this.depthTexture = null;
        this.depthFramebuffer = null;
    }

    setRoot(node) {
        this.root = node;
    }

    getRoot() {
        return this.root;
    }

    update() {
        this.root.updateWorldMatrix();
    }

    transformNode(nodeName, transformation){
        let node = this.getSceneNodeByObjectName(nodeName);
        node.applyTransformation(transformation);
        node.updateWorldMatrix();
        // TODO check computational efficency
        this.computeBoundingBox();
    }
    //TODO implement functions like find a node or remove a node from scene or replace a node
    traverse(callback) {
        const traverseNode = (node) => {
            callback(node);
            for (let child of node.children) {
                traverseNode(child);
            }
        }
        traverseNode(this.root);
    }

    // Traversal to find a specific node by name
    traverseFind(callback) {
        const traverseNode = (node) => {
            if (callback(node)) {
                return node;
            }
            for (let child of node.children) {
                const result = traverseNode(child);
                if (result) {
                    return result;
                }
            }
            return null;
        }
        return traverseNode(this.root);
    }
    
    getSceneNodeByObjectName(name) {
        return this.traverseFind((node) => {
            return node.name === name;
        });
    }
    
    computeBoundingBox(node = null) {
        if (!node) {
            node = this.root;
        }
        
        return computeBoundingBoxForSceneNode(node);
    }

    setDepthTexture(depthTexture){
        this.depthTexture = depthTexture;
    }

    getDepthTexture(){
        return this.depthTexture;
    }

    setDepthFrameBuffer(depthFramebuffer){
        this.depthFramebuffer = depthFramebuffer;
    }

    getDepthFrameBuffer(){
        return this.depthFramebuffer;
    }
}

// function computeBoundingBoxForMesh(vertices) {
//     if (vertices.length === 0) {
//         return null;
//     }

//     const min = vec3.fromValues(vertices[0], vertices[1], vertices[2]);
//     const max = vec3.fromValues(vertices[0], vertices[1], vertices[2]);

//     for (let i = 3; i < vertices.length; i += 3) {
//         const x = vertices[i];
//         const y = vertices[i + 1];
//         const z = vertices[i + 2];

//         min[0] = Math.min(min[0], x);
//         min[1] = Math.min(min[1], y);
//         min[2] = Math.min(min[2], z);

//         max[0] = Math.max(max[0], x);
//         max[1] = Math.max(max[1], y);
//         max[2] = Math.max(max[2], z);
//     }

//     return { min, max };
// }

function computeBoundingBoxForMesh(vertices, transformationMatrix) {
    if (vertices.length === 0) {
        return null;
    }

    const transformedVertices = [];
    for (let i = 0; i < vertices.length; i += 3) {
        const vertex = vec4.fromValues(vertices[i], vertices[i + 1], vertices[i + 2], 1);
        vec4.transformMat4(vertex, vertex, transformationMatrix); // Apply the transformation
        transformedVertices.push(vertex[0], vertex[1], vertex[2]);
    }

    const min = vec3.fromValues(transformedVertices[0], transformedVertices[1], transformedVertices[2]);
    const max = vec3.fromValues(transformedVertices[0], transformedVertices[1], transformedVertices[2]);

    for (let i = 3; i < transformedVertices.length; i += 3) {
        const x = transformedVertices[i];
        const y = transformedVertices[i + 1];
        const z = transformedVertices[i + 2];

        min[0] = Math.min(min[0], x);
        min[1] = Math.min(min[1], y);
        min[2] = Math.min(min[2], z);

        max[0] = Math.max(max[0], x);
        max[1] = Math.max(max[1], y);
        max[2] = Math.max(max[2], z);
    }

    return { min, max };
}

function computeBoundingBoxForSceneNode(node) {
    let min = vec3.fromValues(Infinity, Infinity, Infinity);
    let max = vec3.fromValues(-Infinity, -Infinity, -Infinity);


    // Compute bounding box for all children first
    node.children.forEach(child => {
        
        computeBoundingBoxForSceneNode(child);
        if (child.boundingBox) {
            // const transformedMin = vec4.fromValues(child.boundingBox.min[0], child.boundingBox.min[1], child.boundingBox.min[2], 1);
            // const transformedMax = vec4.fromValues(child.boundingBox.max[0], child.boundingBox.max[1], child.boundingBox.max[2], 1);
            // vec4.transformMat4(transformedMin, transformedMin, node.worldMatrix);
            // vec4.transformMat4(transformedMax, transformedMax, node.worldMatrix);

            // vec3.min(min, min, [transformedMin[0], transformedMin[1], transformedMin[2]]);
            // vec3.max(max, max, [transformedMax[0], transformedMax[1], transformedMax[2]]);

            vec3.min(min, min, [child.boundingBox.min[0], child.boundingBox.min[1], child.boundingBox.min[2]]);
            vec3.max(max, max, [child.boundingBox.max[0], child.boundingBox.max[1], child.boundingBox.max[2]]);
        }
    });

    // Compute bounding box for current node's mesh if available
    if (node.drawInfo && node.drawInfo.position && node.drawInfo.position.data) {
        
        const bbox = computeBoundingBoxForMesh(node.drawInfo.position.data, node.getWorldMatrix());
        if (bbox) {
            vec3.min(min, min, bbox.min);
            vec3.max(max, max, bbox.max);
        }
    }else if (node.drawInfo && node.drawInfo.position){
        const bbox = computeBoundingBoxForMesh(node.drawInfo.position, node.getWorldMatrix());
        if (bbox) {
            vec3.min(min, min, bbox.min);
            vec3.max(max, max, bbox.max);
        }
    }
    // Set the bounding box if valid
    if (min[0] !== Infinity && max[0] !== -Infinity) {
        const boundingBox = { min, max };
        node.setBoundingBox(boundingBox);
    } else {
        if (node.getBoundingBox() && node.getBoundingBox().min && node.getBoundingBox().max){
            let bboxc = vec3.create();
            vec3.transformMat4(bboxc, vec3.fromValues(0, 0, 0), node.getWorldMatrix());
            node.setBoundingBox({min:bboxc, max:bboxc});
        }else{
            node.setBoundingBox(null);
        }
    }
}

// function computeBoundingBoxForSceneNode(node) {
//     let min = vec3.fromValues(Infinity, Infinity, Infinity);
//     let max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

//     // First, compute bounding boxes for all children
//     node.children.forEach(child => {
//         computeBoundingBoxForSceneNode(child); // Recursively compute for children first
        
//         if (child.boundingBox) {
//             vec3.min(min, min, child.boundingBox.min); // Update min based on child's bounding box
//             vec3.max(max, max, child.boundingBox.max); // Update max based on child's bounding box
//         }
//     });

//     // Compute the bounding box for the current node's mesh if it has one
//     if (node.drawInfo && node.drawInfo.position) {
//         const bbox = computeBoundingBoxForMesh(node.drawInfo.position);
//         if (bbox) {
//             vec3.min(min, min, bbox.min); // Compare with current node's mesh min
//             vec3.max(max, max, bbox.max); // Compare with current node's mesh max
//         }
//     }

//     // Only update the bounding box if it's valid
//     if (min[0] !== Infinity && max[0] !== -Infinity) {
//         const boundingBox = { min, max };
//         node.setBoundingBox(boundingBox);
//     } else {
//         node.setBoundingBox(null); // No valid bounding box
//     }
// }

// function computeBoundingBoxForSceneNode(node) {
//     let min = vec3.fromValues(Infinity, Infinity, Infinity);
//     let max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

//     function updateBoundingBox(node) {
        
//         if (node.drawInfo && node.drawInfo.position.data) {
//             const bbox = computeBoundingBoxForMesh(node.drawInfo.position.data);
//             if (bbox) {
//                 vec3.min(min, min, bbox.min);
//                 vec3.max(max, max, bbox.max);
//             }
//         }

//         node.children.forEach(child => updateBoundingBox(child));
//     }

//     updateBoundingBox(node);
//     if (min[0] === Infinity || min[1] === Infinity || min[2] === Infinity ||
//         max[0] === -Infinity || max[1] === -Infinity || max[2] === -Infinity) {
//         return null; // No valid bounding box
//     }
//     const boundingBox = { min, max };
//     node.setBoundingBox(boundingBox);
//     node.children.forEach(child => computeBoundingBoxForSceneNode(child));
//     return boundingBox;
// }



export class Camera {
    constructor() {
        this.position = vec3.create();
        this.target = vec3.create();
        this.up = vec3.fromValues(0, 1, 0);
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
    }

    lookAt(position, target, up) {
        vec3.copy(this.position, position);
        vec3.copy(this.target, target);
        vec3.copy(this.up, up);
        mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    }

    updatePosition(newPos){
        if(!vec3.equals(newPos, this.position)){
            this.lookAt(newPos, this.target, this.up);
        }
    }

    updateTarget(newTarget){
        if(!vec3.equals(newTarget, this.target)){
            this.lookAt(this.position, newTarget, this.up);
        }
        
    }

    updatePosAndTarget(newPos, newTarget){
        if(!vec3.equals(newPos, this.position) || !vec3.equals(newTarget, this.target)){
            this.lookAt(newPos, newTarget, this.up);
        }
    }

    setPerspective(fov, aspect, near, far) {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        mat4.perspective(this.projectionMatrix, fov, aspect, near, far);
    }

    getCameraDirection(){
        // return vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.position, this.target));
        return vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.target, this.position));
    }

    getViewMatrix() {
        // return mat4.invert([], this.viewMatrix);
        return this.viewMatrix;
    }

    getProjectionMatrix() {
        return this.projectionMatrix;
    }

    getViewProjectionMatrix(){
        return mat4.multiply(mat4.create(), this.projectionMatrix, this.viewMatrix);
    }

    getModelViewMatrix(modelMat){
        return mat4.multiply(mat4.create(), this.getViewMatrix(), modelMat);
    }

    getMVP(modelMat){
        return mat4.multiply(mat4.create(), this.getViewProjectionMatrix(), modelMat);
    }

    getViewDirection() {
        const viewDir = vec3.create();
        vec3.subtract(viewDir, this.target, this.position);
        vec3.normalize(viewDir, viewDir);
        return viewDir;
    }

    getFrustumTransformationMatrix(){
        // mat4.multiply(mat4.create(), mat4.invert(mat4.create(), lightCamera.getProjectionMatrix()), mat4.invert(mat4.create(), lightCamera.getViewMatrix()));

        const lightProjMatrix = this.getProjectionMatrix();
        const lightViewMatrix = this.getViewMatrix();
        
        const invertedView = mat4.invert(mat4.create(), lightViewMatrix);
        const invertedProj = mat4.invert(mat4.create(), lightProjMatrix);
        
        return mat4.multiply(mat4.create(), invertedView, invertedProj);
    }
    
}

export function initializeCameraForScene(sceneGraph, canvasWidth, canvasHeight, fieldOfViewRadians = degToRad(70)) {
    // Compute the bounding box of the entire scene
    const bbox = sceneGraph.getRoot().getBoundingBox();

    if (!bbox) {
        throw new Error("Cannot compute bounding box for the scene.");
    }

    // Determine the center and size of the bounding box
    const center = sceneGraph.getRoot().getBoundingBoxCenter();

    const size = sceneGraph.getRoot().getBoundingBoxSize();

    // Calculate the distance from the camera to the center of the bounding box
    const maxDimension = Math.max(size[0], size[1], size[2]);
    // const distance = maxDimension * 2; // or another factor depending on your needs
    const distance = maxDimension;

    // Position the camera
    
    const cameraPosition = vec3.fromValues(center[0], center[1], center[2] + distance );
    // const cameraPosition = vec3.fromValues(0, 0, 0);

    // Initialize the camera
    const camera = new Camera();
    camera.lookAt(cameraPosition, center, vec3.fromValues(0, 1, 0));

    // Set perspective projection
    const fov = fieldOfViewRadians;
    const aspect = canvasWidth / canvasHeight;
    const near = 1e-4;
    const far = 1e4;

    camera.setPerspective(fov, aspect, near, far);

    return camera;
}


export function initializeCamera(cameraPos, target, up, fov, canvasWidth, canvasHeight, near, far){
    const camera = new Camera();
    camera.lookAt(cameraPos, target, up);
    camera.setPerspective(fov, canvasWidth/canvasHeight, near, far);
    return camera;
}


export function initializeLightCamera(lightPos, target, up, fov, aspect, near, far){
    const lightCamera = new Camera();
    lightCamera.lookAt(lightPos, target, up);
    lightCamera.setPerspective(fov,aspect, near, far);
    return lightCamera;
}