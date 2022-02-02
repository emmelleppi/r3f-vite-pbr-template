float shadow = 1.0;

#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		DirectionalLightShadow directionalLight;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			directionalLight = directionalLightShadows[ i ];
			shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias + blueNoise.z * 0.005, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] + vec4(8.0 * (blueNoise.xy - 0.5) / directionalLight.shadowMapSize, 0.0, 0.0) ) : 1.0;
		}
		#pragma unroll_loop_end
	#endif
#endif

gl_FragColor.rgb *= mix(0.5, 1.0, shadow);
