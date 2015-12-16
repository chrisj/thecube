(function (window) {
"use strict";

// constants
var CHUNK_SIZE = 128;
var CUBE_SIZE = 256;

// globals
var assignedTask = null;

var bufferCanvas = document.createElement('canvas');
bufferCanvas.height = bufferCanvas.width = CHUNK_SIZE;
var bufferContext = bufferCanvas.getContext('2d');

var segCanvas = document.createElement('canvas');
segCanvas.height = segCanvas.width = CUBE_SIZE;
var segContext = segCanvas.getContext('2d');

var stagingCanvas = document.createElement('canvas');
stagingCanvas.height = stagingCanvas.width = CUBE_SIZE;
var stagingContext = stagingCanvas.getContext('2d');


var CHUNKS = [
  [0,0,0],
  [1,0,0],
  [0,1,0],
  [1,1,0],
  [0,0,1],
  [1,0,1],
  [0,1,1],
  [1,1,1]
];

// loads all task data and calls done handler when both are complete
function playTask(task, cb) {
  assignedTask = task;

  resetZoom();

  // TODO, setup managers for this task
  var loadSeedMeshes = SegmentManager.loadForTask(task); // TODO, this is ugly

  function loadTaskData(done) {
    waitForAll([
      loadSeedMeshes,
      loadTiles
    ], done);
  }

  loadTaskData(cb);

  // enable the submit task button
  $('#submitTask').click(function () {
    var url = 'https://tasking.eyewire.org/1.0/tasks/' + assignedTask.id + '/testsubmit';
    $.post(url, {
      status: 'finished',
      segments: SegmentManager.selected.join(','),
      duration: 0
    }).done(function (res) {
      $('#accuracyValue').html(res.accuracy + '%');
      $('#results').show();
    });
  });
}

$('#assignTask').click(function () {
  assign($('#taskIdInput').val(), function () {
    $('#results').hide();
  });
});

// kick off the game
function assign(taskId, done) {
  //1029032
  //1043593 no segments to add
  var url = 'https://tasking.eyewire.org/1.0/tasks/testassign';
  if (taskId) {
    url = 'https://tasking.eyewire.org/1.0/tasks/' + taskId + '/testassign';
  }

  $.post(url, function (task) {
      playTask(task, done);
  });
}
assign(332, function () {
  console.log('loaded first cube');
});

///////////////////////////////////////////////////////////////////////////////
/// utils

function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
}

function rgbEqual(rgb1, rgb2) {
  return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
}

function rgbToSegId(rgb) {
  return rgb[0] + rgb[1] * 256 + rgb[2] * 256 * 256;
}

function segIdToRGB(segId) {
  var blue = Math.floor(segId / (256 * 256));
  var green = Math.floor((segId % (256 * 256)) / 256);
  var red = segId % 256;

  return [red, green, blue];
}


var PlaneManager = {
  _defaultOpacity: 0.7,
  _planeOpacity: 0.7,
  get opacity() {
    return this._planeOpacity;
  },
  set opacity(o) {
    this._planeOpacity = o;
    var cPlane = TileManager.getPlane().plane;
    cPlane.material.materials.map(function (material) {
      material.opacity = o;
    });
  }
};

///////////////////////////////////////////////////////////////////////////////
/// classes

var seedColor = [0, 0, 255];
var selectedColor = [0, 255, 0];

// var selectSegIdTween = null;
// var hideSegIdTween = null;

function SegmentProxy(segId) {

  var mesh = SegmentManager.meshes[segId];

  return {
    get opacity() {
      return mesh.material.uniforms.opacity.value;
    },

    set opacity(op) {
      mesh.material.uniforms.opacity.value = op;

      console.log(op);

      var eps = 0.05;

      if (op < eps) {
        mesh.visible = false;
      } else if (op === 1) {
        mesh.visible = true;
        // mesh.material.transparent = false; // TODO, why does this cause the segment to blip?
      } else {
        mesh.visible = true;
        mesh.material.transparent = true;
      }
    }
  }
}

var SegmentManager = {
  // defaults, reset in loadForTask
  selected: [],
  seeds: [],
  // selectedColors: [],
  seedColors: [],
  meshes: {},
  _opacity: 1.0,
  _transparent: false,
  _visible: true,
  _toggleSetting: 1,
  
  get opacity () {
    return this._opacity;
  },

  get transparent () {
    return this._transparent;
  },

  // sets the opacity for all segments
  set opacity (op) {
    this._opacity = op;

    var eps = 0.05;

    if (op < eps) {
      this._visible = false;
    } else if (op === 1) {
      this._visible = true;
      this._transparent = false;
    } else {
      this._visible = true;
      this._transparent = true;
    }

    var _this = this;

    segments.children.map(function (segment) {
      segment.material.uniforms.opacity.value = op;
      segment.visible = _this._visible;
      segment.material.transparent = _this.transparent;
    });
  },

  loadForTask: function (task) {
    this.selected = [];
    this.selectedColors = [];
    this.seeds = task.seeds;
    this.seedColors = task.seeds.map(segIdToRGB);
    this.meshes = {};
    this.hover = undefined;

    segments.remove.apply(segments, segments.children);

    var _this = this;

    function loadSeedMeshes(done) {
      var seedsLoaded = 0;
      _this.seeds.forEach(function (segId) {
        displayMeshForVolumeAndSegId(task.segmentation_id, segId, function () {
          seedsLoaded++;
          if (seedsLoaded === _this.seeds.length) {
            done();
          }
        });
      });
    }

    return loadSeedMeshes;
  },

  isSeed: function (segId) {
    return this.seeds.indexOf(segId) !== -1;
  },
  isSelected: function (segId) {
    return this.selected.indexOf(segId) !== -1;
  },
  hoverSegId: function (segId, startingTile) {
    if (segId === this.hover) {
      return;
    }
    console.log('hover', segId);
    this.hover = segId;

    // clear current voxels
    // hoverContainer.remove.apply(hoverContainer, hoverContainer.children);

    if (this.lastHoverCount) {
      for (var i = 0; i < this.lastHoverCount; i++) {
        particleGeo.vertices[i].set(-1000, -1000, -1000);
      };
    }

    if (segId !== null) {
      this.lastHoverCount = drawVoxelSegment(TileManager.getPlane(), segId, startingTile);
    }

    particleGeo.verticesNeedUpdate = true;

    needsRender = true;
  },
  selectSegId: function (segId, cb) {
    if (segId === 0 || this.isSelected(segId) || this.isSeed(segId)) {
      return;
    }
    this.selected.push(segId);
    // console.log('new select', segId, this.selected);
    this.selectedColors.push(segIdToRGB(segId));
    TileManager.currentTile().draw();
    needsRender = true;

    var _this = this;

    displayMeshForVolumeAndSegId(assignedTask.segmentation_id, segId, function () {
      var duration = 500;

      var indvTweenOut = new TWEEN.Tween(SegmentProxy(segId)).to({ opacity: SegmentManager.opacity }, duration).onUpdate(function () {
        needsRender = true;
      }).start();

      if (cb) {
        cb();
      }
    });
  },

  deselectSegId: function (segId) {
    if (segId === 0 || !this.isSelected(segId)) {
      return;
    }
    var selectedIdx = this.selected.indexOf(segId);
    this.selected.splice(selectedIdx, 1);
    // selectedIdx = this.selectedColors.indexOf(segIdToRGB(segId));
    // this.selectedColors.splice(selectedIdx, 1);

    // console.log('deselect', segId, this.selected, this.selectedColors);

    TileManager.currentTile().draw();


    var duration = 1000;

    // var indvTweenOut = new TWEEN.Tween(PlaneManager).to({ opacity: 0.8 }, duration).onUpdate(function () {
    //   needsRender = true;
    // })
    // .repeat(1)
    // .yoyo(true)
    // .start();

    var segMesh = this.meshes[segId];

    // temporary
    segments.remove(segMesh);
    needsRender = true;
    return;

    var showSeg = new TWEEN.Tween(SegmentProxy(segId)).to({ opacity: 1.0 }, duration / 2)
    .onUpdate(function () {
        needsRender = true;
    })
    .repeat(1)
    .yoyo(true)
    .start();


    var randomX = Math.random() * 8 - 4;
    var randomY = Math.random() * 8 - 4;

    var launchSeg = new TWEEN.Tween(segMesh.position).to({ x: randomX, y: randomY, z: "-5" }, duration)
    .easing(TWEEN.Easing.Cubic.In)
    .onUpdate(function () {
        needsRender = true;
    }).onComplete(function () {
      segments.remove(segMesh);
      segMesh.position.set(0, 0, 0);
    }).start();
  },
  displayMesh: function (segId) {
    segments.add(this.meshes[segId]);
  },
  addMesh: function (segId, mesh) {
    this.meshes[segId] = mesh;
  },
  loaded: function (segId) {
    return this.meshes[segId] !== undefined;
  },
  toggle: function () {
    this._toggleSetting = (this._toggleSetting + 1) % 2;
    this.opacity = this._toggleSetting;

    PlaneManager.opacity = Math.max(PlaneManager._defaultOpacity, 1 - this._toggleSetting);

    needsRender = true;
  }
};

var PLANES_STRING = {
  0: 'xy',
  1: 'xz',
  2: 'zy'
}

var TileManager = {
  planes: null,
  _currentPlane: null,
  initialize: function () {
    if (!this.planes) {
      this.planes = [{str: 'z'}, {str: 'y'}, {str: 'x'}];
    }

    var i = 0;
    this.planes = this.planes.map(function (plane) {
      plane.i = i;
      i++; // stupid hack
      plane.currentTileIdx = null;
      plane.currentTileFloat = null;
      plane.tiles = [];

      return plane;
    });
  },
  getPlane: function () {
    return this.planes[this._currentPlane];
  },
  setPlane: function (plane) {
    this._currentPlane = plane;
    this.planes[(plane  ) % 3].plane.visible = true;
    this.planes[(plane+1) % 3].plane.visible = false;
    this.planes[(plane+2) % 3].plane.visible = false;
    // needsRender = true;


    var plane = this.getPlane();

    this.setCurrentTile(plane, plane.currentTileIdx);
  },
  movePlanes: function (point) {
    var zTile = Math.round((point.z + 0.5) * 256);
    var yTile = Math.round((point.y + 0.5) * 256);
    var xTile = Math.round((point.x + 0.5) * 256);

    this.setCurrentTile(this.planes[0], zTile, true);
    this.setCurrentTile(this.planes[1], yTile, true);
    this.setCurrentTile(this.planes[2], xTile, true);

    // TileManager.setCurrentTile(Math.round((point.z + 0.5) * 256), true);
  },
  currentTile: function () {
    var plane = this.getPlane();
    return plane.tiles[plane.currentTileIdx];
  },
  setCurrentTile: function (plane, i, hard) {
    // var plane = this.getPlane();
    plane.currentTileIdx = i;

    // this._currentTileIdx[this.currentPlane] = i;
    // hard means, also update the float position
    // the float vallue makes scrolling more pleasant
    if (plane.currentTileFloat === undefined || hard) {
      plane.currentTileFloat = i;
    }

    var tileFraction = i / CUBE_SIZE;

    plane.plane.position[plane.str] = tileFraction;

    if (plane.i === this._currentPlane) {
      var curTile = this.currentTile();

      if (curTile) { // TODO this is only for the intiial loading check. Move that somewhere else?
        this.currentTile().draw();
      }
    }

    needsRender = true;
  }
};
TileManager.initialize();

// Tile represents a single 2d 256x256 slice
// since chunks are 128x128, a tile consists of 4 segments and 4 channel iamges.
function Tile(id) {
  this.id = id;
  this.count = 0;
  this.segmentation = {};
  this.channel = {};
}

Tile.prototype.isComplete = function () {
  return this.count === 4;//8; // 4 channel + 4 segmentation
};

// the EyeWire data server returns base 64 strings which need to be converted to javascript images.
function convertBase64ImgToImage(b64String, callback) {
  var imageBuffer = new Image();

  imageBuffer.onload = function () {
    callback(this);
  };

  imageBuffer.src = b64String;
}

// loads all the segmentation and channel images for this tile
// and runs the callback when complete
// tiles are queued for loading to throttle the rate.
Tile.prototype.load = function (data, type, x, y, callback) {
  var _this = this;

  var chunk = y * 2 + x;

  if (_this[type][chunk]) {
    return; // chunk already loaded or in queue
  }

  _this[type][chunk] = true; // mark it as being in progress

  tileLoadingQueue.push(function () {
    convertBase64ImgToImage(data, function (image) {
      _this[type][chunk] = image;
      _this.count++;

      if (_this.isComplete()) { // all tiles have been loaded
        callback(_this);
      }
    });
  });
};

Tile.prototype.drawSegmentation = function () {
  if (!this.isComplete()) {
    console.log('not complete');
    return;
  }

  for (var i = 0; i < 4; i++) {
    var x = i % 2;
    var y = i < 2 ? 0 : 1;

    segContext.drawImage(this.segmentation[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
  }
}

// draw this tile in the 3d view and update the position
Tile.prototype.draw = function () {
  if (!this.isComplete()) {
    console.log('not complete');
    return;
  }

  for (var i = 0; i < 4; i++) {
    var x = i % 2;
    var y = i < 2 ? 0 : 1;

    // stagingContext.drawImage(this.channel[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
    segContext.drawImage(this.segmentation[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
  }

  // highlight();
  TileManager.getPlane().plane.material.materials[5].map.needsUpdate = true; // they all share the same mat so unnecessary to be this specific
  // planes[0].material.materials[5].map.needsUpdate = true;
};

// highlight the seeds and selected segments in the tile 2d view
// returns a new image buffer
function highlight() {
  // copy is a working buffer to add highlights without modifying the original tile data
  var segPixels = segContext.getImageData(0, 0, CUBE_SIZE, CUBE_SIZE).data;
  var channelImageData = stagingContext.getImageData(0, 0, CUBE_SIZE, CUBE_SIZE);
  var channelPixels = channelImageData.data;

  var selectedColors = SegmentManager.selected.map(segIdToRGB);
  var seedColors = SegmentManager.seedColors;

  // get the color for a pixel in the given buffer
  function getColor(buffer, startIndex) {
    return [buffer[startIndex], buffer[startIndex+1], buffer[startIndex+2]];
  }

  // highlights the pixel with the given rgb and alpha
  function setColorAlpha(buffer, startIndex, rgb, alpha) {
    var overlayColor = [rgb[0] * alpha, rgb[1] * alpha, rgb[2] * alpha];

    for (var i = 0; i < 3; i++) {
      buffer[startIndex + i] = overlayColor[i] + buffer[startIndex + i] * (1 - alpha);
    }
  }

  // loop through all the pixels
  for (var j = 0; j < segPixels.length; j += 4) {
    var rgb = getColor(segPixels, j);

    // is the current pixel part of selected segment? if so highlight it
    for (var k = 0; k < seedColors.length; k += 1) {
      if (rgbEqual(seedColors[k], rgb)) {
        setColorAlpha(channelPixels, j, seedColor, 0.5);
      }
    }

    // is the current pixel part of selected segment? if so highlight it
    for (var k = 0; k < selectedColors.length; k += 1) {
      if (rgbEqual(selectedColors[k], rgb)) {
        setColorAlpha(channelPixels, j, selectedColor, 0.5);
      }
    }
  }

  setColorAlpha(channelPixels, 0, [255, 0, 0], 1);

  stagingContext.putImageData(channelImageData, 0, 0);

  // return copy;
}

function drawVoxelSegment(plane, segId, startingTile) {

  var tiles = plane.tiles;

  var segmentRGB = segIdToRGB(segId);

  var thing = {};

  var byteBuffer = new ArrayBuffer(256 * 256 * 256);
  var counts = new Int8Array(byteBuffer);

  var voxelCount = 0;

  var voxels = [];

  function getColor(buffer, startIndex) {
    return [buffer[startIndex], buffer[startIndex+1], buffer[startIndex+2]];
  }

  // direction = 0 (start), 1 up, -1 down
  function recurse(tile, direction) {
    if (tile < 0 || tile >= CUBE_SIZE) {
      return;
    }

    var tileCount = 0;

    // var positionToParticle = {};

    // add voxels
    tiles[tile].drawSegmentation();
    var segPixels = segContext.getImageData(0, 0, CUBE_SIZE, CUBE_SIZE).data;

    for (var j = 0; j < segPixels.length; j += 4) {
      var rgb = getColor(segPixels, j);
      if (rgbEqual(segmentRGB, rgb)) {
          var pixelIdx = j / 4;

          var x = pixelIdx % CUBE_SIZE;
          var y = Math.floor(pixelIdx / CUBE_SIZE);
          var z = tile;


          var selfCount = 0;
          var neighbor = counts[x-1 + y * 256 + z * 256 * 256] <<= 1;
          selfCount += neighbor >>> 31;

          neighbor = counts[x + (y-1) * 256 + z * 256 * 256] <<= 1;
          selfCount += neighbor >>> 31;

          neighbor = counts[x + y * 256 + (z-direction) * 256 * 256] <<= 1;
          selfCount += neighbor >>> 31;

          counts[x + y * 256 + z * 256 * 256] = -1 << selfCount;

          voxels.push([x,y,z]);

          tileCount++;
      }
    }

    if (tileCount > 0) {
      if (direction === 0) {
        recurse(tile - 1, -1);
        recurse(tile + 1, 1);
      } else {
        recurse(tile + direction, direction);
      }
    }
  }


  recurse(startingTile, 0);


  var offsetMul = 1 / (CUBE_SIZE * 4);

  var voxelCount = 0;

  for (var voxel of voxels) {
    var x = voxel[0];
    var y = voxel[1];
    var z = voxel[2];
    if (counts[x + y * 256 + z * 256 * 256] < -63) {
      continue;
    }

    if (voxelCount > maxVoxelCount - 1) {
      break;
    }

    particleGeo.vertices[voxelCount].set(
      x / CUBE_SIZE + (Math.random() - 0.5) * offsetMul,
      y / CUBE_SIZE + (Math.random() - 0.5) * offsetMul,
      z / CUBE_SIZE + (Math.random() - 0.5) * offsetMul
    );
    voxelCount++;
  }

  return voxelCount;
}

// returns the the segment id located at the given x y position of this tile
Tile.prototype.segIdForPosition = function(x, y) {
  this.drawSegmentation();

  var segPixels = segContext.getImageData(0, 0, CUBE_SIZE, CUBE_SIZE).data;
  var start = (y * CUBE_SIZE + x) * 4;
  var rgb = [segPixels[start], segPixels[start+1], segPixels[start+2]];
  return rgbToSegId(rgb);
};

// image operations

// perform the 2d and 3d interactions when selecting a segment
// by default, this will toggle the highlighting of the segment in 2d view,
// the visibility of the segment in 3d view, and the presence of the segment in the selected list (for submission)


///////////////////////////////////////////////////////////////////////////////
/// loading 2d image data

function loadTilesForAxis(axis, startingTile, callback) {
  for (var i = 0; i < CUBE_SIZE; i++) {
    TileManager.planes[axis].tiles[i] = new Tile(i);
  }

  CHUNKS.forEach(function(chunk) {
    // foo(assignedTask.channel_id, chunk, axis, 'channel', [0, CHUNK_SIZE], callback);
    foo(assignedTask.segmentation_id, chunk, axis, 'segmentation', [0, CHUNK_SIZE], callback);
  });
}

function foo(volId, chunk, axis, type, range, callback) {
  var url = "http://cache.eyewire.org/volume/" + volId +
    "/chunk/0/" + chunk[0] + "/" + chunk[1] + "/" + chunk[2] +
    "/tile/" + PLANES_STRING[axis] + "/" + range[0] + ":" + range[1];

  // reorder chunks (x/y/z) so that chunk[2] is our depth, chunk[0] is our left to right and chunk[1] is our top to bottom
  var tmp = chunk[2 - axis];
  chunk[2 - axis] = chunk[2];
  chunk[2] = tmp;

  $.get(url).done(function (tilesRes) {
    for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
      var realTileNum = chunk[2] * CHUNK_SIZE + range[0] + trIdx;

      TileManager.planes[axis].tiles[realTileNum].load(tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
    }
  });
}

///////////////////////////////////////////////////////////////////////////////
/// 3d code

var renderer = new THREE.WebGLRenderer({
  antialias: true,
  // preserveDrawingBuffer: true, // TODO, maybe this is sometimes required if you use ctx.readpixels but since we call it immediately after render, it isn't actually required
  alpha: false,
});
// renderer.state.setDepthTest(false); // TODO, why did we do this?

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
ThreeDView.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();

// scene.fog = new THREE.Fog( 0x000000, 0.5 );

var webGLContainer = document.getElementById('webGLContainer');//$('#webGLContainer');
webGLContainer.appendChild(renderer.domElement);

// THREEJS objects

var camera = (function (perspFov, viewHeight) {

  var realCamera = new THREE.PerspectiveCamera(
    perspFov, // Field of View (degrees)
    window.innerWidth / window.innerHeight, // Aspect ratio (set later) TODO why?
    0.1, // Inner clipping plane // TODO, at 0.1 you start to see white artifacts when scrolling quickly
    // TODO, small inner clipping causes depth buffer issue, lot to read about but really small inner plane destroys z precision
    10 // Far clipping plane
  );

  realCamera.position.set(0, 0, simpleViewHeight(perspFov, viewHeight) / perspFov);
  realCamera.up.set(0, 1, 0);
  realCamera.lookAt(new THREE.Vector3(0, 0, 0));

  function simpleViewHeight(fov, realHeight) {

    function deg2Rad(deg) {
      return deg / 180 * Math.PI;
    }

    var radius = realHeight / Math.sin(deg2Rad(fov)) * Math.sin(deg2Rad((180 - fov) / 2));

    return fov * radius;
  }


  return {
    realCamera: realCamera,
    perspFov: perspFov,
    _viewHeight: viewHeight,
    _fakeViewHeight: simpleViewHeight(perspFov, viewHeight),
    set viewHeight(vH) {
      console.log('viewHeight', vH);
      this._viewHeight = vH;
      this._fakeViewHeight = simpleViewHeight(perspFov, vH);
      this.fov = this.fov; // hahaha
    },
    get viewHeight() {
      return this._viewHeight;
    },
    get fov() {
      return realCamera.fov;
    },
    set fov(fov) {
      realCamera.fov = fov;
      realCamera.position.z = this._fakeViewHeight / fov;
      realCamera.updateProjectionMatrix();
    }
  };
}(40, 2));

scene.add(camera.realCamera);

var pivot = new THREE.Object3D();//new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.1 ), new THREE.MeshNormalMaterial());//
scene.add(pivot);

var cube = new THREE.Object3D();
cube.name = "DA CUBE";
pivot.add(cube);

var light = new THREE.DirectionalLight(0xffffff);
light.name = "pixar light";
light.position.copy(camera.realCamera.position);
scene.add(light);

var cubeShape = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial({visible: false})
);
var wireframe = new THREE.BoxHelper(cubeShape);
wireframe.name = "ol' wires";
wireframe.material.color.set("#888888");
cube.add(wireframe);

var cubeContents = new THREE.Object3D();
cubeContents.position.set(-.5, -.5, -.5);
cube.add(cubeContents);

var segments = new THREE.Object3D();
segments.name = 'is segacious a word?';
cubeContents.add(segments);

// var hoverContainer = new THREE.Object3D();
// cubeContents.add(hoverContainer);

// particle system

var particleGeo = new THREE.Geometry();

var maxVoxelCount = 100000;

for (var i = 0; i < 100000; i++) {
  particleGeo.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
}

var pMaterial = new THREE.ParticleBasicMaterial({
      color: 0xFFFF00,
      size: 0.005,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
});

// var pMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, transparent: true });

var pSystem = new THREE.ParticleSystem(particleGeo, pMaterial);

pSystem.frustumCulled = false;

cubeContents.add(pSystem);




// end of particle system



var controls = new THREE.RotateCubeControls(pivot, camera, SegmentManager, PlaneManager);
controls.rotateSpeed = 4.0;
  // controls.dynamicDampingFactor = 0.5;

// var axis = new THREE.AxisHelper( 2 );
// cube.add(axis);

// for debug
var checkPointsContainer = new THREE.Object3D();
// cubeContents.add(checkPointsContainer);

var checkVoxelGeometry = new THREE.BoxGeometry( 1/256, 1/256, 1/256 );
var checkVoxelMat = new THREE.MeshLambertMaterial( {color: 0xffff00} );

var lineMat = new THREE.LineBasicMaterial({
    color: 0xffff00
});

var lineGeo = new THREE.Geometry();
lineGeo.vertices.push(new THREE.Vector3(0, 0, 0));
lineGeo.vertices.push(new THREE.Vector3(0, 0, -1));

var line = new THREE.Line(lineGeo, lineMat);
// cubeContents.add(line);

var test = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.1 ), new THREE.MeshNormalMaterial({
    transparent: false,
    opacity: 1
  }));
// test.position.set(0, 0, 1);
// planes[0].add(test);


var planeGeo = new THREE.BoxGeometry(1, 1, 1 / CUBE_SIZE);
planeGeo.faceVertexUvs[0][10] = [new THREE.Vector2(1, 1), new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];
planeGeo.faceVertexUvs[0][11] = [new THREE.Vector2(1, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 1)];
{
  var channelTex = new THREE.Texture(
    stagingCanvas,
    undefined,
    undefined,
    undefined,
    THREE.NearestFilter,
    THREE.NearestFilter);
  channelTex.flipY = false;
  
  // TODO, what is the effect of these?
  channelTex.generateMipmaps = false;
  // channelTex.format = THREE.LuminanceFormat; this makes it grayscale

  var imageMat = new THREE.MeshBasicMaterial({
    map: channelTex,
    color: 0xFFFFFF,
    opacity: PlaneManager._defaultOpacity,
    transparent: true,
  });

  // this seems to disable flickering
  imageMat.polygonOffset = true;
  // positive value is pushing the material away from the screen
  imageMat.polygonOffsetFactor = 0.1; // https://www.opengl.org/archives/resources/faq/technical/polygonoffset.htm

  var plainMat = new THREE.MeshBasicMaterial({
    color: 0xCCCCCC,
    opacity: PlaneManager._defaultOpacity,
    transparent: true
  });

  var materials = [
    plainMat,
    plainMat,
    plainMat,
    plainMat,
    imageMat,
    imageMat,
  ];

  var zPlane = TileManager.planes[0];

  zPlane.plane = new THREE.Mesh(planeGeo, new THREE.MeshFaceMaterial(materials));
  zPlane.plane.name = "zzzz go to bed!";
  zPlane.plane.position.x = 0.5;
  zPlane.plane.position.y = 0.5;

  var xPlane = TileManager.planes[2];

  xPlane.plane = new THREE.Mesh(planeGeo, new THREE.MeshFaceMaterial(materials));
  xPlane.plane.name = "x ray, i see everything";
  xPlane.plane.position.z = 0.5;
  xPlane.plane.position.y = 0.5;
  xPlane.plane.rotation.y = -Math.PI / 2; // needed to align tile correctly  (zy plane) haven't thought about it enough but it works

  var yPlane = TileManager.planes[1];

  yPlane.plane = new THREE.Mesh(planeGeo, new THREE.MeshFaceMaterial(materials));
  yPlane.plane.name = "it is only a game";
  yPlane.plane.position.x = 0.5;
  yPlane.plane.position.z = 0.5;
  yPlane.plane.rotation.x = Math.PI / 2;

  var planesHolder = new THREE.Object3D();
  // cubeContents.add(planesHolder);

  planesHolder.add(zPlane.plane);
  planesHolder.add(xPlane.plane);
  planesHolder.add(yPlane.plane);
}

TileManager.setPlane(0);

///////////////////////////////////////////////////////////////////////////////
/// loading 3d mesh data

// loads the mesh for the given segment in the given volume. Calls the done handler
// when the mesh is ready for display. If the mesh is selected or is a seed, it
// displays the segment.
function displayMeshForVolumeAndSegId(volume, segId, done) {
  var doneWrapper = function () {
    if (done) {
      done();
    }
    needsRender = true;
  };

  if (SegmentManager.loaded(segId)) {
    SegmentManager.displayMesh(segId);
    doneWrapper();
  } else {
    var count = CHUNKS.length; // ensure that we have a response for each chunk


    var chunkBinaryData = [];
    var totalLength = 0;
    var lengths = [];

    CHUNKS.forEach(function(chunk, idx) {
      getDataForVolumeXYZAndSegId(volume, chunk, segId, function (data) {
        
        count--;
        if (data) {
          chunkBinaryData[idx] = data;
          totalLength += data.length;
          lengths[idx] = data.length;
        } else {
          chunkBinaryData[idx] = undefined;
          lengths[idx] = 0;
        }
        if (count === 0) {
          console.log('done loading mesh');

          var allData = new Float32Array(totalLength);

          var currentLength = 0;

          for (var i = 0; i < chunkBinaryData.length; i++) {
            var chunk = chunkBinaryData[i];

            if (chunk !== undefined) {
              allData.set(chunk, currentLength);
              currentLength += lengths[i];
            }
          };

          console.log('totalLength', totalLength, lengths);

          var color = SegmentManager.isSeed(segId) ? 'blue' : 'green';
          var shader = $.extend(true, {
            transparent: true
          }, Shaders.idPacked);
          {
            var u = shader.uniforms;
            u.color.value = new THREE.Color(color);
            u.segid.value = segId;
            u.mode.value = 0;
          }

          var material = new THREE.ShaderMaterial(shader);

          material.transparent = false;

          var segmentMesh = new THREE.Segment(
            allData,
            lengths,
            material
          );

          segmentMesh.segId = segId;
          segmentMesh.name = "segId " + segId;

          SegmentManager.addMesh(segId, segmentMesh);

          if (SegmentManager.isSelected(segId) || SegmentManager.isSeed(segId)) {
            SegmentManager.displayMesh(segId);
          } else {
            console.log('not adding mesh');
          }

          doneWrapper();
        }
      });
    });
  }
}



// loads the VOA mesh for the given segment in the given chunk from the EyeWire data server into a Three JS mesh.
// passes the mesh to the done handler as a single argument or passes false if there is no mesh for the given segment in the chunk
function getDataForVolumeXYZAndSegId(volume, chunk, segId, done) {
  var meshUrl = 'http://cache.eyewire.org/volume/' + volume + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segId;

  var req = new XMLHttpRequest();
  req.open("GET", meshUrl, true);
  req.responseType = "arraybuffer";

  req.onload = function (event) {
    var data = req.response;

    if (data) {
      done(new Float32Array(data));
    } else {
      done(false);
    }
  };

  req.send();
}


// start game
// waits for all async functions to call a ca
function waitForAll(asyncFunctions, done) {
  var count = asyncFunctions.length;

  asyncFunctions.forEach(function (f) {
    f(function () {
      count--;

      if (count === 0) {
        done();
      }
    });
  });
}

var loadedStartingTile = false;
var tileLoadingQueue = [];

// load all the tiles for the assigned task
function loadTiles(done) {
  var tileCount = 0;

  var startingTile = assignedTask.startingTile;
  TileManager.setCurrentTile(TileManager.getPlane(), startingTile, true);

  function loadTilesNicely() {
    for (var i = 0; i < 8; i++) {
      var load = tileLoadingQueue.shift();
      if (load) {
        load();
      }
    }

    if (tileCount < CUBE_SIZE * 1) {
      // continue to check for more tiles
      requestAnimationFrame(loadTilesNicely);
    }
  }
  requestAnimationFrame(loadTilesNicely);

  loadTilesForAxis(0, startingTile, function (tile) {
    tileCount++;

    if (tile.id === startingTile) {
      loadedStartingTile = true;
      tile.draw();
      needsRender = true;
    } else if (tile.id === TileManager.getPlane().currentTileIdx) {
      tile.draw();
      needsRender = true;
    }

    if (tileCount === CUBE_SIZE) {
      done();
    }
  });

  // loadTilesForAxis(1, startingTile, function (tile) {
  //   tileCount++;

  //   if (tileCount === CUBE_SIZE) {
  //     done();
  //   }
  // });

  // loadTilesForAxis(2, startingTile, function (tile) {
  //   tileCount++;

  //   if (tileCount === CUBE_SIZE) {
  //     done();
  //   }
  // });

  needsRender = true;
}

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();


var mouseStart = null;

var isZoomed = false;


function mouseup (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // why *2 - 1?
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var duration = Date.now() - mouseStart;
  mouseStart = null;

  // if (duration > 400) {
  //   console.log('too slow', duration);
  //   return;
  // }

  if (key('shift', HELD)) {
      var point = screenToCube(mouse);

      if (point) {
        console.log(point);
        animateToPositionAndZoom(point, 4);
        TileManager.movePlanes(point);
      }
  } else if (key('ctrl', HELD)) {
    // return;
    console.log('checking for segment to remove');
    checkForSegmentClick(event.clientX, event.clientY);
  }
}

function mousemove (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // why *2 - 1?
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;


  if (!mouseStart) {
    selectNeighboringSegment(true);
  }

  // if (!mouseStart) {
  //   checkForTileClick(event);
  // } else {}
}

$(document).stationaryClick(function (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  // checkForTileClick(event, false);

  if (!key('ctrl', HELD) && !key('shift', HELD)) {
    selectNeighboringSegment();
  }
});

function screenToWorld(mouse) {
  var cX = (mouse.x + 1) / 2 * window.innerWidth; // TODO, this will get screwed up with a resize event
  var cY = (mouse.y - 1) / 2 * window.innerHeight * -1;

  pSystem.visible = false;
  var depths = ThreeDView.readBuffer(cX, cY, 1, renderer, scene, camera.realCamera, segments, 'depth');
  pSystem.visible = true;

  var zDepth = depths[0];

  if (zDepth > 0) {
    var vec = new THREE.Vector3(
      mouse.x,
      mouse.y,
      zDepth * 2 - 1
    );

    vec.unproject(camera.realCamera);

    return vec;
  }
}

function worldToCube(vec) {
  vec.applyQuaternion(pivot.quaternion.clone().inverse());
  vec.sub(cube.position);

  return vec;
}

function screenToCube(mouse) {
  var vec = screenToWorld(mouse);
  if (vec) {
    return worldToCube(vec);
  }
}

function between(val, min, max) {
  return val >= min && val <= max;
}

function inCube(x, y, z) {
  return between(x, 0, CUBE_SIZE - 1) &&
    between(y, 0, CUBE_SIZE - 1) &&
    between(z, 0, CUBE_SIZE - 1);
}

function selectNeighboringSegment(mock) {
  var pt1 = screenToCube(mouse);

  if (!pt1) {
    return;
  }

  var start = Date.now();

  var pt2 = worldToCube(camera.realCamera.position.clone());

  pt1.sub(cubeContents.position);
  pt2.sub(cubeContents.position);

  var delta = new THREE.Vector3().subVectors(pt2, pt1);
  delta.normalize();

  var checkVoxels = checkPointsContainer.children;
  for (var i = checkVoxels.length - 1; i >= 0; i--) {
    checkPointsContainer.remove(checkVoxels[i]);
  };

  lineGeo.vertices[0].set(pt1.x, pt1.y, pt1.z);
  lineGeo.vertices[1].set(pt2.x, pt2.y, pt2.z);
  lineGeo.verticesNeedUpdate = true;
  needsRender = true;

  for (var i = 0; i < 10; i++) {
    // todo, do I want to round or floor? I think floor makes more sense for pixel
    var x = Math.floor((pt1.x + delta.x * 1/CUBE_SIZE * i) * CUBE_SIZE);
    var y = Math.floor((pt1.y + delta.y * 1/CUBE_SIZE * i) * CUBE_SIZE);
    var z = Math.floor((pt1.z + delta.z * 1/CUBE_SIZE * i) * CUBE_SIZE);

    if (!inCube(x, y, z)) {
      break;
    }

    var checkPoint = new THREE.Mesh(checkVoxelGeometry, checkVoxelMat);
    checkPoint.position.set((x + 0.5) / CUBE_SIZE, (y + 0.5) / CUBE_SIZE, (z + 0.5) / CUBE_SIZE);
    checkPointsContainer.add(checkPoint);

    // console.log('check', x,y,z);

    var tile = TileManager.planes[0].tiles[z];
    var segId = tile.segIdForPosition(x, y);

    if (segId !== 0 && !SegmentManager.isSelected(segId) && !SegmentManager.isSeed(segId)) {
      if (mock) {
        SegmentManager.hoverSegId(segId, z);
      } else {
        SegmentManager.hoverSegId(segId, z);
        SegmentManager.selectSegId(segId, function () {
          SegmentManager.hoverSegId(null);
        });
      }
      return;
    }
  }

  console.log('could not find a neighbor', Date.now() - start);
}

function checkForTileClick(event, notHover) {
  raycaster.setFromCamera(mouse, camera.realCamera);
  var plane = TileManager.getPlane().plane;
  var intersects = raycaster.intersectObject(plane);

  if (intersects.length === 1) {
    var point = intersects[0].point;
    point.applyQuaternion(pivot.quaternion.clone().inverse());
    point.sub(cube.position);
    point.applyQuaternion(plane.quaternion.clone().inverse());

    var xPixel = Math.floor((point.x + 0.5) * CUBE_SIZE);
    var yPixel = Math.floor((point.y + 0.5) * CUBE_SIZE);

    var tile = TileManager.currentTile();

    if (tile.isComplete()) {
      var segId = tile.segIdForPosition(xPixel, yPixel);

      if (segId === 0) {
        return;
      }

      if (notHover) {
        if (key('ctrl', HELD)) {
          SegmentManager.deselectSegId(segId);
        } else {
          SegmentManager.selectSegId(segId);
        }
      } else {
        SegmentManager.hoverSegId(segId);
      }
      // console.log('hover', segId);
    }

  } else if (intersects.length > 1) {
    console.log('wtf', intersects);
  } else {
    // console.log('no interesects', intersects);
  }
}

function checkForSegmentClick(x, y) {
  wireframe.visible = false;
  var cPlane = TileManager.getPlane();
  cPlane.plane.visible = false;
  pSystem.visible = false;
  var ids = ThreeDView.readBuffer(x, y, 1, renderer, scene, camera.realCamera, segments, 'segid');
  pSystem.visible = true;
  cPlane.plane.visible = true;
  wireframe.visible = true;
  
  for (var i = 0; i < ids.length; i++) {
    var segId = ids[i];
    SegmentManager.deselectSegId(segId);
  };

  
}


function mousedown (event) {
  mouseStart = Date.now();
}

function tileDelta(delta) {
  var currentPlane = TileManager.getPlane();
  currentPlane.currentTileFloat = clamp(currentPlane.currentTileFloat + delta, 0, 255);

  var nextTile = Math.round(currentPlane.currentTileFloat);

  if (nextTile !== currentPlane.currentTileIdx) {
    TileManager.setCurrentTile(TileManager.getPlane(), nextTile);
  }

  if (isZoomed) {
    cube.position[currentPlane.str] = -currentPlane.plane.position[currentPlane.str] + 0.5;
  }
}

function mousewheel( event ) {
  event.preventDefault();
  event.stopPropagation();

  if (event.deltaY > 0) {
    camera.viewHeight /= 19/20;
  } else {
    camera.viewHeight *= 19/20;
  }

  needsRender = true;

  // tileDelta(event.deltaY / 40);
}

document.addEventListener('mouseup', mouseup, false);
document.addEventListener('mousemove', mousemove, false);
document.addEventListener('mousedown', mousedown, false);
document.addEventListener('wheel', mousewheel, false);


function handleChange () {
  needsRender = true;
}

controls.addEventListener('change', handleChange);


function onWindowResize() {
  camera.realCamera.aspect = window.innerWidth / window.innerHeight;
  camera.realCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.handleResize();
  needsRender = true;

  ThreeDView.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener( 'resize', onWindowResize, false );


var animating = false;
var centerPoint = new THREE.Vector2(0, 0);
function animateToPositionAndZoom(point, zoomLevel, reset) {
  if (animating) {
    return;
  }
  animating = true;

  centerPoint.copy(point);
  isZoomed = zoomLevel !== 1;

  var duration = 500;

  new TWEEN.Tween(cube.position).to({x: -point.x, y: -point.y, z: -point.z}, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .onUpdate(function () {
      needsRender = true;
    }).onComplete(function () {
      animating = false;
    }).start();

  // new TWEEN.Tween(camera).to({viewHeight: 2/zoomLevel}, duration)
  //   .easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
  //     needsRender = true;
  //   }).onComplete(function () {
  //     console.log('done animating');
  //     animating = false;
  //   }).start();
}

function resetZoom() {
  camera.viewHeight = 2;
  needsRender = true;
  animateToPositionAndZoom(new THREE.Vector3(0, 0, 0), 1, true);
}

function handleInput() {
  // if (key('x', PRESSED)) {
  //   resetZoom();
  // }
  
  if (key('ctrl', PRESSED)) {
    pSystem.visible = false;
  }
  
  if (key('ctrl', RELEASED)) {
    pSystem.visible = true;
  }

  if (key('a', PRESSED)) {
    SegmentManager.opacity = 0;
    PlaneManager.opacity = 1;
    needsRender = true;
  }

  if (key('s', PRESSED)) {
    SegmentManager.opacity = 1;
    PlaneManager.opacity = PlaneManager._defaultOpacity;
    needsRender = true;
  }

  if (key('d', PRESSED)) {
    SegmentManager.opacity = 1;
    PlaneManager.opacity = 0.2;
    needsRender = true;
  }

  if (key('q', PRESSED)) {
    TileManager.setPlane(0);
  }
  if (key('w', PRESSED)) {
    TileManager.setPlane(1);
  }
  if (key('e', PRESSED)) {
    TileManager.setPlane(2);
  }

  if (key('g', PRESSED)) {
    selectNeighboringSegment();
  }

  if (key('r', PRESSED)) {
    needsRender = true;
  }

  if (key('p', PRESSED)) {
    segments.children.map(function (segment) {
      console.log(segment.material.uniforms.opacity.value, segment.visible, segment.material.transparent);
    });
  }
}


var needsRender = true;

function animate() {
  pollInput();
  handleInput();

  TWEEN.update();
  controls.update();

  if (needsRender) {
    needsRender = false;
    renderer.render(scene, camera.realCamera);
  }

  requestAnimationFrame(animate); // TODO where should this go in the function (beginning, end?)
}
requestAnimationFrame(animate);

}(window))
