(function (window) {
"use strict";

var MCWorker = new Worker('mc_worker.js');

// TODO, hacky
MCWorker.callbacks = {};
MCWorker.count = 0;

MCWorker.onmessage = function (e) {
  if (e.data.callback) {
    MCWorker.callbacks[e.data.callback](e.data.msg);
  }
};

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
window.CHUNK_SIZE = 128;
window.CUBE_SIZE = 256;

// globals
var assignedTask = null;

var bufferCanvas = document.createElement('canvas');
bufferCanvas.height = bufferCanvas.width = CHUNK_SIZE;
var bufferContext = bufferCanvas.getContext('2d');

var stagingCanvas = document.createElement('canvas');
stagingCanvas.height = stagingCanvas.width = CUBE_SIZE;
var stagingContext = stagingCanvas.getContext('2d');

var pixelToSegId = new Int16Array(256 * 256 * 256);

var segInfo = {};

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

function setupWorker() {
  MCWorker.postMessage({ name: 'volume', data: pixelToSegId });
}

var doneLoading = false;

// loads all task data and calls done handler when both are complete
function playTask(task, cb) {
  doneLoading = false;
  twirl();

  assignedTask = task;

  resetZoom();

  // TODO, setup managers for this task
  var loadSeedMeshes = SegmentManager.loadForTask(task); // TODO, this is ugly

  function loadTaskData(done) {
    loadTiles(function () {
      setupWorker();

      loadSeedMeshes();
      doneLoading = true;
      done();
    })
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
//1228475 black spill
assign(332, function () {
  console.log('loaded first cube');
});

///////////////////////////////////////////////////////////////////////////////
/// utils

function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
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
    cPlane.material.opacity = o;
    // cPlane.material.materials.map(function (material) {
    //   material.opacity = o;
    // });
  }
};

///////////////////////////////////////////////////////////////////////////////
/// classes

var seedColor = [0, 104, 242];
var selectedColor = [40, 205, 255];

  


// function drawLine(pt1, pt2) {
//   lineGeo.vertices[0].set(pt1.x, pt1.y, pt1.z);
//   lineGeo.vertices[1].set(pt2.x, pt2.y, pt2.z);
//   lineGeo.verticesNeedUpdate = true;
//   needsRender = true;
// }

function cameraFacingPlane() {
  var visPlane = TileManager.planes[0].plane;

  var cameraToPlane = new THREE.Vector3(-cube.position.x, -cube.position.y, 0); // this could be easily broken

  scene.updateMatrixWorld();

  cameraToPlane.applyMatrix4(visPlane.matrixWorld);

  cameraToPlane.subVectors(camera.realCamera.position, cameraToPlane);

  var faceVec = new THREE.Vector3();
  faceVec.set(0, 0, 1);

  var normalMatrix = new THREE.Matrix3();

  normalMatrix.getNormalMatrix(visPlane.matrixWorld);
  faceVec.applyMatrix3(normalMatrix).normalize();

  var t = cameraToPlane.dot(faceVec) / cameraToPlane.z;

  // t is

  return t > 0;
}

function camInfo() {


  // test.position.set(cameraToPlane.x, cameraToPlane.y, cameraToPlane.z);

  // drawLine(camera.realCamera.position, cameraToPlane);

  // cameraToPlane.setFromMatrixPosition(visPlane.matrixWorld);
  


  // 1 to -1, 0 = paralel to plane
  // var t = cameraToPlane.dot(faceVec) / cameraToPlane.z;

  // console.log(t);

  // var cameraInFront = t > 0;

  // console.log(cameraInFront);


  // var u = t > 0 ? (1 - t) : (1 + t);

  // PlaneManager.opacity = 1 - u;



  // u = Math.min(1, u * u * u * u);

  // segments.children.forEach(function (segment) {
  //     if (cameraInFront) {
  //       segment.material.uniforms.nMin.value.z = 0;
  //       segment.material.uniforms.nMax.value.z = TileManager.planes[0].plane.position.z + u;
  //     } else {
  //       segment.material.uniforms.nMin.value.z = TileManager.planes[0].plane.position.z - u;
  //       segment.material.uniforms.nMax.value.z = 1;
  //     }
  // });
}


function workerGenerateMesh(segId, wireframe, origin, callback) {
  var msg = { name: 'segId', wireframe: wireframe, origin: origin, data: segId, min: segInfo[segId].min, max: segInfo[segId].max };

  var unique = MCWorker.count++;
  MCWorker.callbacks[unique] = function (data) {
    var segGeo = new THREE.BufferGeometry();
    segGeo.addAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions), 3));

    if (data.normals) {
      segGeo.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normals), 3));
      segGeo.normalizeNormals();
    }

    var meshFunc = wireframe ? generateWireframeForSegment : generateMeshForSegment;
    var mesh = meshFunc(data.segId, segGeo);
    mesh.segId = segId;

    callback(data.segId, mesh);
  };

  MCWorker.postMessage({ callback: unique, msg: msg });
}

//  I may want to consider a different shader
function generateWireframeForSegment(segId, segGeo) {
  // TODO: Bring back quads (this is a message from the creator, maybe it would allow cube wireframe)
  var vectors = [
    new THREE.Vector3( 1, 0, 0 ),
    new THREE.Vector3( 0, 1, 0 ),
    new THREE.Vector3( 0, 0, 1 )
  ];

  var position = segGeo.attributes.position;
  var centers = new Float32Array( position.count * 3 );

  for ( var i = 0, l = position.count; i < l; i ++ ) {
    vectors[ i % 3 ].toArray( centers, i * 3 );
  }

  segGeo.addAttribute( 'center', new THREE.BufferAttribute( centers, 3 ) );

  var shader = $.extend(true, {
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  }, Shaders.wireframe);
  
  // var u = shader.uniforms;
  // u.color.value = new THREE.Color(color);
  var material = new THREE.ShaderMaterial(shader);

  var mesh = new THREE.Mesh(segGeo, material);
  return mesh;
  }

function generateMeshForSegment(segId, segGeo) {
  var color = SegmentManager.isSeed(segId) ? "rgb(0, 104, 242)" : "rgb(40, 205, 255)";

  if (SegmentManager.segments[segId].multi) {
    color = "rgb(255, 255, 0)";
  }

  var shader = $.extend(true, {
    transparent: false
    // side: THREE.DoubleSide
  }, Shaders.idPacked);
  
  var u = shader.uniforms;
  u.color.value = new THREE.Color(color);
  var material = new THREE.ShaderMaterial(shader);

  var segMesh = new THREE.Mesh(segGeo, material);

  return segMesh;
}

var SegmentManager = {
  // defaults, reset in loadForTask
  segments: {},
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
    this.seeds = task.seeds;
    this.seedColors = task.seeds.map(segIdToRGB);
    this.meshes = {};
    this.hover = undefined;
    this.visibleHover = undefined;

    for (let i = segments.children.length - 1; i >= 0; i--) {
      segments.remove(segments.children[i]);
    }

    for (let i = wfSegments.children.length - 1; i >= 0; i--) {
      wfSegments.remove(wfSegments.children[i]);
    }

    for (let i = segmentInteraction.children.length - 1; i >= 0; i--) {
      segmentInteraction.remove(segmentInteraction.children[i]);
    }

    this.segments = {};

    var _this = this;

    function loadSeedMeshes() {
      _this.seeds.forEach(function (segId) {
        _this.segments[segId] = {};
        workerGenerateMesh(segId, false, null, function (segId, mesh) {
          SegmentManager.addMesh(segId, mesh, false);
          SegmentManager.displayMesh(segId, false);
        });
      });
    }

    return loadSeedMeshes;
  },
  get selected () {
    return Object.keys(this.segments).filter(segId => this.segments[segId].selected);
  },
  isSeed: function (segId) {
    return this.seeds.indexOf(segId) !== -1;
  },
  isSelected: function (segId) {
    return this.segments[segId] && this.segments[segId].selected;
  },
  isMulti: function (segId) {
    return this.isSelected(segId) && this.segments[segId].multi;
  },
  setHoverOrigin: function (origin) {
    this.hoverOrigin = origin;

    wfSegments.children.map(function (wfSegment) {
      wfSegment.material.uniforms.origin.value = origin;
    });

    needsRender = true;
  },
  hoverSegId: function (segId, origin) {
    // console.log('hover', segId, this.hover);

    if (segId !== null) {
      this.segments[segId] = this.segments[segId] || {};

      var swap = false;

      if (this.segments[segId].origin) {
        var d = this.segments[segId].origin.distanceTo(origin);
        swap = d > 10;
      }
      var _this = this;

      if (!this.segments[segId].origin || swap) {
        this.segments[segId].origin = origin;
        console.log('request mesh', segId);
        this.segments[segId].state = 'preload';
        workerGenerateMesh(segId, true, origin, function (segId, mesh) {
          _this.segments[segId].state = 'loaded';
          console.log('got mesh', segId);
          if (!swap) {
            // mesh.material.uniforms.color.value = new THREE.Color(0xff9900);
            mesh.material.uniforms.opacity.value = 0;
            _this.segments[segId].wireframe = mesh;
          } else {
            mesh.material.uniforms.opacity.value = _this.segments[segId].wireframe.material.uniforms.opacity.value;

            // mesh.material.uniforms.color.value = new THREE.Color(0x0000ff);

            wfSegments.remove(_this.segments[segId].wireframe);
            _this.segments[segId].wireframe = mesh;
          }

          if (_this.hover === segId) {
            _this.displayMesh(segId, true);
          }
        });
      } else if (segId !== this.hover) {
        // console.log('switch hover', this.hover, segId);
        if (this.segments[segId].wireframe) {
          this.displayMesh(segId, true);
        } else {
          if (this.segments[segId].state !== "preload") {
            console.log("now we are in trouble");
          }
        }
        
      } else {
        // do nothing
      }
    } else {
      if (this.hover) {
        if (this.segments[this.hover].wireframe) { // maybe I should just check state == preload
          this.hideMesh(this.hover, true);
        }
        this.hover = null;
      }
    }

    this.hover = segId;
  },
  selectSegId: function (segId, cb, multi) {
    console.log('selectSegId', segId);

    if (multi && segInfo[segId].size > 5000) {
      return;
    }

    if (segId === 0 || this.isSelected(segId) || this.isSeed(segId)) {
      return;
    }

    this.segments[segId] = this.segments[segId] || {};
    Object.assign(this.segments[segId], { selected: true, cb: cb, multi: !!multi });
    workerGenerateMesh(segId, false, null, function (segId, mesh) {
      SegmentManager.addMesh(segId, mesh, false);
      SegmentManager.displayMesh(segId, false);
    });

    // animate to center of segment, it would be nice to animate to center of mass, also maybe only for big segments
    // and possibly zoom out to fit the whole segment
    var tVec = new THREE.Vector3();
    tVec.subVectors(segInfo[segId].max, segInfo[segId].min).divideScalar(2).add(segInfo[segId].min).divideScalar(CUBE_SIZE);

    tVec.x -= 0.5;
    tVec.y -= 0.5;
    tVec.z -= 0.5;

    animateToPositionAndZoom(tVec, 200);

  },

  deselectSegId: function (segId) {
    if (segId === 0 || !this.isSelected(segId)) {
      return;
    }

    this.segments[segId].selected = false;

    // var selectedIdx = this.selected.indexOf(segId);
    // this.selected.splice(selectedIdx, 1);
    // selectedIdx = this.selectedColors.indexOf(segIdToRGB(segId));
    // this.selectedColors.splice(selectedIdx, 1);

    // console.log('deselect', segId, this.selected, this.selectedColors);

    // TileManager.currentTile().draw();

    // temporary
    this.hideMesh(segId);
  },
  displayMesh: function (segId, wireframe) {
    if (this.visibleHover !== undefined) {
      SegmentManager.hideMesh(this.visibleHover, true);
      this.visibleHover = undefined;
    }

    if (wireframe) {
      this.visibleHover = segId;

      if (!this.segments[segId].wireframe) {
        console.log('what a display');
      }

      this.segments[segId].wireframe.material.uniforms.origin.value = this.hoverOrigin;

      if (this.segments[segId].tween) {
        // console.log('stop tween', segId);
        this.segments[segId].tween.stop();
      }

      if (wfSegments.children.indexOf(this.segments[segId].wireframe) === -1) {
        wfSegments.add(this.segments[segId].wireframe);
      }

      // console.log('tween in', segId);
      // this.segments[segId].wireframe.material.uniforms.color.value = new THREE.Color(0x00FF00);
      this.segments[segId].wireframe.material.uniforms.color.value = new THREE.Color(0xFFFF00);
      var _this = this;

      this.segments[segId].tween = new TWEEN.Tween(this.segments[segId].wireframe.material.uniforms.opacity).to({ value: 1}, 150)
        .onUpdate(function () {
          needsRender = true;
        }).onComplete(function () {
          // _this.segments[segId].wireframe.material.uniforms.color.value = new THREE.Color(0xFFFF00);
        }).start();


    } else {
      segments.add(this.segments[segId].mesh);
      segmentInteraction.add(this.segments[segId].interactiveMesh);
    }

    needsRender = true;
  },
  hideMesh: function (segId, wireframe) {
    if (wireframe) {
      if (this.segments[segId].tween) {
        this.segments[segId].tween.stop();
      }

      if (!this.segments[segId].wireframe) {
        console.log('what a mess');
      }

      // console.log('hide', segId);

      // console.log('tween out', segId);
      var _this = this;
      // this.segments[segId].wireframe.material.uniforms.color.value = new THREE.Color(0xFF0000);
      this.segments[segId].tween = new TWEEN.Tween(this.segments[segId].wireframe.material.uniforms.opacity).to({ value: 0}, 150)
        .onUpdate(function () {
          needsRender = true;
        }).onComplete(function () {
          // _this.segments[segId].wireframe.material.uniforms.color.value = new THREE.Color(0xFF00FF);
          wfSegments.remove(_this.segments[segId].wireframe);
          // _this.segments[segId].tween = null;
          // console.log('hide complete', segId);
        }).start();


    } else {
      segments.remove(this.segments[segId].mesh);
      segmentInteraction.remove(this.segments[segId].interactiveMesh);
    }

    needsRender = true;
  },
  addMesh: function (segId, mesh) {
    this.segments[segId].mesh = mesh;

    var shader = $.extend(true, {}, Shaders.segIdPacked);
    var u = shader.uniforms.segid.value = segId;
    var material = new THREE.ShaderMaterial(shader);
    material.blending = 0;
    var im = new THREE.Mesh(mesh.geometry, material);
    im.segId = segId;

    this.segments[segId].interactiveMesh = im;
    // var cb = this.segments[segId].cb;
    // if (cb) cb();
  },
  // loaded: function (segId) {
  //   return this.meshes[segId] !== undefined;
  // },
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

        var segId = rgbToSegIdOffset(segPixels, i * 4);

        pixelToSegId[pixel] = segId;

        segInfo[segId] = segInfo[segId] || { size: 0, min: new THREE.Vector3(px, py, z), max: new THREE.Vector3(px, py, z)};

        segInfo[segId].size++;
        segInfo[segId].min.x = Math.min(segInfo[segId].min.x, px);
        segInfo[segId].min.y = Math.min(segInfo[segId].min.y, py);
        segInfo[segId].min.z = Math.min(segInfo[segId].min.z, z);

        segInfo[segId].max.x = Math.max(segInfo[segId].max.x, px);
        segInfo[segId].max.y = Math.max(segInfo[segId].max.y, py);
        segInfo[segId].max.z = Math.max(segInfo[segId].max.z, z);
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
  for (var j = 0; j < channelPixels.length; j += 4) {
    var segId = pixelToSegId[j / 4 + 256 * 256 * TileManager.getPlane().currentTileIdx];//   rgbToSegIdOffset(segPixels, j / 4);

    // is the current pixel part of selected segment? if so highlight it
    if (SegmentManager.seeds.indexOf(segId) !== -1) {
      setColorAlpha(channelPixels, j, seedColor, 0.5);
    }

    // is the current pixel part of selected segment? if so highlight it
    if (SegmentManager.selected.indexOf(segId) !== -1) {
      setColorAlpha(channelPixels, j, selectedColor, 0.5);
    }
  }

  // secret red pixel
  setColorAlpha(channelPixels, 0, [255, 0, 0], 1);

  stagingContext.putImageData(channelImageData, 0, 0);
}

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
wireframe.material.transparent = true;
wireframe.material.color.set("#ffffff");
wireframe.material.opacity = 0.2;
cube.add(wireframe);

var cubeContents = new THREE.Object3D();
cubeContents.position.set(-.5, -.5, -.5);
cube.add(cubeContents);

// cubeContents.add(mesh2);

var segments = new THREE.Object3D();
segments.name = 'is segacious a word?';
cubeContents.add(segments);

var wfSegments = new THREE.Object3D();
cubeContents.add(wfSegments);

var segmentInteraction = new THREE.Object3D();
segmentInteraction.visible = false;
cubeContents.add(segmentInteraction);


var controls = new THREE.RotateCubeControls(pivot, cube, camera, SegmentManager, PlaneManager);
controls.rotateSpeed = 4.0;
  // controls.dynamicDampingFactor = 0.5;

// var axis = new THREE.AxisHelper( 2 );
// pivot.add(axis);

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

var test = new THREE.Mesh( new THREE.BoxGeometry( 1 / CUBE_SIZE, 1 / CUBE_SIZE, 1 / CUBE_SIZE ), new THREE.MeshNormalMaterial({
    transparent: false,
    opacity: 1
  }));

// cubeContents.add(test);
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
    // return;
    // console.log('disabled')
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
  } else {
    if (key('ctrl', HELD)) {
      checkForSegmentClick(event.clientX, event.clientY);
    } else if (key('alt', HELD)) {
      selectNeighboringSegment(true);
      selectNeighboringSegment(3);
    }
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

function buildingSegments() {
  return segmentInteraction.children.filter(function (segMesh) {
    return !SegmentManager.isMulti(segMesh.segId) && (SegmentManager.isSelected(segMesh.segId) || SegmentManager.isSeed(segMesh.segId)) && SegmentManager.segments[segMesh.segId].interactiveMesh;
  });
}

function screenToWorld(mouse) {
  var cX = (mouse.x + 1) / 2 * window.innerWidth; // TODO, this will get screwed up with a resize event
  var cY = (mouse.y - 1) / 2 * window.innerHeight * -1;

  var depths = ThreeDView.readBuffer(cX, cY, 1, renderer, scene, camera.realCamera, buildingSegments(), 'depth');

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

  SegmentManager.setHoverOrigin(pt1);

  pt1.sub(cubeContents.position);
  pt2.sub(cubeContents.position);

  var delta = new THREE.Vector3().subVectors(pt2, pt1);
  delta.normalize();

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

    if (SegmentManager.isMulti(segId)) {
      return;
    }

    var origin = new THREE.Vector3(x, y, z);

    if (segId !== 0 && !SegmentManager.isSelected(segId) && !SegmentManager.isSeed(segId)) {
      if (mock === 3) {
        SegmentManager.selectSegId(segId, function () {}, true)
      } else if (mock) {
        SegmentManager.hoverSegId(segId, origin);
      } else {
        SegmentManager.hoverSegId(segId, origin);
        SegmentManager.selectSegId(segId, function () {
          // SegmentManager.hoverSegId(null);
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
  var ids = ThreeDView.readBuffer(x, y, 1, renderer, scene, camera.realCamera, buildingSegments(), 'segid');
  
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

var tVec = new THREE.Vector3();

var tQuat = new THREE.Quaternion();

function mousewheel( event ) {
  event.preventDefault();
  event.stopPropagation();

  if (key('shift', HELD)) {
    tVec.set(0, 0, -event.deltaY / 200);
    tQuat.copy(pivot.quaternion);
    tQuat.inverse();
    tVec.applyQuaternion(tQuat);
    cube.position.add(tVec);
  } else {
    if (event.deltaY > 0) {
      camera.viewHeight /= 19/20;
    } else {
      camera.viewHeight *= 19/20;
    }
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
onWindowResize();
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


function showAllSegs() {
  if (showAllSegs.started) {
    return;
  }
  showAllSegs.started = true;

  var segCount = -1;

  for (var i = 0; i < pixelToSegId.length; i++) {
    segCount = Math.max(segCount, pixelToSegId[i]);
  }

  for (var i = 1; i < segCount; i++) {
    SegmentManager.selectSegId(i);
  }
}
 
function handleInput() {
  // if (key('x', PRESSED)) {
  //   resetZoom();
  // }

  if (key('f', PRESSED)) {
    showAllSegs();
  }

  if (key('alt', RELEASED)) {
    for (let segId of Object.keys(SegmentManager.segments)) {
      if (SegmentManager.segments[segId].multi) {
        SegmentManager.segments[segId].multi = false;

        if (SegmentManager.segments[segId].mesh) {
          SegmentManager.segments[segId].mesh.material.uniforms.color.value = new THREE.Color("rgb(40, 205, 255)");
        }
      }
    }

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
    // for (let segId of Object.keys(SegmentManager.segments)) {
    //   if (SegmentManager.segments[segId].wireframe) {
    //     if (segments.chil)
    //   }
    // }
    console.log('visible wireframes', wfSegments.children.map(function (segment) {
      return segment.segId;
    }));
  }
}


var needsRender = true;

function twirl() {
  pivot.rotation.y += 0.02;

  if (!doneLoading) {
    requestAnimationFrame(twirl);
  }
}

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


window.h = function (segId) {
  if (Array.isArray(segId)) {
    for (let i = 0; i < segId.length; i++) {
      setTimeout(function () {
        h(segId[i])
      }, i * 10);
    }
    return;
  }


  var tVec = new THREE.Vector3();

  tVec.subVectors(segInfo[segId].max, segInfo[segId].min).divideScalar(2);

  tVec.add(segInfo[segId].min);

  SegmentManager.hoverSegId(segId, new THREE.Vector3().copy(tVec));

  SegmentManager.setHoverOrigin(tVec.divideScalar(CUBE_SIZE));



  // var tVec2 = new THREE.Vector3();
  // tVec2.subVectors(segInfo[segId].max, segInfo[segId].min).divideScalar(CUBE_SIZE);

  // var cubeShape = new THREE.Mesh(
  //   new THREE.BoxGeometry(tVec2.x, tVec2.y, tVec2.z),
  //   new THREE.MeshNormalMaterial({visible: false})
  // );

  // var wireframe = new THREE.BoxHelper(cubeShape);
  // wireframe.position.copy(tVec);
  // // wireframe.name = "ol' wires";
  // // wireframe.material.color.set("#888888");
  // cubeContents.add(wireframe);
};

window.s = function (segId) {
  SegmentManager.selectSegId(segId);
}

}(window))
