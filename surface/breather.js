const WIREFRAME_MODE = 2;
const GOURAUD_MODE = 0;
const PHONG_MODE = 1;
const TEXTURE_MODE = 3;

var tex_url = "https://i.imgur.com/zFZvKPA.png";

document.addEventListener("DOMContentLoaded", function () {

    const canvas = document.getElementById("webgl-canvas");

    let canvasBounds = canvas.getBoundingClientRect()

    let shadingMode = GOURAUD_MODE;

    let bumpMode = false;

    // Variables to track the initial mouse position
    let startMouseX = 0;
    let startMouseY = 0;

    let textCoords = [];

    // Variables to track the accumulated rotation angles
    let totalRotationX = 0;
    let totalRotationY = 0;

    var isMouseDown = false;

    // Event handlers
    function onMouseDown(event) {

        if (event.clientX >= canvasBounds.left && event.clientX <= canvasBounds.right) {
            isMouseDown = true;
            startMouseX = event.clientX;
            startMouseY = event.clientY;
        }
    }

    function onMouseMove(event) {

        if (isMouseDown) {
            const deltaX = event.clientX - canvas.getBoundingClientRect().left - startMouseX;
            const deltaY = event.clientY - canvas.getBoundingClientRect().top - startMouseY;

            // Sensitivity factor to control rotation speed
            const sensitivity = 0.2;

            // Calculate rotation angles
            const rotationX = -deltaY * sensitivity;
            const rotationY = -deltaX * sensitivity;

            // Update total rotation angles
            totalRotationX = rotationX;
            totalRotationY = rotationY;
        }
    }

    function onMouseUp(event) {
        isMouseDown = false;
        totalRotationX = 0;
        totalRotationY = 0;
    }

    // Attach event listeners
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    let uRangeStart;
    let uRangeEnd;
    let vRangeStart;
    let vRangeEnd;

    let changed = false;

    let uRange = [-16, 16];
    let vRange = [-23, 23];
    let uPrecision = 0.2;
    let vPrecision = 0.2;
    let aa = 0.5;
    let zoomFactor = 600;

    document.getElementById("button").addEventListener("click", getNumbers);

    const uPrecisionValueSpan = document.getElementById('uPrecisionValue');
    uPrecisionValueSpan.textContent = `${uPrecision}`;

    document.getElementById("uPrecision").addEventListener("input", function () {
        uPrecision = parseFloat(this.value);
        uPrecisionValueSpan.textContent = `${uPrecision}`;
        changed = true;
    });


    const vPrecisionValueSpan = document.getElementById('vPrecisionValue');
    vPrecisionValueSpan.textContent = `${vPrecision}`;

    document.getElementById("vPrecision").addEventListener("input", function () {
        vPrecision = parseFloat(this.value);
        vPrecisionValueSpan.textContent = `${vPrecision}`;
        changed = true;
    });

    const aaPrecisionValueSpan = document.getElementById('aaPrecisionValue');
    aaPrecisionValueSpan.textContent = `${aa}`;

    document.getElementById("aaValue").addEventListener("input", function () {
        aa = this.value;
        aaPrecisionValueSpan.textContent = `${aa}`;
        changed = true;
    });

    const zoomSpan = document.getElementById('zoomSpan');
    zoomSpan.textContent = `${zoomFactor}`;

    document.getElementById("zoomSlider").addEventListener("input", function () {
        zoomFactor = this.value;
        zoomSpan.textContent = `${zoomFactor}`;
    });

    function getNumbers() {
        const uRangeStartInput = document.getElementById("uRangeStart").value;
        const uRangeEndInput = document.getElementById("uRangeEnd").value;
        const vRangeStartInput = document.getElementById("vRangeStart").value;
        const vRangeEndInput = document.getElementById("vRangeEnd").value;

        uRangeStart = parseInt(uRangeStartInput);
        uRangeEnd = parseInt(uRangeEndInput);
        vRangeStart = parseInt(vRangeStartInput);
        vRangeEnd = parseInt(vRangeEndInput);

        uRange = [uRangeStart, uRangeEnd];
        vRange = [vRangeStart, vRangeEnd];

        changed = true;
    }


    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }

    var length_of_strip;

    // Vertex and fragment shader source code
    const gouraudVertexShaderSource = `
        attribute vec4 vPosition;
        attribute vec4 vNormal;

        varying vec4 fColor;

        uniform vec4 ambientProduct, diffuseProduct, specularProduct;
        uniform float shininess;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform vec4 lightPosition;
        uniform mat3 normalMatrix;

        void main() {
            vec3 pos = -(modelViewMatrix * vPosition).xyz;

            vec3 L;

            if (lightPosition.w == 0.0){
                L = normalize(lightPosition.xyz);
            }
            else {
                L = normalize(lightPosition.xyz - pos);
            }

            vec3 E = normalize( -pos );
            vec3 H = normalize(L + E);
            vec3 N = normalize( normalMatrix * vNormal.xyz );

            //float ambientOcclusion = max(dot(N, E), 0.2);
            vec4 ambient = ambientProduct; //* ambientOcclusion;

            float Kd = max( dot(L, N), 0.0);
            vec4 diffuse = Kd * diffuseProduct;

            float Ks = pow( max( dot(N, H), 0.0), shininess);
            //float Ks = smoothstep(0.0, 1.0, pow(max(dot(N, H), 0.0), shininess));
            vec4 specular = Ks * specularProduct;

            if ( dot( L , N ) < 0.0 ){
                specular = vec4(0.0, 0.0, 0.0, 1.0);
            }

            fColor = ambient + diffuse + specular;

            fColor.a = 1.0;

            gl_Position = projectionMatrix * modelViewMatrix * vPosition;
        }
    `;

    const gouraudFragmentShaderSource = `
        precision mediump float;

        varying vec4 fColor;
        uniform bool wireframeMode;

        void main() {
            
            if(wireframeMode == true) {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
            else {
                gl_FragColor = fColor;
            }
            
        }
    `;


    const phongVertexShaderSource = `
    attribute vec4 vPosition;
    attribute vec4 vNormal;
    varying vec3 N, L, E;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec4 lightPosition;
    uniform mat3 normalMatrix;

    void main() {
        vec3 light = lightPosition.xyz;

        vec3 pos = -(modelViewMatrix * vPosition).xyz;

        if (lightPosition.w == 0.0){
            L = normalize(lightPosition.xyz);
        }
        else {
            L = normalize(light - pos);
        }

        E = normalize( -pos );
        N = normalize( normalMatrix * vNormal.xyz );

        gl_Position = projectionMatrix * modelViewMatrix * vPosition;
    }
`;

    const phongFragmentShaderSource = `
precision mediump float;

uniform vec4 ambientProduct;
uniform vec4 diffuseProduct;
uniform vec4 specularProduct;
uniform float shininess;
varying vec3 N, L, E;

void main() {
    vec4 fColor;
    
    vec3 H = normalize( L + E );
    vec4 ambient = ambientProduct;

    float Kd = max( dot(L, N), 0.0 );
    vec4  diffuse = Kd*diffuseProduct;

    float Ks = pow( max(dot(N, H), 0.0), shininess );
    vec4  specular = Ks * specularProduct;
    
    if( dot(L, N) < 0.0 ) specular = vec4(0.0, 0.0, 0.0, 1.0);

    fColor = ambient + diffuse +specular;
    fColor.a = 1.0;

    gl_FragColor = fColor; 
    }
`;

const textureVertexShaderSource = `
attribute vec4 vPosition;
attribute vec4 vNormal;

varying vec4 fColor;

attribute vec2 vTexCoord;

varying highp vec2 fTexCoord;

uniform vec4 ambientProduct, diffuseProduct, specularProduct;
uniform float shininess;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec4 lightPosition;
uniform mat3 normalMatrix;


void main() {
    vec3 pos = -(modelViewMatrix * vPosition).xyz;

    vec3 L;

    if (lightPosition.w == 0.0){
        L = normalize(lightPosition.xyz);
    }
    else {
        L = normalize(lightPosition.xyz - pos);
    }

    vec3 E = normalize( -pos );
    vec3 H = normalize(L + E);
    vec3 N = normalize( normalMatrix * vNormal.xyz );

    //float ambientOcclusion = max(dot(N, E), 0.2);
    vec4 ambient = vec4(0.9, 0.9, 0.9, 1.0); //* ambientOcclusion;

    float Kd = max( dot(L, N), 0.0);
    vec4 diffuse = Kd * diffuseProduct;

    float Ks = pow( max( dot(N, H), 0.0), shininess);
    //float Ks = smoothstep(0.0, 1.0, pow(max(dot(N, H), 0.0), shininess));
    vec4 specular = Ks * specularProduct;

    if ( dot( L , N ) < 0.0 ){
        specular = vec4(0.0, 0.0, 0.0, 1.0);
    }

    // specular = vec4(0.7,0.7,0.7,1.0);

    fColor = ambient + diffuse + specular;

    fColor.a = 1.0;

    fTexCoord = vTexCoord;

    gl_Position = projectionMatrix * modelViewMatrix * vPosition;
}
`;

const textureFragmentShaderSource = `
precision mediump float;

varying vec4 fColor;
uniform bool wireframeMode;

varying highp vec2 fTexCoord;
uniform sampler2D texture;

void main() {
    
    if(wireframeMode == true) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    else {
        gl_FragColor = fColor * texture2D(texture, fTexCoord);;
    }
    
}
`;

function configureTexture()
{
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    var textureInfo =
    {
        width: 1,
        height: 1,
        texture: texture,
    };

    var img = new Image();
    img.addEventListener('load', function()
    {
        textureInfo.width = img.width;
        textureInfo.height = img.height;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });

    requestCORSIfNotSameOrigin(img, tex_url);
    img.src = tex_url;
}

function requestCORSIfNotSameOrigin(img, tex_url)
{
    if ((new URL(tex_url)).origin !== window.location.origin)
    {
        img.crossOrigin = "";
    }
}

    // Compile shaders
    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    let vertexShader = compileShader(gl.VERTEX_SHADER, gouraudVertexShaderSource);
    let fragmentShader = compileShader(gl.FRAGMENT_SHADER, gouraudFragmentShaderSource);

    // Link shaders into a program
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
        return;
    }

    document.getElementById("wireframeButton").onclick = function () {

        if (shadingMode == PHONG_MODE || TEXTURE_MODE) {
            vertexShader = compileShader(gl.VERTEX_SHADER, gouraudVertexShaderSource);
            fragmentShader = compileShader(gl.FRAGMENT_SHADER, gouraudFragmentShaderSource);
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
            return;
        }

        shadingMode = WIREFRAME_MODE;
        changed = true;
    };
    document.getElementById("gouraudButton").onclick = function () {

        if (shadingMode == PHONG_MODE || TEXTURE_MODE) {
            vertexShader = compileShader(gl.VERTEX_SHADER, gouraudVertexShaderSource);
            fragmentShader = compileShader(gl.FRAGMENT_SHADER, gouraudFragmentShaderSource);
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
            return;
        }

        shadingMode = GOURAUD_MODE;
        changed = true;
    };
    document.getElementById("phongButton").onclick = function () {

        if (shadingMode != PHONG_MODE) {
            vertexShader = compileShader(gl.VERTEX_SHADER, phongVertexShaderSource);
            fragmentShader = compileShader(gl.FRAGMENT_SHADER, phongFragmentShaderSource);
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
            return;
        }

        shadingMode = PHONG_MODE;
        changed = true;
    };

    document.getElementById("textureButton").onclick = function () {

        if (shadingMode != TEXTURE_MODE) {
            vertexShader  = compileShader(gl.VERTEX_SHADER, textureVertexShaderSource);
            fragmentShader = compileShader(gl.FRAGMENT_SHADER, textureFragmentShaderSource);
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
            return;
        }

        shadingMode = TEXTURE_MODE;
        changed = true;
    };

    document.getElementById("bumpButton").onclick = function (){
        bumpMode = !bumpMode;
        changed = true;
    }


    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(program);

    let normalsArray = [];

    function reverseNormal(normal) {
        return vec4(-normal[0], -normal[1], -normal[2], 0.0);
    }

    function calculateNormals(vertices) {
        var normals = [];

        for (var i = 0; i < vertices.length - 2; i += 3) {
            var v0 = vertices[i];
            var v1 = vertices[i + 1];
            var v2 = vertices[i + 2];

            var edge1 = subtract(v1, v0);
            var edge2 = subtract(v2, v0);
            var normal = normalize(cross(edge1, edge2));

            normals.push(normal, normal, normal);
        }

        var averagedNormals = [];

        for (var i = 0; i < vertices.length; i++) {
            var normalSum = vec3(0, 0, 0);

            // Sum normals from adjacent triangles
            for (var j = 0; j < normals.length; j += 3) {
                if (Math.floor(i / 3) === Math.floor(j / 3)) {
                    normalSum = add(normalSum, normals[j]);
                }
            }

            // Average and normalize the sum
            var averagedNormal = normalize(normalSum);
            averagedNormals.push(averagedNormal);
        }

        return averagedNormals;
    }

    function heightMapFunction(x, y, z) {
        // Example: Use a sine function as a simple height map
        return 0.7 * Math.sin(5 * x) * Math.cos(5 * y) * z;
    }
    

    function calculatePerturbedNormals(vertices, normals, heightMap, bumpiness) {
        const perturbedNormals = [];
    
        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];
            const normal = normals[i];
    
            // Perturb the normal based on the height map and bumpiness
            const perturbation = bumpiness * getHeightFromMap(vertex, heightMap);
            const perturbedNormal = add(normal, scale(perturbation, normalize(vertex)));
    
            perturbedNormals.push(normalize(perturbedNormal));
        }
    
        return perturbedNormals;
    }
    
    function getHeightFromMap(vertex, heightMap) {
        // Assuming heightMap is a function that returns height at the given vertex coordinates
        // Adjust this function based on how you store and access your height map
        return heightMap(vertex[0], vertex[1], vertex[2]);
    }

    function calculateSurfacePoint(u, v) {
        const wsqr = 1 - aa * aa;
        const w = Math.sqrt(wsqr);
        const denom = aa * (wsqr * Math.cosh(aa * u) ** 2 + aa * Math.sin(w * v) ** 2);

        const x = -u + (2 * wsqr * Math.cosh(aa * u) * Math.sinh(aa * u) / denom);
        const y = 2 * w * Math.cosh(aa * u) * (-(w * Math.cos(v) * Math.cos(w * v)) - (Math.sin(v) * Math.sin(w * v))) / denom;
        const z = 2 * w * Math.cosh(aa * u) * (-(w * Math.sin(v) * Math.cos(w * v)) + (Math.cos(v) * Math.sin(w * v))) / denom;

        return vec3(x, y, z);
    }


    function createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa) {
        // Create an empty array to store the vertices.
        const verticesBreathable1 = [];
        const verticesBreathable2 = [];

        const normalsBreathable1 = [];
        const normalsBreathable2 = [];

        const totalVertices = [];
        const normalVertices = [];

        const sebvertices = [];
        const sebText = [];
        const sebnormals = [];
        var chose = 1;

        for (let u = uRange[0]; u <= uRange[1]; u += uPrecision) {
            for (let v = vRange[0]; v <= vRange[1]; v += vPrecision) {

                sebText.push(vec2((u-uRange[0]) / (uRange[1] - uRange[0]), (v-vRange[0]) / (vRange[1] - vRange[0])));

                // Calculate partial derivatives with respect to u and v
                const deltaU = 0.01; // Small change in u for numerical differentiation
                const deltaV = 0.01; // Small change in v for numerical differentiation
                const du = subtract(calculateSurfacePoint(u + deltaU, v), calculateSurfacePoint(u - deltaU, v));
                const dv = subtract(calculateSurfacePoint(u, v + deltaV), calculateSurfacePoint(u, v - deltaV));

                // Cross product of partial derivatives gives surface normal
                var normal = vec4();
                normal = normalize(cross(du, dv));
                normal[3] = 0.0;

                if (chose % 3 == 1) {
                    verticesBreathable1.push(vec4(calculateSurfacePoint(u, v), 1.0));
                    normalsBreathable1.push(normal);;
                }
                else if (chose % 3 == 2) {
                    verticesBreathable2.push(vec4(calculateSurfacePoint(u, v), 1.0));
                    normalsBreathable2.push(normal);
                }
            }
            chose++;
            if (chose % 3 == 0) {
                u -= uPrecision;
                if (length_of_strip === undefined) {
                    length_of_strip = verticesBreathable1.length;
                }
                for (var i = 0; i < verticesBreathable1.length; i++) {
                    var a = verticesBreathable1.shift();
                    var b = verticesBreathable2.shift();
                    totalVertices.push(a);
                    totalVertices.push(b);
                    var c = normalsBreathable1.shift();
                    var d = normalsBreathable2.shift();
                    normalVertices.push(c);
                    normalVertices.push(d);
                }
                chose++;
            }
        }

        for (var i = 0; i < totalVertices.length - 3; i = i + 2) {

            //quad(i, i+1, i+2, i+3);
            sebvertices.push(totalVertices[i]);     // a
            sebvertices.push(totalVertices[i + 1]); // b
            sebvertices.push(totalVertices[i + 2]); // c - quad d
            sebvertices.push(totalVertices[i + 2]); // c - quad d
            sebvertices.push(totalVertices[i + 1]); // b
            sebvertices.push(totalVertices[i + 3]); // d - quad c

            textCoords.push(sebText[i]);
            textCoords.push(sebText[i + 1]); // b
            textCoords.push(sebText[i + 2]); // c - quad d
            textCoords.push(sebText[i + 2]); // c - quad d
            textCoords.push(sebText[i + 1]); // b
            textCoords.push(sebText[i + 3]);

            sebnormals.push(normalVertices[i]);
            sebnormals.push(normalVertices[i+1]);
            sebnormals.push(normalVertices[i+2]);
            sebnormals.push(normalVertices[i+2]);
            sebnormals.push(normalVertices[i+1]);
            sebnormals.push(normalVertices[i+3]);
        }

        normalsArray = (sebnormals);
        // console.log("huba");
        // console.log(normalsArray);

        // console.log(errorTest);


        return sebvertices;
    }

    let vertices = createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa);

    if (shadingMode == TEXTURE_MODE){
        // let textCoords = structuredClone(vertices);

        const textureBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(textCoords), gl.STATIC_DRAW);

        let vTexCoord = gl.getAttribLocation(program, "vTexCoord");
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);
        configureTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    }

    // Create buffer and set vertices based on the parametrization
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    let positionAttribLocation = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(positionAttribLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);

    let nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    let vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Set up the perspective matrix
    var projectionMatrix = mat4();
    projectionMatrix = perspective(Math.PI / 4, canvas.width / canvas.height, 4, 1000);

    // Set up the model-view matrix
    var modelViewMatrix = mat4();
    modelViewMatrix = lookAt(vec3(0, 0, -(zoomFactor)), vec3(0, 0, 0), vec3(0, 1, 0));

    // Set up the perspective matrix
    var modelviewmatrixLocation = gl.getUniformLocation(program, "modelViewMatrix");

    gl.uniformMatrix4fv(modelviewmatrixLocation, false, flatten(modelViewMatrix));

    var projectionmatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

    gl.uniformMatrix4fv(projectionmatrixLocation, false, flatten(projectionMatrix));

    var normalMatrixLocation = gl.getUniformLocation(program, "normalMatrix");

    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix3fv(normalMatrixLocation, false, flatten(normalMatrix));

    var lightPosition = vec4(0.0, 10.0, 0.0, 0.0);
    var lightAmbient = vec4(0.4, 0.4, 0.4, 1.0);
    var lightDiffuse = vec4(0.7, 0.7, 0.7, 1.0);
    var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

    var materialAmbient = vec4(1.0, 0.0, 0.0, 1.0);
    var materialDiffuse = vec4(1.0, 0.0, 0.0, 1.0);
    var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
    var materialShininess = 100.0;

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    var lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    var ambientColorLoc = gl.getUniformLocation(program, "ambientProduct");
    var diffuseColorLoc = gl.getUniformLocation(program, "diffuseProduct");
    var specularColorLoc = gl.getUniformLocation(program, "specularProduct");
    var shininessLoc = gl.getUniformLocation(program, "shininess");
    var wireframeModeLoc = gl.getUniformLocation(program, "wireframeMode");

    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
    gl.uniform4fv(ambientColorLoc, flatten(ambientProduct));
    gl.uniform4fv(diffuseColorLoc, flatten(diffuseProduct));
    gl.uniform4fv(specularColorLoc, flatten(specularProduct));
    gl.uniform1f(shininessLoc, materialShininess);
    
    render();

    function render() {
        // Set the WebGL rendering context clear color
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // console.log(`uRange: ${uRange} vRange: ${vRange}, uPrecision: ${uPrecision} vPrecision: ${vPrecision} aa: ${aa}`);

        if (changed) {
            vertices = createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa);

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

            positionAttribLocation = gl.getAttribLocation(program, "vPosition");
            gl.vertexAttribPointer(positionAttribLocation, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionAttribLocation);

            gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);

            if (bumpMode == true){
                const bumpiness = 2; // Adjust as needed
                const perturbedNormals = calculatePerturbedNormals(vertices, normalsArray, heightMapFunction, bumpiness);
                gl.bufferData(gl.ARRAY_BUFFER, flatten(perturbedNormals), gl.STATIC_DRAW);
            }
            else{
                gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
            }

            vNormal = gl.getAttribLocation(program, "vNormal");
            gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vNormal);
            
            if (shadingMode == TEXTURE_MODE){

                let textCoords = structuredClone(vertices);
                const textureBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, flatten(textCoords), gl.STATIC_DRAW);
                let vTexCoord = gl.getAttribLocation(program, "vTexCoord");
                gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(vTexCoord);
                configureTexture();
        
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
            }

            var normalMatrixLocation = gl.getUniformLocation(program, "normalMatrix");

            gl.uniformMatrix3fv(normalMatrixLocation, false, flatten(normalMatrix));

            var ambientProduct = mult(lightAmbient, materialAmbient);
            var diffuseProduct = mult(lightDiffuse, materialDiffuse);
            var specularProduct = mult(lightSpecular, materialSpecular);
        
            var lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
            var ambientColorLoc = gl.getUniformLocation(program, "ambientProduct");
            var diffuseColorLoc = gl.getUniformLocation(program, "diffuseProduct");
            var specularColorLoc = gl.getUniformLocation(program, "specularProduct");
            var shininessLoc = gl.getUniformLocation(program, "shininess");
            var wireframeModeLoc = gl.getUniformLocation(program, "wireframeMode");
        
            gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
            gl.uniform4fv(ambientColorLoc, flatten(ambientProduct));
            gl.uniform4fv(diffuseColorLoc, flatten(diffuseProduct));
            gl.uniform4fv(specularColorLoc, flatten(specularProduct));
            gl.uniform1f(shininessLoc, materialShininess);
        }

        // modelViewMatrix = mult(modelViewMatrix, rotate(totalRotationX * (Math.PI / 180), [1, 0, 0]));

        modelViewMatrix[2][3] = -(zoomFactor);
        modelViewMatrix = mult(modelViewMatrix, rotate(totalRotationY * (Math.PI / 180), [0, 1, 0]));

        modelviewmatrixLocation = gl.getUniformLocation(program, "modelViewMatrix");

        gl.uniformMatrix4fv(modelviewmatrixLocation, false, flatten(modelViewMatrix));

        var projectionmatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

        gl.uniformMatrix4fv(projectionmatrixLocation, false, flatten(projectionMatrix));

        changed = false;

        if (shadingMode == WIREFRAME_MODE) {
            gl.uniform1f(wireframeModeLoc, true);
            gl.drawArrays(gl.LINE_STRIP, 0, vertices.length);
        }
        else {
            gl.uniform1f(wireframeModeLoc, false);
            gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
        }

        setTimeout(render, 10);
        // requestAnimationFrame(render)
    }
});