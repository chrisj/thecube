var counts = new Int8Array(256 * 256 * 256);

var particleGeo = new THREE.Geometry();

var maxVoxelCount = 100000;

var lastHoverCount = 0;

function particleInit() {
  for (var i = maxVoxelCount - 1; i >= 0; --i) {
    particleGeo.vertices.push(new THREE.Vector3(-1000, -1000, -1000));
  }

  var sprite = THREE.ImageUtils.loadTexture( "./circle2.png" );

  var pMaterial = new THREE.PointsMaterial({
      color: 0xFFFF00,
      size: 0.008,
      transparent: true,// this doesn't seem to have an affect, maybe it is always on?
      opacity: 0.5,
      sizeAttenuation: true,
      map: sprite,
      // alphaTest: 0.7,
      blending: THREE.AdditiveBlending,
      // depthTest: false,
      depthWrite: false
  });

  var pSystem = new THREE.Points(particleGeo, pMaterial);
  pSystem.frustumCulled = false;

  pSystem.renderOrder = 1;

  return pSystem;
}

function drawVoxelSegment(segId, pixelToSegId) {
  var voxels = [];

  var start = window.performance.now();

  for (var i = 256 * 256 * 256 - 1; i >= 0; --i) {
    if (pixelToSegId[i] === segId) {
      var selfCount = 0;
      var neighbor = counts[i + 1] <<= 1;
      selfCount += neighbor >>> 31;

      neighbor = counts[i + 256] <<= 1;
      selfCount += neighbor >>> 31;

      neighbor = counts[i + 256 * 256] <<= 1;
      selfCount += neighbor >>> 31;

      counts[i] = -1 << selfCount;

      voxels.push(i);
    }
  }

  var offsetMul = 1 / (CUBE_SIZE * 8);

  var voxelCount = 0;
  var potentialCount = voxels.length;

  for (var i = 0; i < potentialCount; i++) {
    var voxel = voxels[i];

    if (counts[voxel] < -63) {
      counts[voxel] = 0;
      continue;
    }

    counts[voxel] = 0;

    if (voxelCount > maxVoxelCount - 1) {
      break;
    }

    var x = voxel % CUBE_SIZE;
    var z = Math.floor(voxel / (CUBE_SIZE * CUBE_SIZE));
    var y = Math.floor((voxel - z * (CUBE_SIZE * CUBE_SIZE)) / CUBE_SIZE);
    particleGeo.vertices[voxelCount].set(
      x / CUBE_SIZE + (Math.random() - 0.5) * offsetMul,
      y / CUBE_SIZE + (Math.random() - 0.5) * offsetMul,
      z / CUBE_SIZE + (Math.random() - 0.5) * offsetMul
    );
    voxelCount++;
  }

  var end = window.performance.now();

  console.log('time', end - start);//, numTiles, (end - start) / numTiles);

  for (var i = voxelCount - 1; i < lastHoverCount; i++) {
      particleGeo.vertices[i].set(-1000, -1000, -1000);
  };

  lastHoverCount = voxelCount;

  particleGeo.verticesNeedUpdate = true;
}
