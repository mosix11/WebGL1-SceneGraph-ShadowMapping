
import {sphere, plane, cube} from "primitive-geometry";
import {SceneNode} from "./scene";
import {create1PixelTexture, generateTangents, createCheckerTexture} from "./utils";
import {createBufferInfoFromArrays} from "./webgl-utils"
import { OBJMesh } from "./obj_parser";
import { vec3, vec4, mat3, mat4 } from "gl-matrix";

function getDefaultMaterial(gl){
	const defTextures = {
		defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]), // Full white
		defaultBlack: create1PixelTexture(gl, [0, 0, 0, 255]), // Full black
		defaultGray: create1PixelTexture(gl, [128, 128, 128, 255]), // Middle gray
		defaultNormal: create1PixelTexture(gl, [127, 127, 255, 255]), // Normal map neutral normal
		defaultAlpha: create1PixelTexture(gl, [255, 255, 255, 255]) // Full opacity white
	};
	
	
	const defaultMaterial = {
		Ka: [0.3, 0.3, 0.3], // Ambient reflectivity
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


	return defaultMaterial;
}






export function Sphere(gl, name, radius, color, localMatrix, worldMatrix, parent, children, programInfo){
	const sphereGeometry = sphere({
		radius: radius,
		// nx: 32,
		// ny: 16,
		nx: 128,
		ny: 64,
		theta: Math.PI,
		thetaOffset: 0,
		phi: Math.PI * 2,
		phiOffset: 0,
	});
	let drawInfo = {}
	drawInfo.position = sphereGeometry.positions;
	drawInfo.normal = sphereGeometry.normals;
	drawInfo.uv = sphereGeometry.uvs;
	drawInfo.indices = sphereGeometry.cells;
	drawInfo.tangent = generateTangents(sphereGeometry.positions, sphereGeometry.uvs, sphereGeometry.cells);
	let material = getDefaultMaterial(gl);
	material.map_Kd = create1PixelTexture(gl, color);
	drawInfo.mat = material;
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
	
	let sceneNode = new SceneNode(name, localMatrix, worldMatrix, parent, children, drawInfo, programInfo, false, 'sh_bph');
	return sceneNode

}


export function Cube(gl, name, axis, size, color, localMatrix, worldMatrix, parent, children, programInfo){
	const cubeGeometry = generateCube(axis, size)
	let drawInfo = {}
	drawInfo.position = cubeGeometry.positions;
	drawInfo.normal = cubeGeometry.normals;
	drawInfo.uv = cubeGeometry.uvs;
	drawInfo.indices = null;
	drawInfo.tangent = generateTangents(cubeGeometry.positions, cubeGeometry.uvs, null);
	let material = getDefaultMaterial(gl);
	material.map_Kd = create1PixelTexture(gl, color);
	drawInfo.mat = material;
	drawInfo.bufferInfo = createBufferInfoFromArrays(gl, {
		position: drawInfo.position,
		texcoord: drawInfo.uv,
		normal: drawInfo.normal,
		tangent: drawInfo.tangent,
	}, { 
		...(drawInfo.position && {position: 'position'}),
		...(drawInfo.normal && {normal: 'normal'}),
		...(drawInfo.uv && {uv: 'texcoord'}),
		...(drawInfo.tangent && {tangent: 'tangent'})
	});
	
	let sceneNode = new SceneNode(name, localMatrix, worldMatrix, parent, children, drawInfo, programInfo, false, 'sh_bph');
	return sceneNode

}

export function WireFrameCube(gl, name, axis, size, color, programInfo){
	let cubeGeometry = generateWireframeCube(axis, size);
	let drawInfo = {}
	drawInfo.position = cubeGeometry.positions;
	drawInfo.color = [color[0]/255, color[1]/255, color[2]/255, color[3]/255];
	drawInfo.primitiveType = gl.LINES;
	drawInfo.bufferInfo = createBufferInfoFromArrays(gl, {
		position: drawInfo.position,
	}, { 
		...(drawInfo.position && {position: 'position'}),
	})
	let sceneNode = new SceneNode(name, null, null, null, null, drawInfo, programInfo, false, 'simple');
	return sceneNode;
}


function generateCube(axis = [0, 1, 0], size = 1) {
    const normalizedAxis = vec3.normalize(vec3.create(), axis);
    const tangent = findOrthogonalVector(normalizedAxis);
    const bitangent = vec3.cross(vec3.create(), normalizedAxis, tangent);

    const halfSize = size / 2;

    // Define the positions for a cube centered at the origin
    const positions = [
        // Front face
        -halfSize, -halfSize,  halfSize,
         halfSize, -halfSize,  halfSize,
         halfSize,  halfSize,  halfSize,
        -halfSize, -halfSize,  halfSize,
         halfSize,  halfSize,  halfSize,
        -halfSize,  halfSize,  halfSize,

        // Back face
        -halfSize, -halfSize, -halfSize,
        -halfSize,  halfSize, -halfSize,
         halfSize,  halfSize, -halfSize,
        -halfSize, -halfSize, -halfSize,
         halfSize,  halfSize, -halfSize,
         halfSize, -halfSize, -halfSize,

        // Top face
        -halfSize,  halfSize, -halfSize,
        -halfSize,  halfSize,  halfSize,
         halfSize,  halfSize,  halfSize,
        -halfSize,  halfSize, -halfSize,
         halfSize,  halfSize,  halfSize,
         halfSize,  halfSize, -halfSize,

        // Bottom face
        -halfSize, -halfSize, -halfSize,
         halfSize, -halfSize, -halfSize,
         halfSize, -halfSize,  halfSize,
        -halfSize, -halfSize, -halfSize,
         halfSize, -halfSize,  halfSize,
        -halfSize, -halfSize,  halfSize,

        // Right face
         halfSize, -halfSize, -halfSize,
         halfSize,  halfSize, -halfSize,
         halfSize,  halfSize,  halfSize,
         halfSize, -halfSize, -halfSize,
         halfSize,  halfSize,  halfSize,
         halfSize, -halfSize,  halfSize,

        // Left face
        -halfSize, -halfSize, -halfSize,
        -halfSize, -halfSize,  halfSize,
        -halfSize,  halfSize,  halfSize,
        -halfSize, -halfSize, -halfSize,
        -halfSize,  halfSize,  halfSize,
        -halfSize,  halfSize, -halfSize
    ];

    // Define the normals for each face of the cube
    const normals = [
        // Front
        0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
        // Back
        0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
        // Top
        0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
        // Bottom
        0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
        // Right
        1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
        // Left
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ];

    // Define the UVs for each face of the cube
    const uvs = [
        // Front
        0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
        // Back
        0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
        // Top
        0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
        // Bottom
        0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
        // Right
        0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
        // Left
        0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1
    ];

    // Create the transformation matrix
    const transformMatrix = createTransformMatrix(normalizedAxis, tangent, bitangent);

    // Apply the transformation to the cube positions
    const transformedPositions = [];
    for (let i = 0; i < positions.length; i += 3) {
        const position = vec3.fromValues(positions[i], positions[i + 1], positions[i + 2]);
        vec3.transformMat4(position, position, transformMatrix);
        transformedPositions.push(position[0], position[1], position[2]);
    }

    return {
        positions: transformedPositions,
        normals: normals,
        uvs: uvs
    };
}


function generateWireframeCube(axis = [0, 1, 0], size = 1) {
    const normalizedAxis = vec3.normalize(vec3.create(), axis);
    const tangent = findOrthogonalVector(normalizedAxis);
    const bitangent = vec3.cross(vec3.create(), normalizedAxis, tangent);

    const halfSize = size / 2;

    // Define the vertices for a cube centered at the origin
    const vertices = [
        [-halfSize, -halfSize,  halfSize], // 0
        [ halfSize, -halfSize,  halfSize], // 1
        [ halfSize,  halfSize,  halfSize], // 2
        [-halfSize,  halfSize,  halfSize], // 3
        [-halfSize, -halfSize, -halfSize], // 4
        [ halfSize, -halfSize, -halfSize], // 5
        [ halfSize,  halfSize, -halfSize], // 6
        [-halfSize,  halfSize, -halfSize]  // 7
    ];

    // Define the lines for the edges of the cube
    const edges = [
        // Front face
        0, 1, 1, 2, 2, 3, 3, 0,
        // Back face
        4, 5, 5, 6, 6, 7, 7, 4,
        // Connecting edges
        0, 4, 1, 5, 2, 6, 3, 7
    ];

    // Create the transformation matrix
    const transformMatrix = createTransformMatrix(normalizedAxis, tangent, bitangent);

    // Apply the transformation to the cube vertices
    const transformedPositions = [];
    edges.forEach(index => {
        const vertex = vec3.fromValues(vertices[index][0], vertices[index][1], vertices[index][2]);
        vec3.transformMat4(vertex, vertex, transformMatrix);
        transformedPositions.push(vertex[0], vertex[1], vertex[2]);
    });

    return {
        positions: transformedPositions
    };
}

function generatePlane(axis = [0, 0, 1], size = 1) {
    const normalizedAxis = vec3.normalize(vec3.create(), axis);
    const tangent = findOrthogonalVector(normalizedAxis);
    const bitangent = vec3.cross(vec3.create(), normalizedAxis, tangent);

    const halfSize = size / 2;

    const positions = [
        -halfSize, -halfSize, 0,
         halfSize, -halfSize, 0,
         halfSize,  halfSize, 0,
        -halfSize, -halfSize, 0,
         halfSize,  halfSize, 0,
        -halfSize,  halfSize, 0
    ];

    const normals = new Array(18).fill(0).map((_, i) => normalizedAxis[i % 3]);

    const uvs = [
        0, 0,
        1, 0,
        1, 1,
        0, 0,
        1, 1,
        0, 1
    ];

    const transformedPositions = [];
    for (let i = 0; i < positions.length; i += 3) {
        const position = vec3.fromValues(positions[i], positions[i + 1], positions[i + 2]);
        const transformedPosition = vec3.create();
        vec3.scaleAndAdd(transformedPosition, transformedPosition, tangent, position[0]);
        vec3.scaleAndAdd(transformedPosition, transformedPosition, bitangent, position[1]);
        vec3.scaleAndAdd(transformedPosition, transformedPosition, normalizedAxis, position[2]);
        transformedPositions.push(...transformedPosition);
    }

    return {
        positions: transformedPositions,
        normals: normals,
        uvs: uvs
    };
}

function findOrthogonalVector(v) {
    if (v[0] === 0 && v[1] === 0) {
        return vec3.fromValues(1, 0, 0);
    }
    return vec3.normalize(vec3.create(), vec3.fromValues(-v[1], v[0], 0));
}

function createTransformMatrix(normalizedAxis, tangent, bitangent) {
    const transformMatrix = mat4.create();

    transformMatrix[0] = tangent[0];
    transformMatrix[1] = tangent[1];
    transformMatrix[2] = tangent[2];

    transformMatrix[4] = bitangent[0];
    transformMatrix[5] = bitangent[1];
    transformMatrix[6] = bitangent[2];

    transformMatrix[8] = normalizedAxis[0];
    transformMatrix[9] = normalizedAxis[1];
    transformMatrix[10] = normalizedAxis[2];

    return transformMatrix;
}



export function Plane(gl, name, axis, size, color, localMatrix, worldMatrix, parent, children, programInfo){

	const planeGeometry = generatePlane(axis, size);
	let drawInfo = {}
	drawInfo.position = planeGeometry.positions;
	drawInfo.normal = planeGeometry.normals;
	drawInfo.uv = planeGeometry.uvs;
	drawInfo.indices = null;
	drawInfo.tangent = generateTangents(planeGeometry.positions, planeGeometry.uvs, null);
	let material = getDefaultMaterial(gl);

	// material.map_Kd = create1PixelTexture(gl, color);
	material.map_Kd = createCheckerTexture(gl);
	material.map_Ka = createCheckerTexture(gl);
	material.Ks = [0.1, 0.1, 0.1];

	drawInfo.mat = material;
	drawInfo.bufferInfo = createBufferInfoFromArrays(gl, {
		position: drawInfo.position,
		texcoord: drawInfo.uv,
		normal: drawInfo.normal,
		tangent: drawInfo.tangent,
	}, { 
		...(drawInfo.position && {position: 'position'}),
		...(drawInfo.normal && {normal: 'normal'}),
		...(drawInfo.uv && {uv: 'texcoord'}),
		...(drawInfo.tangent && {tangent: 'tangent'})
	})

	let sceneNode = new SceneNode(name, localMatrix, worldMatrix, parent, children, drawInfo, programInfo, false, 'sh_bph');
	return sceneNode
}

export async function grassRoad(gl, programInfo){
	let sceneNode = new SceneNode('road');
	let roadLoader = new OBJMesh('path/travnikova-cesta.obj', 'path/travnikova-cesta.mtl');


	let road1 = await roadLoader.load(gl, programInfo);
	road1 = road1.children[0].children[0];
	road1.rename('road3');
	road1.scaleNode(2 / (road1.getBoundingBoxExtent()));

	road1.moveCenterTo([0, 0, 0]);
	road1.computeBoundingBox();
	let roadExtent = road1.getBoundingBoxExtent();
	let roadSize = road1.getBoundingBoxSize();

	let road2 = await roadLoader.load(gl, programInfo);
	road2 = road2.children[0].children[0];
	road2.rename('road1');
	road2.scaleNode(2 / (road2.getBoundingBoxExtent()));
	// road2.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 6))
	road2.moveCenterTo([roadSize[0]*0.643, roadSize[1]*0.80, roadSize[2]*0.7]);

	let road3 = await roadLoader.load(gl, programInfo);
	road3 = road3.children[0].children[0];
	road3.rename('road5')
	road3.scaleNode(2 / (road3.getBoundingBoxExtent()));
	road3.moveCenterTo([-roadSize[0]*0.643, -roadSize[1]*0.80, -roadSize[2]*0.7]);

	let road4 = await roadLoader.load(gl, programInfo);
	road4 = road4.children[0].children[0];
	road4.rename('road4')
	road4.scaleNode(2 / (road4.getBoundingBoxExtent()));
	road4.moveCenterTo([roadSize[0]*0.335, -roadSize[1]*0.165, 0]);

	let road5 = await roadLoader.load(gl, programInfo);
	road5 = road5.children[0].children[0];
	road5.rename('road2')
	road5.scaleNode(2 / (road5.getBoundingBoxExtent()));
	road5.moveCenterTo([roadSize[0]*0.335 + roadSize[0]*0.643, -roadSize[1]*0.165 + roadSize[1]*0.80, roadSize[2]*0.7]);
	
	let road6 = await roadLoader.load(gl, programInfo);
	road6 = road6.children[0].children[0];
	road6.rename('road6')
	road6.scaleNode(2 / (road6.getBoundingBoxExtent()));
	road6.moveCenterTo([roadSize[0]*0.335-roadSize[0]*0.643, -roadSize[1]*0.165 -roadSize[1]*0.80,  -roadSize[2]*0.7]);

	sceneNode.addChild(road1);
	sceneNode.addChild(road2);
	sceneNode.addChild(road3);
	sceneNode.addChild(road4);
	sceneNode.addChild(road5);
	sceneNode.addChild(road6);
	sceneNode.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), -Math.PI / 2));

	let treesLoader = new OBJMesh('tree9/trees9.obj', 'tree9/trees9.mtl');
	let trees = await treesLoader.load(gl, programInfo);
	let tree1 = trees.children[0].children[3]; // 4th in pic
	tree1.rename('read4-tree1');
	let tree2 = trees.children[0].children[4]; // 1st in pic
	tree2.rename('road3-tree2')
	let tree3 = trees.children[0].children[5]; // 7th in pic
	let tree4 = trees.children[0].children[6]; // 2nd in pic
	tree4.rename('road2-tree4');
	let tree5 = trees.children[0].children[7]; // 8th in pic
	let tree6 = trees.children[0].children[0]; // 5th in pic
	tree6.rename('road4-tree6');
	let tree7 = trees.children[0].children[1]; // 3rd in pic
	tree7.rename('road3-tree7');
	let tree8 = trees.children[0].children[2]; // 6th in pic

	let trees2 = await treesLoader.load(gl, programInfo);
	let tree11 = trees2.children[0].children[3]; // 4th in pic
	tree11.rename('road5-tree1');
	let tree22 = trees2.children[0].children[4]; // 1st in pic
	tree22.rename('road6-tree2');
	let tree44 = trees2.children[0].children[6]; // 2nd in pic
	tree44.rename('road5-tree4');

	let trees3 = await treesLoader.load(gl, programInfo);
	let tree111 = trees3.children[0].children[3]; // 4th in pic
	tree111.rename('road1-tree1');
	let tree222 = trees3.children[0].children[4]; // 1st in pic
	tree222.rename('road1-tree2');
	let tree444 = trees3.children[0].children[6]; // 2nd in pic
	tree444.rename('road3-tree4');
	

	
	road1.addChild(tree2);
	tree2.scaleNode(0.6);
	tree2.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree2.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), vec3.scale(vec3.create(), [-tree2.getBoundingBoxSize()[0]*0.9, 0, tree2.getBoundingBoxSize()[2]], 0.5)));
	
	road1.addChild(tree7)
	tree7.scaleNode(0.85);
	tree7.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree7.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [tree7.getBoundingBoxSize()[0]*0.25, tree7.getBoundingBoxSize()[1]*0.8, tree7.getBoundingBoxSize()[2]* 0.55]));


	road5.addChild(tree4);
	tree4.scaleNode(0.8);
	tree4.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree4.moveCenterTo(vec3.add(vec3.create(), road5.getBoundingBoxCenter(), vec3.scale(vec3.create(), [tree4.getBoundingBoxSize()[0]*0.9, 0, tree4.getBoundingBoxSize()[2]], 0.55)));


	road4.addChild(tree1);
	tree1.scaleNode(1.2)
	tree1.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree1.moveCenterTo(vec3.add(vec3.create(), road4.getBoundingBoxCenter(), vec3.scale(vec3.create(), [tree1.getBoundingBoxSize()[0]*1.1, 0, tree1.getBoundingBoxSize()[2]], 0.55)));


	road4.addChild(tree6);
	// tree6.scaleNode(1);
	tree6.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree6.moveCenterTo(vec3.add(vec3.create(), road4.getBoundingBoxCenter(), vec3.scale(vec3.create(), [tree6.getBoundingBoxSize()[0]*2, tree6.getBoundingBoxSize()[0]*2, tree6.getBoundingBoxSize()[2]*1.2], 0.55)));


	road6.addChild(tree22);
	tree22.scaleNode(0.65);
	tree22.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree22.moveCenterTo(vec3.add(vec3.create(), road6.getBoundingBoxCenter(), vec3.scale(vec3.create(), [-tree22.getBoundingBoxSize()[0]*0.7, 0, tree22.getBoundingBoxSize()[2]], 0.47)));
	tree22.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 2));

	road3.addChild(tree44);
	tree44.scaleNode(0.9);
	tree44.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree44.moveCenterTo(vec3.add(vec3.create(), road3.getBoundingBoxCenter(), [-tree44.getBoundingBoxSize()[0]*1.2, tree44.getBoundingBoxSize()[1] * 0.33, tree44.getBoundingBoxSize()[2] * 0.45]));
	tree44.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3));

	road3.addChild(tree11);
	tree11.scaleNode(1.3);
	tree11.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree11.moveCenterTo(vec3.add(vec3.create(), road3.getBoundingBoxCenter(), [tree11.getBoundingBoxSize()[0]*1, tree11.getBoundingBoxSize()[1] * 0.44, tree11.getBoundingBoxSize()[2] * 0.5]));
	tree11.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3));


	road2.addChild(tree222);
	tree222.scaleNode(0.7);
	tree222.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree222.moveCenterTo(vec3.add(vec3.create(), road2.getBoundingBoxCenter(), [-tree222.getBoundingBoxSize()[0]*0.17, -tree222.getBoundingBoxSize()[2] * 0.33, tree222.getBoundingBoxSize()[2]*0.55]));
	tree222.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI));

	road2.addChild(tree111);
	tree111.scaleNode(1.5);
	tree111.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree111.moveCenterTo(vec3.add(vec3.create(), road2.getBoundingBoxCenter(), [tree111.getBoundingBoxSize()[0]*0.4, -tree111.getBoundingBoxSize()[1] * 0.25, tree111.getBoundingBoxSize()[2] * 0.6]));
	tree111.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI));

	road1.addChild(tree444)
	tree444.scaleNode(0.85);
	tree444.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI / 2));
	tree444.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [tree444.getBoundingBoxSize()[0], tree444.getBoundingBoxSize()[1]*0.8, tree444.getBoundingBoxSize()[2]* 0.47]));
	tree444.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI));



	let bushLoader = new OBJMesh('Bush/Bush1.obj', 'Bush/Bush1.mtl');
	let bush1 = await bushLoader.load(gl, programInfo);
	bush1 = bush1.children[0];


	road1.addChild(bush1);
	bush1.scaleNode(2);
	bush1.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), Math.PI/2));
	bush1.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), vec3.scale(vec3.create(), [-bush1.getBoundingBoxSize()[0], 0, bush1.getBoundingBoxSize()[2]*1.2], 0.7)));


	
	let fenceLoader = new OBJMesh('fence/13076_Gothic_Wood_Fence_Panel_v2_l3.obj', 'fence/13076_Gothic_Wood_Fence_Panel_v2_l3.mtl');


	let fence3 = await fenceLoader.load(gl, programInfo);
	fence3.scaleNode(16 / (fence3.getBoundingBoxExtent()))
	fence3.rename('road3-fence1');
	road1.addChild(fence3);
	fence3.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68 ));
	fence3.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	fence3.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [fence3.getBoundingBoxSize()[0]*0.1, fence3.getBoundingBoxSize()[1]*1.11, fence3.getBoundingBoxSize()[2]*0.71]));


	let fence1 = await fenceLoader.load(gl, programInfo);
	fence1.scaleNode(16 / (fence1.getBoundingBoxExtent()))
	fence1.rename('road3-fence2');
	road1.addChild(fence1);
	fence1.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68));
	fence1.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	fence1.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence1.getBoundingBoxSize()[0]*0.75, fence1.getBoundingBoxSize()[1]*0.24, fence1.getBoundingBoxSize()[2]*0.63]));

	let fence2 = await fenceLoader.load(gl, programInfo);
	fence2.scaleNode(16 / (fence2.getBoundingBoxExtent()))
	fence2.rename('road3-fence3');
	road1.addChild(fence2);
	fence2.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68 ));
	fence2.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	// fence2.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence2.getBoundingBoxSize()[0]*1.61, -fence2.getBoundingBoxSize()[1]*0.68, fence2.getBoundingBoxSize()[2]*0.55]));
	fence2.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence2.getBoundingBoxSize()[0]*1.72, -fence2.getBoundingBoxSize()[1]*0.74, fence2.getBoundingBoxSize()[2]*0.55]));


	let fence33 = await fenceLoader.load(gl, programInfo);
	fence33.scaleNode(16 / (fence33.getBoundingBoxExtent()))
	fence33.rename('road1-fence1');
	road2.addChild(fence33);
	fence33.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68 ));
	fence33.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	fence33.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [fence33.getBoundingBoxSize()[0]*0.1, fence33.getBoundingBoxSize()[1]*1.11, fence33.getBoundingBoxSize()[2]*0.71]));


	let fence11 = await fenceLoader.load(gl, programInfo);
	fence11.scaleNode(16 / (fence11.getBoundingBoxExtent()))
	fence11.rename('road1-fence2');
	road2.addChild(fence11);
	fence11.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68));
	fence11.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	fence11.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence11.getBoundingBoxSize()[0]*0.75, fence11.getBoundingBoxSize()[1]*0.24, fence11.getBoundingBoxSize()[2]*0.63]));

	let fence22 = await fenceLoader.load(gl, programInfo);
	fence22.scaleNode(16 / (fence22.getBoundingBoxExtent()))
	fence22.rename('road1-fence3');
	road2.addChild(fence22);
	fence22.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68 ));
	fence22.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	// fence2.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence2.getBoundingBoxSize()[0]*1.61, -fence2.getBoundingBoxSize()[1]*0.68, fence2.getBoundingBoxSize()[2]*0.55]));
	fence22.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence22.getBoundingBoxSize()[0]*1.72, -fence22.getBoundingBoxSize()[1]*0.74, fence22.getBoundingBoxSize()[2]*0.55]));


	let fence333 = await fenceLoader.load(gl, programInfo);
	fence333.scaleNode(16 / (fence333.getBoundingBoxExtent()))
	fence333.rename('road5-fence1');
	road3.addChild(fence333);
	fence333.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68 ));
	fence333.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	fence333.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [fence333.getBoundingBoxSize()[0]*0.1, fence333.getBoundingBoxSize()[1]*1.11, fence333.getBoundingBoxSize()[2]*0.71]));


	let fence111 = await fenceLoader.load(gl, programInfo);
	fence111.scaleNode(16 / (fence111.getBoundingBoxExtent()))
	fence111.rename('road5-fence2');
	road3.addChild(fence111);
	fence111.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68));
	fence111.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	fence111.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence111.getBoundingBoxSize()[0]*0.75, fence111.getBoundingBoxSize()[1]*0.24, fence111.getBoundingBoxSize()[2]*0.63]));

	let fence222 = await fenceLoader.load(gl, programInfo);
	fence222.scaleNode(16 / (fence222.getBoundingBoxExtent()))
	fence222.rename('road5-fence3');
	road3.addChild(fence222);
	fence222.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), -Math.PI / 68 ));
	fence222.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), Math.PI / 3.1));
	// fence2.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence2.getBoundingBoxSize()[0]*1.61, -fence2.getBoundingBoxSize()[1]*0.68, fence2.getBoundingBoxSize()[2]*0.55]));
	fence222.moveCenterTo(vec3.add(vec3.create(), road1.getBoundingBoxCenter(), [-fence222.getBoundingBoxSize()[0]*1.72, -fence222.getBoundingBoxSize()[1]*0.74, fence222.getBoundingBoxSize()[2]*0.55]));



	sceneNode.computeBoundingBox();
	sceneNode.updateWorldMatrix();
	return sceneNode;
}



export async function globeCoveredWithGrass(gl, programInfo){
	let globeRadius = 1;
	const globe = Sphere(gl, 'globe', globeRadius, [10, 140, 0, 255], null, null, null, null, programInfo);
	globe.computeBoundingBox();

	let grass = await grassLoader.load(gl, programInfo);
	grass = grass.children[0].children[0];
	grass.rename('grass');
	grass.scaleNode(1 / (grass.getBoundingBoxExtent() * 8 ));
	
	console.log(grass);

	let globePerimeter = 2 * globeRadius * Math.PI; 

	let globeExtent = globe.getBoundingBoxExtent();
	let globeSize = globe.getBoundingBoxSize();
	let grassExtent = grass.getBoundingBoxExtent();
	let grassSize = grass.getBoundingBoxSize();
	let offsetFromGlobeCenter = grassSize[1] / 2 + globeRadius - grassSize[1]/5;

	let numGrassForPerimeter = Math.floor(globePerimeter / grassSize[0]) + 1;
	numGrassForPerimeter *= 5;
	let radianChunkPerGrass = 2 * Math.PI / numGrassForPerimeter;

	let totalNumGrasses = numGrassForPerimeter * numGrassForPerimeter;

	
	// console.log(grass);
	// let grassDrawInfo = grass.children[0].children[0].getDrawInfo();
	// // console.log(grassDrawInfo);
	// for (let ii = 0 ; ii < numGrassForPerimeter; ii++){
	// 	let newGrass = new SceneNode('grass'.concat(ii+1), null, null, null, null, grassDrawInfo, programInfo, false, 'bph');
	// 	// let newGrass = new SceneNode('grass'.concat(ii+1));
	// 	newGrass.computeBoundingBox();
	// 	newGrass.moveCenterTo([Math.cos(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter, Math.sin(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter, 0]);
	// 	// newGrass.applyTransformation(mat4.ro)
	// 	globe.addChild(newGrass);

	// }
	const matrixData = new Float32Array(totalNumGrasses * 16);
	const localMatrices = [];
	for (let ii = 0 ; ii < numGrassForPerimeter; ii++){
		for (let jj = 0 ; jj < numGrassForPerimeter; jj++){
			let lm = mat4.clone(grass.localMatrix);
			lm = mat4.multiply(lm, mat4.rotateX(mat4.create(), mat4.create(), jj * radianChunkPerGrass), lm);
			lm = mat4.multiply(lm, mat4.rotateZ(mat4.create(), mat4.create(), ii * radianChunkPerGrass), lm);

			// mat4.translate(lm, lm, [2.0, 2.0, 2.0]);
			let target = [Math.cos(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter,
				Math.sin(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter,
				Math.cos(Math.PI/2 + jj * radianChunkPerGrass) * offsetFromGlobeCenter];

			let displacement = vec3.subtract(vec3.create(), target, grass.getBoundingBoxCenter());
       		mat4.multiply(lm, mat4.translate(mat4.create(), mat4.create(), displacement), lm);

			const byteOffsetToMatrix = (ii * numGrassForPerimeter + jj) * 4;
			const numFloatsForView = 16;
			localMatrices.push(new Float32Array(
				matrixData.buffer,
				byteOffsetToMatrix,
				numFloatsForView));
			// let newGrass = new SceneNode('grass'.concat(ii+1), mat4.copy(mat4.create(), grass.localMatrix), mat4.copy(mat4.create(), grass.worldMatrix), null, null, grass.getDrawInfo(), programInfo, false, 'bph');
			// // let newGrass = new SceneNode('grass'.concat(ii+1));
			// newGrass.computeBoundingBox();
			// newGrass.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), ii * radianChunkPerGrass));
			// newGrass.moveCenterTo([Math.cos(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter, Math.sin(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter, 0]);
			
			// // mat4.rotateZ(newGrass.worldMatrix, newGrass.worldMatrix, ii * radianChunkPerGrass);
			// // newGrass.updateWorldMatrix();
			// // newGrass.computeBoundingBox();
			// // newGrass.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), ii * radianChunkPerGrass/2))
			// globe.addChild(newGrass);
		}
	}
	grass.activateMultipleInstance();
	grass.setInstancesLocalMatrices(localMatrices);
	globe.addChild(grass);
	globe.updateWorldMatrix();

	// for (let ii = 0 ; ii < numGrassForPerimeter; ii++){
	// 	let newGrass = await grassLoader.load(gl, programInfo);
	// 	newGrass = newGrass.children[0].children[1];
	// 	newGrass.rename('grass'.concat(ii+1));
	// 	newGrass.scaleNode(1 / (newGrass.getBoundingBoxExtent() * 4 ));
	// 	newGrass.moveCenterTo([Math.cos(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter, Math.sin(Math.PI/2 + ii * radianChunkPerGrass) * offsetFromGlobeCenter, 0]);
	// 	globe.addChild(newGrass);
	// 	break
	// }

	// globe.addChild(grass);
	// grass.moveCenterTo([0, offsetFromGlobeCenter , 0]);
	return globe;

}


export async function sphereGuy(gl, programInfo){
	// let woodenSphereLoader = new OBJMesh('wooden_sphere_OBJ/wooden_sphere.obj', 'wooden_sphere_OBJ/wooden_sphere.mtl');


  	var sphereGuyNodeDescriptions =
    {
      name: "point between feet",
      draw: false,
      children: [
        {
           name: "waist",
           translation: [0, 3, 0],
           children: [
             {
               name: "torso",
               translation: [0, 2, 0],
               children: [
                 {
                   name: "neck",
                   translation: [0, 1, 0],
                   children: [
                     {
                       name: "head",
                       translation: [0, 1, 0],
                     },
                   ],
                 },
				 {
					name: "stomache",
					translation: [0, -1, 0]
				 },
                 {
                   name: "left-arm",
                   translation: [-1, 0, 0],
                   children: [
                     {
                       name: "left-forearm",
                       translation: [-1, 0, 0],
                       children: [
                         {
                           name: "left-hand",
                           translation: [-1, 0, 0],
                         },
                       ],
                     },
                   ],
                 },
                 {
                   name: "right-arm",
                   translation: [1, 0, 0],
                   children: [
                     {
                       name: "right-forearm",
                       translation: [1, 0, 0],
                       children: [
                         {
                           name: "right-hand",
                           translation: [1, 0, 0],
                         },
                       ],
                     },
                   ],
                 },
               ],
             },
             {
               name: "left-leg",
               translation: [-1, -1, 0],
               children: [
                 {
                   name: "left-calf",
                   translation: [0, -1, 0],
                   children: [
                     {
                       name: "left-foot",
                       translation: [0, -1, 0],
                     },
                   ],
                 }
               ],
             },
             {
               name: "right-leg",
               translation: [1, -1, 0],
               children: [
                 {
                   name: "right-calf",
                   translation: [0, -1, 0],
                   children: [
                     {
                       name: "right-foot",
                       translation: [0, -1, 0],
                     },
                   ],
                 }
               ],
             },
           ],
        },
      ],
    };
	let rootNode = new SceneNode('sphere_guy');
	async function traverse (parent, node){
		let thisNode = null;
		if (node.name === "point between feet"){
			thisNode = new SceneNode(node.name);
			if(node.translation){
				thisNode.transformation.translation = node.translation;
			}
		}else{
			thisNode = Sphere(gl, node.name, 0.5, [120, 100, 0, 255], null, null, null, null, programInfo);

			if (node.translation){
				thisNode.transformation.translation = node.translation;
			}
		}
		parent.addChild(thisNode);
		if (node.children){
			for (let ii = 0 ; ii < node.children.length; ii++){
				await traverse(thisNode, node.children[ii]);
			}
		}
		
	}
	await traverse(rootNode, sphereGuyNodeDescriptions);

	rootNode.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), Math.PI))
	rootNode.updateWorldMatrix();
	rootNode.computeBoundingBox();

	return rootNode;
}

export function sphereGuyAnimation(node, speed, time){
	let adjust;
    let c = time * speed;
	switch(node.name) {
		case 'point between feet':
		  adjust = Math.abs(Math.sin(c));
		  node.transformation.translation[1] = adjust;
		  break;
		case 'left-leg':
		  adjust = Math.sin(c);
		  node.transformation.rotation[0] =  adjust;
		  break;
		case 'right-leg':
		  adjust = Math.sin(c);
		  node.transformation.rotation[0] = -adjust;
		  break;
		case 'left-calf':
		  adjust = Math.sin(c + 0.1) * 0.4;
		  node.transformation.rotation[0] = -adjust;
		  break;
		case 'right-calf':
		  adjust = Math.sin(c + 0.1) * 0.4;
		  node.transformation.rotation[0] = adjust;
		  break;
		case 'left-foot':
		  adjust = Math.sin(c + 0.1) * 0.4;
		  node.transformation.rotation[0] = -adjust;
		  break;
		case 'right-foot':
		  adjust = Math.sin(c + 0.1) * 0.4;
		  node.transformation.rotation[0] = adjust;
		  break;
		case 'left-arm':
		  adjust = Math.sin(c) * 0.4;
		  node.transformation.rotation[2] =  adjust;
		  break;
		case 'right-arm':
		  adjust = Math.sin(c) * 0.4;
		  node.transformation.rotation[2] =  adjust;
		  break;
		case 'left-forearm':
		  adjust = Math.sin(c + 0.1) * 0.4;
		  node.transformation.rotation[2] =  adjust;
		  break;
		case 'right-forearm':
		  adjust = Math.sin(c + 0.1) * 0.4;
		  node.transformation.rotation[2] =  adjust;
		  break;
		case 'left-hand':
		  adjust = Math.sin(c - 0.1) * 0.4;
		  node.transformation.rotation[2] =  adjust;
		  break;
		case 'right-hand':
		  adjust = Math.sin(c - 0.1) * 0.4;
		  node.transformation.rotation[2] =  adjust;
		  break;
		case 'waist':
		  adjust = Math.sin(c) * 0.4;
		  node.transformation.rotation[1] =  adjust;
		  break;
		case 'torso':
		  adjust = Math.sin(c) * 0.4;
		  node.transformation.rotation[1] =  adjust;
		  break;
		case 'neck':
		  adjust = Math.sin(c + 0.25) * 0.4;
		  node.transformation.rotation[1] =  adjust;
		  break;
		case 'head':
		  adjust = Math.sin(c + 0.5) * 0.4;
		  node.transformation.rotation[1] =  adjust;
		  adjust = Math.cos(c * 2) * 0.4;
		  node.transformation.rotation[0] =  adjust;
		  break;
	  
	  }
}





function TriSphere(subdiv)
{
	var faces = [];
	var verts = [];
	verts.push(0,0, 1);
	verts.push(0,0,-1);
	var vpt = 0;
	var vpb = 1;
	var vi = 2;
	for ( var i=1; i<subdiv; ++i ) {
		var a = Math.PI * i / (2*subdiv);
		var z = Math.cos(a);
		var r = Math.sin(a);
		a = 0;
		var da = Math.PI / (2*i);
		var v0t = vpt;
		var v0b = vpb;
		var v1t = vi++;
		var v1b = vi++;
		verts.push(r,0, z);
		verts.push(r,0,-z);
		for ( var s=0; s<4; ++s ) {
			for ( var j=1; j<i; ++j ) {
				a += da;
				var x = Math.cos(a)*r;
				var y = Math.sin(a)*r;
				verts.push( x, y,  z );
				verts.push( x, y, -z );
				faces.push( v0t, vi-2, vi );
				faces.push( v0t, vi, v0t+2 );
				faces.push( v0b, vi-1, vi+1 );
				faces.push( v0b, vi+1, v0b+2 );
				v0t+=2;
				v0b+=2;
				vi+=2;
			}
			if ( s < 3 ) {
				a += da;
				var x = Math.cos(a)*r;
				var y = Math.sin(a)*r;
				verts.push( x, y,  z );
				verts.push( x, y, -z );
				faces.push( v0t, vi-2, vi );
				faces.push( v0b, vi-1, vi+1 );
				vi+=2;
			}
		}
		if ( i > 1 ) {
			faces[ faces.length-7 ] = vpt;
			faces[ faces.length-1 ] = vpb;
		}
		faces.push( vpt, vi-2, v1t );
		faces.push( vpb, vi-1, v1b );
		vpt = v1t;
		vpb = v1b;
	}
	var a = 0;
	var da = Math.PI / (2*subdiv);
	verts.push(1,0,0);
	var v0t = vpt;
	var v0b = vpb;
	var v1 = vi++;
	for ( var s=0; s<4; ++s ) {
		for ( var j=1; j<subdiv; ++j ) {
			a += da;
			var x = Math.cos(a);
			var y = Math.sin(a);
			verts.push( x, y, 0 );
			faces.push( v0t, vi-1, vi );
			faces.push( v0t, vi, v0t+2 );
			faces.push( v0b, vi-1, vi );
			faces.push( v0b, vi, v0b+2 );
			v0t+=2;
			v0b+=2;
			vi++;
		}
		if ( s < 3 ) {
			a += da;
			var x = Math.cos(a);
			var y = Math.sin(a);
			verts.push( x, y, 0 );
			faces.push( v0t, vi-1, vi );
			faces.push( v0b, vi-1, vi );
			vi++;
		}
	}
	if ( subdiv > 1 ) {
		faces[ faces.length-7 ] = vpt;
		faces[ faces.length-1 ] = vpb;
	}
	faces.push( vpt, vi-1, v1 );
	faces.push( vpb, vi-1, v1 );
	return { pos:verts, elems:faces };
}