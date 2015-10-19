/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin 	/ http://mark-lundin.com
 */

THREE.RotateCubeControls = function (object, camera, SegmentManager, PlaneManager) { // EWWWW

	var _this = this;
	var STATE = { NONE: 1, ROTATE: 2, ANIMATE: 3};
	var SNAP_STATE = { NONE: 1, BEGIN: 2, ORTHO: 3, SHIFT: 4 };
	
	this.SNAP_STATE = SNAP_STATE;

	this.snapState = SNAP_STATE.NONE;

	this.object = object;

	// API

	this.enabled = true;

	this.screen = { left: 0, top: 0, width: 0, height: 0 };

	this.rotateSpeed = 1.0;

	// this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;

	// internals

	var _state = STATE.NONE,
	_prevState = STATE.NONE,

	_rotateStart = new THREE.Vector3(),
	_rotateEnd = new THREE.Vector3(),

	_panStart = new THREE.Vector2(),
	_panEnd = new THREE.Vector2();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };
	var rotateEvent = { type: 'rotate' };


	var snapBeginEvent = { type: 'snapBegin' };
	var snapUpdateEvent = { type: 'snapUpdate' };
	var snapCompleteEvent = { type: 'snapComplete' };

	var unSnapEvent = { type: 'unSnap' };


	// methods

	this.handleResize = function () {
			this.screen.left = 0;
			this.screen.top = 0;
			this.screen.width = window.innerWidth;
			this.screen.height = window.innerHeight;
	};

	this.handleEvent = function ( event ) {
		if ( typeof this[ event.type ] == 'function' ) {
			this[ event.type ]( event );
		}
	};

	var getMouseProjectionOnBall = ( function () {
		var mouseOnBall = new THREE.Vector3();

		return function ( pageX, pageY ) {

			var minDist = Math.min(_this.screen.width, _this.screen.height);
			var circleRadius = minDist / 2.2;

			mouseOnBall.set(
				( pageX - _this.screen.width / 2 - _this.screen.left ) / circleRadius,
				( _this.screen.height / 2 + _this.screen.top - pageY ) / circleRadius,
				0.0
			);

			var length = mouseOnBall.length();

			if (length > 1.0) {
				mouseOnBall.normalize();
			} else {
				mouseOnBall.z = Math.sqrt( 1.0 - length * length );
			}

			return mouseOnBall;

		};

	}());

	this.rotateObject = (function() {
		var axis = new THREE.Vector3(),
			quaternion = new THREE.Quaternion();


		return function () {

			var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

			if ( angle ) {
				if (_this.snapState === SNAP_STATE.ORTHO) {
					_this.snapState = SNAP_STATE.SHIFT;
				}

				_this.dispatchEvent(rotateEvent);

				axis.crossVectors( _rotateStart, _rotateEnd ).normalize();

				angle *= _this.rotateSpeed;

				quaternion.setFromAxisAngle( axis, angle ).normalize(); // maybe normalize is neccesary

				var curQuaternion = _this.object.quaternion;
				curQuaternion.multiplyQuaternions(quaternion, curQuaternion).normalize();
				_this.object.setRotationFromQuaternion(curQuaternion);

				// TODO, only switch to 'dynamic' on mouseup
				if (_state === STATE.NONE) {
					quaternion.setFromAxisAngle( axis, angle * 0.1 ).normalize();
				}
				_rotateStart.applyQuaternion( quaternion );
			}
		}

	}());

	var prevQuat = _this.object.quaternion.clone();

	this.update = function () {

		if (_state !== STATE.ANIMATE) {
			_this.rotateObject(); // TODO, should ignore input as well
		}

		if (!_this.object.quaternion.equals(prevQuat)) {
			prevQuat.copy(_this.object.quaternion);
			_this.dispatchEvent(changeEvent);
		} else {
			if (_state === STATE.ANIMATE) {
				console.log('dispatch change for animate');
				_this.dispatchEvent(changeEvent);
			}
		}
	};

	function animateToTargetQuaternion(duration, cb) {
		_state = STATE.ANIMATE; // TODO maybe use state = animating

		var startQuat = new THREE.Quaternion().copy(_this.object.quaternion);

		var o = {t: 0};

		var currentSegOpacity = SegmentManager.opacity;

		new TWEEN.Tween(o).to({t: 1}, duration).onUpdate(function () {
			THREE.Quaternion.slerp(startQuat, _this.targetQuaternion, _this.object.quaternion, o.t);

			var p = 1 - o.t;
			camera.fov = Math.min(camera.fov, camera.orthoFov * (1 - p) + camera.perspFov * p);

			SegmentManager.opacity = Math.min(SegmentManager.opacity, p);
		    PlaneManager.opacity = o.t * 0.2 + 0.8;

			// _this.dispatchEvent(snapUpdateEvent, o.t);
		}).onComplete(function () {
			_this.object.quaternion.copy(_this.targetQuaternion);
			_this.object.setRotationFromQuaternion(_this.targetQuaternion);
			_state = STATE.NONE;
			cb();
		}).start();
	}

	this.targetQuaternion = new THREE.Quaternion();
	var tmpEuler = new THREE.Euler();

	// function furthestFromZero(arr) {
	// 	var current = null;
	// 	var second = null;

	// 	for (var i = 1; i < arr.length; i++) {
	// 		if (current === null || Math.abs(arr[i]) > Math.abs(arr[current])) {
	// 			current = i;
	// 		} else (current === null || Math.abs(arr[i]) > Math.abs(arr[current])) {

	// 		}
	// 	};

	// 	return i;
	// }

	function snapEuler(euler) {
		// var largest = 1;
		// for (var i = 1; i < 3; i++) {
		// 	if (Math.abs(arr[i]) > Math.abs(arr[current])) {
		// 		current = i;
		// 	}
		// };

		// var t = 0;

		// for (var i = 0; i < 3; i++) {
		// 	if (i != largest && Math.abs(arr[i])) {

		// 	}
		// };
	}

	function printMatrix(m) {
		return;
		function p(n) {
			if (n >= 0) {
				return ' ' + n.toFixed(2);
			} else {
				return n.toFixed(2);
			}
		}

		console.log(`
			${p(m[0])} ${p(m[1])} ${p(m[2])} ${p(m[3])}
			${p(m[4])} ${p(m[5])} ${p(m[6])} ${p(m[7])}
			${p(m[8])} ${p(m[9])} ${p(m[10])} ${p(m[11])}
			${p(m[12])} ${p(m[13])} ${p(m[14])} ${p(m[15])}
		`);
	}

	function foo(matrix, ignores) {
		var largest = null;

		for (var i = 0; i < matrix.length; i++) {
			if (ignores.indexOf(i) === -1) {
				largest = i;
				break;
			}
		};

		if (largest === null) {
			throw "WTF!";
		}

		for (var i = 0; i < matrix.length; i++) {
			// if (ignores.indexOf(i) !== -1) {
			// 	continue;
			// }

			var y = Math.floor(i / 4);
			var x = i % 4;

			if (x > 2 || y > 2) {
				continue;
			}

			if (Math.abs(matrix[i]) > Math.abs(matrix[largest])) {
				largest = i;
			}
		};

		// printMatrix(matrix);
		console.log('largest', largest, matrix[largest]);

		var ly = Math.floor(largest / 4);
		var lx = largest % 4;

		for (var i = 0; i < matrix.length; i++) {
			var y = Math.floor(i / 4);
			var x = i % 4;

			if (x === lx || y === ly) {
				matrix[i] = 0;
			}
		}

		return largest;
	}

	function snapMatrix(matrix) {
		var nMatrix = matrix.clone();
		var one = foo(nMatrix.elements, []);
		var two = foo(nMatrix.elements, [one]);
		var three = foo(nMatrix.elements, [one, two]);

		function snap(v) {
			if (v < 0) {
				return -1;
			} else {
				return 1;
			}
		}

		nMatrix.elements[one] = snap(matrix.elements[one]);
		nMatrix.elements[two] = snap(matrix.elements[two]);
		nMatrix.elements[three] = snap(matrix.elements[three]);

		return nMatrix;
	}

	function snapAxis(val) {
		var HALF_PI = Math.PI / 2;
		return Math.round(val / HALF_PI) * HALF_PI;
	}

	this.snap = function () {
		console.log('snap!', _this.snapState);

		// TODO, should we be doing this? (maybe so animate can take over rotation, especially if cube has momentum)
		// _state = STATE.NONE;
		// _prevState = STATE.NONE;

		if (_this.snapState === SNAP_STATE.NONE) {
			var nMatrix = snapMatrix(_this.object.matrix);
			printMatrix(_this.object.matrix.elements);
			printMatrix(nMatrix.elements);
			_this.targetQuaternion.setFromRotationMatrix(nMatrix);
		}

		_this.snapState = SNAP_STATE.BEGIN;
		_this.dispatchEvent( snapBeginEvent );

		_rotateStart.copy( _rotateEnd );

		animateToTargetQuaternion(250, function () {
			_this.snapState = SNAP_STATE.ORTHO;
			_this.dispatchEvent( changeEvent ); // TODO have to dispatch change before snapcomplete so that the camera is put in final place, this means we dispatch twice
			_this.dispatchEvent( snapCompleteEvent );
		});
	};

	this.unSnap = function () {
		console.log('unSnap');
		_this.snapState = SNAP_STATE.NONE;
		_this.dispatchEvent(unSnapEvent);
	}

	// listeners
	function keydown( event ) {

		if ( _this.enabled === false ) return;

		_prevState = _state;

		// if ( _state !== STATE.NONE ) {
			// return;
		// } else 
		if ( event.keyCode === 32 ) { // TODO, I want to snap/unsnap even when rotating
			console.log('snapState spacebar', _this.snapState);
			if (_this.snapState === SNAP_STATE.NONE) {
				_this.snap();
			} else {
				_this.unSnap();
			}
		}
	}

	function keyup( event ) {

		// if ( _this.enabled === false ) return;

		// _state = _prevState;

		// window.addEventListener( 'keydown', keydown, false );

	}

	function mousedown( event ) {

		if ( _this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.NONE ) {
			if (event.button === 0 && !key("shift", HELD) && !key("ctrl", HELD)) {
				console.log('rotating!');
				_state = STATE.ROTATE;
			}
		}

		if ( _state === STATE.ROTATE && !_this.noRotate ) {

			_rotateStart.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
			_rotateEnd.copy( _rotateStart );

		}

		document.addEventListener( 'mousemove', mousemove, false );
		document.addEventListener( 'mouseup', mouseup, false );

		_this.dispatchEvent( startEvent );

	}

	function mousemove( event ) {

		if ( _this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.ROTATE && !_this.noRotate ) {
			_rotateEnd.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
		}

	}

	function mouseup( event ) {
		// todo, this is screwing up animations

		if ( _this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		_state = STATE.NONE;

		document.removeEventListener( 'mousemove', mousemove );
		document.removeEventListener( 'mouseup', mouseup );
		_this.dispatchEvent( endEvent );

		if (_this.snapState === SNAP_STATE.SHIFT) {
			_this.snap();
		}

	}

	document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	document.addEventListener( 'mousedown', mousedown, false );

	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );

	this.handleResize();

	// force an update at start
	this.update();

};

THREE.RotateCubeControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.RotateCubeControls.prototype.constructor = THREE.RotateCubeControls;
