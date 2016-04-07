/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin 	/ http://mark-lundin.com
 */

THREE.RotateCubeControls = function (object, cube, camera, SegmentManager, PlaneManager) { // EWWWW

	var _this = this;
	var STATE = { NONE: 1, ROTATE: 2, ANIMATE: 3, PAN: 4};

	this.object = object;

	// API

	this.screen = { left: 0, top: 0, width: 0, height: 0 };

	this.rotateSpeed = 1.0;
	this.panSpeed = 0.3;

	// this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;

	// internals

	var _state = STATE.NONE,
	// _prevState = STATE.NONE,

	_mouseStart = new THREE.Vector2(),
	_mouseEnd = new THREE.Vector2(),

	_panStart = new THREE.Vector2(),
	_panEnd = new THREE.Vector2();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };
	var rotateEvent = { type: 'rotate' };

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

	var getMouseOnScreen = ( function () {
		var vector = new THREE.Vector2();

		return function getMouseOnScreen(pageX, pageY) {
			var minDist = Math.min(_this.screen.width, _this.screen.height);
			vector.set(
				((2 * pageX - _this.screen.width) / minDist),
				((_this.screen.height - 2 * pageY) / minDist)
			);

			return vector;

		};

	}());

	this.rotateObject = (function() {
		var angle = 0,
			quaternion = new THREE.Quaternion(),
			moveDirection = new THREE.Vector3();


		return function () {
			moveDirection.set(-(_mouseEnd.y - _mouseStart.y), _mouseEnd.x - _mouseStart.x, 0);
			angle = moveDirection.length();
			
			var axis = moveDirection.normalize(); // also modifies moveDirection

			if ( angle ) {
				_this.dispatchEvent(rotateEvent);

				angle *= _this.rotateSpeed;

				quaternion.setFromAxisAngle(axis, angle).normalize(); // maybe normalize is neccesary

				var curQuaternion = _this.object.quaternion;
				curQuaternion.multiplyQuaternions(quaternion, curQuaternion).normalize();
				_this.object.setRotationFromQuaternion(curQuaternion);

				// TODO, only switch to 'dynamic' on mouseup
				if (false && _state === STATE.NONE) {
					console.log('dynamic');
					// quaternion.setFromAxisAngle( axis, angle * 0.2 ).normalize();
					// _rotateStart.applyQuaternion( quaternion );

					// _rotateStart += (_rotateEnd - _rotateStart) * 0.2;
				} else {
					_mouseStart.copy(_mouseEnd);
				}
			}
		}

	}());

	this.panCamera = (function() {
		var mouseChange = new THREE.Vector3(),
			objectUp = new THREE.Vector3(),
			pan = new THREE.Vector3();


		var objRotation = new THREE.Quaternion();

		return function panCamera() {
			mouseChange.copy( _panEnd ).sub( _panStart );

			mouseChange.z = 0;

			// console.log(mouseChange.lengthSq());

			if ( mouseChange.lengthSq() ) {

				// mouseChange.multiplyScalar();

				// console.log(mouseChange);
			// 	mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

				// pan.copy( _eye ).cross( _this.object.up ).setLength( mouseChange.x );
				// pan.add( objectUp.copy( _this.object.up ).setLength( mouseChange.y ) );

			// 	_this.object.position.add( pan );
			// 	_this.target.add( pan );


				// pan.copy()

				objRotation.copy(_this.object.quaternion);

				objRotation.inverse();

				mouseChange.multiplyScalar(camera.viewHeight / 2);

				mouseChange.applyQuaternion(objRotation);


				cube.position.add(mouseChange);

				_this.dispatchEvent(changeEvent);


			// 	if ( _this.staticMoving ) {
					_panStart.copy( _panEnd );
			// 	} else {
			// 		_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );
			// 	}

			}

		};

	}());

	var prevQuat = _this.object.quaternion.clone();

	this.update = function () {
		// if (key("SHIFT", RELEASED)


		if (_state !== STATE.ANIMATE) {
			_this.rotateObject(); // TODO, should ignore input as well
		}

		_this.panCamera();

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

	function mousedown( event ) {
		// event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.NONE ) {
			if (key("shift", HELD)) {
				_state = STATE.PAN;
			} else if (event.button === 0 && !key("ctrl", HELD) && !key("alt", HELD)) {
				console.log('rotating!');
				_state = STATE.ROTATE;
			}
		}

		if ( _state === STATE.ROTATE) {
			var mousePosition = getMouseOnScreen(event.pageX, event.pageY);

			_mouseStart.copy(mousePosition);
			_mouseEnd.copy(mousePosition );
		} else if (_state === STATE.PAN) {
			_panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
			_panEnd.copy( _panStart );
		}

		document.addEventListener( 'mousemove', mousemove, false );
		document.addEventListener( 'mouseup', mouseup, false );

		_this.dispatchEvent( startEvent );

	}

	var lastEvent = null;

	function mousemove( event ) {
		event.preventDefault();
		event.stopPropagation();

		lastEvent = event;

		if ( _state === STATE.ROTATE) {
			var ballPosition = getMouseOnScreen(event.pageX, event.pageY);
			_state === STATE.ROTATE;
			_mouseEnd.copy(ballPosition);
		} else if (_state === STATE.PAN) {
			_panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
		}

	}

	function mouseup( event ) {
		// todo, this is screwing up animations

		event.preventDefault();
		event.stopPropagation();

		console.log('no longer rotating!');

		// if (_state === STATE.ROTATE && _rotateEnd.equals(_rotateStart)) {
		// 	console.log('do the magic');
		// 	// too hackish, this fixes the previous problem:
		// 	// if update happens between mousemove and mouse up, the last mousemove event is performed in rotateObject
		// 	// and the cube will do a hard stop
		// 	_rotateEnd.copy (getMouseOnCircle(lastEvent.pageX + lastEvent.movementX, lastEvent.pageY + lastEvent.movementY));
		// }

		_state = STATE.NONE;

		document.removeEventListener( 'mousemove', mousemove );
		document.removeEventListener( 'mouseup', mouseup );
		_this.dispatchEvent( endEvent );
	}

	document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	document.addEventListener( 'mousedown', mousedown, false );

	// window.addEventListener( 'keydown', keydown, false );
	// window.addEventListener( 'keyup', keyup, false );

	this.handleResize();

	// force an update at start
	this.update();

};

THREE.RotateCubeControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.RotateCubeControls.prototype.constructor = THREE.RotateCubeControls;
