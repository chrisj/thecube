/**
 * author @ Mark Richardson
 **/

Shaders = {
	/* depthPacked
	 *
	 * I think what this is doing is taking the cell and coloring
	 * the canvas by depth. This is used for selecting cubes in overview.
	 * It's using a weird precision trick that
	 * is compensated for in ThreeDView.readBuffer. I think Mark Richardson
	 * mentioned that he had problems with precisely selecting cubes. 
	 *
	 * William Silversmith, Aug. 2014
	 */
	depthPacked: {
		uniforms: {},
		vertexShader:
			`void main() {
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				gl_Position = projectionMatrix * mvPosition;
			}`,

		fragmentShader: 
			`vec4 pack_depth(const in highp float depth) {
				const highp vec4 bit_shift = vec4(256.0, 256.0*256.0, 256.0*256.0*256.0, 256.0*256.0*256.0*256.0);
				vec4 res = depth * bit_shift;
				res.x = min(res.x + 1.0, 255.0);
				return fract(floor(res) / 256.0);
			}

			void main() {
				gl_FragData[0] = pack_depth(gl_FragCoord.z); // Setting color of pixel (aka fragment)
			}`
	},
	segIdPacked: {
		uniforms: {
			segid: { type: "i", value: 0 },
		},
		vertexShader:
			`void main() {
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				gl_Position = projectionMatrix * mvPosition;
			}`,

		fragmentShader:
		`uniform int segid;

		vec3 pack_int( const in int id ) {
			const highp vec3 bit_shift = vec3( 256.0 * 256.0, 256.0, 1.0 );
			float fid = float(id);
			vec3 res = floor(fid / bit_shift);
			res = mod(res, 256.0);
			return (res / 255.0);
		}

		void main() {
			gl_FragColor = vec4(pack_int(segid), 1.0);
		}`
	},

	wireframe: {
		derivatives: true,
		uniforms: {
			color: { type: "c", value: new THREE.Color( 0xffffff ) },
			origin: { type: "v3", value: new THREE.Vector3( 0, 0, 0 ) },
			opacity: { type: "f", value: 1.0 },
		},
		vertexShader: `
			uniform vec3 origin;

			attribute vec3 center;
			varying vec3 vCenter;
			varying float dTOS;

			void main() {

				vCenter = center;
				dTOS = (pow(position.x - origin.x, 2.0) + pow(position.y - origin.y, 2.0) + pow(position.z - origin.z, 2.0)) / .03;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				gl_Position.z -= 0.00001; // fix z-fighting

			}
		`,
		fragmentShader: `
			varying vec3 vCenter;
			varying float dTOS;
			uniform float opacity;
			uniform vec3 color;

			float edgeFactor() {

				vec3 d = fwidth( vCenter );
				vec3 a3 = smoothstep( vec3( 0.0 ), d * 1.5, vCenter );
				return min( min( a3.x, a3.y ), a3.z );

			}

			void main() {
				gl_FragColor.rgb = color;
				gl_FragColor.a = max(0.0, opacity * (1.0 - dTOS)) * (1.0 - edgeFactor()) * 0.5;
			}
		`
	},

	idPacked: {
		uniforms: {
			color: { type: "c", value: new THREE.Color( 0xffffff ) },
			opacity: { type: "f", value: 1.0 },

			specular: { type: "c", value: new THREE.Color( 0x333333 ) },
			shininess: { type: "f", value: 30 },

			diffuse: { type: "c", value: new THREE.Color( 0x888888 ) },
			ambientLightColor: { type: "c", value: new THREE.Color( 0x666666 ) },
		},

		vertexShader: `
			varying vec3 vViewPosition;
			varying vec3 vNormal;
			varying float isEdge;

			void main() {
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

				vViewPosition = -mvPosition.xyz;
				vNormal = normalMatrix * normal;

				gl_Position = projectionMatrix * mvPosition;

				isEdge = float(position.x <= 1.0 / 256.0 || position.x >= 255.0 / 256.0 || position.y <= 1.1 / 256.0 || position.y >= 255.0 / 256.0 || position.z <= 1.0 / 256.0 || position.z >= 255.0 / 256.0);
			}`,

		fragmentShader: `
			uniform float opacity;
			uniform vec3 diffuse;
			uniform vec3 color;

			uniform vec3 specular;
			uniform float shininess;

			uniform bool clip;

			uniform vec3 ambientLightColor;

			varying vec3 vViewPosition;
			varying vec3 vNormal;

			varying float isEdge;

			void main() {
				gl_FragColor.a = opacity;

				if (isEdge == 1.0) {
					gl_FragColor.rgb = vec3(0.0, 0.0, 0.0);
				} else {
					gl_FragColor.rgb = color;

					vec3 normal = normalize( vNormal );
					vec3 viewPosition = normalize( vViewPosition );

					vec4 lDirection = viewMatrix * vec4( cameraPosition, 0.0 );
					vec3 dirVector = normalize( lDirection.xyz );

					// diffuse

					float dotProduct = dot( normal, dirVector );
					float dirDiffuseWeight = max( dotProduct, 0.0 );
					vec3 dirDiffuse = diffuse * dirDiffuseWeight;

					// specular

					vec3 dirHalfVector = normalize( dirVector + viewPosition );
					float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );
					float dirSpecularWeight = max( pow( dirDotNormalHalf, shininess ), 0.0 );

					vec3 dirSpecular = specular * dirSpecularWeight * dirDiffuseWeight;

					gl_FragColor.rgb = gl_FragColor.rgb * ( dirDiffuse + ambientLightColor ) + dirSpecular;
				}
			}`
	}
};
