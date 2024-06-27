import { loadFile, loadMaterialTextures, generateTangents, create1PixelTexture, generatePlanarUVs
    , computeVertexNormalsForIndexedGeometry, computeVertexNormalsNonIndexed
} from "./utils";
import { createBuffersFromArrays, createAttribsFromArrays, createBufferInfoFromArrays } from "./webgl-utils";
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { SceneNode, SceneGraph } from "./scene";
import {mat3, mat4, vec3, vec4, vec2, mat2} from 'gl-matrix';
import { normalize } from "three/src/math/MathUtils.js";


export class OBJMesh{

    constructor (objFilePath, mtlFilePath){
        this.objFilePath = objFilePath;
        this.mtlFilePath = mtlFilePath;
    }

    async load(gl, programInfo){
        this.programInfo = programInfo;
        
        if (!this.mtlFilePath){
            return new Promise((resolve, reject) => {
                const loader = new OBJLoader();
                loader.load('/models/' + this.objFilePath, async (object) => {
                    // console.log(object);
                    const node = this.processModel(gl, object);
                    node.computeBoundingBox();
                    resolve(node);
                    
                });
            })
        }else{
            
            return new Promise((resolve, reject) => {
                const loader = new OBJLoader();
                const mtlLoader = new MTLLoader();
                mtlLoader.load('/models/' + this.mtlFilePath, async (materials) => {
                    materials.preload();
                    loader.setMaterials(materials);
                    loader.load('/models/' + this.objFilePath, async (object) => {
                        // console.log(object);
                        await this.waitForTexturesToLoad(object);
                        const node = this.processModel(gl, object);
                        node.computeBoundingBox();
                        resolve(node);
                        
                    });
                });
            });
        }
    }


    waitForTexturesToLoad(object) {
        const materialsToCheck = [];

        object.traverse((child) => {
            if (child.isMesh) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    ['map', 'ambientMap', 'specularMap', 'emissiveMap', 'shininessMap', 'alphaMap', 'bumpMap', 'displacementMap', 'stencilMap'].forEach((mapKey) => {
                        if (material[mapKey] && !material[mapKey].image) {
                            materialsToCheck.push(material[mapKey]);
                            
                        }
                    });
                });
            }
        });

        return new Promise((resolve) => {
            const checkTextures = () => {
                const allLoaded = materialsToCheck.every((map) => map.image && map.image.complete);

                if (allLoaded) {
                    resolve();
                } else {
                    
                    setTimeout(checkTextures, 100);
                    
                }
            };

            checkTextures();
        });
    }


    processModel(gl, object) {
        var rootNode = new SceneNode("obj_root", null, null, null, null, null, null, false);
        // var sceneGraph = new SceneGraph(rootNode);
        let that = this;

        function splitMeshByGroups(mesh, gl) {
            const geometry = mesh.geometry;
            const materials = mesh.material;
            const groups = geometry.groups;

            if (!groups || !Array.isArray(materials)) {
                // Single material or no groups
                return [mesh];
            }

            const meshes = [];

            groups.forEach((group, index) => {
                const start = group.start;
                const count = group.count;
                const material = materials[group.materialIndex];

                const newGeometry = new THREE.BufferGeometry();
                const position = geometry.attributes.position.array.slice(start * 3, (start + count) * 3);
                const normal = geometry.attributes.normal ? geometry.attributes.normal.array.slice(start * 3, (start + count) * 3) : null;
                const uv = geometry.attributes.uv ? geometry.attributes.uv.array.slice(start * 2, (start + count) * 2) : null;
                const tangent = geometry.attributes.tangent ? geometry.attributes.tangent.array.slice(start * 3, (start + count) * 3) : null;
                
                newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
                if (normal) newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
                if (uv) newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
                if(tangent) newGeometry.setAttribute('tangent', new THREE.Float32BufferAttribute(tangent, 3));

                if (geometry.index) {
                    const indices = geometry.index.array.slice(start, start + count);
                    newGeometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1));
                }

                const newMesh = new THREE.Mesh(newGeometry, material);
                meshes.push(newMesh);
            });

            return meshes;
        }

        function traverseThreeJSNode(threeNode, parentNode) {
            if (threeNode.isMesh) {
                const meshes = splitMeshByGroups(threeNode, gl);

                meshes.forEach(mesh => {
                    const geometry = mesh.geometry;
                    const material = mesh.material;

                    const vertices = (geometry.attributes.position) ? geometry.attributes.position.array : [];
                    const uvs = (geometry.attributes.uv) ? geometry.attributes.uv.array : null;
                    const normals = (geometry.attributes.normal) ? geometry.attributes.normal.array : null;
                    const indices = (geometry.index) ? geometry.index.array : null;
                    const tangents = (geometry.attributes.tangent) ? geometry.attributes.tangent.array : null;
                    
                    const localMatrix = (mesh.matrix) ? mesh.matrix.elements : mat4.create();
                    const worldMatrix = (mesh.matrixWorld) ? mesh.matrixWorld.elements : mat4.create();
                    
                    const drawInfo = {
                        position: {
                            data: vertices,
                            numComponents: geometry.attributes.position.itemSize,
                            normalized: geometry.attributes.position.normalized
                        },
                        uv: uvs ? {
                            data: uvs,
                            numComponents: geometry.attributes.uv.itemSize,
                            normalized: geometry.attributes.uv.normalized
                        } : {
                            data: generatePlanarUVs(vertices),
                            numComponents: 2,
                            normalized: false
                        },
                        normal: normals ? {
                            data: normals,
                            numComponents: geometry.attributes.normal.itemSize,
                            normalized: geometry.attributes.normal.normalized
                        } : {
                            data: (indices) ? computeVertexNormalsForIndexedGeometry(vertices, indices) : computeVertexNormalsNonIndexed(vertices),
                            numComponents: 3,
                            normalized: false
                        },
                        tangent: tangents ? {
                            data: tangents,
                            numComponents: geometry.attributes.tangent.itemSizes,
                            normalized: geometry.attributes.tangent.normalized
                        } : null,
                        indices: indices ? {
                            data: indices,
                            numComponents: geometry.index.itemSize
                        } : null,
                        mat: that.extractMaterialInfo(gl, material),
                        
                    };
                    if (!drawInfo.tangent){
                        drawInfo.tangent = {
                            data: generateTangents(vertices, drawInfo.uv, indices),
                            numComponents: 3,
                            normalized: false
                        }
                    }
                    drawInfo.bufferInfo = createBufferInfoFromArrays(gl, {
                        position: drawInfo.position,
                        texcoord: drawInfo.uv,
                        normal: drawInfo.normal,
                        tangent: drawInfo.tangent,
                        indices: drawInfo.indices
                    }, { 
                        ...(drawInfo.position && {position: 'position'}),
                        ...(drawInfo.normal && {normal: 'normal'}),
                        ...(drawInfo.uv && {uv: 'texcoord'}),
                        ...(drawInfo.tangent && {tangent: 'tangent'})
                    })

                    
                    
                    const sceneNode = new SceneNode(mesh.name, localMatrix, worldMatrix, null, [], drawInfo, that.programInfo, false, 'sh_bph');
                    parentNode.addChild(sceneNode);
                    sceneNode.setParent(parentNode);
                    // Process children
                    if (mesh.children) {
                        mesh.children.forEach(child => {
                            traverseThreeJSNode(child, sceneNode);
                        });
                    }
                });
            } else {
                // For non-mesh nodes, just create a corresponding SceneNode
                
                const sceneNode = new SceneNode(threeNode.name, threeNode.matrix.elements, threeNode.matrixWorld.elements);
                // console.log('adding ##non## mesh ',  sceneNode.name, ' to ', parentNode.name);
                parentNode.addChild(sceneNode);
                sceneNode.setParent(parentNode);
                            // Process children
                if (threeNode.children) {
                    threeNode.children.forEach(child => {
                        traverseThreeJSNode(child, sceneNode);
                    });
                }
            }

            // // Process children
            // if (threeNode.children) {
            //     threeNode.children.forEach(child => {
            //         traverseThreeJSNode(child, parentNode);
            //     });
            // }
        }
    
        traverseThreeJSNode(object, rootNode);
        
        return rootNode;
    }
    
    
    extractMaterialInfo(gl, material) {
        const defTextures = {
            defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]), // Full white
            defaultBlack: create1PixelTexture(gl, [0, 0, 0, 255]), // Full black
            defaultGray: create1PixelTexture(gl, [128, 128, 128, 255]), // Middle gray
            defaultNormal: create1PixelTexture(gl, [127, 127, 255, 255]), // Normal map neutral normal
            defaultAlpha: create1PixelTexture(gl, [255, 255, 255, 255]) // Full opacity white
        };
        
        
        const defaultMaterial = {
            Ka: [0, 0, 0], // Ambient reflectivity
            Kd: [1, 1, 1], // Diffuse reflectivity
            Ks: [1, 1, 1], // Specular reflectivity
            Ke: [0, 0, 0], // Emissive reflectivity
            Ns: 50, // Specular exponent (shininess)
            Ni: 1.0, // Optical density (refraction index)
            d: 1, // Transparency
        
            map_Ka: defTextures.defaultGray, // Ambient texture map
            map_Kd: defTextures.defaultWhite, // Diffuse texture map
            map_Ks: defTextures.defaultWhite, // Specular texture map
            map_d: defTextures.defaultAlpha, // Alpha texture map with full opacity
            map_bump: defTextures.defaultNormal, // Bump map (normal map)
            map_Ke: defTextures.defaultBlack, // Emissive Map
            map_Ns: defTextures.defaultGray, // Shininess Map
            disp: defTextures.defaultGray, // Displacement Map

            illum: 2 // Illumination method
        };

        const materialInfo = defaultMaterial;
        // Extract ambient color (Ka)
        if (material.ambient) {
            materialInfo.Ka = material.ambient.toArray();
        }
        // Extract diffuse color (Kd)
        if (material.color) {
            materialInfo.Kd = material.color.toArray();
        }
        // Extract specular color (Ks)
        if (material.specular) {
            materialInfo.Ks = material.specular.toArray();
        }
        // Extract emissive color (Ke)
        if (material.emissive) {
            materialInfo.Ke = material.emissive.toArray();
        }
        // Extract specular exponent (Ns)
        if (material.shininess !== undefined) {
            materialInfo.Ns = material.shininess;
        }
        // Extract optical density (Ni)
        if (material.refractionRatio !== undefined) {
            materialInfo.Ni = material.refractionRatio;
        }
        // Extract transparency (d or Tr)
        if (material.opacity !== undefined) {
            materialInfo.d = material.opacity;
        } 
        // Extract illumination model (illum)
        if (material.illum !== undefined) {
            materialInfo.illum = material.illum;
        } 
        // Extract texture maps
        if (material.ambientMap){
            materialInfo.map_Ka = material.ambientMap.image.src;
        }
        if (material.map){
            materialInfo.map_Kd = material.map.image.src;
        }
        if (material.specularMap){
            materialInfo.map_Ks = material.specularMap.image.src;
        }
        if (material.emissiveMap){
            materialInfo.map_Ke = material.emissiveMap.image.src;
        }
        if (material.shininessMap){
            materialInfo.map_Ns = material.shininessMap.image.src;
        }
        if (material.alphaMap){
            materialInfo.map_d = material.alphaMap.image.src;
        }
        if(material.bumpMap){
            materialInfo.map_bump = material.bumpMap.image.src;
        }
        if (material.displacementMap){
            materialInfo.disp = material.displacementMap.image.src;
        }
        return materialInfo;
    }
    

}