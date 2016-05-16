importScripts('./asm/marching_cubes.js');

var dualMarchingCubes = Module.cwrap(
  'dual_marching_cubes', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']
);

var dualMarchingCubesWireframe = Module.cwrap(
  'dual_marching_cubes_wireframe', 'number', ['number', 'number', 'number', 'number', 'number', 'number']
);

var dualMarchingCubesAgg = Module.cwrap(
  'dual_marching_cubes_agg', 'number', []
);

var deselect = Module.cwrap(
  'deselect', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']
);

var clearAgg = Module.cwrap(
  'clear_agg'
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

	// clear agg
	clearAgg();
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
	var structPtr = dualMarchingCubes(pixelToSegIdPtr, segId, min.x, min.y, min.z, max.x, max.y, max.z);
	var res = readStruct(structPtr, dmc_result_struct);

	var positions = Module.HEAPU8.buffer.slice(res.vertices, res.vertices + res.vertCount * 3 * 4);

	var normals = Module.HEAPU8.buffer.slice(res.normals, res.normals + res.vertCount * 3 * 4);

	var triangles = Module.HEAPU8.buffer.slice(res.triangles, res.triangles + res.quadCount * 2 * 3 * 4);

	postMessage({ callback: callback, msg: { segId: segId, positions: positions, normals: normals, triangles: triangles, } }, [positions, normals, triangles]);

	Module._free(res.vertices);
	Module._free(res.normals);
	Module._free(res.triangles);
	Module._free(structPtr);
}

// function generateWireframeForSegId(segId, origin, callback) {
// 	var PREVIEW_SIZE = 3;

// 	var structPtr = dualMarchingCubesWireframe(pixelToSegIdPtr, segId, origin.x, origin.y, origin.z, PREVIEW_SIZE);
// 	var res = readStruct(structPtr, dmc_result_struct);

// 	var positions = Module.HEAPU8.buffer.slice(res.vertices, res.vertices + res.vertCount * 3 * 4);

// 	var triangles = Module.HEAPU8.buffer.slice(res.triangles, res.triangles + res.quadCount * 2 * 3 * 4);

// 	postMessage({ callback: callback, msg: { wireframe: true, segId: segId, positions: positions, triangles: triangles, } }, [positions, triangles]);

// 	Module._free(res.vertices);
// 	Module._free(res.triangles);
// 	Module._free(structPtr);
// }

function generateMeshForAgg(callback) {
	var structPtr = dualMarchingCubesAgg();
	var res = readStruct(structPtr, dmc_result_struct);

	var positions = Module.HEAPU8.buffer.slice(res.vertices, res.vertices + res.vertCount * 3 * 4);

	var normals = Module.HEAPU8.buffer.slice(res.normals, res.normals + res.vertCount * 3 * 4);

	var triangles = Module.HEAPU8.buffer.slice(res.triangles, res.triangles + res.quadCount * 2 * 3 * 4);

	postMessage({ callback: callback, msg: { positions: positions, normals: normals, triangles: triangles, } }, [positions, normals, triangles]);

	Module._free(res.vertices);
	Module._free(res.normals);
	Module._free(res.triangles);
	Module._free(structPtr);
}

// function generateWireframeForSegId(segId, origin, callback) {
// 	var meshPtr = marchingCubesWireframe(segId, origin.x, origin.y, origin.z, 100, pixelToSegIdPtr);

// 	var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

// 	var start = meshPtr + 4;

// 	var positions = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);

// 	postMessage({ callback: callback, msg: { wireframe: true, segId: segId, positions: positions } }, [positions]);

// 	Module._free(meshPtr);
// }

onmessage = function (e) {
	switch (e.data.name) {
		case 'volume':
			setVolumeData(e.data.data);
			break;
		case 'normal':
			generateMeshForSegId(e.data.msg.data, e.data.msg.min, e.data.msg.max, e.data.callback);
			break;
		case 'wireframe':
			// generateWireframeForSegId(e.data.msg.data, e.data.msg.origin, e.data.callback);
			break;
		case 'agg':
			generateMeshForAgg(e.data.callback);
			break;
		case 'deselect':
			var min = e.data.msg.min;
			var max = e.data.msg.max;
			deselect(pixelToSegIdPtr, e.data.msg.segId, min.x, min.y, min.z, max.x, max.y, max.z);
			break;
		default:
			console.log('invalid name', e.data.name);
	}
}