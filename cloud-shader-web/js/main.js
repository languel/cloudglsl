// Wait for the DOM to load completely before accessing elements
document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas element
    const canvas = document.getElementById('glCanvas');
    
    if (!canvas) {
        console.error('Canvas element not found! Make sure your HTML has a canvas with id="glCanvas".');
        return;
    }
    
    // Adjust canvas to fill the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Get WebGL context
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }
    
    // Initialize shader parameters with default values
    const shaderParams = {
        cloudscale: 1.1,
        speed: 0.03,
        clouddark: 0.5,
        cloudlight: 0.3,
        cloudcover: 0.2,
        cloudalpha: 8.0,
        skytint: 0.5,
        skycolour1: [0.2, 0.4, 0.6],
        skycolour2: [0.4, 0.7, 1.0]
    };
    
    // Setup shader program
    const program = initShaderProgram(gl);
    
    if (!program) {
        console.error('Failed to initialize shader program');
        return;
    }
    
    // Setup UI controls
    setupControls(shaderParams);
    
    // Setup buffer for rectangle that will cover the entire canvas
    const bufferInfo = initBuffers(gl);
    
    // Start the rendering loop
    const startTime = Date.now();
    
    function render() {
        const currentTime = (Date.now() - startTime) / 1000.0;
        drawScene(gl, program, bufferInfo, shaderParams, currentTime);
        requestAnimationFrame(render);
    }
    
    render();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
});

// Function to initialize shader program
function initShaderProgram(gl) {
    // Use the vertex shader source from shader.js
    const vsSource = vertexShaderSource;
    
    // Fragment shader source from shader.js file
    const fsSource = fragmentShaderSource;
    
    // Create and compile shaders
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    
    // Create the shader program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}

// Function to load and compile a shader
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// Function to initialize buffers
function initBuffers(gl) {
    // Create a buffer for the positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Create a rectangle that covers the entire canvas
    const positions = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    return {
        position: positionBuffer,
        vertexCount: 4
    };
}

// Function to draw the scene
function drawScene(gl, program, bufferInfo, params, currentTime) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(program);
    
    // Set up the vertex attributes
    const positionAttribLocation = gl.getAttribLocation(program, 'aVertexPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.position);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);
    
    // Set up uniform values
    const uniformLocations = {
        iResolution: gl.getUniformLocation(program, 'iResolution'),
        iTime: gl.getUniformLocation(program, 'iTime'),
        cloudscale: gl.getUniformLocation(program, 'cloudscale'),
        speed: gl.getUniformLocation(program, 'speed'),
        clouddark: gl.getUniformLocation(program, 'clouddark'),
        cloudlight: gl.getUniformLocation(program, 'cloudlight'),
        cloudcover: gl.getUniformLocation(program, 'cloudcover'),
        cloudalpha: gl.getUniformLocation(program, 'cloudalpha'),
        skytint: gl.getUniformLocation(program, 'skytint'),
        skycolour1: gl.getUniformLocation(program, 'skycolour1'),
        skycolour2: gl.getUniformLocation(program, 'skycolour2')
    };
    
    gl.uniform3f(uniformLocations.iResolution, gl.canvas.width, gl.canvas.height, 1.0);
    gl.uniform1f(uniformLocations.iTime, currentTime);
    gl.uniform1f(uniformLocations.cloudscale, params.cloudscale);
    gl.uniform1f(uniformLocations.speed, params.speed);
    gl.uniform1f(uniformLocations.clouddark, params.clouddark);
    gl.uniform1f(uniformLocations.cloudlight, params.cloudlight);
    gl.uniform1f(uniformLocations.cloudcover, params.cloudcover);
    gl.uniform1f(uniformLocations.cloudalpha, params.cloudalpha);
    gl.uniform1f(uniformLocations.skytint, params.skytint);
    gl.uniform3fv(uniformLocations.skycolour1, params.skycolour1);
    gl.uniform3fv(uniformLocations.skycolour2, params.skycolour2);
    
    // Draw the rectangle
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, bufferInfo.vertexCount);
}

// Function to set up UI controls
function setupControls(params) {
    // Get control elements
    const controls = {
        container: document.getElementById('controls'),
        toggle: document.getElementById('toggle-controls'),
        cloudscale: document.getElementById('cloudscale'),
        speed: document.getElementById('speed'),
        clouddark: document.getElementById('clouddark'),
        cloudlight: document.getElementById('cloudlight'),
        cloudcover: document.getElementById('cloudcover'),
        cloudalpha: document.getElementById('cloudalpha'),
        skytint: document.getElementById('skytint')
    };
    
    // Setup values display
    const valueElements = {
        cloudscale: document.getElementById('cloudscale-value'),
        speed: document.getElementById('speed-value'),
        clouddark: document.getElementById('clouddark-value'),
        cloudlight: document.getElementById('cloudlight-value'),
        cloudcover: document.getElementById('cloudcover-value'),
        cloudalpha: document.getElementById('cloudalpha-value'),
        skytint: document.getElementById('skytint-value')
    };
    
    // Toggle controls visibility
    controls.toggle.addEventListener('click', () => {
        const content = controls.container.querySelector('.controls-content');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            controls.toggle.textContent = 'Hide';
        } else {
            content.style.display = 'none';
            controls.toggle.textContent = 'Show';
        }
    });
    
    // Set up event listeners for sliders
    for (const param in controls) {
        if (param !== 'container' && param !== 'toggle') {
            controls[param].addEventListener('input', (e) => {
                params[param] = parseFloat(e.target.value);
                valueElements[param].textContent = params[param].toFixed(2);
            });
        }
    }
}