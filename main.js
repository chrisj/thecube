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

function setTask(task) {
  assignedTask = task;
  // TODO, setup managers for this task

  var loadSeedMeshes = SegmentManager.loadForTask(task); // TODO, this is ugly

  function loadTaskData(done) {
    waitForAll([
      loadSeedMeshes,
      loadTiles
    ], done);
  }

  loadTaskData(function () {
    console.log('we are done loading!');
  });
}

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
  _planeOpacity: 0.8,
  get opacity() {
    return this._planeOpacity;
  },
  set opacity(o) {
    this._planeOpacity = o;
    planes.z.material.materials.map(function (material) {
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

  isSeed: function (segId) {
    return this.seeds.indexOf(segId) !== -1;
  },
  isSelected: function (segId) {
    return this.selected.indexOf(segId) !== -1;
  },
  selectSegId: function (segId) {
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

      if (controls.snapState === controls.SNAP_STATE.ORTHO) {
        _this.meshes[segId].visible = true;
        _this.meshes[segId].material.transparent = true;
        var indvTweenOut = new TWEEN.Tween(SegmentProxy(segId)).to({ opacity: 1.0 }, duration).onUpdate(function () {
          needsRender = true;
        })
        .repeat(1)
        .yoyo(true)
        .onComplete(function () {
          _this.meshes[segId].visible = false;
        })
        .start();

        // var indvTween = new TWEEN.Tween(SegmentProxy(segId)).to({ opacity: 0.8 }, duration).onUpdate(function () {
        //   needsRender = true;
        // }).start();


        var reshowPlaneTween = new TWEEN.Tween(PlaneManager).to({ opacity: 1.0 }, duration).onUpdate(function () {
          needsRender = true;
        });

        var hidePlaneTween = new TWEEN.Tween(PlaneManager).to({ opacity: 0.8 }, duration).onUpdate(function () {
          needsRender = true;
        }).chain(reshowPlaneTween).start();
      } else {
        var indvTweenOut = new TWEEN.Tween(SegmentProxy(segId)).to({ opacity: SegmentManager.opacity }, duration).onUpdate(function () {
          needsRender = true;
        }).start();
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

    var indvTweenOut = new TWEEN.Tween(PlaneManager).to({ opacity: 0.8 }, duration).onUpdate(function () {
      needsRender = true;
    })
    .repeat(1)
    .yoyo(true)
    .start();

    var segMesh = this.meshes[segId];

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
  loadForTask: function (task) {
    this.selected = [];
    this.selectedColors = [];
    this.seeds = task.seeds;
    this.seedColors = task.seeds.map(segIdToRGB);
    this.meshes = {};

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
  displayMesh: function (segId) {
    segments.add(this.meshes[segId]);
  },
  addMesh: function (segId, mesh) {
    this.meshes[segId] = mesh;
  },
  loaded: function (segId) {
    return this.meshes[segId] !== undefined;
  }
};

var TileManager = {
  _currentTileIdx: null,
  _currentTileFloat: null,
  tiles: {},
  currentTile: function () {
    return this.tiles[this._currentTileIdx]
  },
  setCurrentTile: function (i, hard) {
    this._currentTileIdx = i;
    if (this._currentTileFloat === undefined || hard) {
      this._currentTileFloat = i;
    }
    planes.z.position.z = i / CUBE_SIZE;
    setTimeline(planes.z.position.z);

    segments.children.forEach(function (segment) {
        segment.material.uniforms.nMin.value.z = planes.z.position.z;// - 1 / 512; // TODO this combo with three.js works, don't know why, seems to cause minor artifacts on snap to ortho
    });

    var curTile = this.currentTile();

    if (curTile) { // TODO this is only for the intiial loading check. Move that somewhere else?
      this.currentTile().draw();
    }
    
    needsRender = true;
  }
};

// Tile represents a single 2d 256x256 slice
// since chunks are 128x128, a tile consists of 4 segments and 4 channel iamges.
function Tile(id) {
  this.id = id;
  this.count = 0;
  this.segmentation = {};
  this.channel = {};
}

Tile.prototype.isComplete = function () {
  return this.count === 8; // 4 channel + 4 segmentation
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

// draw this tile in the 3d view and update the position
Tile.prototype.draw = function () {
  if (!this.isComplete()) {
    console.log('not complete');
    return;
  }

  for (var i = 0; i < 4; i++) {
    var x = i % 2;
    var y = i < 2 ? 0 : 1;

    stagingContext.drawImage(this.channel[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
    segContext.drawImage(this.segmentation[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
  }

  // if (controls.snapState === controls.SNAP_STATE.ORTHO) {
    highlight();
  // }
  planes.z.material.materials[5].map.needsUpdate = true;
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

  stagingContext.putImageData(channelImageData, 0, 0);

  // return copy;
}

// returns the the segment id located at the given x y position of this tile
Tile.prototype.segIdForPosition = function(x, y) {
  // var chunkX = Math.floor(x / CHUNK_SIZE);
  // var chunkY = Math.floor(y / CHUNK_SIZE);
  // var chunkRelX = x % CHUNK_SIZE;
  // var chunkRelY = y % CHUNK_SIZE;
   var segPixels = segContext.getImageData(0, 0, CUBE_SIZE, CUBE_SIZE).data;
  // var data = //this.segmentation[chunkY * 2 + chunkX].data;
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
    TileManager.tiles[i] = new Tile(i);
  }

  for (var i = 0; i < 4; i++) {
    var chunk = CHUNKS[i];
    getStartingTiles(startingTile, 1, assignedTask.channel_id, chunk, axis, 'channel', callback);
    getStartingTiles(startingTile, 1, assignedTask.segmentation_id, chunk, axis, 'segmentation', callback);
  }

  for (var i = 0; i < 4; i++) {
    var chunk = CHUNKS[i];
    getStartingTiles(startingTile, 32, assignedTask.channel_id, chunk, axis, 'channel', callback);
    getStartingTiles(startingTile, 32, assignedTask.segmentation_id, chunk, axis, 'segmentation', callback);
  }

  CHUNKS.forEach(function(chunk) {
    getImagesForVolXY(assignedTask.channel_id, chunk, axis, 'channel', callback);
    getImagesForVolXY(assignedTask.segmentation_id, chunk, axis, 'segmentation', callback);
  });
}

// get tiles around the starting tile
function getStartingTiles(realTileNum, bundleSize, volId, chunk, axis, type, callback) {
  var chunkTile = realTileNum % CHUNK_SIZE;
  var chunkZ = Math.floor(realTileNum / CHUNK_SIZE);
  var start = clamp(chunkTile - Math.floor(bundleSize / 2), 0, CHUNK_SIZE - bundleSize);
  var range = [start, start + bundleSize];
  var url = "http://cache.eyewire.org/volume/" + volId + "/chunk/0/" + chunk[0] + "/" + chunk[1] + "/" + chunkZ + "/tile/" + axis + "/" + range[0] + ":" + range[1];

  $.get(url).done(function (tilesRes) {
    for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
      var realTileNum = chunkZ * CHUNK_SIZE + range[0] + trIdx;

      TileManager.tiles[realTileNum].load(tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
    }
  });
}

// load all the tiles for the given axis in the given chunk of the given type
// ex. load all the segmentation tiles in chunk (0, 0, 0) for the 'z' axis (x/y plane)
function getImagesForVolXY(volId, chunk, axis, type, callback) {
  var url = "http://cache.eyewire.org/volume/" + volId + "/chunk/0/" + chunk[0] + "/" + chunk[1] + "/" + chunk[2] + "/tile/" + axis + "/" + 0 + ":" + CHUNK_SIZE;
  $.get(url).done(function (tilesRes) {
    for (var trIdx = 0; trIdx < tilesRes.length; trIdx++) {
      var realTileNum = chunk[2] * CHUNK_SIZE + trIdx;

      TileManager.tiles[realTileNum].load(tilesRes[trIdx].data, type, chunk[0], chunk[1], callback);
    }
  });
}

// overlay

var overlayCanvas = document.getElementById('overlay');
var overlayContext = overlayCanvas.getContext('2d');

var circleRadius = null;

function resizeCanvas() {
  overlayCanvas.width = window.innerWidth;
  overlayCanvas.height = window.innerHeight;

  overlayContext.fillStyle = "rgba(255, 255, 255, 0.5)";
  overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  overlayContext.beginPath();
  // TODO, 2.2 is a magic constant
  circleRadius = Math.min(overlayCanvas.width, overlayCanvas.height) / 2.2;

  overlayContext.arc(overlayCanvas.width / 2, overlayCanvas.height / 2, circleRadius, 0, Math.PI * 2, false);
  overlayContext.closePath();
  
  overlayContext.save();
  overlayContext.clip();
  overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  overlayContext.restore();

  overlayContext.strokeStyle = "#000";
  overlayContext.stroke();
}
resizeCanvas();

function hideTimeline() {
  // var center = new THREE.Vector2(overlayCanvas.width / 2, overlayCanvas.height / 2);
  // var start = new THREE.Vector2(+circleRadius * 0.6, 0).add(center);
  // overlayContext.clearRect(start.x, start.y - 1, circleRadius * 1.2, 3);
}

function setTimeline(fraction) {
  overlayContext.fillStyle = 'black';
  var center = new THREE.Vector2(overlayCanvas.width / 2, overlayCanvas.height / 2);
  var start = new THREE.Vector2(circleRadius + 40, -circleRadius / 2).add(center);
  // // var start = new THREE.Vector2(-circleRadius * 0.6, circleRadius * 0.7).add(center);
  overlayContext.clearRect(start.x - 1, start.y, 3, circleRadius );
  overlayContext.fillRect(start.x, start.y, 2, circleRadius * fraction);

  overlayContext.fillRect(start.x, start.y + circleRadius - 3, 2, 2);
}

///////////////////////////////////////////////////////////////////////////////
/// 3d code

var renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true, // TODO, why?
  alpha: true,
});
// renderer.state.setDepthTest(false); // TODO, why did we do this?

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
ThreeDView.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();

var webGLContainer = document.getElementById('webGLContainer');//$('#webGLContainer');
webGLContainer.appendChild(renderer.domElement);

// THREEJS objects


var camera = (function (perspFov, orthoFov, viewHeight) {

  var realCamera = new THREE.PerspectiveCamera(
    perspFov, // Field of View (degrees)
    window.innerWidth / window.innerHeight, // Aspect ratio (set later) TODO why?
    0.2, // Inner clipping plane // TODO, at 0.1 you start to see white artifacts when scrolling quickly
    1300 // Far clipping plane
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
    orthoFov: orthoFov,
    _viewHeight: viewHeight,
    _fakeViewHeight: simpleViewHeight(perspFov, viewHeight),
    set viewHeight(vH) {
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
}(40, 0.1, 2));

scene.add(camera.realCamera);

var pivot = new THREE.Object3D();//new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.1 ), new THREE.MeshNormalMaterial());//
scene.add(pivot);

// pivot.rotation.y = Math.PI / 2;

var cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial({visible: false})
);
pivot.add(cube);

cube.name = "DA CUBE";

var light = new THREE.DirectionalLight(0xffffff);
light.position.copy(camera.realCamera.position);
scene.add(light);

light.name = "pixar light";

var wireframe = new THREE.BoxHelper(cube);
wireframe.material.color.set("#000000");
scene.add(wireframe);

wireframe.name = "ol' wires";

var segments = new THREE.Object3D();
segments.position.set(-.5, -.5, -.5);
cube.add(segments);

segments.name = 'is segacious a word?';

var controls = new THREE.RotateCubeControls(pivot, camera, SegmentManager, PlaneManager);
controls.rotateSpeed = 1.2;
  // controls.staticMoving = true; // TODO maybe dynamic is better?
  // controls.dynamicDampingFactor = 0.5;
  // controls.snap();

var axis = new THREE.AxisHelper( 2 );
// scene.add(axis);



var planes = {};

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
      opacity: 0.8,
      transparent: true,
    });

    // this seems to disable flickering
    imageMat.polygonOffset = true;
    // positive value is pushing the material away from the screen
    imageMat.polygonOffsetFactor = 0.1; // https://www.opengl.org/archives/resources/faq/technical/polygonoffset.htm

    var plainMat = new THREE.MeshBasicMaterial({
      color: 0xCCCCCC,
      opacity: 0.8,
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

    planes.z = new THREE.Mesh(planeGeo, new THREE.MeshFaceMaterial(materials));
    planes.z.name = "zzzz go to bed!";
    planes.z.position.x = 0.5;
    planes.z.position.y = 0.5;

    // planes.z.visible = false;

    // planes.z.visible = false;

    // planes.z.rotation.z = Math.PI;
    var planesHolder = new THREE.Object3D();

    planesHolder.position.set(-.5, -.5, -.5);
    cube.add(planesHolder);

    planesHolder.add(planes.z);


    var test = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.1 ), new THREE.MeshNormalMaterial({
  transparent: false,
  opacity: 1
}) );
// test.position.set(0, 0, 1);
// planes.z.add(test);
  }

  // {
  //   var material = new THREE.MeshBasicMaterial( {color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.2} );
  //   planes.y = new THREE.Mesh(planeGeo, material);
  //   planes.y.rotation.x = Math.PI / 2;
  //   cube.add(planes.y);
  // }

  // {
  //   var material = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.2} );
  //   planes.x = new THREE.Mesh(planeGeo, material);
  //   planes.x.rotation.y = Math.PI / 2;
  //   cube.add(planes.x);
  // }

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
            u.opacity.value = SegmentManager.opacity;
            u.nMin.value = new THREE.Vector3(0, 0, planes.z.position.z);
            u.nMax.value = new THREE.Vector3(1.0, 1.0, 1.0);
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
  var meshUrl = 'http://testdata.eyewire.org/volume/' + volume + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segId;

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
  TileManager.setCurrentTile(startingTile, true);

  function loadTilesNicely() {
    for (var i = 0; i < 8; i++) {
      var load = tileLoadingQueue.shift();
      if (load) {
        load();
      }
    }

    if (tileCount < CUBE_SIZE) {
      // continue to check for more tiles
      requestAnimationFrame(loadTilesNicely);
    }
  }
  requestAnimationFrame(loadTilesNicely);

  loadTilesForAxis('xy', startingTile, function (tile) {
    tileCount++;

    if (tile.id === startingTile) {
      loadedStartingTile = true;
      tile.draw();
      needsRender = true;
    } else if (tile.id === TileManager.currentTileIdx) {
      tile.draw();
      needsRender = true;
    }

    if (tileCount === CUBE_SIZE) {
      done();
    }
  });

  needsRender = true;
}

// loads all task data and calls done handler when both are complete
function playTask(task) {
  setTask(task);

  // $('#loadingText').show();

  // var loadingIndicator = setInterval(function () {
  //   $('#loadingText').html($('#loadingText').html() + '.');
  // }, 2000);

  // loadTaskData(function () {
  //   console.log('we are done loading!');
  //   clearInterval(loadingIndicator);

  //   // enable the submit task button
  //   $('#submitTask').click(function () {
  //     var url = 'https://eyewire.org/2.0/tasks/' + assignedTask.id + '/testsubmit';
  //     $.post(url, 'status=finished&segments=' + assignedTask.selected.join()).done(function (res) {
  //       $('#results').html('score ' + res.score + ', accuracy ' + res.accuracy + ', trailblazer ' + res.trailblazer);
  //     });
  //   });
  // });
}


// kick off the game
function start() {
  //1029032
  //1043593  this one has segment 
  $.post('https://eyewire.org/2.0/tasks/testassign').done(playTask);
}
start();

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();


var mouseStart = null;

var isZoomed = false;

function tileClick(x, y) {

}

function getPositionOnTileFromMouse(mouse) {
  raycaster.setFromCamera(mouse, camera.realCamera);
  var intersects = raycaster.intersectObject(planes.z);

  if (intersects.length === 1) {
    var point = intersects[0].point;
    point.applyQuaternion(pivot.quaternion.clone().inverse());
    point.sub(cube.position);

    return new THREE.Vector2(point.x, point.y);
  }
}

function mouseup (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // why *2 - 1?
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var duration = Date.now() - mouseStart;
  mouseStart = null;

  // if (duration > 400) {
  //   console.log('too slow', duration);
  //   return;
  // }

  if (controls.snapState === controls.SNAP_STATE.ORTHO || key('shift', HELD)) {
    // checkForTileClick(event);
    console.log('do I need this?');
  } else if (controls.snapState !== controls.SNAP_STATE.ORTHO && key('ctrl', HELD)) {
    // return;
    console.log('checking for segment');
    checkForSegmentClick(event.clientX, event.clientY);
  }
}

function mousemove (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // why *2 - 1?
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (mouseStart && (key('shift', HELD) || key('ctrl', HELD))) {
    checkForTileClick(event);
  }
}

$(document).stationaryClick(function (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // why *2 - 1?
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  checkForTileClick(event);
});

function checkForTileClick(event) {
  raycaster.setFromCamera(mouse, camera.realCamera);
  var intersects = raycaster.intersectObject(planes.z);

  if (intersects.length === 1) {
    console.log('got something');
    var point = intersects[0].point;
    point.applyQuaternion(pivot.quaternion.clone().inverse());
    point.sub(cube.position);

    var xPixel = Math.floor((point.x + 0.5) * CUBE_SIZE); // TODO, why do I add 0.5? i guess for rounding
    var yPixel = Math.floor((point.y + 0.5) * CUBE_SIZE);

    var tile = TileManager.currentTile();

    if (tile.isComplete()) {
      var segId = tile.segIdForPosition(xPixel, yPixel);
      if (key('ctrl', HELD)) {
        SegmentManager.deselectSegId(segId);
      } else {
        SegmentManager.selectSegId(segId);
      }
    }

  } else if (intersects.length > 1) {
    console.log('wtf', intersects);
  } else {
    console.log('no interesects', intersects);
  }
}

function checkForSegmentClick(x, y) {
  wireframe.visible = false;
  planes.z.visible = false;
  var ids = ThreeDView.readBuffer(x, y, 1, renderer, scene, camera.realCamera, segments);
  for (var i = 0; i < ids.length; i++) {
    var segId = ids[i];
    SegmentManager.deselectSegId(segId);
  };

  planes.z.visible = true;
  wireframe.visible = true;
}


function mousedown (event) {
  mouseStart = Date.now();
}

function tileDelta(delta) {
  TileManager._currentTileFloat = clamp(TileManager._currentTileFloat + delta, 1, 254);

  var nextTile = Math.round(TileManager._currentTileFloat);

  if (nextTile !== TileManager._currentTileIdx) {
    TileManager.setCurrentTile(nextTile);
  }

  if (isZoomed) {
    cube.position.z = -planes.z.position.z + 0.5;
  }
}

function mousewheel( event ) {
  event.preventDefault();
  event.stopPropagation();

  tileDelta(event.wheelDelta / 40);
}

document.addEventListener('mouseup', mouseup, false);
document.addEventListener('mousemove', mousemove, false);
document.addEventListener('mousedown', mousedown, false);
document.addEventListener('mousewheel', mousewheel, false);


function handleChange () {
  if (controls.snapState === controls.SNAP_STATE.SHIFT) {
    hideTimeline(); // bad place


    // TODO , this doesn't work with rotating on the z axis, think about this from the ground up
    // maybe keep track of angle in rotate cube after a snap event
    var targetFacingVec = new THREE.Vector3(0, 0, 1);
    targetFacingVec.applyQuaternion(controls.targetQuaternion);

    var currentFacingVec = new THREE.Vector3(0, 0, 1);
    currentFacingVec.applyQuaternion(pivot.quaternion);

    var angle = targetFacingVec.angleTo(currentFacingVec);

    var segmentOpacity = function (currentOpacity, angle, min, max) {
      if (angle === 0) {
        return 0;
      } else if (angle < currentOpacity && angle < min) {
        return Math.min(min, currentOpacity);
      } else {
        return Math.min(max, angle);
      }
    }


    var p = Math.min(1, angle / (Math.PI / 4));
    var op = segmentOpacity(SegmentManager.opacity, p, 0.3, 1);

    PlaneManager.opacity = Math.max(1 - op, 0.8);
    SegmentManager.opacity = op;

    camera.fov = Math.max(camera.fov, camera.orthoFov * (1 - p) + camera.perspFov * p);
  }

  needsRender = true;
}

function handleSnapBegin () {
  console.log('snapBegin');
}

function handleSnapComplete () {
  console.log('snapComplete distance', camera.realCamera.position.z);

  PlaneManager.opacity = 1;

  setTimeline(planes.z.position.z);

  SegmentManager.opacity = 0;
}

function handleUnSnap() {
  var o = {t: 0};
  new TWEEN.Tween(o).to({t: 1}, 250).onUpdate(function () {
    var p = o.t;
    camera.fov = Math.max(camera.fov, camera.orthoFov * (1 - p) + camera.perspFov * p);

    SegmentManager.opacity = p;// * (isZoomed ? 0.8 : 1.0);

    // PlaneManager.opacity = Math.max(1 - p, 0.8));

    PlaneManager.opacity = (1-p) * (0.2) + 0.8;

    needsRender = true;
  }).start();
}

controls.addEventListener('change', handleChange);
controls.addEventListener('snapBegin', handleSnapBegin);
// controls.addEventListener('snapUpdate', handleSnapUpdate);
controls.addEventListener('snapComplete', handleSnapComplete);
// controls.addEventListener('rotate', handleRotate);
controls.addEventListener('unSnap', handleUnSnap);



function onWindowResize() {
  camera.realCamera.aspect = window.innerWidth / window.innerHeight;
  camera.realCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.handleResize();
  needsRender = true;
  resizeCanvas();

  ThreeDView.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener( 'resize', onWindowResize, false );


var animating = false;
var centerPoint = new THREE.Vector2(0, 0);
function animateToPositionAndZoom(point, zoomLevel, reset) {
  if (animating) {
    return;
  }

  centerPoint.copy(point);

  animating = true;
  isZoomed = zoomLevel !== 1;

  var duration = 500;

  // new TWEEN.Tween(SegmentManager).to({ opacity: 0.8 }, duration)
  // .onUpdate(function () {
  //     needsRender = true;
  // })
  // .start();

  new TWEEN.Tween(cube.position).to({x: -point.x, y: -point.y, z: !reset ? -planes.z.position.z + 0.5 : 0}, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .onUpdate(function () {
      needsRender = true;
    }).start();


  new TWEEN.Tween(camera).to({viewHeight: 2/zoomLevel}, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
      needsRender = true;
    }).onComplete(function () {
      animating = false;
    }).start();
}

function handleInput() {
  if (key('x', PRESSED)) {
    animateToPositionAndZoom(new THREE.Vector3(0, 0, 0), 1, true);
  }

  if (key('z', HELD)) {
    // if (isZoomed) {
      // animateToPositionAndZoom(new THREE.Vector3(0, 0, 0), 1);
    // } else {
      var point = getPositionOnTileFromMouse(mouse);

      if (point) {
        animateToPositionAndZoom(point, 4);
      }
    // }
  } else {
    // if (isZoomed && mouseStart === null) {
    //   var point = getPositionOnTileFromMouse(mouse);

    //   if (point && point.distanceTo(centerPoint) > 0.2) {

    //       animateToPositionAndZoom(point, 4);
    //   }

    //   if (point) {
    //     console.log(point.distanceTo(centerPoint));
    //   }
    // }
  }


  var td = 0;

  if (key('w', PRESSED)) {
    td += 1;
  }

  if (key('s', PRESSED)) {
    td -= 1;
  }

  if (key('r', PRESSED)) {
    needsRender = true;
  }

  if (key('p', PRESSED)) {
    segments.children.map(function (segment) {
      console.log(segment.material.uniforms.opacity.value, segment.visible, segment.material.transparent);
    });
  }

  tileDelta(td);
}


var needsRender = true;

function animate() {
  pollInput();
  handleInput();

  TWEEN.update();
  controls.update();

  if (needsRender) {
    needsRender = false;
    render();
  }

  requestAnimationFrame(animate); // TODO where should this go in the function (beginning, end?)
}
requestAnimationFrame(animate);


var render = (function () {
  var faceVec = new THREE.Vector3();
  var cameraToPlane = new THREE.Vector3();
  var normalMatrix = new THREE.Matrix3();
  scene.autoUpdate = false; // since we call updateMatrixWorld below
  return function () {
    scene.updateMatrixWorld();

    cameraToPlane.setFromMatrixPosition(planes.z.matrixWorld);

    cameraToPlane.subVectors(camera.realCamera.position, cameraToPlane);


    faceVec.set(0, 0, 1);

    normalMatrix.getNormalMatrix(planes.z.matrixWorld);
    faceVec.applyMatrix3(normalMatrix).normalize();


    // is the camera on the same side as the front of the plane?
    var cameraInFront = cameraToPlane.dot(faceVec) >= 0;

    renderer.render(scene, camera.realCamera, undefined, undefined, cameraInFront, !SegmentManager.transparent);
  }
}());

}(window))
