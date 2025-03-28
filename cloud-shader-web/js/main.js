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
        u_noiseScale: 1.0,            // Noise scale parameter (default to 1.0)
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
        
        // Update parameters with smoothing
        updateParameters(shaderParams);
        
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
    
    // Initialize MIDI
    initMIDI();
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
        u_noiseOffset: gl.getUniformLocation(program, 'u_noiseOffset'),
        u_noiseScale: gl.getUniformLocation(program, 'u_noiseScale')
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
    gl.uniform1f(uniformLocations.u_noiseScale, params.u_noiseScale);
    
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
        noiseScale: document.getElementById('noiseScale'),
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
        noiseScale: document.getElementById('noiseScale-value'),
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
    
    // Helper function to convert RGB array to hex color
    function rgbToHex(rgb) {
        const r = Math.round(rgb[0] * 255).toString(16).padStart(2, '0');
        const g = Math.round(rgb[1] * 255).toString(16).padStart(2, '0');
        const b = Math.round(rgb[2] * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    
    // Set up initial colors
    if (controls.cloudColor) {
        params.cloudcolour = hexToRGB(controls.cloudColor.value);
        // Update MIDI targets with initial values
        controlState.midiTargets.cloudcolour = [...params.cloudcolour];
        
        controls.cloudColor.addEventListener('input', (e) => {
            params.cloudcolour = hexToRGB(e.target.value);
            // Update MIDI targets to match
            controlState.midiTargets.cloudcolour = [...params.cloudcolour];
        });
    }
    
    if (controls.skyColor1) {
        params.skycolour1 = hexToRGB(controls.skyColor1.value);
        // Update MIDI targets with initial values
        controlState.midiTargets.skycolour1 = [...params.skycolour1];
        
        controls.skyColor1.addEventListener('input', (e) => {
            params.skycolour1 = hexToRGB(e.target.value);
            // Update MIDI targets to match
            controlState.midiTargets.skycolour1 = [...params.skycolour1];
        });
    }
    
    if (controls.skyColor2) {
        params.skycolour2 = hexToRGB(controls.skyColor2.value);
        // Update MIDI targets with initial values
        controlState.midiTargets.skycolour2 = [...params.skycolour2];
        
        controls.skyColor2.addEventListener('input', (e) => {
            params.skycolour2 = hexToRGB(e.target.value);
            // Update MIDI targets to match
            controlState.midiTargets.skycolour2 = [...params.skycolour2];
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
                    // Update MIDI target to match the manual control
                    controlState.midiTargets.moveDirection[index] = params.moveDirection[index];
                    valueElements[param].textContent = params.moveDirection[index].toFixed(3);
                });
            } else if (param === 'noiseSeed' || param === 'noiseOffset') {
                // Special handling for noise parameters
                controls[param].addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    // Map parameter names to shader uniform names
                    const uniformName = param === 'noiseSeed' ? 'u_seed' : 'u_noiseOffset';
                    params[uniformName] = value;
                    // Update MIDI target for noise offset (if applicable)
                    if (param === 'noiseOffset') {
                        controlState.midiTargets.u_noiseOffset = value;
                    }
                    valueElements[param].textContent = value.toFixed(2);
                });
            } else if (param === 'noiseScale') {
                // Special handling for noise scale
                controls[param].addEventListener('input', (e) => {
                    params.u_noiseScale = parseFloat(e.target.value);
                    // Update MIDI target
                    controlState.midiTargets.u_noiseScale = params.u_noiseScale;
                    valueElements[param].textContent = params.u_noiseScale.toFixed(2);
                });
            } else if (param === 'animationSpeed') {
                // Special handling for animation speed
                controls[param].addEventListener('input', (e) => {
                    params.animationSpeed = parseFloat(e.target.value);
                    // Update MIDI target
                    controlState.midiTargets.animationSpeed = params.animationSpeed;
                    valueElements[param].textContent = params.animationSpeed.toFixed(3);
                });
            } else {
                // Handle other parameters with appropriate precision
                controls[param].addEventListener('input', (e) => {
                    params[param] = parseFloat(e.target.value);
                    // Update MIDI target to match the manual control
                    if (param in controlState.midiTargets) {
                        controlState.midiTargets[param] = params[param];
                    }
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

    // Initialize manual control tracking
    initManualControlTracking(params);
    
    // Handle interpolation time control
    const interpolationTimeControl = document.getElementById('interpolationTime');
    const interpolationTimeValue = document.getElementById('interpolationTime-value');
    if (interpolationTimeControl && interpolationTimeValue) {
        interpolationTimeControl.addEventListener('input', (e) => {
            controlState.interpolationTime = parseFloat(e.target.value);
            interpolationTimeValue.textContent = controlState.interpolationTime.toFixed(1);
        });
    }

    // Add manual control tracking to slider inputs
    for (const param in controls) {
        if (param !== 'container' && param !== 'toggle' && 
            param !== 'cloudColor' && param !== 'skyColor1' && param !== 'skyColor2') {
            
            // Add pointerdown event to mark parameter as under manual control
            controls[param].addEventListener('pointerdown', () => {
                if (param === 'directionX') {
                    controlState.manualControl.moveDirection[0] = true;
                } else if (param === 'directionY') {
                    controlState.manualControl.moveDirection[1] = true;
                } else if (param === 'noiseScale') {
                    controlState.manualControl.u_noiseScale = true;
                } else {
                    controlState.manualControl[param] = true;
                }
            });
            
            // Add pointerup event to release manual control
            controls[param].addEventListener('pointerup', () => {
                if (param === 'directionX') {
                    controlState.manualControl.moveDirection[0] = false;
                } else if (param === 'directionY') {
                    controlState.manualControl.moveDirection[1] = false;
                } else if (param === 'noiseScale') {
                    controlState.manualControl.u_noiseScale = false;
                } else {
                    controlState.manualControl[param] = false;
                }
            });
        }
    }

    // Add manual control tracking for color pickers
    if (controls.cloudColor) {
        controls.cloudColor.addEventListener('input', () => {
            controlState.manualControl.cloudcolour = [true, true, true];
        });
        controls.cloudColor.addEventListener('change', () => {
            controlState.manualControl.cloudcolour = [false, false, false];
        });
    }
    
    if (controls.skyColor1) {
        controls.skyColor1.addEventListener('input', () => {
            controlState.manualControl.skycolour1 = [true, true, true];
        });
        controls.skyColor1.addEventListener('change', () => {
            controlState.manualControl.skycolour1 = [false, false, false];
        });
    }
    
    if (controls.skyColor2) {
        controls.skyColor2.addEventListener('input', () => {
            controlState.manualControl.skycolour2 = [true, true, true];
        });
        controls.skyColor2.addEventListener('change', () => {
            controlState.manualControl.skycolour2 = [false, false, false];
        });
    }
}

// MIDI parameter smoothing configuration
const smoothingFactors = {
    movement: 0.02,   // Direction X/Y
    core: 0.05,       // Scale, Cover, Alpha, etc
    color: 0.1,       // RGB values
    speed: 0.2        // Speed parameters
};

// Target values for MIDI-controlled parameters
const midiTargets = {
    cloudscale: 1.1,
    speed: 0.03,
    clouddark: 0.5,
    cloudlight: 0.3,
    cloudcover: 0.2,
    cloudalpha: 8.0,
    skytint: 0.5,
    u_noiseScale: 1.0,
    moveDirection: [1.0, 0.0],
    animationSpeed: 0.05,
    u_noiseOffset: 0.0,
    cloudcolour: [1.1, 1.1, 0.9],
    skycolour1: [0.2, 0.4, 0.6],
    skycolour2: [0.4, 0.7, 1.0]
};

// MIDI and parameter control state
const controlState = {
    interpolationTime: 0.5,  // Default interpolation time in seconds
    manualControl: {},      // Track which parameters are under manual control
    lastMidiUpdate: {},     // Track when each parameter was last updated by MIDI
    midiTargets: {          // Target values for MIDI-controlled parameters
        cloudscale: 1.1,
        speed: 0.03,
        clouddark: 0.5,
        cloudlight: 0.3,
        cloudcover: 0.2,
        cloudalpha: 8.0,
        skytint: 0.5,
        u_noiseScale: 1.0,
        moveDirection: [1.0, 0.0],
        animationSpeed: 0.05,
        u_noiseOffset: 0.0,
        cloudcolour: [1.1, 1.1, 0.9],
        skycolour1: [0.2, 0.4, 0.6],
        skycolour2: [0.4, 0.7, 1.0]
    }
};

// Parameter ranges for MIDI mapping
const parameterRanges = {
    cloudscale: { min: 0.1, max: 3.0 },
    speed: { min: 0.0, max: 0.1 },
    clouddark: { min: 0.0, max: 1.0 },
    cloudlight: { min: 0.0, max: 1.0 },
    cloudcover: { min: 0.0, max: 1.0 },
    cloudalpha: { min: 0.0, max: 20.0 },
    skytint: { min: 0.0, max: 1.0 },
    u_noiseScale: { min: 0.1, max: 5.0 },
    moveDirection: { min: -1.0, max: 1.0 },
    animationSpeed: { min: 0.01, max: 0.2 },
    u_noiseOffset: { min: 0.0, max: 10.0 },
    color: { min: 0.0, max: 1.0 }
};

// Initialize manual control tracking
function initManualControlTracking(params) {
    // Initialize all parameters as not under manual control
    for (const key in params) {
        controlState.manualControl[key] = false;
        controlState.lastMidiUpdate[key] = 0;
    }
    
    // Special handling for vector parameters
    controlState.manualControl['moveDirection'] = [false, false];
    controlState.lastMidiUpdate['moveDirection'] = [0, 0];
    
    ['cloudcolour', 'skycolour1', 'skycolour2'].forEach(color => {
        controlState.manualControl[color] = [false, false, false];
        controlState.lastMidiUpdate[color] = [0, 0, 0];
    });
}

// Calculate smoothing factor based on interpolation time
function calculateSmoothingFactor(paramName, index = -1) {
    const now = performance.now();
    const lastUpdate = index >= 0 ? 
        controlState.lastMidiUpdate[paramName][index] : 
        controlState.lastMidiUpdate[paramName];
    
    if (!lastUpdate) return 1.0; // No smoothing if never updated
    
    const timeSinceUpdate = (now - lastUpdate) / 1000; // Convert to seconds
    if (timeSinceUpdate >= controlState.interpolationTime) return 1.0;
    
    return timeSinceUpdate / controlState.interpolationTime;
}

// Map MIDI value (0-127) to parameter range
function mapMIDIValue(value, min, max) {
    return min + (value / 127) * (max - min);
}

// Smooth parameter updates
function smoothParameter(current, target, smoothingFactor) {
    return current + (target - current) * smoothingFactor;
}

// Initialize MIDI
function initMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure);
    } else {
        console.log('Web MIDI API not supported in this browser');
    }
}

// Handle MIDI success
function onMIDISuccess(midiAccess) {
    const inputs = midiAccess.inputs.values();
    for (let input of inputs) {
        input.onmidimessage = onMIDIMessage;
    }
}

// Handle MIDI failure
function onMIDIFailure() {
    console.log('Could not access your MIDI devices');
}

// Handle MIDI messages
function onMIDIMessage(message) {
    const [status, data1, data2] = message.data;
    const now = performance.now();
    
    // Check if it's a Control Change message (0xB0)
    if ((status & 0xF0) === 0xB0) {
        const controlNumber = data1;
        const value = data2;
        
        // Handle different control numbers based on our protocol
        switch(controlNumber) {
            case 0: // Cloud Scale
                controlState.midiTargets.cloudscale = mapMIDIValue(value, parameterRanges.cloudscale.min, parameterRanges.cloudscale.max);
                controlState.lastMidiUpdate.cloudscale = now;
                break;
            case 1: // Speed
                controlState.midiTargets.speed = mapMIDIValue(value, parameterRanges.speed.min, parameterRanges.speed.max);
                controlState.lastMidiUpdate.speed = now;
                break;
            case 2: // Cloud Darkness
                controlState.midiTargets.clouddark = mapMIDIValue(value, parameterRanges.clouddark.min, parameterRanges.clouddark.max);
                controlState.lastMidiUpdate.clouddark = now;
                break;
            case 3: // Cloud Lightness
                controlState.midiTargets.cloudlight = mapMIDIValue(value, parameterRanges.cloudlight.min, parameterRanges.cloudlight.max);
                controlState.lastMidiUpdate.cloudlight = now;
                break;
            case 4: // Cloud Cover
                controlState.midiTargets.cloudcover = mapMIDIValue(value, parameterRanges.cloudcover.min, parameterRanges.cloudcover.max);
                controlState.lastMidiUpdate.cloudcover = now;
                break;
            case 5: // Cloud Alpha
                controlState.midiTargets.cloudalpha = mapMIDIValue(value, parameterRanges.cloudalpha.min, parameterRanges.cloudalpha.max);
                controlState.lastMidiUpdate.cloudalpha = now;
                break;
            case 6: // Sky Tint
                controlState.midiTargets.skytint = mapMIDIValue(value, parameterRanges.skytint.min, parameterRanges.skytint.max);
                controlState.lastMidiUpdate.skytint = now;
                break;
            case 7: // Noise Scale
                controlState.midiTargets.u_noiseScale = mapMIDIValue(value, parameterRanges.u_noiseScale.min, parameterRanges.u_noiseScale.max);
                controlState.lastMidiUpdate.u_noiseScale = now;
                break;
            case 8: // Direction X
                controlState.midiTargets.moveDirection[0] = mapMIDIValue(value, parameterRanges.moveDirection.min, parameterRanges.moveDirection.max);
                controlState.lastMidiUpdate.moveDirection[0] = now;
                break;
            case 9: // Direction Y
                controlState.midiTargets.moveDirection[1] = mapMIDIValue(value, parameterRanges.moveDirection.min, parameterRanges.moveDirection.max);
                controlState.lastMidiUpdate.moveDirection[1] = now;
                break;
            case 10: // Animation Speed
                controlState.midiTargets.animationSpeed = mapMIDIValue(value, parameterRanges.animationSpeed.min, parameterRanges.animationSpeed.max);
                controlState.lastMidiUpdate.animationSpeed = now;
                break;
            case 11: // Noise Offset
                controlState.midiTargets.u_noiseOffset = mapMIDIValue(value, parameterRanges.u_noiseOffset.min, parameterRanges.u_noiseOffset.max);
                controlState.lastMidiUpdate.u_noiseOffset = now;
                break;
            // Cloud Color RGB
            case 12: 
                controlState.midiTargets.cloudcolour[0] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.cloudcolour[0] = now;
                break;
            case 13: 
                controlState.midiTargets.cloudcolour[1] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.cloudcolour[1] = now;
                break;
            case 14: 
                controlState.midiTargets.cloudcolour[2] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.cloudcolour[2] = now;
                break;
            // Sky Color Top RGB
            case 15: 
                controlState.midiTargets.skycolour1[0] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.skycolour1[0] = now;
                break;
            case 16: 
                controlState.midiTargets.skycolour1[1] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.skycolour1[1] = now;
                break;
            case 17: 
                controlState.midiTargets.skycolour1[2] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.skycolour1[2] = now;
                break;
            // Sky Color Bottom RGB
            case 18: 
                controlState.midiTargets.skycolour2[0] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.skycolour2[0] = now;
                break;
            case 19: 
                controlState.midiTargets.skycolour2[1] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.skycolour2[1] = now;
                break;
            case 20: 
                controlState.midiTargets.skycolour2[2] = mapMIDIValue(value, parameterRanges.color.min, parameterRanges.color.max);
                controlState.lastMidiUpdate.skycolour2[2] = now;
                break;
        }
    }
}

// Update parameters with smoothing and manual control respect
function updateParameters(params) {
    const now = performance.now();
    
    // Update scalar parameters
    for (const param in params) {
        if (param === 'moveDirection' || 
            param === 'cloudcolour' || 
            param === 'skycolour1' || 
            param === 'skycolour2') continue;
        
        // Skip if under manual control
        if (controlState.manualControl[param]) continue;
        
        if (param in controlState.midiTargets) {
            const smoothingFactor = calculateSmoothingFactor(param);
            params[param] = params[param] + (controlState.midiTargets[param] - params[param]) * smoothingFactor;
        }
    }
    
    // Update vector parameters (moveDirection and colors)
    if (!controlState.manualControl.moveDirection[0]) {
        const smoothX = calculateSmoothingFactor('moveDirection', 0);
        params.moveDirection[0] = params.moveDirection[0] + 
            (controlState.midiTargets.moveDirection[0] - params.moveDirection[0]) * smoothX;
    }
    
    if (!controlState.manualControl.moveDirection[1]) {
        const smoothY = calculateSmoothingFactor('moveDirection', 1);
        params.moveDirection[1] = params.moveDirection[1] + 
            (controlState.midiTargets.moveDirection[1] - params.moveDirection[1]) * smoothY;
    }
    
    // Update color parameters
    ['cloudcolour', 'skycolour1', 'skycolour2'].forEach(colorParam => {
        for (let i = 0; i < 3; i++) {
            if (!controlState.manualControl[colorParam][i]) {
                const smoothing = calculateSmoothingFactor(colorParam, i);
                params[colorParam][i] = params[colorParam][i] + 
                    (controlState.midiTargets[colorParam][i] - params[colorParam][i]) * smoothing;
            }
        }
    });
    
    // Update UI values
    updateUIValues(params);
}

// Update UI values to reflect current parameters
function updateUIValues(params) {
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
        animationSpeed: document.getElementById('animationSpeed-value'),
        noiseScale: document.getElementById('noiseScale-value')
    };
    
    // Update value displays
    for (const param in valueElements) {
        if (valueElements[param]) {
            if (param === 'directionX') {
                valueElements[param].textContent = params.moveDirection[0].toFixed(3);
            } else if (param === 'directionY') {
                valueElements[param].textContent = params.moveDirection[1].toFixed(3);
            } else if (param === 'noiseScale') {
                valueElements[param].textContent = params.u_noiseScale.toFixed(2);
            } else {
                valueElements[param].textContent = params[param].toFixed(param === 'speed' || param === 'animationSpeed' ? 3 : 2);
            }
        }
    }
    
    // Update sliders
    const sliders = {
        cloudscale: document.getElementById('cloudscale'),
        speed: document.getElementById('speed'),
        clouddark: document.getElementById('clouddark'),
        cloudlight: document.getElementById('cloudlight'),
        cloudcover: document.getElementById('cloudcover'),
        cloudalpha: document.getElementById('cloudalpha'),
        skytint: document.getElementById('skytint'),
        directionX: document.getElementById('directionX'),
        directionY: document.getElementById('directionY'),
        noiseScale: document.getElementById('noiseScale')
    };
    
    // Update slider positions
    for (const param in sliders) {
        if (sliders[param]) {
            if (param === 'directionX') {
                sliders[param].value = params.moveDirection[0];
            } else if (param === 'directionY') {
                sliders[param].value = params.moveDirection[1];
            } else if (param === 'noiseScale') {
                sliders[param].value = params.u_noiseScale;
            } else {
                sliders[param].value = params[param];
            }
        }
    }
}