(function(app) {

  'use strict';

  /////////////////////////////////////////////////////////////////////////////
  // MapShader
  //
  // - VertexShader for the Bottom GradientMesh and WireframeMesh
  // - VertexShader for the Top GradientMesh and WireframeMesh
  // - FragmentShader for the Bottom/Top GradientMesh and WireframeMesh
  //
  // - Remember to define the NUM_AREAS when creating the ShaderMaterial
  //
  /////////////////////////////////////////////////////////////////////////////

  app.views.MapShader = {

    bottomVertexShader: [

      'attribute float areaIndexByColor;',
      'uniform float colorCoefs[ NUM_AREAS ];',
      'uniform float currentArea;',
      'uniform float globalAlpha;',
      'uniform float maxElevation;',
      'uniform sampler2D areamapTexture;',
      'uniform sampler2D heightmapTexture;',
      'uniform vec3 currentColor;',
      'varying float areaAlphaCoef;',
      'varying float coef;',
      'varying vec2 vUv;',

      'void main() {',

        'vec4 areaMapColor = texture2D(areamapTexture, uv);',
        'vec4 heightMapColor = texture2D(heightmapTexture, uv);',
        'vec4 vPosition = vec4(position, 1.0);',

        // check the red color on heightmap as heightmapTexture
        // red green and blue have the same values as I am using greyscale.
        'if ( areaIndexByColor == -1.0 ) {',

          'coef = 0.0;',
          'areaAlphaCoef = 0.0;',

        '} else {',

          'if ( currentArea != areaIndexByColor ) {',

            // 'areaAlphaCoef = 1.0;',
            'areaAlphaCoef = globalAlpha;',

          '} else {',

            'areaAlphaCoef = 1.0;',

          '}',

          'coef = colorCoefs[ int(areaIndexByColor) ];',

          'if (heightMapColor.r > 0.0) {',
            'vPosition.y = heightMapColor.r * maxElevation * coef;',

            // test for the client, please remove it later.
            // 'coef = 1.0;',
          '}',

        '}',

        'vUv = uv;',
        'gl_Position = projectionMatrix * modelViewMatrix * vPosition;',

      '}'

    ].join('\n'),

    topVertexShader: [

      'attribute float areaIndexByColor;',
      'uniform float colorCoefs[ NUM_AREAS ];',
      'uniform float currentArea;',
      'uniform float globalAlpha;',
      'uniform float maxElevation;',
      'uniform sampler2D areamapTexture;',
      'uniform sampler2D heightmapTexture;',
      'uniform vec3 currentColor;',
      'varying float areaAlphaCoef;',
      'varying float coef;',
      'varying vec2 vUv;',

      'void main() {',

      '  vec4 areaMapColor = texture2D(areamapTexture, uv);',
      '  vec4 heightMapColor = texture2D(heightmapTexture, uv);',
      '  vec4 vPosition = vec4(position, 1.0);',

      // check the red color on heightmap as heightmapTexture
      // red green and blue have the same values as I am using greyscale.

      '  if ( currentArea == -1.0 ) {',
      '    areaAlphaCoef = globalAlpha;',
      '  } else {',
      '    if ( currentArea == areaIndexByColor && currentArea != -1.0) {',
      '      areaAlphaCoef = 1.0;',
      '    } else {',
      '      areaAlphaCoef = globalAlpha;',
      '    }',
      '  }',

      '  if (areaIndexByColor == -1.0) {',

      '    coef = 0.0;',
      '    areaAlphaCoef = 0.0;',

      '  } else {',

      '    coef = colorCoefs[ int(areaIndexByColor) ];',
      '    if (heightMapColor.r > 0.0) {',
      '      vPosition.y = heightMapColor.r * maxElevation * coef;',
      '    }',

      '  }',

      '  vUv = uv;',

      '  gl_Position = projectionMatrix * modelViewMatrix * vPosition;',

      '}'

    ].join('\n'),

    fragmentShader: [

      'uniform sampler2D areamapTexture;',
      'uniform sampler2D heightmapTexture;',
      'uniform vec3 currentColor;',
      'varying float areaAlphaCoef;',
      'varying float coef;',
      'varying vec2 vUv;',

      'void main() {',

        'mediump vec4 mp = texture2D( areamapTexture, vUv );',
        'mediump vec4 sp = texture2D( heightmapTexture, vUv );',
        // apply alpha based on colorCoef and heightmap Red
        'float destAlpha = sqrt( sp.r * coef * areaAlphaCoef );',
        // 'vec4 color = vec4( currentColor,  destAlpha );',
        'vec4 color = vec4( currentColor,  destAlpha );',

        'if (destAlpha == 0.0)',
        '  discard;',

        'gl_FragColor = color;',

      '}'

    ].join('\n')

  };

}(window.sl.loom));
