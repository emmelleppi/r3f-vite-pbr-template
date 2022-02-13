vec4 shadow = vec4(1.0);

#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias * (1.0 + 0.25 * blueNoise.z), directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] + vec4(8.0 * (blueNoise.xy - 0.5) / directionalLight.shadowMapSize, 0.0, 0.0) ) : vec4(1.0);
	}
	#pragma unroll_loop_end
#endif

gl_FragColor.rgb *= mix(vec3(1.0), shadow.rgb, (0.3 - 0.2 * (u_transmission * (1.0 - u_metalness))) * (1.0 - shadow.a));
