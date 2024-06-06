import { createProgram, createProgramInfo, createProgramFromFiles,
  createUniformSetters, createBufferInfoFromArrays, setBuffersAndAttributes
  , resizeCanvasToDisplaySize,
  setUniforms} from "./utility/webgl-utils";

import {SceneNode, SceneGraph, Camera, initializeCameraForScene, initializeCamera, initializeLightCamera} from "./utility/scene"
import { loadFile, loadShader, linkShaders, assignVertexAttributeData,
   loadImage, loadTexture, radToDeg, degToRad,
    loadMaterialTextures, create1PixelTexture, showImageBitmapInAlert, createDepthTextureAndDepthFrameBuffer} from "./utility/utils";
import { vec2, vec3, vec4, mat2, mat3, mat4 } from 'gl-matrix'

import { OBJMesh } from "./utility/obj_parser";
import { GLTFMesh } from "./utility/gltf_loader";

import { Sphere, Plane, sphereGuy, sphereGuyAnimation, globeCoveredWithGrass, grassRoad, Cube , WireFrameCube} from './utility/mesh_gen';


window.addEventListener('resize', UpdateCanvasSize);
window.addEventListener('load', setUpWebgl);


let canvas = null;
let gl = null;
let camera = null;

let nearFarExtent = 3.48*10;
// let nearFarExtent = 20;
var rotX=0, rotY=0, transZ=5;
let sceneGraph = null;
let sceneCenter = [0, 0, 0];
let cameraSetting = {
  cameraStartingPos: [0, 2, transZ],
  fov: degToRad(60),
  near: (transZ - nearFarExtent/2),
  fat: (transZ + nearFarExtent/2)
}
let sunInitialPos = [-1.5, 2.5, -4];
let lightCamera = null;
let lightNode = null;
let lightSetting ={
  lightStartingPos: sunInitialPos,
  // lightStartingPos: [-5, 2, 0],
  // lightStartingPos: [0, 2.5, 3.5],
  fov: degToRad(90),
  aspect: 1.0,
  near: 1e-1,
  far: 10,
  textureSize: 2048
}

let simpleProgram = null;
let shadowBlinnPhongProgramInfo = null;
let depthMapProgram = null;
let noShadowBlinnPhongProgramInfo = null;
let noLightProgramInfo = null;
let pbrProgram = null;

let currentCanvasWidth = null;
let currentCanvasHieght = null;
function UpdateCanvasSize()
{
  if (!canvas){
    canvas = document.getElementById("glcanvas");
  }
  if (!gl){
    gl = canvas.getContext("webgl");
    if (!gl){
      throw new Error("Webgl is not available");
    }
  }
  
	canvas.style.width  = "100%";
	canvas.style.height = "100%";
	const pixelRatio = window.devicePixelRatio || 1;
	canvas.width  = pixelRatio * canvas.clientWidth;
	canvas.height = pixelRatio * canvas.clientHeight;
	const width  = (canvas.width  / pixelRatio);
	const height = (canvas.height / pixelRatio);
	canvas.style.width  = width  + 'px';
	canvas.style.height = height + 'px';
	gl.viewport( 0, 0, canvas.width, canvas.height );
  currentCanvasWidth = canvas.width;
  currentCanvasHieght = canvas.height;
  
  
  UpdateProjectionMatrix();
}

function UpdateProjectionMatrix()
{
  if (!camera){
    return;
  }
	var r = canvas.width / canvas.height;
	cameraSetting.near = (transZ - nearFarExtent/2);
	const min_n = 1e-4;
	if (cameraSetting.near < min_n ) cameraSetting.near = min_n;
	cameraSetting.far = (transZ + nearFarExtent/2); 
  camera.setPerspective(cameraSetting.fov, r, cameraSetting.near, cameraSetting.far);
  if(sceneGraph)
    render();
}

function setUpEvents(){
  canvas.zoom = (event) => {
    transZ *= event/canvas.height + 1;
    UpdateProjectionMatrix();
    // TODO check this out
    if(sceneGraph)
      render()
  }
	
  canvas.onwheel = (event) => { canvas.zoom(0.3*event.deltaY); } 
  canvas.onmousedown = function() {
		var cx = event.clientX;
		var cy = event.clientY;
		if ( event.ctrlKey ) {
			canvas.onmousemove = function() {
				canvas.zoom(5*(event.clientY - cy));
				cy = event.clientY;
			}
		} else {
			canvas.onmousemove = function() {
				// rotY -= (cx - event.clientX)/canvas.width*5;
				// rotX -= (cy - event.clientY)/canvas.height*5;
				// cx = event.clientX;
				// cy = event.clientY;
        // sceneGraph.getRoot().transformation.rotation[0] = rotX;
        // sceneGraph.getRoot().transformation.rotation[1] = rotY;

        // sceneGraph.update();
				// UpdateProjectionMatrix();


        let rotYdiff = -(cx - event.clientX)/canvas.width*5;
				let rotXdiff = -(cy - event.clientY)/canvas.height*5;
				cx = event.clientX;
				cy = event.clientY;
        sceneGraph.getRoot().applyTransformation(mat4.rotateY(mat4.create(), mat4.rotateX(mat4.create(), mat4.create(), rotXdiff), rotYdiff));
        // let cameraPos = vec3.copy(vec3.create(), camera.position);
        // vec3.rotateX(cameraPos, cameraPos, camera.target, rotXdiff);
        // vec3.rotateY(cameraPos, cameraPos, camera.target, rotYdiff);
        // camera.updatePosition(cameraPos);

        rotX = rotXdiff;
        rotY = rotYdiff;
        // vec3.transformMat4(lightPos, lightPos, mat4.rotateY(mat4.create(), mat4.rotateX(mat4.create(), mat4.create(), rotXdiff), rotYdiff));
        // sceneGraph.update();
				UpdateProjectionMatrix();

			}
		}
	}
	canvas.onmouseup = canvas.onmouseleave = function() {
		canvas.onmousemove = null;
	}
}

var lastUsedProgramInfo = null;
var lastUsedBufferInfo = null;  
function drawNode(node, updateUniforms){

    let drawInfo = node.drawInfo;
    let bindBuffers = false;

    if (lastUsedProgramInfo !== node.getProgramInfo()){
      lastUsedBufferInfo = node.getProgramInfo();
      gl.useProgram(node.getProgramInfo().program);
      bindBuffers = true;
    }
    if (bindBuffers || drawInfo.bufferInfo != lastUsedBufferInfo){
      lastUsedBufferInfo = drawInfo.bufferInfo;
      setBuffersAndAttributes(gl, node.getProgramInfo(), drawInfo.bufferInfo);
    }
    if (updateUniforms){
      setUniforms(node.getProgramInfo(), updateUniforms)
    }

    var primitiveType = (drawInfo.primitiveType) ? drawInfo.primitiveType : gl.TRIANGLES;
    var offset = 0;
    var numElements = drawInfo.bufferInfo.numElements;
    if (drawInfo.indices){
      gl.drawElements(primitiveType, numElements, gl.UNSIGNED_SHORT, offset);
    }else{
      gl.drawArrays(primitiveType, offset, numElements);
    }
}

function fillDepthTexture(){
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneGraph.getDepthFrameBuffer());
  gl.viewport(0, 0, lightSetting.textureSize, lightSetting.textureSize);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  sceneGraph.traverse((node) => {
    if (node.drawInfo){
      
      let modelMat = node.getWorldMatrix();
      if (node.name === 'frustum'){
        modelMat = lightCamera.getFrustumTransformationMatrix();
      }
      const lightMVP = lightCamera.getMVP(modelMat);
      let uniforms = {
        lightMVP: lightMVP
      };

      let drawInfo = node.drawInfo;
      gl.useProgram(depthMapProgram.program);
      setBuffersAndAttributes(gl, depthMapProgram, drawInfo.bufferInfo);
      setUniforms(depthMapProgram, uniforms);

      var primitiveType = (drawInfo.primitiveType) ? drawInfo.primitiveType : gl.TRIANGLES;
      var offset = 0;
      var numElements = drawInfo.bufferInfo.numElements;
      if (drawInfo.indices){
        gl.drawElements(primitiveType, numElements, gl.UNSIGNED_SHORT, offset);
      }else{
        gl.drawArrays(primitiveType, offset, numElements);
      }
    }
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, currentCanvasWidth, currentCanvasHieght);
  // gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function drawScene(){
  sceneGraph.traverse((node) => {
    if (node.drawInfo){
      if (node.multipleDrawInstance){
        let modelMats = node.getInstancesWorldMatrices();
        for (let ii = 0; ii < modelMats.length; ii++){
          let modelMat = modelMats[ii];
          let viewMat = camera.getViewMatrix();
    
          let modelViewMat = mat4.create();
          let normalMat = mat4.create();
          let MVP = camera.getMVP(modelMat);
          mat4.multiply(modelViewMat, viewMat, modelMat);
          mat4.transpose(normalMat, mat4.invert(mat4.create(), modelViewMat));
          
          
          const lightMVP = lightCamera.getMVP(modelMat);

          let updateUniforms = Object.assign({}, {
            MVP: MVP,
            MV: modelViewMat,
            M: modelMat,
            N: normalMat,
            // lightMVP: lightMVP,
            // shadowMap: sceneGraph.getDepthTexture(),
            lightPos: lightCamera.position
          }, node.drawInfo.textureUniforms);
          drawNode(node, updateUniforms);
        }
      }else{
        let modelMat = node.getWorldMatrix();

        if (node.name === 'frustum'){
          modelMat = lightCamera.getFrustumTransformationMatrix();
        }
        let modelViewMat = camera.getModelViewMatrix(modelMat);
        let normalMat = mat4.create();
        let MVP = camera.getMVP(modelMat);
        mat4.transpose(normalMat, mat4.invert(mat4.create(), modelViewMat));


        const lightMVP = lightCamera.getMVP(modelMat);
        let updateUniforms = null;
        if (node.renderingModel === 'simple'){
          updateUniforms = {
            MVP: MVP,
            color: node.drawInfo.color
          };
        }else if (node.name ==='sun'){
          updateUniforms = {
            MVP: MVP,
            ...node.drawInfo.textureUniforms
          }; 
        }else if (node.renderingModel === 'sh_bph'){
          updateUniforms = Object.assign({}, {
            MVP: MVP,
            MV: modelViewMat,
            M: modelMat,
            N: normalMat,
            cameraPos: camera.position,
            lightPos: lightCamera.position,
            lightMVP: lightMVP,
            shadowMap: sceneGraph.getDepthTexture(),
            spotLightDir: lightCamera.getCameraDirection(),
            spotLightInnerLimit: Math.cos(degToRad(radToDeg(lightSetting.fov / 2) - 10)),
            spotLightOuterLimit: Math.cos(degToRad(radToDeg(lightSetting.fov) / 2))
          }, node.drawInfo.textureUniforms);
  
        }else if (node.renderingModel === 'bph'){
          updateUniforms = Object.assign({}, {
            MVP: MVP,
            MV: modelViewMat,
            M: modelMat,
            N: normalMat,
            cameraPos: camera.position,
            lightPos: lightCamera.position,
            spotLightDir: lightCamera.getCameraDirection(),
            spotLightInnerLimit: Math.cos(degToRad(radToDeg(lightSetting.fov / 2) - 10)),
            spotLightOuterLimit: Math.cos(degToRad(radToDeg(lightSetting.fov) / 2))
          }, node.drawInfo.textureUniforms);
        }else if (node.renderingModel === 'pbr'){
        
          const lightPositions = new Float32Array([
            [0, 2, 0]
            // [lightDir[0], lightDir[1], lightDir[2]]
            // [10.0, 10.0, 10.0],
            // [-10.0, 10.0, 10.0],
            // [10.0, -10.0, 10.0],
            // [-10.0, -10.0, 10.0]
          ].flat());
          const lightColors = new Float32Array([
            [1.0, 1.0, 1.0],
            // [1.0, 1.0, 1.0],
            // [1.0, 1.0, 1.0],
            // [1.0, 1.0, 1.0]
          ].flat());
  
          // const ambientLight = new Float32Array([0.1, 0.1, 0.1]);
          const ambientLight = new Float32Array([0.01, 0.01, 0.01]);
  
          updateUniforms = Object.assign({}, {
            MVP: MVP,
            MV: modelViewMat,
            M: modelMat,
            N: normalMat,
            lightPositions: lightPositions,
            lightColors: lightColors,
            ambientLight: ambientLight,
            cameraPos: camera.position,
          }, node.drawInfo.textureUniforms);
        }else{
          console.error('No rendering model specified for node ', node.name);
        }
        drawNode(node, updateUniforms);
      }

    }
  })
}

function render(){
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  lightCamera.updatePosAndTarget(lightNode.getBoundingBoxCenter(), sceneCenter);
  fillDepthTexture();
  drawScene();
}

async function setUpWebgl(){
  if (!canvas){
    canvas = document.getElementById("glcanvas");
  }
  if (!gl){
    gl = canvas.getContext("webgl");
    if (!gl){
      throw new Error("Webgl is not available");
    }
  }
  const ext = gl.getExtension('WEBGL_depth_texture');
  if (!ext) {
    return alert('need WEBGL_depth_texture');
  }

  setUpEvents()
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  // Enable the depth buffer
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);



  if (!camera){
    camera = initializeCamera(cameraSetting.cameraStartingPos, sceneCenter, [0, 1, 0], cameraSetting.fov, canvas.clientWidth, canvas.clientHeight, cameraSetting.near, cameraSetting.far);
    lightCamera = initializeLightCamera(lightSetting.lightStartingPos, sceneCenter, [0, 1, 0], lightSetting.fov, lightSetting.aspect, lightSetting.near, lightSetting.far);
    UpdateCanvasSize()
  }
  


  simpleProgram = await createProgramInfo(gl, ['simple_vsh.vert', 'simple_fsh.frag']);
  noShadowBlinnPhongProgramInfo =  await createProgramInfo(gl, ['bph_vsh.vert', 'bph_fsh.frag']);
  shadowBlinnPhongProgramInfo = await createProgramInfo(gl, ['bph_shadow_vsh.vert', 'bph_shadow_fsh.frag']);
  depthMapProgram = await createProgramInfo(gl, ['depth_vsh.vert', 'depth_fsh.frag']);
  noLightProgramInfo = await createProgramInfo(gl, ['no_light_vsh.vert', 'no_light_fsh.frag']);
  pbrProgram = await createProgramInfo(gl, ['pbr-vsh.vert', 'pbr-fsh.frag']);


  // var programInfo = await createProgramInfo(gl, ['m_pbrver2.vert', 'm_pbrsh2.frag']);
  // var programInfo = await createProgramInfo(gl, ['m_vsh.vert', 'm_mesh_standard_sh.frag']);

  // let myMesh = new GLTFMesh('arash_grass/scene.gltf');
  // let myMesh = new GLTFMesh('grass-gltf/scene.gltf');
  // let myMesh = new GLTFMesh('waterbottle/waterbottle.gltf');
  // let myMesh = new GLTFMesh('skull/scene.gltf');
  // let myMesh = new GLTFMesh('robot/robot.gltf');
  // let myMesh = new OBJMesh('Palm_01/Palm_01.obj', 'Palm_01/Palm_01.mtl');
  // let myMesh = new OBJMesh('obj_Grass/grass.obj', 'obj_Grass/grass2.mtl');
  // let myMesh = new OBJMesh('arash_globe/grass.obj', 'arash_globe/grass.mtl');
  // let myMesh = new OBJMesh('export/green_lawn__corona.obj', 'export/green_lawn__corona.mtl');


  // let myMesh = new OBJMesh('sun/sun.obj', 'sun/sun.mtl');
  // let myMesh = new OBJMesh('date_palm/DatePalm.obj', 'date_palm/DatePalm.mtl');

  // let myMesh = new OBJMesh('Grass/LowPolyGrass.obj', 'Grass/LowPolyGrass.mtl');
  // let myMesh = new OBJMesh('desert_building/H01.obj', 'desert_building/H01.mtl');
  // let myMesh = new OBJMesh('tree9/trees9.obj', 'tree9/trees9.mtl');
  // let myMesh = new OBJMesh('chair/chair.obj', 'chair/chair.mtl');
  // let myMesh = new OBJMesh('nyra/nyra.obj', 'nyra/nyra.mtl');
  let myMesh = new OBJMesh('windmill/windmill.obj', 'windmill/windmill.mtl');
  // let myMesh = new OBJMesh('palm/10446_Palm_Tree_v1_max2010_iteration-2.obj', 'palm/10446_Palm_Tree_v1_max2010_iteration-2.mtl');
  // let myMesh = new OBJMesh('IndoorPotPlant/indoor plant_02.obj', 'IndoorPotPlant/indoor plant_02.mtl'); 
  // let myMesh = new OBJMesh('Tree/Tree.obj', 'Tree/Tree.mtl');
  // let myMesh = new OBJMesh('/teapot/teapot.obj');
  // let myMesh = new OBJMesh('path/travnikova-cesta.obj', 'path/travnikova-cesta.mtl');
  // let myMesh = new OBJMesh('Bush/Bush1.obj', 'Bush/Bush1.mtl');
  // let myMesh = new OBJMesh('fence/13076_Gothic_Wood_Fence_Panel_v2_l3.obj', 'fence/13076_Gothic_Wood_Fence_Panel_v2_l3.mtl');
  // let myMesh = new OBJMesh('wooden_sphere_OBJ/wooden_sphere.obj', 'wooden_sphere_OBJ/wooden_sphere.mtl');
  // let myMesh = new OBJMesh('cloud/Cloud_Polygon_Blender_1.obj', 'cloud/Cloud_Polygon_Blender_1.mtl');
  // let myMesh = new OBJMesh('cloud2/Hi_Clouds_4.obj');
  

  const rootNode = new SceneNode('root', null, null, null, null, null, null, true);
  sceneGraph = new SceneGraph(rootNode);
  lightNode = new SceneNode('light');
  // lightNode.drawInfo.position.data = [0, 0, 0];
  lightNode.setBoundingBox({
    min:vec3.fromValues(0, 0, 0),
    max:vec3.fromValues(0, 0, 0)
  });

  rootNode.addChild(lightNode);
  lightNode.moveCenterTo(lightSetting.lightStartingPos);
  lightCamera.updatePosition(lightNode.getBoundingBoxCenter());
  
  let frustum = WireFrameCube(gl, 'frustum', [0, 1, 0], 2, [0, 0, 255, 255], simpleProgram);
  frustum.computeBoundingBox();
  frustum.updateWorldMatrix();
  

  let plane = Plane(gl, 'plane', [0, 1, 0], 10, [100, 100, 100, 255], null, null, null, null, shadowBlinnPhongProgramInfo);
  plane.computeBoundingBox();
  plane.applyTransformation(mat4.rotateZ(mat4.create(), mat4.create(), -0.01));
  plane.applyTransformation(mat4.rotateX(mat4.create(), mat4.create(), 0.07));
  plane.applyTransformation(mat4.translate(mat4.create(), mat4.create(), [0, -0.03, 0]));
  plane.updateWorldMatrix();
  rootNode.addChild(plane);


  const road = await grassRoad(gl, shadowBlinnPhongProgramInfo);
  const sphereGuyNode = await sphereGuy(gl, shadowBlinnPhongProgramInfo);
  sphereGuyNode.scaleNode(0.04);

  sphereGuyNode.moveCenterTo([sphereGuyNode.getBoundingBoxSize()[0]*0.9, sphereGuyNode.getBoundingBoxSize()[1]*0.53, 0]);
  sphereGuyNode.applyTransformation(mat4.rotateY(mat4.create(), mat4.create(), - Math.PI / 5));
  rootNode.addChild(road);
  rootNode.addChild(sphereGuyNode);
  // rootNode.addChild(frustum);
  sceneGraph.update();
  sceneGraph.computeBoundingBox();
  rootNode.moveCenterTo([0, 1, 0]);
  
  console.log(sceneGraph);

  let sunLoader = new OBJMesh('sun/sun.obj', 'sun/sun.mtl');
  let sun = await sunLoader.load(gl, noLightProgramInfo);
  sun = sun.children[0].children[0];
  sun.rename('sun');
  sun.scaleNode(1/sun.getBoundingBoxExtent());
  sun.moveCenterTo(sunInitialPos);
  rootNode.addChild(sun);

  lightCamera.updateTarget(sphereGuyNode.getBoundingBoxCenter());
  vec3.copy(sceneCenter, sphereGuyNode.getBoundingBoxCenter());



  // let node = await myMesh.load(gl, noShadowBlinnPhongProgramInfo);
  // node.rename('testobj');
  
  // node.moveCenterTo([0, 0 ,0]);
  // console.log(node);

  
  // node.scaleNode(2/node.getBoundingBoxExtent() * 1);


  // let sphere = Sphere(gl, 'sphere', 0.3, [100, 100, 100, 255],null, null, null, null, shadowBlinnPhongProgramInfo);
  // let plane = Plane(gl, 'plane', [0, 1, 0], 10, [100, 100, 100, 255], null, null, null, null, shadowBlinnPhongProgramInfo);
  // let cube = Cube(gl, 'cube', [0, 1, 0], 1, [0, 0, 255, 255], null, null, null, null, shadowBlinnPhongProgramInfo);
  // let frustum = WireFrameCube(gl, 'frustum', [0, 1, 0], 2, [255, 255, 255, 255], simpleProgram);

  // sphere.computeBoundingBox();
  // sphere.updateWorldMatrix();

  // plane.computeBoundingBox();
  // plane.updateWorldMatrix();

  // cube.computeBoundingBox();
  // cube.updateWorldMatrix();

  // frustum.computeBoundingBox();
  // frustum.updateWorldMatrix();


  // rootNode.addChild(node);
  // rootNode.addChild(sphere);
  // rootNode.addChild(plane);
  // // rootNode.addChild(cube);
  // rootNode.addChild(frustum);


  // cube.moveCenterTo([0, -cube.getBoundingBox().min[1], 0]);
  // sphere.moveCenterTo([-1.5, 0.3, 0]);
  // node.moveCenterTo([0, -node.getBoundingBox().min[1], 0]);
  // plane.moveCenterTo([0, 0, 0]);
  // sceneGraph.update();
  // sceneGraph.computeBoundingBox();
  // console.log(sceneGraph);


  

  // const node = await myMesh.load(gl, programInfo);
  // node.rename('skull');
  // rootNode.addChild(node);
  // // sceneGraph.transformNode('root', mat4.translate(mat4.create(), mat4.create(), [0, 0, -3]));
  // sceneGraph.update();
  // sceneGraph.computeBoundingBox();
  // console.log(sceneGraph);
  


  // Load texture unifroms for all nodes
  await loadTextureUniformsForScene(gl, sceneGraph);
  

  let depthInfo = createDepthTextureAndDepthFrameBuffer(gl, lightSetting.textureSize);
  sceneGraph.setDepthTexture(depthInfo.depthTexture);
  sceneGraph.setDepthFrameBuffer(depthInfo.depthFramebuffer);
  render()


  let guyEndTranslation = [-1.14023756980896, -0.11402427405118942, 1.7102586030960083];
  
  function animate(time) {
    requestAnimationFrame(animate);
    // console.log(time)
    // var adjust;
    // var speed = 0.002;
    // var c = time * speed;
    sceneGraph.traverse((node) => {

      // if (node.name === 'root'){
      //   node.transformation.rotation[1] += 0.01;
      //   sceneGraph.update();
      //   lightNode.computeBoundingBox();
      // }

      sphereGuyAnimation(node, 0.004, time);
      if (node.name === "sphere_guy"){
        let step = 0.005;
        node.transformation.translation[0] -= step * 0.3;
        node.transformation.translation[1] -= step * 0.03;
        node.transformation.translation[2] += step * 0.45;
        if (node.transformation.translation[0] < guyEndTranslation[0] && node.transformation.translation[1] < guyEndTranslation[1] && node.transformation.translation[2] > guyEndTranslation[2]){
          node.transformation.translation[0] = guyEndTranslation[0] * -1;
          node.transformation.translation[1] = guyEndTranslation[1] * -1;
          node.transformation.translation[2] = guyEndTranslation[2] * -1;
        }
        sceneGraph.update();
      }

      if (node.name == "sun"){
        node.transformation.rotation[1] += 0.005;
        sceneGraph.update();
      }
      if (node.name === 'light'){
        node.transformation.rotation[1] += 0.005;
        sceneGraph.update();
        lightNode.computeBoundingBox();
      }
      // if (node.name === 'testobj' || node.name === 'sphere' || node.name === 'plane'){
      //   node.transformation.rotation[1] += 0.02;
      //   sceneGraph.update();
      // }

    });
    render();
  }
  animate();
}

async function loadTextureUniformsForScene(gl, sceneGraph){
  await sceneGraph.traverse(async (node) => {
    if (node.drawInfo && node.drawInfo.mat){
      let material = node.drawInfo.mat;
      let textUniforms = await loadMaterialTextures(gl, material);
      node.drawInfo.textureUniforms = textUniforms;
    }
  });
}



