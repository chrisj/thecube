importScripts('./asm/marching_cubes.js');

// TODO, does this work? (specifying number)
// var marchingCubes = Module.cwrap(
//   'marching_cubes', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']
// );

// var marchingCubesWireframe = Module.cwrap(
//   'marching_cubes_wireframe', 'number', ['number', 'number', 'number', 'number', 'number', 'number']
// );

var dualMarchingCubes = Module.cwrap(
  'dual_marching_cubes', 'number', ['number', 'number']
);

var pixelToSegIdPtr;


function setVolumeData(data) {
	console.log('setVolumeData');
	if (pixelToSegIdPtr) {
		Module._free(pixelToSegIdPtr);
	}

	var whatIsThis = Module._malloc(data.byteLength);
	var dataHeap = new Uint8Array(Module.HEAPU8.buffer, whatIsThis, data.byteLength);
	dataHeap.set(new Uint8Array(data.buffer));
	pixelToSegIdPtr = dataHeap.byteOffset;
}

var dmc_result_struct = {
	quadCount: 'i32',
	vertCount: 'i32',

	vertices: 'float*',
	normals: 'float*',
	triangles: 'i32*'
}

function readStruct (ptr, struct) {
	var res = {};

	for (let key of Object.keys(struct)) {
		res[key] = getValue(ptr, struct[key]);
		ptr += Runtime.getNativeTypeSize(struct[key]);
	}

	return res;
}

function generateMeshForSegId(segId, min, max, callback) {
	console.log('generating mesh for', segId);
	var res = readStruct(dualMarchingCubes(pixelToSegIdPtr, segId), dmc_result_struct);
	console.log('finished', segId, res);

	// var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

	// var start = meshPtr + 4;

	var positions = Module.HEAPU8.buffer.slice(res.vertices, res.vertices + res.vertCount * 3 * 4);

	var normals = Module.HEAPU8.buffer.slice(res.normals, res.normals + res.vertCount * 3 * 4);

	var triangles = Module.HEAPU8.buffer.slice(res.triangles, res.triangles + res.quadCount * 2 * 3 * 4);

	postMessage({ callback: callback, msg: { segId: segId, positions: positions, normals: normals, triangles: triangles, } }, [positions, normals, triangles]);

	Module._free(res.vertices);
	Module._free(res.normals);
	Module._free(res.triangles);
	Module._free(res);
}

// function generateMeshForSegId(segId, min, max, callback) {
// 	console.log('generating mesh for', segId);
// 	var meshPtr = marchingCubes(segId, min.x, min.y, min.z, max.x, max.y, max.z, pixelToSegIdPtr);
// 	console.log('finished', segId);

// 	var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

// 	var start = meshPtr + 4;

// 	var positions = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);
// 	var normals = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);

// 	postMessage({ callback: callback, msg: { segId: segId, positions: positions, normals: normals } }, [positions, normals]);

// 	Module._free(meshPtr);
// }

// function generateWireframeForSegId(segId, origin, callback) {
// 	var meshPtr = marchingCubesWireframe(segId, origin.x, origin.y, origin.z, 100, pixelToSegIdPtr);

// 	var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

// 	var start = meshPtr + 4;

// 	var positions = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);

// 	postMessage({ callback: callback, msg: { wireframe: true, segId: segId, positions: positions } }, [positions]);

// 	Module._free(meshPtr);
// }

onmessage = function (e) {
	if (e.data.name === 'volume') {
		setVolumeData(e.data.data);
	} else if (e.data.msg.name === 'segId') {
		if (e.data.msg.wireframe) {
			// generateWireframeForSegId(e.data.msg.data, e.data.msg.origin, e.data.callback);
		} else {
			generateMeshForSegId(e.data.msg.data, e.data.msg.min, e.data.msg.max, e.data.callback);
		}
	} else {
		console.log('invalid message', e);
	}
}