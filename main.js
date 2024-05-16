import { loadOBJ, loadOBJMTL } from "./utility/utils";

window.addEventListener('resize', setViewPort);
window.addEventListener('load', setUpWebgl);

function setViewPort(){
    const canvas = document.getElementById('mycanvas');
    const gl = canvas.getContext('webgl');
    if (!gl){
        throw new Error('Web GL is not supported!!');
    }
    const pixelRation = window.devicePixelRatio || 1;
    canvas.width = pixelRation * canvas.clientWidth;
    canvas.height = pixelRation * canvas.clientHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
}

async function setUpWebgl(){
    setViewPort()
    const canvas = document.getElementById("mycanvas");
    const gl = canvas.getContext("webgl");

    if (!gl){
        throw new Error("Webgl is not available");
    }

    // try {
    //     var object = await loadOBJ('trees9/trees9.obj');
    //     console.log(object);
    // } catch (error) {
    //     console.error(error);
    // }
    try {
        var object = await loadOBJMTL('Tree1/Tree1.obj', 'Tree1/Tree1.mtl');
        console.log(object);
    } catch (error) {
        console.error(error);
    }

    // object.traverse(function (child) {
    //     if (child.isMesh) {
    //         const geometry = child.geometry;
    
    //         if (geometry.index) {
    //             console.log('Face Vertex Indices:', geometry.index.array);
    //         } else {
    //             // If for some reason the geometry.index is not available
    //             console.log('This mesh does not use indexed geometry.');
    //         }
    
    //         // Accessing other attributes as earlier
    //         if (geometry.attributes.position) {
    //             console.log('Vertex Positions:', geometry.attributes.position.array);
    //         }
    //         if (geometry.attributes.uv) {
    //             console.log('Texture Coordinates:', geometry.attributes.uv.array);
    //         }
    //         if (geometry.attributes.normal) {
    //             console.log('Normals:', geometry.attributes.normal.array);
    //         }
    //     }
    // });
}   