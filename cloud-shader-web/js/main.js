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
        skycolour1: [0.2, 0.4, 0.6],  // Default sky top color (will be updated by color picker)
        skycolour2: [0.4, 0.7, 1.0],  // Default sky bottom color (will be updated by color picker)
        cloudcolour: [1.1, 1.1, 0.9], // Default cloud color (will be updated by color picker)
        moveDirection: [1.0, 0.0],    // Direction vector for cloud movement (x, y)
        u_seed: 0.0,                  // Seed parameter
        u_noiseOffset: 0.0,           // Noise offset parameter
        animationSpeed: 0.05          // Animation speed parameter
    };
    
    // Setup shader program
    const program = initShaderProgram(gl);
    
    if (!program) {
        console.error('Failed to initialize shader program');
        return;
    }
    
    // Setup buffer for rectangle that will cover the entire canvas
    const bufferInfo = initBuffers(gl);
    
    // Animation settings
    let autoAnimate = false; // Set to false by default
    const variationSpeed = 0.05; // Slower for more subtle changes
    
    // Setup UI controls
    setupControls(shaderParams);
    
    // Get references to the new UI controls
    const noiseSeedControl = document.getElementById('noiseSeed');
    const noiseSeedValue = document.getElementById('noiseSeed-value');
    const noiseOffsetControl = document.getElementById('noiseOffset');
    const noiseOffsetValue = document.getElementById('noiseOffset-value');
    const autoAnimateControl = document.getElementById('autoAnimate');

    // Toggle auto-animation
    if (autoAnimateControl) {
        autoAnimateControl.addEventListener('change', (e) => {
            autoAnimate = e.target.checked;
            if (noiseSeedControl) {
                noiseSeedControl.disabled = autoAnimate;
            }
        });
    }
    
    // Start the rendering loop
    const startTime = Date.now();
    
    function render() {
        const currentTime = (Date.now() - startTime) / 1000.0;
        
        // If auto-animation is enabled, update the seed
        if (autoAnimate) {
            // Smoothly vary the seed over time using the animation speed parameter
            shaderParams.u_seed = (currentTime * shaderParams.animationSpeed) % 10.0;
            
            // Update the UI slider to match
            if (noiseSeedControl && noiseSeedValue) {
                noiseSeedControl.value = shaderParams.u_seed.toFixed(1);
                noiseSeedValue.textContent = shaderParams.u_seed.toFixed(1);
            }
        }
        
        // Get current values from the noise sliders if not in auto-animate mode
        if (!autoAnimate && noiseSeedControl) {
            shaderParams.u_seed = parseFloat(noiseSeedControl.value);
        }
        
        if (noiseOffsetControl) {
            shaderParams.u_noiseOffset = parseFloat(noiseOffsetControl.value);
        }
        
        // Draw the scene with updated parameters
        drawScene(gl, program, bufferInfo, shaderParams, currentTime);
        requestAnimationFrame(render);
    }
    
    // Start render loop
    render();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    
    // Add keyboard shortcut for UI toggle (Alt+U)
    document.addEventListener('keydown', function(e) {
        // Check if Alt+U was pressed
        if (e.altKey && (e.key === 'u' || e.key === 'U' || e.code === 'KeyU')) {
            const controls = document.getElementById('controls');
            if (controls) {
                controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
                console.log('UI toggled via Alt+U');
            }
            e.preventDefault();
            e.stopPropagation();
        }
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
        skycolour2: gl.getUniformLocation(program, 'skycolour2'),
        cloudcolour: gl.getUniformLocation(program, 'cloudcolour'),
        moveDirection: gl.getUniformLocation(program, 'moveDirection'),
        u_seed: gl.getUniformLocation(program, 'u_seed'),
        u_noiseOffset: gl.getUniformLocation(program, 'u_noiseOffset')
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
    gl.uniform3fv(uniformLocations.cloudcolour, params.cloudcolour);
    gl.uniform2fv(uniformLocations.moveDirection, params.moveDirection);
    
    // Always pass the noise parameters from the params object
    gl.uniform1f(uniformLocations.u_seed, params.u_seed);
    gl.uniform1f(uniformLocations.u_noiseOffset, params.u_noiseOffset);
    
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
        skytint: document.getElementById('skytint'),
        directionX: document.getElementById('directionX'),
        directionY: document.getElementById('directionY'),
        // Add noise controls
        noiseSeed: document.getElementById('noiseSeed'),
        noiseOffset: document.getElementById('noiseOffset'),
        // Add animation speed control
        animationSpeed: document.getElementById('animationSpeed'),
        // Add color pickers
        cloudColor: document.getElementById('cloudColor'),
        skyColor1: document.getElementById('skyColor1'),
        skyColor2: document.getElementById('skyColor2')
    };
    
    // Setup values display
    const valueElements = {
        cloudscale: document.getElementById('cloudscale-value'),
        speed: document.getElementById('speed-value'),
        clouddark: document.getElementById('clouddark-value'),
        cloudlight: document.getElementById('cloudlight-value'),
        cloudcover: document.getElementById('cloudcover-value'),
        cloudalpha: document.getElementById('cloudalpha-value'),
        skytint: document.getElementById('skytint-value'),
        directionX: document.getElementById('directionX-value'),
        directionY: document.getElementById('directionY-value'),
        // Add noise value displays
        noiseSeed: document.getElementById('noiseSeed-value'),
        noiseOffset: document.getElementById('noiseOffset-value'),
        // Add animation speed value display
        animationSpeed: document.getElementById('animationSpeed-value')
    };
    
    // Toggle controls visibility
    controls.toggle.addEventListener('click', () => {
        const content = controls.container.querySelector('.controls-content');
        const toggleButton = controls.toggle;
        
        // Toggle only the content, not the entire controls panel
        if (content.style.display === 'none') {
            content.style.display = 'block';
            // Show minimize icon
            toggleButton.innerHTML = '<span class="minimize-icon"></span>';
            toggleButton.title = 'Minimize controls panel';
        } else {
            content.style.display = 'none';
            // Show maximize icon
            toggleButton.innerHTML = '<span class="maximize-icon"></span>';
            toggleButton.title = 'Expand controls panel';
        }
    });
    
    // Helper function to convert hex color to RGB array with values from 0.0 to 1.0
    function hexToRGB(hex) {
        const r = parseInt(hex.substr(1, 2), 16) / 255;
        const g = parseInt(hex.substr(3, 2), 16) / 255;
        const b = parseInt(hex.substr(5, 2), 16) / 255;
        return [r, g, b];
    }
    
    // Set up initial colors
    if (controls.cloudColor) {
        params.cloudcolour = hexToRGB(controls.cloudColor.value);
        controls.cloudColor.addEventListener('input', (e) => {
            params.cloudcolour = hexToRGB(e.target.value);
        });
    }
    
    if (controls.skyColor1) {
        params.skycolour1 = hexToRGB(controls.skyColor1.value);
        controls.skyColor1.addEventListener('input', (e) => {
            params.skycolour1 = hexToRGB(e.target.value);
        });
    }
    
    if (controls.skyColor2) {
        params.skycolour2 = hexToRGB(controls.skyColor2.value);
        controls.skyColor2.addEventListener('input', (e) => {
            params.skycolour2 = hexToRGB(e.target.value);
        });
    }
    
    // Set up event listeners for sliders
    for (const param in controls) {
        if (param !== 'container' && param !== 'toggle' && 
            param !== 'cloudColor' && param !== 'skyColor1' && param !== 'skyColor2') {
            if (param === 'directionX' || param === 'directionY') {
                // Special handling for direction parameters
                controls[param].addEventListener('input', (e) => {
                    const index = param === 'directionX' ? 0 : 1;
                    params.moveDirection[index] = parseFloat(e.target.value);
                    valueElements[param].textContent = params.moveDirection[index].toFixed(3); // Changed to 3 decimals for finer control
                });
            } else if (param === 'noiseSeed' || param === 'noiseOffset') {
                // Special handling for noise parameters
                controls[param].addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    // Map parameter names to shader uniform names
                    const uniformName = param === 'noiseSeed' ? 'u_seed' : 'u_noiseOffset';
                    params[uniformName] = value;
                    valueElements[param].textContent = value.toFixed(2); // Changed to 2 decimals
                });
            } else if (param === 'animationSpeed') {
                // Special handling for animation speed
                controls[param].addEventListener('input', (e) => {
                    params.animationSpeed = parseFloat(e.target.value);
                    valueElements[param].textContent = params.animationSpeed.toFixed(3);
                });
            } else {
                // Handle other parameters with appropriate precision
                controls[param].addEventListener('input', (e) => {
                    params[param] = parseFloat(e.target.value);
                    // Use different precision based on the parameter
                    if (param === 'cloudscale') {
                        valueElements[param].textContent = params[param].toFixed(2);
                    } else if (param === 'speed') {
                        valueElements[param].textContent = params[param].toFixed(3);
                    } else {
                        valueElements[param].textContent = params[param].toFixed(2);
                    }
                });
            }
        }
    }
}