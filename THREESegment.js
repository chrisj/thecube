THREE.Segment = function (interleavedData, lengths, material) {
  "use strict";

  var _this = this;
  var _interleavedData, _webglPositionNormalBuffer;

  THREE.Object3D.call(this);
  this.interleavedData = interleavedData;
  this.lengths = lengths;
  this.type = THREE.Segment;
  this.material = material;

  this.immediateRenderCallback = function (program, _gl, _frustum) {
    if (!_webglPositionNormalBuffer) {
      _webglPositionNormalBuffer = _gl.createBuffer();
    }

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _webglPositionNormalBuffer);
    _gl.bufferData(_gl.ARRAY_BUFFER, _this.interleavedData, _gl.STATIC_DRAW);

    // NB: Unintiuitive bug fix. Compiler was optimizing away
    // the normal attribute in certain builds of firefox and
    // seemingly randomly returning -1 for the normal attribute
    // location. Since we have constructed the Vertex Array Object (VAO)
    // we can explicitly tell the compiler to use it.
    //
    // VAO objects have a standard definition, that's an additional
    // reason why this is safe to do.
    //
    // - Will Silversmith, Aug. 2014

    // This was causing problems with our Princeton Ubuntu 14.04 installations.
    // if (program.attributes.normal === -1) {
    // 	_gl.bindAttribLocation(program.program, 0, 'position');
    // 	_gl.bindAttribLocation(program.program, 1, 'normal');
    // 	program.attributes.position = 0;
    // 	program.attributes.normal = 1;
    // }

    // _gl.enableVertexAttribArray(index);
    _gl.enableVertexAttribArray(program.attributes.position);
    _gl.enableVertexAttribArray(program.attributes.normal);

    // _gl.vertexAttribPointer(index, size, type, normalized, stride, pointer)
    _gl.vertexAttribPointer(program.attributes.position, 3, _gl.FLOAT, false, 24, 0);
    _gl.vertexAttribPointer(program.attributes.normal, 3, _gl.FLOAT, false, 24, 12);

    // _gl.drawArrays(mode, start, count)
    // 6 = dimensions per vertex: 3 for position, 3 for normal vector

    var currentLength = 0;
    for (var i = 0; i < lengths.length; i++) {
      var l = lengths[i];
      if (l > 0) {
        _gl.drawArrays(_gl.TRIANGLE_STRIP, currentLength / 6, l / 6);
      }
      currentLength += l;
    };
  };
};

THREE.Segment.prototype = new THREE.Object3D();
THREE.Segment.prototype.constructor = THREE.Segment;



ThreeDView = {};
window.ThreeDView = ThreeDView;


ThreeDView.setSize = function (width, height) {
  w = width;
  h = height;

  // _camera.aspect = w / h;
  // _camera.updateProjectionMatrix();

  var pars = { format : THREE.RGBAFormat };
  var pot = {
    w: Math.pow(2, Math.ceil(Math.log(w) / Math.log(2))),
    h: Math.pow(2, Math.ceil(Math.log(h) / Math.log(2)))
  };

  // Performance optimization to render to an intermediate buffer
  // that isn't the frame buffer or the back buffer
  ThreeDView._renderTarget = new THREE.WebGLRenderTarget(pot.w, pot.h, pars);
};


/* readBuffer
 *
 * Reads information about 3D objects on screen by using
 * special shaders to encode information in colors. The algorithm
 * hides the box around the mesh segments, paints the segments with
 * encoded colors and then compute the values requested (determined by x,y) 
 * from the color. This happens offscreen by painting to a render target 
 * independent of the actual frame buffer.
 *
 * The box is then restored to visibility and values returned.
 *
 * Required:
 *   [0] x: mouse x coordinate
 *   [1] y: mouse y coordinate
 *   [2] size: Square root of the number of pixels read (it specifies length and width)
 *   [3] type: 'depth', 'taskid', or 'segid'
 *
 * Return: computed value (int)
 */
ThreeDView.readBuffer = function (x, y, size, _renderer, _scene, _camera, _segments) {


  _renderTarget = ThreeDView._renderTarget;

  ///////
  
  _segments.traverse(setMode(2));

  var ctx = _renderer.getContext();
  ctx.disable(ctx.BLEND);

  // showCube(false);

  _renderer.render(_scene, _camera, _renderTarget, true);
  
  // showCube(true);

  x = x / ctx.drawingBufferWidth;
  y = (ctx.drawingBufferHeight - 1 - y) / ctx.drawingBufferHeight;

  x = Math.floor(x * _renderTarget.width) - Math.floor(size / 2);
  y = Math.floor(y * _renderTarget.height) - Math.floor(size / 2);

  var valsBroken = new Uint8Array(size * size * 4);
  ctx.readPixels(x, y, size, size, ctx.RGBA, ctx.UNSIGNED_BYTE, valsBroken);

  var vals, i;


  vals = new Uint32Array(size * size);
  for (i = 0; i < size * size; i += 1) {
    vals[i] = valsBroken[i * 4] * 256.0 * 256.0 + 
      valsBroken[i * 4 + 1] * 256.0 +
      valsBroken[i * 4 + 2];
  }

  _segments.traverse(setMode(0));

  ctx.enable(ctx.BLEND);
  
  return vals;
};

function setMode (mode) { 
  return function (object) {
    if (object.hasOwnProperty('material')) {
      object.material.uniforms.mode.value = mode;
    }
  };
}
