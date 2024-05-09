//
//  initShaders.js
//

function initShaders(gl) {
  const vertexShaderSource = `
  attribute vec4 vPosition;
  attribute vec3 vNormal;
  varying vec4 fColor;
  
  uniform vec4 ambientProduct, diffuseProduct, specularProduct;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform vec4 lightPosition;
  uniform float shininess;
  
  void main()
  {
      vec3 pos = -(modelViewMatrix * vPosition).xyz;
  
      // Normalize vectors early
      vec3 N = normalize((modelViewMatrix * vec4(vNormal, 0.0)).xyz);
      vec3 L = normalize(lightPosition.xyz - pos);
      vec3 E = normalize(-pos);
      vec3 H = normalize(L + E);
  
      // Compute terms in the illumination equation
      float ambientOcclusion = max(dot(N, E), 0.2); // Tweak the factor for best results
      vec4 ambient = ambientProduct * ambientOcclusion;
  
      float Kd = max(dot(L, N), 0.0);
      vec4 diffuse = Kd * diffuseProduct;
  
      float Ks = smoothstep(0.0, 1.0, pow(max(dot(N, H), 0.0), shininess));
      vec4 specular = Ks * specularProduct;
  
      if (dot(L, N) < 0.0) {
          specular = vec4(0.0, 0.0, 0.0, 1.0);
      }
  
      gl_Position = projectionMatrix * modelViewMatrix * vPosition;
      fColor = ambient + diffuse + specular;
      fColor.a = 1.0;
  }
  `;
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  const fragmentShaderSource = `precision mediump float;
    varying vec4 fColor;
    
    void main(){
        gl_FragColor = fColor;
    }`;

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  return shaderProgram;
}

var canvas;
var gl;
var program;

var rotate_toggle = false;
var isAnimation = false;

var projectionMatrix;
var modelViewMatrix;

var instanceMatrix;

var modelViewMatrixLoc;

var vertices = [
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, 0.5, 0.5, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, 0.5, -0.5, 1.0),
  vec4(0.5, 0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0),
];

var activeFrame = -1;

var headId = 0;

var left1UpperTentacleId = 1;
var left1MidTentacleId = 7;
var left1LowerTentacleId = 13;

var left2UpperTentacleId = 2;
var left2MidTentacleId = 8;
var left2LowerTentacleId = 14;

var left3UpperTentacleId = 3;
var left3MidTentacleId = 9;
var left3LowerTentacleId = 15;

var left4UpperTentacleId = 19;
var left4MidTentacleId = 21;
var left4LowerTentacleId = 23;

var right1UpperTentacleId = 4;
var right1MidTentacleId = 10;
var right1LowerTentacleId = 16;

var right2UpperTentacleId = 5;
var right2MidTentacleId = 11;
var right2LowerTentacleId = 17;

var right3UpperTentacleId = 6;
var right3MidTentacleId = 12;
var right3LowerTentacleId = 18;

var right4UpperTentacleId = 20;
var right4MidTentacleId = 22;
var right4LowerTentacleId = 24;

var tiltIndex = 25;

var headHeight = 3.0;
var headWidth = 3.0;

var upperTentacleHeight = 3.0;
var upperTentacleWidth = 0.6;

var midTentacleHeight = 2.0;
var midTentacleWidth = 0.5;

var lowerTentacleHeight = 1.0;
var lowerTentacleWidth = 0.4;

var numNodes = 25;

var figureSliders = [];

var currentTheta = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
];

var theta = currentTheta;

var keyframes = [];
let intervalId;

var stack = [];
var figure = [];

let animationSpeed = 2000;

for (var i = 0; i < numNodes; i++) {
  figure[i] = createNode(null, null, null, null);
  figureSliders[i] = 0;
}

var vBuffer;
var modelViewLoc;

var pointsArray = [];
var normalsArray = [];

var lightPosition = vec4(1.0, 1.0, 1.0, 1.0); // Experiment with different values
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0); // Experiment with different values
var lightDiffuse = vec4(0.5, 0.5, 0.3, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(92/255, 0/255, 41/255, 1.0);
var materialDiffuse = vec4(92/255, 0/255, 50/255, 1.0); // Experiment with different values
var materialSpecular = vec4(0.4, 0.4, 0.4, 0.4); // Experiment with different values
var materialShininess = 100.0; // Experiment with different values

//-------------------------------------------

function scale4(a, b, c) {
  var result = mat4();
  result[0][0] = a;
  result[1][1] = b;
  result[2][2] = c;
  return result;
}

//--------------------------------------------

function createNode(transform, render, sibling, child) {
  var node = {
    transform: transform,
    render: render,
    sibling: sibling,
    child: child,
  };
  return node;
}

function initNodes(nodeId) {
  var m = mat4();

  if (nodeId == headId) {
    m = rotate(theta[headId], 0, 1, 0);
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(theta[tiltIndex], 0, 1, 0));
    figure[headId] = createNode(m, drawHead, null, left1UpperTentacleId);
  } else if (nodeId == left1UpperTentacleId) {
    m = translate(
      -(headWidth / 2 - upperTentacleWidth),
      0.9 * headHeight,
      headWidth * 0.5
    );
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(135, 0, 1, 0));
    m = mult(m, rotate(theta[left1UpperTentacleId], 0, 0, 1));
    figure[left1UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      right1UpperTentacleId,
      left1MidTentacleId
    );
  } else if (nodeId == right1UpperTentacleId) {
    m = translate(
      headWidth / 2 - upperTentacleWidth,
      0.9 * headHeight,
      headWidth * 0.5
    );
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(-135, 0, 1, 0));
    m = mult(m, rotate(theta[right1UpperTentacleId], 0, 0, 1));
    figure[right1UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      left2UpperTentacleId,
      right1MidTentacleId
    );
  } else if (nodeId == left2UpperTentacleId) {
    m = translate(
      -(headWidth / 2 - upperTentacleWidth),
      0.5 * headHeight,
      headWidth * 0.5
    );
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(90, 0, 1, 0));
    m = mult(m, rotate(theta[left2UpperTentacleId], 1, 0, 0));
    figure[left2UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      right2UpperTentacleId,
      left2MidTentacleId
    );
  } else if (nodeId == right2UpperTentacleId) {
    m = translate(
      headWidth / 2 - upperTentacleWidth,
      0.5 * headHeight,
      headWidth * 0.5
    );
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(90, 0, 1, 0));
    m = mult(m, rotate(theta[right2UpperTentacleId], 1, 0, 0));
    figure[right2UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      left3UpperTentacleId,
      right2MidTentacleId
    );
  } else if (nodeId == left3UpperTentacleId) {
    m = translate(
      -(headWidth / 2 - upperTentacleWidth),
      0.1 * upperTentacleHeight,
      headWidth * 0.5
    );
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(45, 0, 1, 0));
    m = mult(m, rotate(theta[left3UpperTentacleId], 0, 0, 1));
    figure[left3UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      right3UpperTentacleId,
      left3MidTentacleId
    );
  } else if (nodeId == right3UpperTentacleId) {
    m = translate(
      headWidth / 2 - upperTentacleWidth,
      0.1 * upperTentacleHeight,
      headWidth * 0.5
    );
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(135, 0, 1, 0));
    m = mult(m, rotate(theta[right3UpperTentacleId], 0, 0, 1));
    figure[right3UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      left4UpperTentacleId,
      right3MidTentacleId
    );
  } else if (nodeId == left4UpperTentacleId) {
    m = translate(0, 0.1 * upperTentacleHeight, headWidth * 0.5);
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(90, 0, 1, 0));
    m = mult(m, rotate(theta[left4UpperTentacleId], 0, 0, 1));
    figure[left4UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      right4UpperTentacleId,
      left4MidTentacleId
    );
  } else if (nodeId == right4UpperTentacleId) {
    m = translate(0, 0.9 * upperTentacleHeight, headWidth * 0.5);
    m = mult(m, rotate(90, 1, 0, 0));
    m = mult(m, rotate(-90, 0, 1, 0));
    m = mult(m, rotate(theta[right4UpperTentacleId], 0, 0, 1));
    figure[right4UpperTentacleId] = createNode(
      m,
      drawUpperTentacle,
      null,
      right4MidTentacleId
    );
  } else if (nodeId == left1MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left1MidTentacleId], 0, 0, 1));
    figure[left1MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      left1LowerTentacleId
    );
  } else if (nodeId == right1MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right1MidTentacleId], 0, 0, 1));
    figure[right1MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      right1LowerTentacleId
    );
  } else if (nodeId == left2MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left2MidTentacleId], 1, 0, 0));
    figure[left2MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      left2LowerTentacleId
    );
  } else if (nodeId == right2MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right2MidTentacleId], 1, 0, 0));
    figure[right2MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      right2LowerTentacleId
    );
  } else if (nodeId == left3MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left3MidTentacleId], 0, 0, 1));
    figure[left3MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      left3LowerTentacleId
    );
  } else if (nodeId == right3MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right3MidTentacleId], 0, 0, 1));
    figure[right3MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      right3LowerTentacleId
    );
  } else if (nodeId == left4MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left4MidTentacleId], 0, 0, 1));
    figure[left4MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      left4LowerTentacleId
    );
  } else if (nodeId == right4MidTentacleId) {
    m = translate(0.0, upperTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right4MidTentacleId], 0, 0, 1));
    figure[right4MidTentacleId] = createNode(
      m,
      drawMidTentacle,
      null,
      right4LowerTentacleId
    );
  } else if (nodeId == left1LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left1LowerTentacleId], 0, 0, 1));
    figure[left1LowerTentacleId] = createNode(m, drawLowerTentacle, null, null);
  } else if (nodeId == right1LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right1LowerTentacleId], 0, 0, 1));
    figure[right1LowerTentacleId] = createNode(
      m,
      drawLowerTentacle,
      null,
      null
    );
  } else if (nodeId == left2LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(90, 0, 1, 0));
    m = mult(m, rotate(theta[left2LowerTentacleId], 0, 0, 1));
    figure[left2LowerTentacleId] = createNode(m, drawLowerTentacle, null, null);
  } else if (nodeId == right2LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right2LowerTentacleId], 1, 0, 0));
    figure[right2LowerTentacleId] = createNode(
      m,
      drawLowerTentacle,
      null,
      null
    );
  } else if (nodeId == left3LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left3LowerTentacleId], 0, 0, 1));
    figure[left3LowerTentacleId] = createNode(m, drawLowerTentacle, null, null);
  } else if (nodeId == right3LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right3LowerTentacleId], 0, 0, 1));
    figure[right3LowerTentacleId] = createNode(
      m,
      drawLowerTentacle,
      null,
      null
    );
  } else if (nodeId == left4LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[left4LowerTentacleId], 0, 0, 1));
    figure[left4LowerTentacleId] = createNode(m, drawLowerTentacle, null, null);
  } else if (nodeId == right4LowerTentacleId) {
    m = translate(0.0, midTentacleHeight, 0.0);
    m = mult(m, rotate(theta[right4LowerTentacleId], 0, 0, 1));
    figure[right4LowerTentacleId] = createNode(
      m,
      drawLowerTentacle,
      null,
      null
    );
  }
}

function traverse(Id) {
  if (Id == null) return;
  stack.push(modelViewMatrix);
  modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
  figure[Id].render();
  if (figure[Id].child != null) traverse(figure[Id].child);
  modelViewMatrix = stack.pop();
  if (figure[Id].sibling != null) traverse(figure[Id].sibling);
}

function drawHead() {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0));
  instanceMatrix = mult(
    instanceMatrix,
    scale4(headWidth, headHeight, headWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 4 * i, 36);
}

function drawUpperTentacle() {
  instanceMatrix = mult(
    modelViewMatrix,
    translate(0.0, 0.5 * upperTentacleHeight, 0.0)
  );
  instanceMatrix = mult(
    instanceMatrix,
    scale4(upperTentacleWidth, upperTentacleHeight, upperTentacleWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 4 * i, 36);
}

function drawMidTentacle() {
  instanceMatrix = mult(
    modelViewMatrix,
    translate(0.0, 0.5 * midTentacleHeight, 0.0)
  );
  instanceMatrix = mult(
    instanceMatrix,
    scale4(midTentacleWidth, midTentacleHeight, midTentacleWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 4 * i, 36);
}

function drawLowerTentacle() {
  instanceMatrix = mult(
    modelViewMatrix,
    translate(0.0, 0.5 * lowerTentacleHeight, 0.0)
  );
  instanceMatrix = mult(
    instanceMatrix,
    scale4(lowerTentacleWidth, lowerTentacleHeight, lowerTentacleWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 4 * i, 36);
}

function quad(a, b, c, d) {
  var t1 = subtract(vertices[b], vertices[a]);
  var t2 = subtract(vertices[c], vertices[b]);
  var normal = cross(t1, t2);
  var normal = vec3(normal);

  pointsArray.push(vertices[a]);
  normalsArray.push(normal);
  pointsArray.push(vertices[c]);
  normalsArray.push(normal);
  pointsArray.push(vertices[d]);
  normalsArray.push(normal);
  pointsArray.push(vertices[a]);
  normalsArray.push(normal);
  pointsArray.push(vertices[b]);
  normalsArray.push(normal);
  pointsArray.push(vertices[c]);
  normalsArray.push(normal);
}

function cube() {
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);

}


window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl);
  gl.useProgram(program);

  cube();

  var nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

  var vNormal = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormal);

  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  projectionMatrix = ortho(-10.0, 10.0, -10.0, 10.0, -10.0, 10.0);
  instanceMatrix = mat4();
  modelViewMatrix = mat4();
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

  ambientProduct = mult(lightAmbient, materialAmbient);
  diffuseProduct = mult(lightDiffuse, materialDiffuse);
  specularProduct = mult(lightSpecular, materialSpecular);

  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );

  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "modelViewMatrix"),
    false,
    flatten(modelViewMatrix)
  );
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "projectionMatrix"),
    false,
    flatten(projectionMatrix)
  );

  for (var i = 0; i < numNodes; i++) {
    initNodes(i);
  }


  figureSliders[headId] = document.getElementById("bodyRange");
  figureSliders[headId].addEventListener("input", function () {
    theta[headId] = this.value;
    initNodes(headId);
  });

  figureSliders[tiltIndex] = document.getElementById("tiltRange");
  figureSliders[tiltIndex].addEventListener("input", function () {
    theta[tiltIndex] = this.value;
    initNodes(headId);
  });

  figureSliders[left1UpperTentacleId] = document.getElementById("upper1Range");
  figureSliders[left1UpperTentacleId].addEventListener("input", function () {
    theta[left1UpperTentacleId] = this.value;
    initNodes(left1UpperTentacleId);
  });

  figureSliders[left2UpperTentacleId] = document.getElementById("upper2Range");
  figureSliders[left2UpperTentacleId].addEventListener("input", function () {
    theta[left2UpperTentacleId] = this.value;
    initNodes(left2UpperTentacleId);
  });

  figureSliders[left3UpperTentacleId] = document.getElementById("upper3Range");
  figureSliders[left3UpperTentacleId].addEventListener("input", function () {
    theta[left3UpperTentacleId] = this.value;
    initNodes(left3UpperTentacleId);
  });

  figureSliders[right1UpperTentacleId] = document.getElementById("upper4Range");
  figureSliders[right1UpperTentacleId].addEventListener("input", function () {
    theta[right1UpperTentacleId] = this.value;
    initNodes(right1UpperTentacleId);
  });

  figureSliders[right2UpperTentacleId] = document.getElementById("upper5Range");
  figureSliders[right2UpperTentacleId].addEventListener("input", function () {
    theta[right2UpperTentacleId] = this.value;
    initNodes(right2UpperTentacleId);
  });

  figureSliders[right3UpperTentacleId] = document.getElementById("upper6Range");
  figureSliders[right3UpperTentacleId].addEventListener("input", function () {
    theta[right3UpperTentacleId] = this.value;
    initNodes(right3UpperTentacleId);
  });

  figureSliders[left4UpperTentacleId] = document.getElementById("upper7Range");
  figureSliders[left4UpperTentacleId].addEventListener("input", function () {
    theta[left4UpperTentacleId] = this.value;
    initNodes(left4UpperTentacleId);
  });

  figureSliders[right4UpperTentacleId] = document.getElementById("upper8Range");
  figureSliders[right4UpperTentacleId].addEventListener("input", function () {
    theta[right4UpperTentacleId] = this.value;
    initNodes(right4UpperTentacleId);
  });

  figureSliders[left1MidTentacleId] = document.getElementById("mid1Range");
  figureSliders[left1MidTentacleId].addEventListener("input", function () {
    theta[left1MidTentacleId] = this.value;
    initNodes(left1MidTentacleId);
  });

  figureSliders[left2MidTentacleId] = document.getElementById("mid2Range");
  figureSliders[left2MidTentacleId].addEventListener("input", function () {
    theta[left2MidTentacleId] = this.value;
    initNodes(left2MidTentacleId);
  });

  figureSliders[left3MidTentacleId] = document.getElementById("mid3Range");
  figureSliders[left3MidTentacleId].addEventListener("input", function () {
    theta[left3MidTentacleId] = this.value;
    initNodes(left3MidTentacleId);
  });

  figureSliders[right1MidTentacleId] = document.getElementById("mid4Range");
  figureSliders[right1MidTentacleId].addEventListener("input", function () {
    theta[right1MidTentacleId] = this.value;
    initNodes(right1MidTentacleId);
  });

  figureSliders[right2MidTentacleId] = document.getElementById("mid5Range");
  figureSliders[right2MidTentacleId].addEventListener("input", function () {
    theta[right2MidTentacleId] = this.value;
    initNodes(right2MidTentacleId);
  });

  figureSliders[right3MidTentacleId] = document.getElementById("mid6Range");
  figureSliders[right3MidTentacleId].addEventListener("input", function () {
    theta[right3MidTentacleId] = this.value;
    initNodes(right3MidTentacleId);
  });

  figureSliders[left4MidTentacleId] = document.getElementById("mid7Range");
  figureSliders[left4MidTentacleId].addEventListener("input", function () {
    theta[left4MidTentacleId] = this.value;
    initNodes(left4MidTentacleId);
  });

  figureSliders[right4MidTentacleId] = document.getElementById("mid8Range");
  figureSliders[right4MidTentacleId].addEventListener("input", function () {
    theta[right4MidTentacleId] = this.value;
    initNodes(right4MidTentacleId);
  });

  figureSliders[left1LowerTentacleId] = document.getElementById("lower1Range");
  figureSliders[left1LowerTentacleId].addEventListener("input", function () {
    theta[left1LowerTentacleId] = this.value;
    initNodes(left1LowerTentacleId);
  });

  figureSliders[left2LowerTentacleId] = document.getElementById("lower2Range");
  figureSliders[left2LowerTentacleId].addEventListener("input", function () {
    theta[left2LowerTentacleId] = this.value;
    initNodes(left2LowerTentacleId);
  });

  figureSliders[left3LowerTentacleId] = document.getElementById("lower3Range");
  figureSliders[left3LowerTentacleId].addEventListener("input", function () {
    theta[left3LowerTentacleId] = this.value;
    initNodes(left3LowerTentacleId);
  });

  figureSliders[right1LowerTentacleId] = document.getElementById("lower4Range");
  figureSliders[right1LowerTentacleId].addEventListener("input", function () {
    theta[right1LowerTentacleId] = this.value;
    initNodes(right1LowerTentacleId);
  });

  figureSliders[right2LowerTentacleId] = document.getElementById("lower5Range");
  figureSliders[right2LowerTentacleId].addEventListener("input", function () {
    theta[right2LowerTentacleId] = this.value;
    initNodes(right2LowerTentacleId);
  });

  figureSliders[right3LowerTentacleId] = document.getElementById("lower6Range");
  figureSliders[right3LowerTentacleId].addEventListener("input", function () {
    theta[right3LowerTentacleId] = this.value;
    initNodes(right3LowerTentacleId);
  });

  figureSliders[left4LowerTentacleId] = document.getElementById("lower7Range");
  figureSliders[left4LowerTentacleId].addEventListener("input", function () {
    theta[left4LowerTentacleId] = this.value;
    initNodes(left4LowerTentacleId);
  });

  figureSliders[right4LowerTentacleId] = document.getElementById("lower8Range");
  figureSliders[right4LowerTentacleId].addEventListener("input", function () {
    theta[right4LowerTentacleId] = this.value;
    initNodes(right4LowerTentacleId);
  });

  document.getElementById("animationSpeedRange").value = animationSpeed;
  document.getElementById("animationSpeedRange").addEventListener("input", function() {
    animationSpeed = this.value;
  });

  document.getElementById("rotateButton").onclick = function () {
    rotate_toggle = !rotate_toggle;
  };


  document.getElementById("resetButton").onclick = function () {

    for (let index = 0; index < currentTheta.length; index++) {
      currentTheta[index] = 0;
    }

    for (i = 0; i < numNodes; i++) initNodes(i);

    for (let i = 0; i < numNodes; i++) {
      figureSliders[i].value = theta[i];
    }

    figureSliders[tiltIndex].value = theta[tiltIndex];
  };

  document.getElementById("saveFrameButton").onclick = function () {
    keyframes.push(structuredClone(theta));
    updateKeyframesList();
  };

  document
    .getElementById("stopButton")
    .addEventListener("click", stopAnimation);

  function stopAnimation() {
    isAnimation = false;
    clearInterval(intervalId);
  }

  updateKeyframesList();

  document.getElementById("animateButton").onclick = function () {
    if (!isAnimation && keyframes.length > 1) {
      isAnimation = true;

      function lerpAngle(angle1, angle2, t) {
        angle1 = ((angle1 % 360) + 360) % 360;
        angle2 = ((angle2 % 360) + 360) % 360;
        let diff = angle2 - angle1;
        if (Math.abs(diff) > 180) {
          angle2 += diff > 0 ? -360 : 360;
        }
        return angle1 + t * (angle2 - angle1);
      }

      function animateAngles(angleArrays, duration, updateCallback) {
        const interval = 10;
        const steps = duration / interval;
        let currentArrayIndex = 0;
        let nextArrayIndex = 1;
        let step = 0;

        const intervalId = setInterval(() => {
          const t = (step / steps) % 1;
          const currentArray = angleArrays[currentArrayIndex];
          const nextArray = angleArrays[nextArrayIndex];

          const interpolatedAngles = currentArray.map((angle, index) =>
            lerpAngle(angle, nextArray[index], t)
          );

          updateCallback(interpolatedAngles);

          step++;

          if (step >= steps) {
            step = 0;
            currentArrayIndex = (currentArrayIndex + 1) % angleArrays.length;
            nextArrayIndex = (nextArrayIndex + 1) % angleArrays.length;
          }
        }, interval);

        return intervalId;
      }

      intervalId = animateAngles(keyframes, animationSpeed, (interpolatedAngles) => {
        // Update your UI or do something with the interpolated angles
        theta = interpolatedAngles;
        for (i = 0; i < numNodes; i++) initNodes(i);
      });
    }
  };

  render();
};

function updateKeyframesList() {
  const keyframesList = document.getElementById("keyframesList");
  keyframesList.innerHTML = "";

  if (keyframes.length > 0) {
    const currentButton = document.createElement("button");
    currentButton.setAttribute("type", "button");
    currentButton.classList.add("list-group-item", "list-group-item-action");
    if (activeFrame == -1) {
      currentButton.classList.add("active");
    }
    currentButton.textContent = "Current";
    currentButton.style.marginTop = "5px";
    currentButton.addEventListener("click", () => selectCurrentButton(currentButton));
    keyframesList.appendChild(currentButton);

  }

  keyframes.forEach((frame, index) => {
    const listItem = document.createElement("button");
    listItem.setAttribute("type", "button");
    listItem.classList.add("list-group-item", "list-group-item-action");

    if (index === activeFrame) {
      listItem.classList.add("active");
    }

    listItem.textContent = `Keyframe ${index + 1}`;
    listItem.addEventListener("click", () => selectKeyframe(index));
    keyframesList.appendChild(listItem);
  });

  if (keyframes.length > 0) {
    const deleteButton = document.createElement("button");
    deleteButton.setAttribute("type", "button");
    deleteButton.classList.add("btn", "btn-danger", "btn-sm");
    deleteButton.textContent = "Delete";
    deleteButton.style.marginTop = "5px";
    deleteButton.addEventListener("click", () => deleteKeyFrame());
    keyframesList.appendChild(deleteButton);

    const downloadButton = document.createElement("button");
    downloadButton.setAttribute("type", "button");
    downloadButton.classList.add("btn", "btn-primary", "btn-sm");
    downloadButton.textContent = "Download";
    downloadButton.id = "downloadButton";
    downloadButton.style.marginTop = "5px";
    downloadButton.addEventListener("click", () => downloadAnimation());
    keyframesList.appendChild(downloadButton);
  }

  const uploadButton = document.createElement("button");
  uploadButton.setAttribute("type", "button");
  uploadButton.classList.add("btn", "btn-success", "btn-sm");
  uploadButton.textContent = "Upload";
  uploadButton.style.marginTop = "5px";
  uploadButton.addEventListener("click", () => uploadAnimation());
  keyframesList.appendChild(uploadButton);
}

function selectCurrentButton(currentButton) {
  activeFrame = -1;

  theta = currentTheta;

  document.querySelectorAll(".list-group-item").forEach((button) => {
    button.classList.remove("active");
  });

  currentButton.classList.add("active");


  for (let i = 0; i < numNodes; i++) {
    figureSliders[i].value = theta[i];
  }

  figureSliders[tiltIndex].value = theta[tiltIndex];
}

function deleteKeyFrame() {
  if (activeFrame != -1) {
    keyframes.splice(activeFrame, 1);
  }

  updateKeyframesList();

  for (let i = 0; i < numNodes; i++) {
    figureSliders[i].value = keyframes[0][i];
  }

  figureSliders[tiltIndex].value = theta[tiltIndex];

  activeFrame = -1;
}

function selectKeyframe(index) {
  activeFrame = index;

  theta = keyframes[index];

  document.querySelectorAll(".list-group-item").forEach((button) => {
    button.classList.remove("active");
  });

  // Add "active" class to the selected button
  const selectedButton = document.querySelector(`#keyframesList button:nth-child(${index + 2})`);
  if (selectedButton) {
    selectedButton.classList.add("active");
  }

  for (i = 0; i < numNodes; i++) initNodes(i);

  for (let i = 0; i < numNodes; i++) {
    figureSliders[i].value = keyframes[index][i];
  }

  figureSliders[tiltIndex].value = theta[tiltIndex];
}

var render = async function () {
  rotateUnit();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  traverse(headId);
  requestAnimFrame(render);
};

var rotateUnit = function () {
  if (rotate_toggle) {
      theta[headId] = theta[headId] + 2;
      if (theta[headId] > 180) {
        theta[headId] = -180 + (theta[headId] % 180);
      }
      initNodes(headId);
    
    document.getElementById("bodyRange").value = theta[headId];
  }
};

function downloadAnimation() {
  const fileName = prompt("Enter a name for the animation you want to save: ");
  if (!fileName) {
    alert("Please enter a valid filename.");
    return;
  }

  const jsonContent = JSON.stringify(keyframes);

  const blob = new Blob([jsonContent], { type: "application/json" });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName + ".tim";
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);

  window.URL.revokeObjectURL(url);
}

function uploadAnimation() {
  const newInput = document.createElement("input");
  newInput.type = "file";
  newInput.style.display = "none";

  newInput.addEventListener("change", function () {
    const file = newInput.files[0];
    console.log(file);
    if (file) {
      console.log(file.name);
      if (file.name.endsWith(".tim")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const content = e.target.result;
          try {
            const parsedData = JSON.parse(content);
            keyframes = parsedData;
            if (keyframes.length > 0) {
              console.log("here now");
              theta = keyframes[0];
              updateKeyframesList();
              selectKeyframe(0);
            }
          } catch (error) {
            alert("Error parsing the TIM file.");
          }
        };
        reader.readAsText(file);
      } else {
        alert("Please select a TIM file.");
      }
    }
  });
  newInput.click();
}
