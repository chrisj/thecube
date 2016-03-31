importScripts('./asm/marching_cubes.js');

var marchingCubes = Module.cwrap(
  'marching_cubes', 'number', ['number', 'number']
);

var pixelToSegIdPtr;


function setVolumeData(data) {
	console.log('setVolumeData');
	var whatIsThis = Module._malloc(data.byteLength);
	var dataHeap = new Uint8Array(Module.HEAPU8.buffer, whatIsThis, data.byteLength);
	dataHeap.set(new Uint8Array(data.buffer));
	pixelToSegIdPtr = dataHeap.byteOffset;
}

function generateMeshForSegId(segId) {
	var meshPtr = marchingCubes(segId, pixelToSegIdPtr);

	var arrSizeBytes = new Float32Array(Module.HEAPU8.buffer, meshPtr, 1)[0] * 4;

	var start = meshPtr + 4;

	var positions = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);
	var normals = Module.HEAPU8.buffer.slice(start, start += arrSizeBytes);

	Module._free(meshPtr);

	postMessage([segId, positions, normals], [positions, normals]);
}

onmessage = function (e) {
	if (e.data.name === 'volume') {
		setVolumeData(e.data.data);
	} else if (e.data.name === 'segId') {
		generateMeshForSegId(e.data.data);
	} else {
		console.log('invalid message', e);
	}
}