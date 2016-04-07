var counts = new Int8Array(256 * 256 * 256);

var particleGeo = new THREE.Geometry();

var maxVoxelCount = 200000;

var lastHoverCount = 0;

var pSystem;

function particleInit() {
  for (var i = maxVoxelCount - 1; i >= 0; --i) {
    particleGeo.vertices.push(new THREE.Vector3(-1000, -1000, -1000));
  }

  var sprite = THREE.ImageUtils.loadTexture( "./circle2.png" );

  var pMaterial = new THREE.PointsMaterial({
      color: 0xFFFF00,
      size: 0.005,
      transparent: true,// this doesn't seem to have an affect, maybe it is always on?
      opacity: 1.0,
      sizeAttenuation: true,
      map: sprite,
      // alphaTest: 0.7,
      // blending: THREE.AdditiveBlending,
      // depthTest: false,
      depthWrite: false
  });

  pSystem = new THREE.Points(particleGeo, pMaterial);
  pSystem.frustumCulled = false;

  pSystem.renderOrder = 10000;

  return pSystem;
}

function clearHover(start) {
  start = start || 0; 
  for (var i = start; i < lastHoverCount; i++) {
      particleGeo.vertices[i].set(-1000, -1000, -1000);
  };

  lastHoverCount = start + 1;

  particleGeo.verticesNeedUpdate = true;
}

function drawVoxelSegment(segId, pixelToSegId, segSize) {
  var voxels = [];

  // pSystem.material.size = 0.005 + 0.005 * ((15 - Math.log(segSize)) / 7);

  if (segSize < 5000) {
    pSystem.material.color = new THREE.Color(0x00FF00);
  } else {
    pSystem.material.color = new THREE.Color(0xFFFF00);
  }

  // console.log('opacity', opacity);

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

  var offsetMul = 1 / (CUBE_SIZE * 4);

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

  clearHover(voxelCount - 1);
}
