function hexToWebGLRgb(hex) {
  // Remove the hash symbol (#) if it's included
  hex = hex.replace(/^#/, "");

  // Parse the hex value and convert it to RGB
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  // Return the RGB values as an object
  return rgbToWebGLFormat(r, g, b);
}

let colorValues = [
  rgbToWebGLFormat(64, 224, 208),
  rgbToWebGLFormat(230, 230, 250),
  rgbToWebGLFormat(255, 130, 67),
  rgbToWebGLFormat(75, 0, 130),
  rgbToWebGLFormat(255, 250, 205),
  rgbToWebGLFormat(220, 20, 60),
  rgbToWebGLFormat(204, 204, 255),
  rgbToWebGLFormat(46, 204, 113),
  rgbToWebGLFormat(244, 196, 48),
];

const ApplicationModes = {
  DRAW: "draw",
  ERASER: "eraser",
  SELECT: "select",
  MOVE: "move",
  COPY: "copy",
  //ALL_LAYERS: "all_layers",
};

var isAllLayersSelected = false;

const eraserButton = document.getElementById("button11");
const clearButton = document.getElementById("button12");
const undoButton = document.getElementById("undoButton");
const selectButton = document.getElementById("selectButton");
const copyPasteButton = document.getElementById("copyPasteButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const redoButton = document.getElementById("redoButton");
const toggleLayerButtons = document.querySelectorAll(".toggleable");
const moveButton = document.getElementById("moveButton");
const layer1Button = document.getElementById("layer1Button");
const layer2Button = document.getElementById("layer2Button");
const layer3Button = document.getElementById("layer3Button");
const allLayersButton = document.getElementById("allLayersButton");
const drawButton = document.getElementById("drawButton");
const colorButtons = document.querySelectorAll(".color");
const exportButton = document.getElementById("exportButton");

let whichLayerIsSelected = 1;

let mode = ApplicationModes.DRAW;
let activeModeButton = drawButton;

const customButton = document.getElementById("colorPicker");
const colorInput = document.getElementById("colorPickerInput");

// When you click the custom button, open the color picker
customButton.addEventListener("click", () => {});

// When a color is selected, update the custom button's background color
colorInput.addEventListener("input", () => {
  setColor(hexToWebGLRgb(colorInput.value));
  drawButton.children[0].style.color = colorInput.value;
});

function changeActiveButton(button) {
  activeModeButton.classList.remove("active");
  activeModeButton = button;
  activeModeButton.classList.add("active");

  if (button != drawButton) {
    colorButtons.forEach((button) => {
      button.style.display = "none";
    });
  }
}

function handleDrawButton() {
  mode = ApplicationModes.DRAW;
  changeActiveButton(drawButton);

  colorButtons.forEach((button) => {
    button.style.display = "block";
  });
}

colorButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    setColor(colorValues[index]);
    let c = button.children[0].style.color;
    drawButton.children[0].style.color = c;
  });
});

let isAllLayersShown = false;

toggleLayerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Toggle the active state for the clicked button
    toggleLayerButtons.forEach((otherButton) => {
      if (otherButton !== button) {
        otherButton.classList.remove("active");
      }
    });
    button.classList.add("active");

    if (button == allLayersButton) {
      isAllLayersShown = true;
    }
  });
});

function handleEraserClick() {
  mode = ApplicationModes.ERASER;
  changeActiveButton(eraserButton);
}

function handleAllLayersButton() {
  isAllLayersSelected = !isAllLayersSelected;
  if (isAllLayersSelected) {
    allLayersButton.classList.add("active");
    drawAllLayers();
  } else {
    allLayersButton.classList.remove("active");
    draw();
  }
}

function handleSelectClick() {
  mode = ApplicationModes.SELECT;
  changeActiveButton(selectButton);
}

function handleMoveClick() {
  mode = ApplicationModes.MOVE;
  changeActiveButton(moveButton);
}

function handleCopyPasteClick() {
  mode = ApplicationModes.COPY;
  changeActiveButton(copyPasteButton);
}

function handleLayer1Button() {
  paintCanvas = layer1;
  undoStack = stackLayer1;
  redoStack = redoStackLayer1;
  whichLayerIsSelected = 1;
  draw();
}

function handleLayer2Button() {
  paintCanvas = layer2;
  undoStack = stackLayer2;
  redoStack = redoStackLayer2;
  whichLayerIsSelected = 2;
  draw();
}

function handleLayer3Button() {
  paintCanvas = layer3;
  undoStack = stackLayer3;
  redoStack = redoStackLayer3;
  whichLayerIsSelected = 3;
  draw();
}

function handleClearClick() {
  if (!isAllLayersSelected) {
    gl.clearColor(
      backgroundColor[0],
      backgroundColor[1],
      backgroundColor[2],
      backgroundColor[3]
    ); // Set the clear color to black
    gl.clear(gl.COLOR_BUFFER_BIT); // Clear the color buffer
  }

  undoStack.push(structuredClone(paintCanvas));
  for (let x = 0; x < squareCount; x++) {
    for (let y = 0; y < squareCount; y++) {
      for (let z = 0; z < 4; z++) {
        paintCanvas[x][y][z] = 0;
      }
    }
  }

  if (isAllLayersSelected) {
    zoomDis = calculateZoomDispositons();
    draw(zoomDis[0], zoomDis[1]);
  }
}

function handleUndoClick() {
  if (undoStack.length !== 0) {
    redoStack.push(structuredClone(paintCanvas));
    var index = layerOrderNames.indexOf(whichLayerIsSelected.toString());
    if (whichLayerIsSelected == 1) {
      layer1 = structuredClone(undoStack.pop());
      layerOrder[index] = layer1;
      paintCanvas = layer1;
    }

    if (whichLayerIsSelected == 2) {
      layer2 = structuredClone(undoStack.pop());
      layerOrder[index] = layer2;
      paintCanvas = layer2;
    }

    if (whichLayerIsSelected == 3) {
      layer3 = structuredClone(undoStack.pop());
      layerOrder[index] = layer3;
      paintCanvas = layer3;
    }

    draw();
  }
}

function handleRedoClick() {
  if (redoStack.length !== 0) {
    undoStack.push(structuredClone(paintCanvas));
    //redoStack.push(structuredClone(paintCanvas));
    var index = layerOrderNames.indexOf(whichLayerIsSelected.toString());
    if (whichLayerIsSelected == 1) {
      layer1 = structuredClone(redoStack.pop());
      layerOrder[index] = layer1;
      paintCanvas = layer1;
    }

    if (whichLayerIsSelected == 2) {
      layer2 = structuredClone(redoStack.pop());
      layerOrder[index] = layer2;
      paintCanvas = layer2;
    }

    if (whichLayerIsSelected == 3) {
      layer3 = structuredClone(redoStack.pop());
      layerOrder[index] = layer3;
      paintCanvas = layer3;
    }
    draw();
  }
}

function handleZoomIn() {
  zoomFactor += 1;
  squareWidth = initialSquareWidth * zoomFactor;

  let zoomDis = calculateZoomDispositons();
  draw(zoomDis[0], zoomDis[1]);
}

function handleZoomOut() {
  if (zoomFactor > 1) {
    zoomFactor -= 1;
    squareWidth = initialSquareWidth * zoomFactor;
  }

  let sc = squareCount / zoomFactor;

  let x = Math.round(screenCenterX - sc / 2);
  let y = Math.round(screenCenterY - sc / 2);

  if (zoomFactor === 1 || x < 0 || y < 0) {
    x = 0;
    y = 0;
    screenCenterY = 20;
    screenCenterX = 20;
  }

  draw(x, y);
}

clearButton.addEventListener("click", handleClearClick);
eraserButton.addEventListener("click", handleEraserClick);
selectButton.addEventListener("click", handleSelectClick);
copyPasteButton.addEventListener("click", handleCopyPasteClick);
undoButton.addEventListener("click", handleUndoClick);
redoButton.addEventListener("click", handleRedoClick);
zoomInButton.addEventListener("click", handleZoomIn);
zoomOutButton.addEventListener("click", handleZoomOut);
zoomOutButton.addEventListener("click", handleZoomOut);
moveButton.addEventListener("click", handleMoveClick);
layer1Button.addEventListener("click", handleLayer1Button);
layer2Button.addEventListener("click", handleLayer2Button);
layer3Button.addEventListener("click", handleLayer3Button);
allLayersButton.addEventListener("click", handleAllLayersButton);
drawButton.addEventListener("click", handleDrawButton);

let startX, startY, endX, endY, moveStartX, moveStartY, moveEndX, moveEndY;
let selectedColor = colorValues[0];
let backgroundColor = [0.0784, 0.0824, 0.0824, 1.0];

// Function to set the global color variable
function setColor(color) {
  selectedColor = color;
}

function rgbToWebGLFormat(r, g, b) {
  return [r / 255.0, g / 255.0, b / 255.0, 1.0];
}

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
const vertexBuffer = gl.createBuffer();

if (!gl) {
  console.error("WebGL is not supported in your browser.");
}

function setViewport() {
  canvas.width = 800;
  canvas.height = 800;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// Call setViewport initially and whenever the window is resized
setViewport();
window.addEventListener("resize", setViewport);

// Define the shader source code
const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

const fragmentShaderSource = `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                gl_FragColor = u_color;
            }
        `;

// Create and compile the shaders
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

// Create and link the shader program
const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

// Get attribute and uniform locations
const positionAttributeLocation = gl.getAttribLocation(
  shaderProgram,
  "a_position"
);
const colorUniformLocation = gl.getUniformLocation(shaderProgram, "u_color");

const initialSquareWidth = 20;
const initialSquareCount = 40;
let squareWidth = initialSquareWidth;
let squareCount = 40;
let zoomFactor = 1;
let screenCenterX = 20;
let screenCenterY = 20;

// Create an empty 3D array
// let paintCanvas = new Array(squareCount);
let layer1 = new Array(squareCount);
let layer2 = new Array(squareCount);
let layer3 = new Array(squareCount);

var stackLayer1 = [];
var stackLayer2 = [];
var stackLayer3 = [];

var redoStackLayer1 = [];
var redoStackLayer2 = [];
var redoStackLayer3 = [];

for (let x = 0; x < squareCount; x++) {
  // paintCanvas[x] = new Array(squareCount);
  layer1[x] = new Array(squareCount);
  layer2[x] = new Array(squareCount);
  layer3[x] = new Array(squareCount);
  for (let y = 0; y < squareCount; y++) {
    // paintCanvas[x][y] = new Array(4);
    layer1[x][y] = new Array(4);
    layer2[x][y] = new Array(4);
    layer3[x][y] = new Array(4);
    for (let z = 0; z < 4; z++) {
      // paintCanvas[x][y][z] = 0;
      layer1[x][y][z] = 0;
      layer2[x][y][z] = 0;
      layer3[x][y][z] = 0;
    }
  }
}

let paintCanvas = layer1;
let layerOrder = [layer1, layer2, layer3];
let layerOrderNames = ["1", "2", "3"];
let undoStack = stackLayer1;

let redoStack = redoStackLayer1;
let undoStackOrder = [stackLayer1, stackLayer2, stackLayer3]; //I may not need this

function allowDrop(event) {
  event.preventDefault();
}

function drag(event) {
  event.dataTransfer.setData("text", event.target.dataset.layer);
}

function drop(event) {
  event.preventDefault();
  const layer = event.dataTransfer.getData("text");
  const target = event.target;

  if (target.classList.contains("layer")) {
    // Get the current order of buttons
    const layerButtons = Array.from(document.querySelectorAll(".layer"));

    // Sort buttons by their data-layer attribute
    layerButtons.sort((a, b) => a.dataset.layer - b.dataset.layer);

    // Find the index of the dragged button
    const index = layerButtons.findIndex(
      (button) => button.dataset.layer === layer
    );

    // Find the index of the drop target button
    const dropIndex = layerButtons.findIndex((button) => button === target);

    // Swap the order of buttons
    if (index !== -1 && dropIndex !== -1) {
      [layerButtons[index], layerButtons[dropIndex]] = [
        layerButtons[dropIndex],
        layerButtons[index],
      ];
    }

    layerOrder = [];
    layerOrderNames = [];

    layerButtons.forEach((button) => {
      if (button.dataset.layer === "1") {
        layerOrder.push(layer1);
      } else if (button.dataset.layer === "2") {
        layerOrder.push(layer2);
      } else if (button.dataset.layer === "3") {
        layerOrder.push(layer3);
      }
      layerOrderNames.push(button.dataset.layer);
    });

    console.log(layerOrder);

    drawAllLayers();

    // Update the order of buttons in the toolbox
    const toolbox = document.getElementById("layerToolbox");
    toolbox.innerHTML = "";
    layerButtons.forEach((button) => toolbox.appendChild(button));
  }
}

function createTriangle(indexX, indexY, indexZ) {
  let squareHalfWidth = squareWidth / 2;

  centerX = indexX * squareWidth + squareHalfWidth;
  centerY = indexY * squareWidth + squareHalfWidth;

  const squareSize = (1 / squareCount) * zoomFactor;

  // Calculate the position of the clicked point
  const normalizedX = (centerX / canvas.width) * 2 - 1;
  const normalizedY = -((centerY / canvas.height) * 2 - 1);

  if (indexZ === 0) {
    // left
    return [
      normalizedX - squareSize,
      normalizedY - squareSize,
      normalizedX,
      normalizedY,
      normalizedX - squareSize,
      normalizedY + squareSize,
    ];
  } else if (indexZ === 1) {
    return [
      normalizedX - squareSize,
      normalizedY - squareSize,
      normalizedX,
      normalizedY,
      normalizedX + squareSize,
      normalizedY - squareSize,
    ];
  } else if (indexZ === 2) {
    return [
      normalizedX + squareSize,
      normalizedY - squareSize,
      normalizedX,
      normalizedY,
      normalizedX + squareSize,
      normalizedY + squareSize,
    ];
  } else if (indexZ === 3) {
    return [
      normalizedX - squareSize,
      normalizedY + squareSize,
      normalizedX,
      normalizedY,
      normalizedX + squareSize,
      normalizedY + squareSize,
    ];
  }
}

function createRectangle(sX, sY, eX, eY) {
  const normalizedStartX = (sX / canvas.width) * 2 - 1;
  const normalizedStartY = -((sY / canvas.height) * 2 - 1);
  const normalizedEndX = (eX / canvas.width) * 2 - 1;
  const normalizedEndY = -((eY / canvas.height) * 2 - 1);

  // Define the vertices for the normalized rectangle
  const vertices = new Float32Array([
    normalizedStartX,
    normalizedStartY,
    normalizedEndX,
    normalizedStartY,
    normalizedEndX,
    normalizedStartY,
    normalizedEndX,
    normalizedEndY,
    normalizedEndX,
    normalizedEndY,
    normalizedStartX,
    normalizedEndY,
    normalizedStartX,
    normalizedEndY,
    normalizedStartX,
    normalizedStartY,
  ]);

  // Create a buffer for the normalized rectangle vertices
  gl.uniform4fv(colorUniformLocation, [1, 1, 1, 0.1]);
  // const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Vertex and fragment shaders (you would need to define these)
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // Draw the rectanglese
  gl.drawArrays(gl.LINES, 0, 8);
}

canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mouseup", onMouseUp);
canvas.addEventListener("click", onClick);

function draw(indexStartX = 0, indexStartY = 0) {
  if (isAllLayersSelected) {
    drawAllLayers(indexStartX, indexStartY);
  } else {
    gl.clearColor(
      backgroundColor[0],
      backgroundColor[1],
      backgroundColor[2],
      backgroundColor[3]
    ); // Set the clear color to black
    gl.clear(gl.COLOR_BUFFER_BIT); // Clear the color buffer
    var triangle;

    for (let x = indexStartX; x < squareCount; x++) {
      for (let y = indexStartY; y < squareCount; y++) {
        for (let z = 0; z < 4; z++) {
          const node = paintCanvas[x][y][z];

          if (node === 0) {
            continue;
          }

          triangle = createTriangle(x - indexStartX, y - indexStartY, z);

          const color = [node[0], node[1], node[2], 1.0];
          webGLTriangleDraw(triangle, color);
        }
      }
    }
  }
}

function drawAllLayers(indexStartX = 0, indexStartY = 0) {
  gl.clearColor(
    backgroundColor[0],
    backgroundColor[1],
    backgroundColor[2],
    backgroundColor[3]
  ); // Set the clear color to black
  gl.clear(gl.COLOR_BUFFER_BIT); // Clear the color buffer
  var triangle;

  for (let x = indexStartX; x < squareCount; x++) {
    for (let y = indexStartY; y < squareCount; y++) {
      for (let z = 0; z < 4; z++) {
        let node;

        if (layerOrder[0][x][y][z] !== 0) {
          node = layerOrder[0][x][y][z];
        } else if (layerOrder[1][x][y][z] !== 0) {
          node = layerOrder[1][x][y][z];
        } else {
          node = layerOrder[2][x][y][z];
        }

        if (node === 0) {
          continue;
        }

        triangle = createTriangle(x - indexStartX, y - indexStartY, z);

        const color = [node[0], node[1], node[2], 1.0];
        webGLTriangleDraw(triangle, color);
      }
    }
  }
}

function drawTriangle(clientX, clientY, isRemove, zoomX = 0, zoomY = 0) {
  const rect = canvas.getBoundingClientRect();

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  squarex1 = x - (x % squareWidth);
  squarey1 = y - (y % squareWidth);

  indexX = squarex1 / squareWidth + zoomX;
  indexY = squarey1 / squareWidth + zoomY;

  let squareHalfWidth = squareWidth / 2;

  centerX = squarex1 + squareHalfWidth;
  centerY = squarey1 + squareHalfWidth;

  var xDisposition = centerX - x;
  var yDisposition = centerY - y;

  let value = selectedColor;

  if (isRemove) {
    value = 0;
  }

  // leftside
  if (xDisposition > 0) {
    if (xDisposition > Math.abs(yDisposition)) {
      paintCanvas[indexX][indexY][0] = value;
    } else if (yDisposition > 0) {
      paintCanvas[indexX][indexY][3] = value;
    } else {
      paintCanvas[indexX][indexY][1] = value;
    }
  } else {
    if (-1 * xDisposition > Math.abs(yDisposition)) {
      paintCanvas[indexX][indexY][2] = value;
    } else if (yDisposition > 0) {
      paintCanvas[indexX][indexY][3] = value;
    } else {
      paintCanvas[indexX][indexY][1] = value;
    }
  }
}

function calculateZoomDispositons() {
  let sc = squareCount / zoomFactor;
  let x = Math.round(screenCenterX - sc / 2);
  let y = Math.round(screenCenterY - sc / 2);

  if (x < 0) {
    x = 0;
    screenCenterX = 20;
  }

  if (y < 0) {
    y = 0;
    screenCenterY = 20;
  }

  return [x, y];
}

function onClick(event) {
  if (mode === ApplicationModes.ERASER) {
    zoomDis = calculateZoomDispositons();

    drawTriangle(event.clientX, event.clientY, true, zoomDis[0], zoomDis[1]);
    draw(zoomDis[0], zoomDis[1]);
  } else if (mode === ApplicationModes.DRAW) {
    zoomDis = calculateZoomDispositons();
    drawTriangle(event.clientX, event.clientY, false, zoomDis[0], zoomDis[1]);
    draw(zoomDis[0], zoomDis[1]);
  }
}
let isMouseDown = false;
let isSelectMove = false;
let moveX1, moveX2, moveY1, moveY2;
let sx, sy, ex, ey;

function handleArrowKeys(event) {
  moveStartX = 0;
  moveStartY = 0;
  moveEndX = 0;
  moveEndY = 0;

  switch (event.key) {
    case "ArrowRight":
      event.preventDefault();
      moveEndX = -50;
      moveEndY = 0;
      recalculateCenter();
      break;
    case "ArrowLeft":
      event.preventDefault();
      moveEndX = 50;
      moveEndY = 0;
      recalculateCenter();
      break;
    case "ArrowUp":
      event.preventDefault();
      moveEndX = 0;
      moveEndY = 50;
      recalculateCenter();
      break;
    case "ArrowDown":
      event.preventDefault();
      moveEndX = 0;
      moveEndY = -50;
      recalculateCenter();
      break;
    default:
      break;
  }
}

// Add an event listener for keydown events
document.addEventListener("keydown", handleArrowKeys);

function onMouseDown(event) {
  isMouseDown = true;

  if (isAllLayersShown) {
    allLayersButton.classList.remove("active");
    isAllLayersShown = false;
    toggleLayerButtons[whichLayerIsSelected - 1].classList.add("active");
  }

  undoStack.push(structuredClone(paintCanvas));

  let locationX = event.clientX - canvas.getBoundingClientRect().left;
  let locationY = event.clientY - canvas.getBoundingClientRect().top;

  if (mode === ApplicationModes.SELECT || mode === ApplicationModes.COPY) {
    sx = startX;
    ex = endX;
    sy = startY;
    ey = endY;
    if (sx > ex) {
      // Swap values of sx and ex
      const temp = sx;
      sx = ex;
      ex = temp;
    }

    if (sy > ey) {
      // Swap values of sY and eY
      const temp = sy;
      sy = ey;
      ey = temp;
    }

    let inside =
      locationX >= sx && locationX <= ex && locationY >= sy && locationY <= ey;
    console.log(inside);
    console.log(sx);
    console.log(sy);
    console.log(ex);
    console.log(ey);

    if (inside) {
      isSelectMove = true;
      moveX1 = event.clientX; // is this xorrect tjo
      moveY1 = event.clientY;
    } else {
      startX = event.clientX - canvas.getBoundingClientRect().left;
      startY = event.clientY - canvas.getBoundingClientRect().top;
    }
  } else if (mode === ApplicationModes.MOVE) {
    moveStartX = event.clientX;
    moveStartY = event.clientY;
  }
}

function recalculateCenter() {
  let sc = squareCount / zoomFactor;

  let xDisposition = (moveEndX - moveStartX) / squareWidth;
  let yDisposition = (moveEndY - moveStartY) / squareWidth;

  screenCenterX = Math.round(screenCenterX - xDisposition);
  screenCenterY = Math.round(screenCenterY - yDisposition);

  let x = Math.round(screenCenterX - sc / 2);
  let y = Math.round(screenCenterY - sc / 2);

  let exceedX = x + sc - squareCount;

  if (x < 0) {
    x = 0;
  } else if (exceedX >= 0) {
    console.log(exceedX);
    x = Math.floor(x - exceedX);
    screenCenterX = Math.round(x + sc / 2);
  }

  let exceedY = y + sc - squareCount;

  if (y < 0) {
    y = 0;
  } else if (exceedY >= 0) {
    console.log(exceedY);
    y = Math.floor(y - exceedY);
    screenCenterY = Math.round(y + sc / 2);
  }

  draw(x, y);
}

function onMouseUp(event) {
  isMouseDown = false;

  if (mode === ApplicationModes.MOVE) {
    recalculateCenter();
  }

  if (isSelectMove) {
    if (mode === ApplicationModes.SELECT) {
      startX = undefined;
      startY = undefined;
      endX = undefined;
      endY = undefined;
    }

    moveSelected(
      (moveX2 - moveX1) / squareWidth,
      (moveY2 - moveY1) / squareWidth,
      true
    );

    isSelectMove = false;
  }
}

function moveSelected(translationX, translationY, isUpdate) {
  squarex1 = sx - (sx % squareWidth);
  squarey1 = sy - (sy % squareWidth);
  squarex2 = ex - (ex % squareWidth);
  squarey2 = ey - (ey % squareWidth);

  indexX1 = squarex1 / squareWidth;
  indexY1 = squarey1 / squareWidth;
  indexX2 = squarex2 / squareWidth;
  indexY2 = squarey2 / squareWidth;

  gl.clearColor(
    backgroundColor[0],
    backgroundColor[1],
    backgroundColor[2],
    backgroundColor[3]
  ); // Set the clear color to black
  gl.clear(gl.COLOR_BUFFER_BIT); // Clear the color buffer

  if (startX >= 0 && startY >= 0 && endX >= 0 && endY >= 0) {
    createRectangle(
      startX + translationX * squareWidth,
      startY + translationY * squareWidth,
      endX + translationX * squareWidth,
      endY + translationY * squareWidth
    );

    if (
      mode === ApplicationModes.COPY &&
      (translationX != 0 || translationY != 0)
    ) {
      createRectangle(startX, startY, endX, endY);
    }
  }

  for (let x = 0; x < squareCount; x++) {
    for (let y = 0; y < squareCount; y++) {
      for (let z = 0; z < 4; z++) {
        const node = paintCanvas[x][y][z];

        if (node === 0) {
          continue;
        }

        let triangle;

        if (x >= indexX1 && x <= indexX2 && y >= indexY1 && y <= indexY2) {
          let newIndexX = Math.round(x + translationX);
          let newIndexY = Math.round(y + translationY);

          if (mode === ApplicationModes.COPY) {
            const color = [node[0], node[1], node[2], 1.0];

            if (isUpdate) {
              if (
                newIndexX < squareCount &&
                newIndexY < squareCount &&
                newIndexX >= 0 &&
                newIndexY >= 0
              ) {
                console.log(`new index: x: ${newIndexX} y: ${newIndexY}`);
                paintCanvas[newIndexX][newIndexY][z] = node;
                triangle = createTriangle(x, y, z);
                webGLTriangleDraw(triangle, color);
                triangle = createTriangle(newIndexX, newIndexY, z);
              }
            } else {
              triangle = createTriangle(x, y, z);
              webGLTriangleDraw(triangle, color);
              triangle = createTriangle(x + translationX, y + translationY, z);
            }
          } else {
            if (isUpdate) {
              if (
                newIndexX < squareCount &&
                newIndexY < squareCount &&
                newIndexX >= 0 &&
                newIndexX >= 0
              ) {
                // console.log(`new index: x: ${newIndexX} y: ${newIndexY}`);
                paintCanvas[newIndexX][newIndexY][z] = node;
                paintCanvas[x][y][z] = 0;
                triangle = createTriangle(newIndexX, newIndexY, z);
              }
            } else {
              triangle = createTriangle(x + translationX, y + translationY, z);
            }
          }
        } else {
          triangle = createTriangle(x, y, z);
        }

        const color = [node[0], node[1], node[2], 1.0];
        webGLTriangleDraw(triangle, color);
      }
    }
  }
}

function webGLTriangleDraw(triangle, color) {
  gl.uniform4fv(colorUniformLocation, color);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle), gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function onMouseMove(event) {
  if (isMouseDown) {
    if (mode === ApplicationModes.MOVE) {
      moveEndX = event.clientX;
      moveEndY = event.clientY;
    } else if (
      mode === ApplicationModes.SELECT ||
      mode === ApplicationModes.COPY
    ) {
      if (!isSelectMove) {
        endX = event.clientX - canvas.getBoundingClientRect().left;
        endY = event.clientY - canvas.getBoundingClientRect().top;

        moveSelected(0, 0, false);
      } else {
        moveX2 = event.clientX;
        moveY2 = event.clientY;

        moveSelected(
          (moveX2 - moveX1) / squareWidth,
          (moveY2 - moveY1) / squareWidth,
          false
        );
      }
    } else if (mode === ApplicationModes.ERASER) {
      zoomDis = calculateZoomDispositons();
      drawTriangle(event.clientX, event.clientY, true, zoomDis[0], zoomDis[1]);
      draw(zoomDis[0], zoomDis[1]);
    } else {
      zoomDis = calculateZoomDispositons();
      drawTriangle(event.clientX, event.clientY, false, zoomDis[0], zoomDis[1]);
      draw(zoomDis[0], zoomDis[1]);
    }
  }
}

document
  .getElementById("downloadButton")
  .addEventListener("click", function () {
    const fileName = prompt("Enter a name for the file you want to save: ");
    if (!fileName) {
      alert("Please enter a valid filename.");
      return;
    }

    const jsonContent = JSON.stringify(layerOrder, null, 4);

    const blob = new Blob([jsonContent], { type: "application/json" });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + ".gubi";
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  });

document.getElementById("loadButton").addEventListener("click", function () {
  const newInput = document.createElement("input");
  newInput.type = "file";
  //newInput.accept = ".gubi";
  newInput.style.display = "none";

  newInput.addEventListener("change", function () {
    const file = newInput.files[0];
    console.log(file);
    if (file) {
      console.log(file.name);
      if (file.name.endsWith(".gubi")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const content = e.target.result;
          try {
            const parsedData = JSON.parse(content);
            layerOrder = structuredClone(parsedData);
            layer1 = layerOrder[0];
            layer2 = layerOrder[1];
            layer3 = layerOrder[2];
            drawAllLayers();
          } catch (error) {
            alert("Error parsing the GUBI file.");
          }
        };
        reader.readAsText(file);
      } else {
        alert("Please select a GUBI file.");
      }
    }
  });
  newInput.click();
});

exportButton.addEventListener("click", function () {
  const fileName = prompt("Enter a name for the file you want to save: ");

  const dataURL = canvas.toDataURL("image/png");
  const downloadLink = document.createElement("a");
  downloadLink.href = dataURL;
  downloadLink.download = fileName + ".png";
  downloadLink.click();
});
