(function (window) {
"use strict";

var geometry2 = new THREE.BufferGeometry();

var vertexPositions2 = [
  [ 0, 0, 0],
  [ 1/10, 0, 0],
  [ 1/10, 1/10, 0]
];

var vertices2 = new Float32Array( vertexPositions2.length * 3 );

for ( var i = 0; i < vertexPositions2.length; i++ )
{
  vertices2[ i*3 + 0 ] = vertexPositions2[i][0];
  vertices2[ i*3 + 1 ] = vertexPositions2[i][1];
  vertices2[ i*3 + 2 ] = vertexPositions2[i][2];
}

geometry2.addAttribute( 'position', new THREE.BufferAttribute( vertices2, 3 ) );
var material2 = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
var mesh2 = new THREE.Mesh( geometry2, material2 );



// constants
var CHUNK_SIZE = 128;
var CUBE_SIZE = 256;

// globals
var assignedTask = null;

var bufferCanvas = document.createElement('canvas');
bufferCanvas.height = bufferCanvas.width = CHUNK_SIZE;
var bufferContext = bufferCanvas.getContext('2d');

var stagingCanvas = document.createElement('canvas');
stagingCanvas.height = stagingCanvas.width = CUBE_SIZE;
var stagingContext = stagingCanvas.getContext('2d');

// var bigByteBuffer = new ArrayBuffer(256 * 256 * 256 * 4);
var pixelToSegId = new Int32Array(256 * 256 * 256);

var byteBuffer = new ArrayBuffer(256 * 256 * 256);
var counts = new Uint8Array(byteBuffer);

var onOff = new Uint8Array(256 * 256 * 256);

var voxelNormal = new Int8Array(256 * 256 * 256 * 3);


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
    loadTiles(function () {
      loadSeedMeshes();
      done();
    })

    // waitForAll([
    //   // loadSeedMeshes,
    //   loadTiles
    // ], done);
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
      $('#accuracyValue').html(res.trailblazer ? 'TRAILBLAZER!' : res.accuracy + '%');
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

  // drawVoxelSegment(3328);
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

function rgbToSegIdOffset(rgb, offset) {
  return rgb[offset] + rgb[offset+1] * 256 + rgb[offset+2] * 256 * 256;
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
    // this.seedColors = task.seeds.map(segIdToRGB);
    this.meshes = {};
    this.hover = undefined;

    segments.remove.apply(segments, segments.children);

    var _this = this;

    function loadSeedMeshes() {
      _this.seeds.forEach(function (segId) {
        _this.addMesh(segId, drawVoxelSegment(segId));
        _this.displayMesh(segId);
        needsRender = true;
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
    return;
    if (segId === this.hover) {
      return;
    }
    console.log('hover', segId);
    this.hover = segId;

    // clear current voxels
    // hoverContainer.remove.apply(hoverContainer, hoverContainer.children);

    // if (this.lastHoverCount) {
    //   for (var i = 0; i < this.lastHoverCount; i++) {
    //     particleGeo.vertices[i].set(-1000, -1000, -1000);
    //   };
    // }

    if (segId !== null) {
      drawVoxelSegment(segId);
    }

    // particleGeo.verticesNeedUpdate = true;

    needsRender = true;
  },
  selectSegId: function (segId, cb) {
    if (segId === 0 || this.isSelected(segId) || this.isSeed(segId)) {
      return;
    }
    this.selected.push(segId);
    // console.log('new select', segId, this.selected);
    // this.selectedColors.push(segIdToRGB(segId));
    // TileManager.currentTile().draw();
    // needsRender = true;

    if (!this.meshes[segId]) {
      this.addMesh(segId, drawVoxelSegment(segId));
    }

    this.displayMesh(segId);

    needsRender = true;
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

      bufferContext.drawImage(image, 0, 0);
      var segPixels = bufferContext.getImageData(0, 0, CHUNK_SIZE, CHUNK_SIZE).data;

      var z = _this.id;

      for (var i = 0; i < 128 * 128; ++i) {
        var px = i % CHUNK_SIZE + x * CHUNK_SIZE;
        var py = Math.floor(i / CHUNK_SIZE) + y * CHUNK_SIZE;
        var pixel = z * 256 * 256 + py * 256 + px;

        pixelToSegId[pixel] = rgbToSegIdOffset(segPixels, i * 4);
      }

      if (_this.isComplete()) { // all tiles have been loaded
        callback(_this);
      }
    });
  });
};

// Tile.prototype.drawSegmentation = function () {
//   if (!this.isComplete()) {
//     console.log('not complete');
//     return;
//   }

//   for (var i = 0; i < 4; i++) {
//     var x = i % 2;
//     var y = i < 2 ? 0 : 1;

//     segContext.drawImage(this.segmentation[i], x * CHUNK_SIZE, y * CHUNK_SIZE);
//   }
// }

// draw this tile in the 3d view and update the position
Tile.prototype.draw = function () {
  return;
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

function drawNormal(x1, y1, z1, x2, y2, z2) {
  var material = new THREE.LineBasicMaterial({
    color: 0xffff00
  });

  var vertPos = new THREE.Vector3( x1, y1, z1 );


  var normal = new THREE.Vector3(x2, y2, z2);

    // console.log('normal', new THREE.Vector3(x1 * 256 - 0.5, y1 * 256 - 0.5, z1 * 256 - 0.5), normal);

  normal.setLength(2/256);


  var geometry = new THREE.Geometry();
  geometry.vertices.push(
    vertPos,
    normal.add(vertPos)
  );

  var line = new THREE.Line(geometry, material);

  cubeContents.add(line);
}

function drawVoxelSegment(segId) {

  var start = window.performance.now();

  var partCount = 0;

  voxelNormal = new Int8Array(256 * 256 * 256 * 3);

  // var voxels = [8421504, 8421504+1, 8421504+1+256, 8421504+1+256+256*256];

  for (var i = 256 * 256 * 256 - 1; i >= 0; --i) {
    if (pixelToSegId[i] === segId) {//voxels.indexOf(i) !== -1) { // pixelToSegId[i] === segId) {


      // var z = Math.floor(i / (256 * 256));
      // var y = Math.floor((i - z * 256 * 256) / 256);
      // var x = i % 256;

      // z += 0.5;
      // y += 0.5;
      // x += 0.5;

      // particleGeo.vertices[partCount].set(x / 256, y / 256, z / 256);

      // partCount++;

      var close = 10;//10;
      var med = 7;//7; (1 / sqrt(2))
      var far = 6; // (1 / sqrt(3))
      // var morefar = 0;
      // var veryFar = 0;

      var xOff = 1;
      var yOff = 256;
      var zOff = 256 * 256;

      // this is faster
      voxelNormal[(i + xOff) * 3] += close;
      voxelNormal[(i - xOff) * 3] -= close;
      voxelNormal[(i + yOff) * 3 + 1] += close;
      voxelNormal[(i - yOff) * 3 + 1] -= close;
      voxelNormal[(i + zOff) * 3 + 2] += close;
      voxelNormal[(i - zOff) * 3 + 2] -= close;

      // voxelNormal[(i + 2) * 3] += morefar;
      // voxelNormal[(i - 2) * 3] -= morefar;
      // voxelNormal[(i + 512) * 3 + 1] += morefar;
      // voxelNormal[(i - 512) * 3 + 1] -= morefar;
      // voxelNormal[(i + (256 * 256) * 2) * 3 + 2] += morefar;
      // voxelNormal[(i - (256 * 256) * 2) * 3 + 2] -= morefar;

      // voxelNormal[(i + 3) * 3] += veryFar;
      // voxelNormal[(i - 3) * 3] -= veryFar;
      // voxelNormal[(i + 768) * 3 + 1] += veryFar;
      // voxelNormal[(i - 768) * 3 + 1] -= veryFar;
      // voxelNormal[(i + (256 * 256) * 3) * 3 + 2] += veryFar;
      // voxelNormal[(i - (256 * 256) * 3) * 3 + 2] -= veryFar;

      // right down (+ +)
      voxelNormal[(i + xOff + yOff)*3] += med; 
      voxelNormal[(i + xOff + yOff)*3+1] += med;

      // right down forward (+ + +)
      voxelNormal[(i + xOff + yOff + zOff)*3] += far; 
      voxelNormal[(i + xOff + yOff + zOff)*3+1] += far;
      voxelNormal[(i + xOff + yOff + zOff)*3+2] += far;

      // right down back (+ + -)
      voxelNormal[(i + xOff + yOff - zOff)*3] += far; 
      voxelNormal[(i + xOff + yOff - zOff)*3+1] += far;
      voxelNormal[(i + xOff + yOff - zOff)*3+2] -= far;

      // left down (- +)
      voxelNormal[(i - xOff + yOff)*3] -= med; 
      voxelNormal[(i - xOff + yOff)*3+1] += med;

      // left down forward (- + +)
      voxelNormal[(i - xOff + yOff + zOff)*3] -= far; 
      voxelNormal[(i - xOff + yOff + zOff)*3+1] += far;
      voxelNormal[(i - xOff + yOff + zOff)*3+2] += far;

      // left down back (- + -)
      voxelNormal[(i - xOff + yOff - zOff)*3] -= far; 
      voxelNormal[(i - xOff + yOff - zOff)*3+1] += far;
      voxelNormal[(i - xOff + yOff - zOff)*3+2] -= far;

      // left up (- -)
      voxelNormal[(i - xOff - yOff)*3] -= med; 
      voxelNormal[(i - xOff - yOff)*3+1] -= med;

      // left up forward (- - +)
      voxelNormal[(i - xOff - yOff + zOff)*3] -= far; 
      voxelNormal[(i - xOff - yOff + zOff)*3+1] -= far;
      voxelNormal[(i - xOff - yOff + zOff)*3+2] += far;

      // left up back (- - -)
      voxelNormal[(i - xOff - yOff - zOff)*3] -= far; 
      voxelNormal[(i - xOff - yOff - zOff)*3+1] -= far;
      voxelNormal[(i - xOff - yOff - zOff)*3+2] -= far;

      // right up (+ -)
      voxelNormal[(i + xOff - yOff)*3] += med; 
      voxelNormal[(i + xOff - yOff)*3+1] -= med;

      // right up forward (+ - +)
      voxelNormal[(i + xOff - yOff + zOff)*3] += far; 
      voxelNormal[(i + xOff - yOff + zOff)*3+1] -= far;
      voxelNormal[(i + xOff - yOff + zOff)*3+2] += far;

      // right up back (+ - -)
      voxelNormal[(i + xOff - yOff - zOff)*3] += far; 
      voxelNormal[(i + xOff - yOff - zOff)*3+1] -= far;
      voxelNormal[(i + xOff - yOff - zOff)*3+2] -= far;

      counts[i                      ] |= 1;   // 0
      counts[i - 1                  ] |= 2;   // 1
      counts[i -     256            ] |= 16;  // 4
      counts[i - 1 - 256            ] |= 32;  // 5
      counts[i -           256 * 256] |= 8;   // 3
      counts[i - 1 -       256 * 256] |= 4;   // 2
      counts[i -     256 - 256 * 256] |= 128; // 7
      counts[i - 1 - 256 - 256 * 256] |= 64;  // 6
    }
  }

  particleGeo.verticesNeedUpdate = true;

  var triCount = 0;
  
  for (var i = 256 * 256 * 256 - 1; i >= 0; --i) {
    triCount += triCountTable[counts[i]];
  }

  var vertBuffer = new Float32Array(12*3);
  var normBuffer = new Float32Array(12*3)


  var meshVertices = new Float32Array(triCount * 3 * 3);

  // var meshPotentialNormals = new Float32Array(256 * 256 * 256 * 3 * 3)

  var meshNormals = new Float32Array(triCount * 3 * 3);


  var normalMap = {};

  var curTriCount = 0;

  var dbg = 0;

  for (var i = 256 * 256 * 256 - 1; i >= 0; --i) {
    var cubeIndex = counts[i];
    counts[i] = 0;
    
    var indvTriCount = triCountTable[cubeIndex];

    if (indvTriCount !== 0) {

      var z = Math.floor(i / (256 * 256));
      var y = Math.floor((i - z * 256 * 256) / 256);
      var x = i % 256;

      // var wireframe = new THREE.BoxHelper(voxelShape);
      // wireframe.position.set((x + 1) / 256, (y + 1) / 256, (z + 1) / 256);
      // wireframe.material.color = new THREE.Color('white');
      // cubeContents.add(wireframe);

      z += 0.5;
      y += 0.5;
      x += 0.5;

      var no = i*3;

      var n0x = voxelNormal[no]; var n0y = voxelNormal[no+1]; var n0z = voxelNormal[no+2];
      var n1x = voxelNormal[no+(1)*3]; var n1y = voxelNormal[no+(1)*3+1]; var n1z = voxelNormal[no+(1)*3+2];
      var n2x = voxelNormal[no+(256*256+1)*3]; var n2y = voxelNormal[no+(256*256+1)*3+1]; var n2z = voxelNormal[no+(256*256+1)*3+2];
      var n3x = voxelNormal[no+(256*256)*3]; var n3y = voxelNormal[no+(256*256)*3+1]; var n3z = voxelNormal[no+(256*256)*3+2];
      var n4x = voxelNormal[no+(256)*3]; var n4y = voxelNormal[no+(256)*3+1]; var n4z = voxelNormal[no+(256)*3+2];
      var n5x = voxelNormal[no+(256+1)*3]; var n5y = voxelNormal[no+(256+1)*3+1]; var n5z = voxelNormal[no+(256+1)*3+2];
      var n6x = voxelNormal[no+(256*256+256+1)*3]; var n6y = voxelNormal[no+(256*256+256+1)*3+1]; var n6z = voxelNormal[no+(256*256+256+1)*3+2];
      var n7x = voxelNormal[no+(256*256+256)*3]; var n7y = voxelNormal[no+(256*256+256)*3+1]; var n7z = voxelNormal[no+(256*256+256)*3+2];


      // 0 and 1
      vertBuffer[0] = x + 0.5;
      vertBuffer[1] = y;
      vertBuffer[2] = z;

      normBuffer[0] = n0x + n1x;
      normBuffer[1] = n0y + n1y;
      normBuffer[2] = n0z + n1z;

      // 1 and 2
      vertBuffer[3] = x + 1;
      vertBuffer[4] = y;
      vertBuffer[5] = z + 0.5;

      normBuffer[3] = n1x + n2x;
      normBuffer[4] = n1y + n2y;
      normBuffer[5] = n1z + n2z;

      // 2 and 3
      vertBuffer[6] = x + 0.5;
      vertBuffer[7] = y;
      vertBuffer[8] = z + 1;

      normBuffer[6] = n2x + n3x;
      normBuffer[7] = n2y + n3y;
      normBuffer[8] = n2z + n3z;

      // 3 and 0
      vertBuffer[9]  = x;
      vertBuffer[10] = y;
      vertBuffer[11] = z + 0.5;

      normBuffer[9] = n0x + n3x;
      normBuffer[10] = n0y + n3y;
      normBuffer[11] = n0z + n3z;

      // 4 and 5
      vertBuffer[12] = x + 0.5;
      vertBuffer[13] = y + 1;
      vertBuffer[14] = z;

      normBuffer[12] = n4x + n5x;
      normBuffer[13] = n4y + n5y;
      normBuffer[14] = n4z + n5z;

      // 5 and 6
      vertBuffer[15] = x + 1;
      vertBuffer[16] = y + 1;
      vertBuffer[17] = z + 0.5;

      normBuffer[15] = n5x + n6x;
      normBuffer[16] = n5y + n6y;
      normBuffer[17] = n5z + n6z;

      // 6 and 7
      vertBuffer[18] = x + 0.5;
      vertBuffer[19] = y + 1;
      vertBuffer[20] = z + 1;

      normBuffer[18] = n6x + n7x;
      normBuffer[19] = n6y + n7y;
      normBuffer[20] = n6z + n7z;

      // 7 and 4
      vertBuffer[21] = x;
      vertBuffer[22] = y + 1;
      vertBuffer[23] = z + 0.5;

      normBuffer[21] = n4x + n7x;
      normBuffer[22] = n4y + n7y;
      normBuffer[23] = n4z + n7z;

      // 0 and 4
      vertBuffer[24] = x;
      vertBuffer[25] = y + 0.5;
      vertBuffer[26] = z;

      normBuffer[24] = n0x + n4x;
      normBuffer[25] = n0y + n4y;
      normBuffer[26] = n0z + n4z;

      // 1 and 5
      vertBuffer[27] = x + 1;
      vertBuffer[28] = y + 0.5;
      vertBuffer[29] = z;

      normBuffer[27] = n1x + n5x;
      normBuffer[28] = n1y + n5y;
      normBuffer[29] = n1z + n5z;

      // 2 and 6
      vertBuffer[30] = x + 1;
      vertBuffer[31] = y + 0.5;
      vertBuffer[32] = z + 1;

      normBuffer[30] = n2x + n6x;
      normBuffer[31] = n2y + n6y;
      normBuffer[32] = n2z + n6z;

      // 3 and 7
      vertBuffer[33] = x;
      vertBuffer[34] = y + 0.5;
      vertBuffer[35] = z + 1;

      normBuffer[33] = n3x + n7x;
      normBuffer[34] = n3y + n7y;
      normBuffer[35] = n3z + n7z;



      cubeIndex <<= 4; // mult by 16 (triTable row width)

      var j = cubeIndex;

      for (var m = indvTriCount - 1; m >= 0; --m) {
        var startIdx = curTriCount * 9;
        var vert1 = triTable[j] * 3;
        var vert2 = triTable[j + 1] * 3;
        var vert3 = triTable[j + 2] * 3;

        // console.log('tri', vert1 / 3, vert2 / 3, vert3 / 3);

        j+=3;

        meshVertices[startIdx] = vertBuffer[vert1] / 256;
        meshVertices[startIdx+1] = vertBuffer[vert1+1] / 256;
        meshVertices[startIdx+2] = vertBuffer[vert1+2] / 256;

        meshNormals[startIdx] = normBuffer[vert1];
        meshNormals[startIdx+1] = normBuffer[vert1+1];
        meshNormals[startIdx+2] = normBuffer[vert1+2];

        // drawNormal(meshVertices[startIdx], meshVertices[startIdx+1], meshVertices[startIdx+2], meshNormals[startIdx], meshNormals[startIdx+1], meshNormals[startIdx+2]);

        meshVertices[startIdx+3] = vertBuffer[vert2] / 256;
        meshVertices[startIdx+4] = vertBuffer[vert2+1] / 256;
        meshVertices[startIdx+5] = vertBuffer[vert2+2] / 256;

        meshNormals[startIdx+3] =  normBuffer[vert2];
        meshNormals[startIdx+4] = normBuffer[vert2+1];
        meshNormals[startIdx+5] = normBuffer[vert2+2];

        // drawNormal(meshVertices[startIdx+3], meshVertices[startIdx+4], meshVertices[startIdx+5], meshNormals[startIdx+3], meshNormals[startIdx+4], meshNormals[startIdx+5]);

        meshVertices[startIdx+6] = vertBuffer[vert3] / 256;
        meshVertices[startIdx+7] = vertBuffer[vert3+1] / 256;
        meshVertices[startIdx+8] = vertBuffer[vert3+2] / 256;

        meshNormals[startIdx+6] =  normBuffer[vert3];
        meshNormals[startIdx+7] = normBuffer[vert3+1];
        meshNormals[startIdx+8] = normBuffer[vert3+2];

        // drawNormal(meshVertices[startIdx+6], meshVertices[startIdx+7], meshVertices[startIdx+8], meshNormals[startIdx+6], meshNormals[startIdx+7], meshNormals[startIdx+8]); 
        curTriCount++;
      }

      // console.log('stop');

      // dbg++;

      // if (dbg === 2) {
      //   break;
      // }

      // if (curTriCount > triCount) {
      //   break;
      // }
    }
  }

  var segGeo = new THREE.BufferGeometry();
  segGeo.addAttribute('position', new THREE.BufferAttribute(meshVertices, 3));
  segGeo.addAttribute('normal', new THREE.BufferAttribute(meshNormals, 3));

  segGeo.normalizeNormals();

  // for (var i = Math.min(triCount * 3 - 1, maxVoxelCount); i > 0; --i) {
  //   particleGeo.vertices[partCount].set(meshVertices[i*3] + meshNormals[i*3] / 512, meshVertices[i*3+1] + meshNormals[i*3+1] / 512, meshVertices[i*3+2] + meshNormals[i*3+2] / 512);
  //   partCount++;
  // }

  // particleGeo.verticesNeedUpdate = true;

  var color = SegmentManager.isSeed(segId) ? "rgb(0, 104, 242)" : "rgb(40, 205, 255)";
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

  // var material = new THREE.MeshPhongMaterial({ color: 'blue'});//, shading: THREE.FlatShading });
  var segMesh = new THREE.Mesh(segGeo, material);

  // material.transparent = true;
  // material.opacity = 0.7;



  // segMesh.position.set(0.1, 0, 0);

  // var edges = new THREE.FaceNormalsHelper( segMesh, 2, 0x00ff00, 1 );

  // segments.add(segMesh);

  var end = window.performance.now();

  console.log('time', end - start);

  console.log('triCount', triCount);


  return segMesh;
}



/////////////////////////////////////
// Marching cubes lookup tables
/////////////////////////////////////

// These tables are straight from Paul Bourke's page:
// http://local.wasp.uwa.edu.au/~pbourke/geometry/polygonise/
// who in turn got them from Cory Gene Bloyd.

// var edgeTable = new Int32Array( [
// 0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
// 0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
// 0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
// 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
// 0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
// 0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
// 0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
// 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
// 0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
// 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
// 0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
// 0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
// 0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
// 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
// 0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
// 0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
// 0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
// 0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
// 0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
// 0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
// 0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
// 0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
// 0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
// 0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
// 0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
// 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
// 0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
// 0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
// 0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
// 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
// 0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
// 0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0 ] );

var triCountTable = new Uint8Array([
  0,
  1,
  1,
  2,
  1,
  2,
  2,
  3,
  1,
  2,
  2,
  3,
  2,
  3,
  3,
  2,
  1,
  2,
  2,
  3,
  2,
  3,
  3,
  4,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  3,
  1,
  2,
  2,
  3,
  2,
  3,
  3,
  4,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  3,
  2,
  3,
  3,
  2,
  3,
  4,
  4,
  3,
  3,
  4,
  4,
  3,
  4,
  5,
  5,
  2,
  1,
  2,
  2,
  3,
  2,
  3,
  3,
  4,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  3,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  5,
  3,
  4,
  4,
  5,
  4,
  5,
  5,
  4,
  2,
  3,
  3,
  4,
  3,
  4,
  2,
  3,
  3,
  4,
  4,
  5,
  4,
  5,
  3,
  2,
  3,
  4,
  4,
  3,
  4,
  5,
  3,
  2,
  4,
  5,
  5,
  4,
  5,
  2,
  4,
  1,
  1,
  2,
  2,
  3,
  2,
  3,
  3,
  4,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  3,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  5,
  3,
  2,
  4,
  3,
  4,
  3,
  5,
  2,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  5,
  3,
  4,
  4,
  5,
  4,
  5,
  5,
  4,
  3,
  4,
  4,
  3,
  4,
  5,
  5,
  4,
  4,
  3,
  5,
  2,
  5,
  4,
  2,
  1,
  2,
  3,
  3,
  4,
  3,
  4,
  4,
  5,
  3,
  4,
  4,
  5,
  2,
  3,
  3,
  2,
  3,
  4,
  4,
  5,
  4,
  5,
  5,
  2,
  4,
  3,
  5,
  4,
  3,
  2,
  4,
  1,
  3,
  4,
  4,
  5,
  4,
  5,
  3,
  4,
  4,
  5,
  5,
  2,
  3,
  4,
  2,
  1,
  2,
  3,
  3,
  2,
  3,
  4,
  2,
  1,
  3,
  2,
  4,
  1,
  2,
  1,
  1,
  0]);

/*
1, -1, 1



*/

var triTable = new Int32Array( [
- 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 8, 3, 9, 8, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 2, 10, 0, 2, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 8, 3, 2, 10, 8, 10, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 11, 2, 8, 11, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 9, 0, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 11, 2, 1, 9, 11, 9, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 10, 1, 11, 10, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 10, 1, 0, 8, 10, 8, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 9, 0, 3, 11, 9, 11, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 3, 0, 7, 3, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 1, 9, 4, 7, 1, 7, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 4, 7, 3, 0, 4, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 2, 10, 9, 0, 2, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
8, 4, 7, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 4, 7, 11, 2, 4, 2, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 0, 1, 8, 4, 7, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, - 1, - 1, - 1, - 1,
3, 10, 1, 3, 11, 10, 7, 8, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, - 1, - 1, - 1, - 1,
4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
4, 7, 11, 4, 11, 9, 9, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 4, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 5, 4, 1, 5, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 5, 4, 8, 3, 5, 3, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 8, 1, 2, 10, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 2, 10, 5, 4, 2, 4, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, - 1, - 1, - 1, - 1,
9, 5, 4, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 11, 2, 0, 8, 11, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 5, 4, 0, 1, 5, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, - 1, - 1, - 1, - 1,
10, 3, 11, 10, 1, 3, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, - 1, - 1, - 1, - 1,
5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
5, 4, 8, 5, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 7, 8, 5, 7, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 3, 0, 9, 5, 3, 5, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 7, 8, 0, 1, 7, 1, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 7, 8, 9, 5, 7, 10, 1, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, - 1, - 1, - 1, - 1,
8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, - 1, - 1, - 1, - 1,
2, 10, 5, 2, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 9, 5, 7, 8, 9, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, - 1, - 1, - 1, - 1,
11, 2, 1, 11, 1, 7, 7, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, - 1, - 1, - 1, - 1,
5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, - 1,
11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, - 1,
11, 10, 5, 7, 11, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 0, 1, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 8, 3, 1, 9, 8, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 6, 5, 2, 6, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 6, 5, 1, 2, 6, 3, 0, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 6, 5, 9, 0, 6, 0, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, - 1, - 1, - 1, - 1,
2, 3, 11, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 0, 8, 11, 2, 0, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, - 1, - 1, - 1, - 1,
6, 3, 11, 6, 5, 3, 5, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, - 1, - 1, - 1, - 1,
6, 5, 9, 6, 9, 11, 11, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 10, 6, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 3, 0, 4, 7, 3, 6, 5, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 9, 0, 5, 10, 6, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
6, 1, 2, 6, 5, 1, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, - 1, - 1, - 1, - 1,
8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, - 1, - 1, - 1, - 1,
7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, - 1,
3, 11, 2, 7, 8, 4, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1,
9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, - 1,
8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, - 1,
0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, - 1,
6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, - 1, - 1, - 1, - 1,
10, 4, 9, 6, 4, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 10, 6, 4, 9, 10, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 0, 1, 10, 6, 0, 6, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
1, 4, 9, 1, 2, 4, 2, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, - 1, - 1, - 1, - 1,
0, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 3, 2, 8, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 4, 9, 10, 6, 4, 11, 2, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, - 1, - 1, - 1, - 1,
3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, - 1,
9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, - 1, - 1, - 1, - 1,
8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, - 1,
3, 11, 6, 3, 6, 0, 0, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 4, 8, 11, 6, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 10, 6, 7, 8, 10, 8, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, - 1, - 1, - 1, - 1,
10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, - 1, - 1, - 1, - 1,
10, 6, 7, 10, 7, 1, 1, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, - 1,
7, 8, 0, 7, 0, 6, 6, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 3, 2, 6, 7, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, - 1,
1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, - 1,
11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, - 1, - 1, - 1, - 1,
8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, - 1,
0, 9, 1, 11, 6, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, - 1, - 1, - 1, - 1,
7, 11, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 8, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 9, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 1, 9, 8, 3, 1, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 1, 2, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 3, 0, 8, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 9, 0, 2, 10, 9, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, - 1, - 1, - 1, - 1,
7, 2, 3, 6, 2, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
7, 0, 8, 7, 6, 0, 6, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 7, 6, 2, 3, 7, 0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, - 1, - 1, - 1, - 1,
10, 7, 6, 10, 1, 7, 1, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, - 1, - 1, - 1, - 1,
0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, - 1, - 1, - 1, - 1,
7, 6, 10, 7, 10, 8, 8, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 8, 4, 11, 8, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 6, 11, 3, 0, 6, 0, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 6, 11, 8, 4, 6, 9, 0, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, - 1, - 1, - 1, - 1,
6, 8, 4, 6, 11, 8, 2, 10, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, - 1, - 1, - 1, - 1,
4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, - 1, - 1, - 1, - 1,
10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, - 1,
8, 2, 3, 8, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, - 1, - 1, - 1, - 1,
1, 9, 4, 1, 4, 2, 2, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, - 1, - 1, - 1, - 1,
10, 1, 0, 10, 0, 6, 6, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, - 1,
10, 9, 4, 6, 10, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 5, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 4, 9, 5, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 0, 1, 5, 4, 0, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, - 1, - 1, - 1, - 1,
9, 5, 4, 10, 1, 2, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, - 1, - 1, - 1, - 1,
7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, - 1, - 1, - 1, - 1,
3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, - 1,
7, 2, 3, 7, 6, 2, 5, 4, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, - 1, - 1, - 1, - 1,
3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, - 1, - 1, - 1, - 1,
6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, - 1,
9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, - 1, - 1, - 1, - 1,
1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, - 1,
4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, - 1,
7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, - 1, - 1, - 1, - 1,
6, 9, 5, 6, 11, 9, 11, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, - 1, - 1, - 1, - 1,
0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, - 1, - 1, - 1, - 1,
6, 11, 3, 6, 3, 5, 5, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, - 1, - 1, - 1, - 1,
0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, - 1,
11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, - 1,
6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, - 1, - 1, - 1, - 1,
5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, - 1, - 1, - 1, - 1,
9, 5, 6, 9, 6, 0, 0, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, - 1,
1, 5, 6, 2, 1, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, - 1,
10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, - 1, - 1, - 1, - 1,
0, 3, 8, 5, 6, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 5, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 5, 10, 7, 5, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 5, 10, 11, 7, 5, 8, 3, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 11, 7, 5, 10, 11, 1, 9, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, - 1, - 1, - 1, - 1,
11, 1, 2, 11, 7, 1, 7, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, - 1, - 1, - 1, - 1,
9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, - 1, - 1, - 1, - 1,
7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, - 1,
2, 5, 10, 2, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, - 1, - 1, - 1, - 1,
9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, - 1, - 1, - 1, - 1,
9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, - 1,
1, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 7, 0, 7, 1, 1, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 0, 3, 9, 3, 5, 5, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 8, 7, 5, 9, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 8, 4, 5, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, - 1, - 1, - 1, - 1,
0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, - 1, - 1, - 1, - 1,
10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, - 1,
2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, - 1, - 1, - 1, - 1,
0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, - 1,
0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, - 1,
9, 4, 5, 2, 11, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, - 1, - 1, - 1, - 1,
5, 10, 2, 5, 2, 4, 4, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, - 1,
5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, - 1, - 1, - 1, - 1,
8, 4, 5, 8, 5, 3, 3, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 4, 5, 1, 0, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, - 1, - 1, - 1, - 1,
9, 4, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 11, 7, 4, 9, 11, 9, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, - 1, - 1, - 1, - 1,
1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, - 1, - 1, - 1, - 1,
3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, - 1,
4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, - 1, - 1, - 1, - 1,
9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, - 1,
11, 7, 4, 11, 4, 2, 2, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, - 1, - 1, - 1, - 1,
2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, - 1, - 1, - 1, - 1,
9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, - 1,
3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, - 1,
1, 10, 2, 8, 7, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 1, 4, 1, 7, 7, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, - 1, - 1, - 1, - 1,
4, 0, 3, 7, 4, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
4, 8, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 9, 3, 9, 11, 11, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 1, 10, 0, 10, 8, 8, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 1, 10, 11, 3, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 2, 11, 1, 11, 9, 9, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, - 1, - 1, - 1, - 1,
0, 2, 11, 8, 0, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
3, 2, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 3, 8, 2, 8, 10, 10, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
9, 10, 2, 0, 9, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, - 1, - 1, - 1, - 1,
1, 10, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
1, 3, 8, 9, 1, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 9, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
0, 3, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
- 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1 ] );



// returns the the segment id located at the given x y position of this tile
Tile.prototype.segIdForPosition = function(x, y) {
  // this.drawSegmentation();

  // var segPixels = segContext.getImageData(0, 0, CUBE_SIZE, CUBE_SIZE).data;
  // var start = (y * CUBE_SIZE + x) * 4;
  // var rgb = [segPixels[start], segPixels[start+1], segPixels[start+2]];
  // return rgbToSegId(rgb);
  return pixelToSegId[this.id * 256 * 256 + y * 256 + x];
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
light.position.copy(camera.realCamera.position);
scene.add(light);

var cubeShape = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial({visible: false})
);

var voxelShape = new THREE.Mesh(
  new THREE.BoxGeometry(1/256, 1/256, 1/256),
  new THREE.MeshNormalMaterial({visible: false})
);


var wireframe = new THREE.BoxHelper(cubeShape);
wireframe.name = "ol' wires";
wireframe.material.color.set("#888888");
cube.add(wireframe);

var cubeContents = new THREE.Object3D();
cubeContents.position.set(-.5, -.5, -.5);
cube.add(cubeContents);

// cubeContents.add(mesh2);

var segments = new THREE.Object3D();
segments.name = 'is segacious a word?';
cubeContents.add(segments);

// var hoverContainer = new THREE.Object3D();
// cubeContents.add(hoverContainer);

// particle system

var sprite = THREE.ImageUtils.loadTexture( "./circle2.png" );


var particleGeo = new THREE.Geometry();

var maxVoxelCount = 100000;

for (var i = maxVoxelCount - 1; i >= 0; --i) {
  particleGeo.vertices.push(new THREE.Vector3(-1000, -1000, -1000));
}

var pMaterial = new THREE.PointsMaterial({
      color: 0xFFFF00,
      size: 0.001,
      transparent: true,// this doesn't seem to have an affect, maybe it is always on?
      opacity: 1,
      sizeAttenuation: true,
      map: sprite,
      // alphaTest: 0.7,
      blending: THREE.AdditiveBlending,
      // depthTest: false
      depthWrite: false
});

var pSystem = new THREE.Points(particleGeo, pMaterial);
pSystem.frustumCulled = false;
cubeContents.add(pSystem);




// end of particle system



var controls = new THREE.RotateCubeControls(pivot, camera, SegmentManager, PlaneManager);
controls.rotateSpeed = 4.0;
  // controls.dynamicDampingFactor = 0.5;

var axis = new THREE.AxisHelper( 2 );
cube.add(axis);

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

          var color = SegmentManager.isSeed(segId) ? "rgb(0, 104, 242)" : "rgb(40, 205, 255)";
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

          // var material = new THREE.MeshPhongMaterial({ color: 0x0000ff});//, shading: THREE.FlatShading });

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

  selectNeighboringSegment(true);

  if (key('shift', HELD)) {
      var point = screenToCube(mouse);

      if (point) {
        console.log(point);
        animateToPositionAndZoom(point, 4);
        TileManager.movePlanes(point);
      }
  } else if (key('ctrl', HELD) || event.button === 2) {
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
}

$(document).stationaryClick(function (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  // checkForTileClick(event, false);

  if (!key('ctrl', HELD) && !key('shift', HELD) && event.button !== 2) {
    selectNeighboringSegment();
  }
});

function screenToWorld(mouse) {
  var cX = (mouse.x + 1) / 2 * window.innerWidth; // TODO, this will get screwed up with a resize event
  var cY = (mouse.y - 1) / 2 * window.innerHeight * -1;

  var visible = pSystem.visible;
  pSystem.visible = false;
  var depths = ThreeDView.readBuffer(cX, cY, 1, renderer, scene, camera.realCamera, segments, 'depth');
  pSystem.visible = visible;

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
    SegmentManager.hoverSegId(null);
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
    needsRender = true;
  }
  
  if (key('ctrl', RELEASED)) {
    pSystem.visible = true;
    needsRender = true;
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

// drawVoxelSegment(3328);


}(window))
