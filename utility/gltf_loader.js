import { loadFile, loadMaterialTextures, generateTangents, create1PixelTexture, computeVertexNormalsForIndexedGeometry,
    computeVertexNormalsNonIndexed, generatePlanarUVs
} from "./utils";
import { createBuffersFromArrays, createAttribsFromArrays, createBufferInfoFromArrays } from "./webgl-utils";
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SceneNode, SceneGraph } from "./scene";
import {mat3, mat4, vec3, vec4, vec2, mat2} from 'gl-matrix';

export class GLTFMesh{

    constructor (filePath){
        this.filePath = filePath;
    }

    async load(gl, programInfo){
        
        this.programInfo = programInfo;
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/models/' + this.filePath, async (object) => {
                console.log(object);
                await this.waitForTexturesToLoad(object.scene);
                const node = this.processModel(gl, object.scene);
                node.computeBoundingBox();
                // sceneGraph.computeBoundingBox();
                resolve(node);
                
            });
        });
    }


    waitForTexturesToLoad(object) {
        const materialsToCheck = [];

        object.traverse((child) => {
            if (child.isMesh) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    ['map', 'ambientMap', 'specularMap', 'emissiveMap', 'shininessMap', 'alphaMap', 'bumpMap', 'displacementMap', 'stencilMap', 'aoMap', 'metalnessMap', 'normalMap', 'roughnessMap'].forEach((mapKey) => {
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
                    });

                    const sceneNode = new SceneNode(mesh.name, localMatrix, worldMatrix, null, [], drawInfo, that.programInfo, false, 'pbr');
                    // console.log('adding mesh ',  sceneNode.name, ' to ', parentNode.name);
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
            color: [1, 1, 1], // Diffuse color
            roughness: 1.0, // Roughness
            metalness: 0.0, // Metalness
            emissive: [0, 0, 0], // Emissive color
            emissiveIntensity: 1.0, // Emissive intensity
            aoMapIntensity: 1.0, // Ambient occlusion intensity
            bumpScale: 1.0, // Bump scale
            displacementScale: 1.0, // Displacement scale
            displacementBias: 0.0, // Displacement bias
            normalScale: [1, 1], // Normal map scale
    
            map: defTextures.defaultWhite, // Diffuse map
            metalnessMap: defTextures.defaultGray, // Metalness map
            roughnessMap: defTextures.defaultGray, // Roughness map
            normalMap: defTextures.defaultNormal, // Normal map
            bumpMap: defTextures.defaultNormal, // Bump map
            displacementMap: defTextures.defaultGray, // Displacement map
            emissiveMap: defTextures.defaultBlack, // Emissive map
            alphaMap: defTextures.defaultAlpha, // Alpha map
            aoMap: defTextures.defaultGray, // Ambient occlusion map
    
            envMap: defTextures.defaultWhite, // Environment map
            lightMap: defTextures.defaultGray, // Light map
    
            envMapIntensity: 1.0, // Environment map intensity
            lightMapIntensity: 1.0, // Light map intensity
    
            flatShading: false, // Flat shading
            wireframe: false, // Wireframe mode
            wireframeLinewidth: 1.0 // Wireframe linewidth
        };
    
        const materialInfo = { ...defaultMaterial };
    
        if (material.color) {
            materialInfo.color = material.color.toArray();
        }
        if (material.roughness !== undefined) {
            materialInfo.roughness = material.roughness;
        }
        if (material.metalness !== undefined) {
            materialInfo.metalness = material.metalness;
        }
        if (material.emissive) {
            materialInfo.emissive = material.emissive.toArray();
        }
        if (material.emissiveIntensity !== undefined) {
            materialInfo.emissiveIntensity = material.emissiveIntensity;
        }
        if (material.aoMapIntensity !== undefined) {
            materialInfo.aoMapIntensity = material.aoMapIntensity;
        }
        if (material.bumpScale !== undefined) {
            materialInfo.bumpScale = material.bumpScale;
        }
        if (material.displacementScale !== undefined) {
            materialInfo.displacementScale = material.displacementScale;
        }
        if (material.displacementBias !== undefined) {
            materialInfo.displacementBias = material.displacementBias;
        }
        if (material.normalScale) {
            materialInfo.normalScale = material.normalScale.toArray();
        }
    
        if (material.map) {
            if (material.map.image && material.map.image.src) {
                materialInfo.map = material.map.image.src;
            } else {
                materialInfo.map = material.map.image;
            }
        }
        if (material.metalnessMap) {
            if (material.metalnessMap.image && material.metalnessMap.image.src) {
                materialInfo.metalnessMap = material.metalnessMap.image.src;
            } else {
                materialInfo.metalnessMap = material.metalnessMap.image;
            }
        }
        if (material.roughnessMap) {
            if (material.roughnessMap.image && material.roughnessMap.image.src) {
                materialInfo.roughnessMap = material.roughnessMap.image.src;
            } else {
                materialInfo.roughnessMap = material.roughnessMap.image;
            }
        }
        if (material.normalMap) {
            if (material.normalMap.image && material.normalMap.image.src) {
                materialInfo.normalMap = material.normalMap.image.src;
            } else {
                materialInfo.normalMap = material.normalMap.image;
            }
        }
        if (material.bumpMap) {
            if (material.bumpMap.image && material.bumpMap.image.src) {
                materialInfo.bumpMap = material.bumpMap.image.src;
            } else {
                materialInfo.bumpMap = material.bumpMap.image;
            }
        }
        if (material.displacementMap) {
            if (material.displacementMap.image && material.displacementMap.image.src) {
                materialInfo.displacementMap = material.displacementMap.image.src;
            } else {
                materialInfo.displacementMap = material.displacementMap.image;
            }
        }
        if (material.emissiveMap) {
            if (material.emissiveMap.image && material.emissiveMap.image.src) {
                materialInfo.emissiveMap = material.emissiveMap.image.src;
            } else {
                materialInfo.emissiveMap = material.emissiveMap.image;
            }
        }
        if (material.alphaMap) {
            if (material.alphaMap.image && material.alphaMap.image.src) {
                materialInfo.alphaMap = material.alphaMap.image.src;
            } else {
                materialInfo.alphaMap = material.alphaMap.image;
            }
        }
        if (material.aoMap) {
            if (material.aoMap.image && material.aoMap.image.src) {
                materialInfo.aoMap = material.aoMap.image.src;
            } else {
                materialInfo.aoMap = material.aoMap.image;
            }
        }
    
        if (material.envMap) {
            if (material.envMap.image && material.envMap.image.src) {
                materialInfo.envMap = material.envMap.image.src;
            } else {
                materialInfo.envMap = material.envMap.image;
            }
        }
        if (material.lightMap) {
            if (material.lightMap.image && material.lightMap.image.src) {
                materialInfo.lightMap = material.lightMap.image.src;
            } else {
                materialInfo.lightMap = material.lightMap.image;
            }
        }
    
        if (material.envMapIntensity !== undefined) {
            materialInfo.envMapIntensity = material.envMapIntensity;
        }
        if (material.lightMapIntensity !== undefined) {
            materialInfo.lightMapIntensity = material.lightMapIntensity;
        }
    
        if (material.flatShading !== undefined) {
            materialInfo.flatShading = material.flatShading;
        }
        if (material.wireframe !== undefined) {
            materialInfo.wireframe = material.wireframe;
        }
        if (material.wireframeLinewidth !== undefined) {
            materialInfo.wireframeLinewidth = material.wireframeLinewidth;
        }
    
        return materialInfo;
    }    
    

}