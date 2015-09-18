/**
 * author @ Mark Richardson
 **/

Shaders = {
	idPacked: {
		uniforms: {
			color: { type: "c", value: new THREE.Color( 0xffffff ) },
			opacity: { type: "f", value: 1.0 },
			taskid: { type: "i", value: 0 },
			segid: { type: "i", value: 0 },
			mode: { type: "i", value: 0 },

			diffuse: { type: "c", value: new THREE.Color( 0xeeeeee ) },
			ambient: { type: "c", value: new THREE.Color( 0xffffff ) },
			specular: { type: "c", value: new THREE.Color( 0x666666 ) },
			shininess: { type: "f", value: 30 },
			ambientLightColor: { type: "c", value: new THREE.Color( 0x111111 ) },

			nMin: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
			nMax: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
		},

		vertexShader: [
			"varying vec3 vViewPosition;",
			"varying vec3 vNormal;",
			"varying vec4 vPos;",
			"void main() {",
				"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

				"vViewPosition = -mvPosition.xyz;",
				"vNormal = normalMatrix * normal;",

				"vPos = vec4(position, 1.0);",

				"gl_Position = projectionMatrix * mvPosition;",
			"}"
		].join("\n"),

		fragmentShader: [
			"uniform float tilePosition;",
			"uniform vec3 color;",
			"uniform float opacity;",
			"uniform int taskid;",
			"uniform int segid;",
			"uniform int mode;",

			"uniform vec3 diffuse;",
			"uniform vec3 ambient;",
			"uniform vec3 specular;",
			"uniform float shininess;",

			"uniform bool clip;",
			"uniform vec3 nMin;",
			"uniform vec3 nMax;",

			"uniform vec3 ambientLightColor;",

			"varying vec3 vViewPosition;",
			"varying vec3 vNormal;",
			"varying vec4 vPos;",

			"vec3 pack_int( const in int id ) {",

				"const highp vec3 bit_shift = vec3( 256.0 * 256.0, 256.0, 1.0 );",
				"float fid = float(id);",
				"vec3 res = floor(fid / bit_shift);",
				"res = mod(res, 256.0);",
				"return (res / 255.0);",

			"}",

			"void main() {",
				"if (any(lessThan(vPos.xyz, nMin)) || any(greaterThan(vPos.xyz, nMax))) {",
					"discard;",
				"}",

				"if (mode == 1) {",
					"gl_FragColor = vec4(pack_int(taskid), 1.0);",
				"} else if (mode == 2) {",
					"gl_FragColor = vec4(pack_int(segid), 1.0);",
				"} else {",
					"gl_FragColor.rgb = color;",

					"vec3 normal = normalize( vNormal );",
					"vec3 viewPosition = normalize( vViewPosition );",

					"vec4 lDirection = viewMatrix * vec4( cameraPosition, 0.0 );",
					"vec3 dirVector = normalize( lDirection.xyz );",

					// diffuse

					"float dotProduct = dot( normal, dirVector );",
					"float dirDiffuseWeight = max( dotProduct, 0.0 );",
					"vec3 dirDiffuse = diffuse * dirDiffuseWeight;",

					// specular

					"vec3 dirHalfVector = normalize( dirVector + viewPosition );",
					"float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
					"float dirSpecularWeight = max( pow( dirDotNormalHalf, shininess ), 0.0 );",

					"vec3 dirSpecular = specular * dirSpecularWeight * dirDiffuseWeight;",

					"gl_FragColor.rgb = gl_FragColor.rgb * ( dirDiffuse + ambientLightColor * ambient ) + dirSpecular;",
					"gl_FragColor.a = opacity;",
				"}",
			"}"
		].join("\n")
	}
};
