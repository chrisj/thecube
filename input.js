"use strict";

var INACTIVE = 0;
var HELD = 1;
var PRESSED = 2;
var RELEASED = 3;

var leftStickX;
var leftStickY;
var rightStickX;
var rightStickY;

var pressed_keys;
var held_keys;
var pressed_keys_buffer = [];
var held_keys_buffer = [];
var released_keys = [];
var released_keys_buffer = [];

var debugText;

function pollInput() {
    // debugText = '<pre>';

    pressed_keys = pressed_keys_buffer;
    pressed_keys_buffer = [];
    held_keys = held_keys_buffer.slice(0);

    released_keys = released_keys_buffer;
    released_keys_buffer = [];

    // if (!checkGamepad()) {
        // checkKeyboard();
    // }

    // console.log('pressed_keys', pressed_keys);

    // debugText += 'LeftStick           (' + leftStickX + ", " + leftStickY + ")<br/>";
    // debugText += 'RightStick          (' + rightStickX + ", " + rightStickY + ")<br/>";
    // debugText += 'Pressed Keys        (' + pressed_keys + ")<br/>";
    // debugText += 'Pressed Keys Buffer (' + pressed_keys_buffer + ")<br/>";
    // debugText += 'Held Keys           (' + held_keys + ")<br/>";
    // debugText += 'Held Keys Buffer    (' + held_keys_buffer + ")<br/>";
    // debugText += '</pre';
    // document.getElementById("debug").innerHTML = debugText;
}

function handleKeyDown(e) {
    if(!e){ var e = window.event; }

    switch(e.keyCode) {
        case 37: case 39: case 38:  case 40: // Arrow keys
        case 32: e.preventDefault(); break; // Space
        default: break; // do not block other keys
    }

    var key_name = codetokeymap[e.keyCode];
    if (!held_keys_buffer.contains(key_name)) {
        pressed_keys_buffer.push(key_name);
        held_keys_buffer.push(key_name);
    }

    // console.log('pressed', key_name);
}

function handleKeyUp(e) {
    if(!e){ var e = window.event; }
    var key_name = codetokeymap[e.keyCode];
    held_keys_buffer.removeItem(key_name);
    released_keys_buffer.push(key_name);
}

function button(n, state) {
    return buttons_state[n] === state;
}

function key(key_name, state) {
    if (state === PRESSED) {
        return pressed_keys.contains(key_name);
    } else if (state === HELD) {
        return held_keys.contains(key_name);
    } else if (state === RELEASED) {
        return released_keys.contains(key_name);
    }
    return false;
}

// var pressed_mouse_buttons;
// var released_mouse_buttons;
// var held_mouse_buttons;
// var held_mouse_buttons_buffer = [];

// var mouse_move_events = [];

// function handleMouseUp(e) {
//     event.preventDefault();
//     event.stopPropagation();
// }

// function handleMouseDown(e) {
//     event.preventDefault();
//     event.stopPropagation();


// }

// function handleMouseMove(e) {
//     event.preventDefault();
//     event.stopPropagation();

//     mouse_move_events.push(e);
// }

document.addEventListener('keydown', handleKeyDown, false);
document.addEventListener('keyup', handleKeyUp, false);

// document.addEventListener('mousemove', mousemove, false);
// document.addEventListener('mouseup', mouseup, false);


// utils TODO, remove these, probably use babel

Array.prototype.removeIf = function(condition) {
  for (var i = 0; i < this.length; i++) {
    if (condition(this[i])) {
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

Array.prototype.removeItem = function(item) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === item) {
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

Array.prototype.contains = function(element) {
  return this.indexOf(element) > -1;
}
