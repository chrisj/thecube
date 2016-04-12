importScripts('./asm/marching_cubes.js');

var marchingCubes = Module.cwrap(
  'marching_cubes', 'number', ['number', 'number']
);

var marchingCubesWireframe = Module.cwrap(
  'marching_cubes_wireframe', 'number', ['number', 'number']
);

var pixelToSegIdPtr;


function setVolumeData(data) {
	console.log('setVolumeData');
	var whatIsThis = Module._malloc(data.byteLength);
	var dataHeap = new Uint8Array(Module.HEAPU8.buffer, whatIsThis, data.byteLength);
	dataHeap.set(new Uint8Array(data.buffer));
	pixelToSegIdPtr = dataHeap.byteOffset;
}

function generateMeshForSegId(segId, origin, callback) {
	var meshPtr = marchingCubes(segId, pixelToSegIdPtr);

	var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

	var start = meshPtr + 4;

	var positions = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);
	var normals = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);

	postMessage({ callback: callback, segId: segId, positions: positions, normals: normals }, [positions, normals]);

	Module._free(meshPtr);
}

function generateWireframeForSegId(segId, origin, callback) {
	var meshPtr = marchingCubesWireframe(segId, origin.x, origin.y, origin.z, pixelToSegIdPtr);

	var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

	var start = meshPtr + 4;

	var positions = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);

	postMessage({ callback: callback, wireframe: true, segId: segId, positions: positions }, [positions]);

	Module._free(meshPtr);
}

onmessage = function (e) {
	if (e.data.name === 'volume') {
		setVolumeData(e.data.data);
	} else if (e.data.name === 'segId') {

		var meshFunc = e.data.wireframe ? generateWireframeForSegId : generateMeshForSegId;
		meshFunc(e.data.data, e.data.origin, e.data.callback);
	} else {
		console.log('invalid message', e);
	}
}