"use strict";

var codetokeymap = {
	//general
	"3": "cancel",
	"8": "backspace",
	"9": "tab",
	"12": "clear",
	"13": "enter",
	"16": "shift",
	"17": "ctrl",
	"18": "alt",
	"19": "pause",
	"20": "capslock",
	"27": "escape",
	"32": "space",
	"33": "pageup",
	"34": "pagedown",
	"35": "end",
	"36": "home",
	"37": "left",
	"38": "up",
	"39": "right",
	"40": "down",
	"41": "select",
	"42": "printscreen",
	"43": "execute",
	"44": "snapshot",
	"45": "insert",
	"46": "delete",
	"47": "help",
	"91": "leftsuper",
	"92": "rightsuper",
	"145": "scrolllock",
	"186": "semicolon",
	"187": "equal",
	"188": "comma",
	"189": "dash",
	"190": "period",
	"191": "slash",
	"192": "graveaccent",
	"219": "openbracket",
	"220": "backslash",
	"221": "closebracket",
	"222": "apostrophe",

	//0-9
	"48": "zero",
	"49": "one",
	"50": "two",
	"51": "three",
	"52": "four",
	"53": "five",
	"54": "six",
	"55": "seven",
	"56": "eight",
	"57": "nine",

	//numpad
	"96": "numzero",
	"97": "numone",
	"98": "numtwo",
	"99": "numthree",
	"100": "numfour",
	"101": "numfive",
	"102": "numsix",
	"103": "numseven",
	"104": "numeight",
	"105": "numnine",
	"106": "nummultiply",
	"107": "numadd",
	"108": "numenter",
	"109": "numsubtract",
	"110": "numdecimal",
	"111": "numdevide",
	"144": "numlock",

	//function keys
	"112": "f1",
	"113": "f2",
	"114": "f3",
	"115": "f4",
	"116": "f5",
	"117": "f6",
	"118": "f7",
	"119": "f8",
	"120": "f9",
	"121": "f10",
	"122": "f11",
	"123": "f12"
};
//a-z and A-Z
for (var aI = 65; aI <= 90; aI += 1) {
	codetokeymap[aI] = String.fromCharCode(aI + 32);
}

var keytocodemap = {};
for(var code in codetokeymap){
    keytocodemap[codetokeymap[code]] = code;
}
