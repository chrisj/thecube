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


var _depthMaterial = new THREE.ShaderMaterial(Shaders.depthPacked);
_depthMaterial.blending = 0;

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
ThreeDView.readBuffer = function (x, y, size, _renderer, _scene, _camera, _renderObjects, type) {
  x = x * window.window.devicePixelRatio;
  y = y * window.window.devicePixelRatio;


  var priorVisibility = {};

  _renderTarget = ThreeDView._renderTarget;

  _scene.traverse(function (obj) {
    priorVisibility[obj.uuid] = obj.visible;
    obj.visible = false;
  });


  _renderObjects.forEach(function (renderObject) {
    renderObject.visible = true;
    renderObject.traverseAncestors(function (ancestor) {
      ancestor.visible = true;
    });
  });

  if (type === 'depth') {
    _scene.overrideMaterial = _depthMaterial;
  } else if (type === 'segid') {
  } else {
    console.log('unsupported read buffer type', type);
    return;
  }

  ///////

  var ctx = _renderer.getContext();
  // ctx.disable(ctx.BLEND); // this causes weird errors when the segment material transparent = false

  _renderer.render(_scene, _camera, _renderTarget, true);
  
  x = x / ctx.drawingBufferWidth;
  y = (ctx.drawingBufferHeight - 1 - y) / ctx.drawingBufferHeight;

  x = Math.floor(x * _renderTarget.width) - Math.floor(size / 2);
  y = Math.floor(y * _renderTarget.height) - Math.floor(size / 2);

  var valsBroken = new Uint8Array(size * size * 4);
  ctx.readPixels(x, y, size, size, ctx.RGBA, ctx.UNSIGNED_BYTE, valsBroken);

  var vals, i;

  if (type === 'depth') {
    vals = new Float32Array(size * size);
    for (i = 0; i < size * size; i += 1) {
      vals[i] = valsBroken[i * 4] / 256.0 +
                valsBroken[i * 4 + 1] / (256.0 * 256.0) +
                valsBroken[i * 4 + 2] / (256.0 * 256.0 * 256.0);
    }
    
    _scene.overrideMaterial = null;
  } else if (type === 'segid') {
    vals = new Uint32Array(size * size);
    for (i = 0; i < size * size; i += 1) {
      vals[i] = valsBroken[i * 4] * 256.0 * 256.0 + 
                valsBroken[i * 4 + 1] * 256.0 +
                valsBroken[i * 4 + 2];
    }
  }

  _scene.traverse(function (obj) {
    obj.visible = priorVisibility[obj.uuid];
  });
  
  return vals;
};
