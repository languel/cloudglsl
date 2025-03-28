# Cloud Shader Web: MIDI Control Implementation

## Project Overview

This document summarizes the implementation of MIDI control capabilities for a WebGL-based cloud shader visualization. The project enables real-time control of cloud visualization parameters through both UI controls and external MIDI devices, with temporal smoothing to enhance the precision of MIDI input beyond its native 7-bit resolution.

## Core Features Implemented

1. **Dynamic Parameter Control**
   - UI sliders and color pickers for manual control
   - MIDI Control Change (CC) messages for external control
   - Compact UI with collapsible controls panel

2. **Temporal Smoothing System**
   - Overcomes MIDI's 7-bit (0-127) resolution limitation
   - Configurable interpolation time (0-10 seconds)
   - Different smoothing factors optimized by parameter type

3. **Manual Control Priority**
   - UI controls take precedence over MIDI input
   - MIDI targets update when sliders are adjusted manually
   - Smooth transitions when returning to MIDI control

4. **Visual Parameter Controls**
   - Cloud shape parameters (scale, darkness, lightness, etc.)
   - Color controls for clouds and sky (RGB via color pickers)
   - Movement and animation parameters
   - Noise characteristics (scale, seed, offset)

## Technical Implementation

### MIDI Control Protocol

MIDI implementation follows a standardized protocol documented in `MIDI_control_protocol.md`. Each shader parameter is mapped to a specific MIDI CC number:

- **Core Parameters**: CC 0-7 (Cloud Scale, Speed, Darkness, etc.)
- **Movement Parameters**: CC 8-9 (Direction X/Y)
- **Animation Parameters**: CC 10-11 (Animation Speed, Noise Offset)
- **Color Parameters**: CC 12-20 (Cloud RGB, Sky Top RGB, Sky Bottom RGB)

### Temporal Smoothing Algorithm

Smoothing is implemented through a time-based interpolation system:

```javascript
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
```

Differential smoothing factors are applied based on parameter type:
- Movement parameters: 0.02 (highest smoothing)
- Core visual parameters: 0.05 (medium smoothing)
- Color parameters: 0.1 (medium-low smoothing)
- Speed parameters: 0.2 (lowest smoothing)

### Parameter Update System

The system tracks both current values and target values:

```javascript
// Update parameters with smoothing and manual control respect
function updateParameters(params) {
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
    
    // Special handling for vector parameters and colors...
}
```

### MIDI Message Handling

MIDI CC messages are processed and mapped to appropriate parameter ranges:

```javascript
function onMIDIMessage(message) {
    const [status, data1, data2] = message.data;
    const now = performance.now();
    
    // Check if it's a Control Change message (0xB0)
    if ((status & 0xF0) === 0xB0) {
        const controlNumber = data1;
        const value = data2;
        
        // Process the control change based on control number...
        switch(controlNumber) {
            case 0: // Cloud Scale
                controlState.midiTargets.cloudscale = mapMIDIValue(value, parameterRanges.cloudscale.min, parameterRanges.cloudscale.max);
                controlState.lastMidiUpdate.cloudscale = now;
                break;
            // Other parameters...
        }
    }
}
```

### UI Integration

UI controls are bidirectionally linked with MIDI targets:

```javascript
// When a slider changes
controls[param].addEventListener('input', (e) => {
    params[param] = parseFloat(e.target.value);
    // Update MIDI target to match the manual control
    controlState.midiTargets[param] = params[param];
    valueElements[param].textContent = params[param].toFixed(2);
});

// When manual control is active
controls[param].addEventListener('pointerdown', () => {
    controlState.manualControl[param] = true;
});

controls[param].addEventListener('pointerup', () => {
    controlState.manualControl[param] = false;
});
```

## Key Components

1. **Shader Parameter System**: Unified parameter object used by both UI and MIDI
2. **Manual Control Tracking**: Flags to determine when UI controls take precedence
3. **Interpolation Time Control**: User-adjustable smoothing duration
4. **MIDI Mapping**: Conversion between MIDI values (0-127) and parameter ranges
5. **Color Handling**: Special processing for RGB color components
6. **UI Synchronization**: Updates UI controls to reflect current parameter values
7. **Browser Compatibility**: Requires Chrome or Edge for Web MIDI API support

## Usage Examples

### Basic MIDI Setup

```javascript
// Initialize MIDI access
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
        .then(onMIDISuccess, onMIDIFailure);
}
```

### Parameter Smoothing

```javascript
// Map MIDI value to parameter range
const paramValue = min + (midiValue / 127) * (max - min);

// Apply temporal smoothing
const smoothedValue = currentValue + (paramValue - currentValue) * smoothingFactor;
```

### Color Control

```javascript
// Convert color picker hex to RGB array
function hexToRGB(hex) {
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;
    return [r, g, b];
}
```

## Future Expansion Possibilities

The system is designed for expansion to other control protocols:

1. **OSC Integration**: Could be implemented via a WebSocket bridge
2. **WebSocket Direct Control**: For remote or collaborative control
3. **Preset System**: Save and recall parameter configurations
4. **Parameter Automation**: Timeline-based parameter changes
5. **Multi-touch Support**: Enhanced mobile/tablet control

## Conclusion

The implemented MIDI control system provides a robust framework for real-time interaction with the cloud shader visualization. The temporal smoothing approach effectively overcomes the resolution limitations of MIDI while maintaining responsive control. The prioritization of manual input ensures a seamless user experience when switching between UI and MIDI control methods.