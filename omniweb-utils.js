/* stationaryClick
 *
 * Isolates a click from a drag.
 *
 * Algorithm: Cancel click handler if a significant mouse move was triggered
 * 			  This is so that we can avoid having to press e.g. shift to do
 * 			  cube selection.
 * 
 * 			  A significant mouse move is a radial distance greater than 
 * 			  one pixel. Zero works as well, but one allows for shaky hands.
 *
 * Required:
 *   [0] fn
 *
 * Return: this
 */
$.fn.stationaryClick = function (fn) {
	var oldpos = { x: 0, y: 0 };
	var fire_mouse_up = true;

	return $(this)
		.mousedown(function (e) {
			fire_mouse_up = true;
			oldpos.x = e.clientX;
			oldpos.y = e.clientY;
		})
		.mousemove(function (e) {
			var newpos = { x: e.clientX, y: e.clientY };
			var r2 = Math.pow(newpos.x - oldpos.x, 2) + Math.pow(newpos.y - oldpos.y, 2);

			if (r2 > 0) { // r > 1 pixels
				fire_mouse_up = false;
			}
		})
		.mouseup(function () {
			console.log('mouse up!');
			if (fire_mouse_up) {
				fn.apply($(this), arguments);
			}
		});
};

/* ion
 *
 * i(dempotent)on. When you do $(selector).on('click', fn)
 * and you don't recreate the element each time, 
 * you have to remember to write it as $(selector).off('click').on('click', fn)
 * to avoid adding the event repeatedly.
 *
 * With this function, you only have to wite this: $(selector).ion('click', fn)
 *
 * Required: Same as jQuery.on
 *
 * Return: this
 */
$.fn.ion = function (type, fn) {
	return $(this).off(type).on(type, fn);
};