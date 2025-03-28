# Cloud Shader MIDI Control Protocol

This document defines the MIDI Control Change (CC) mappings for the Cloud Shader parameters. All parameters use temporal smoothing for higher precision control.

## Core Parameters (CC 0-7)
- CC 0: Cloud Scale (0.1 - 3.0)
- CC 1: Speed (0.0 - 0.1)
- CC 2: Cloud Darkness (0.0 - 1.0)
- CC 3: Cloud Lightness (0.0 - 1.0)
- CC 4: Cloud Cover (0.0 - 1.0)
- CC 5: Cloud Alpha (0.0 - 20.0)
- CC 6: Sky Tint (0.0 - 1.0)
- CC 7: Noise Scale (0.1 - 5.0)

## Movement Parameters (CC 8-9)
- CC 8: Direction X (-1.0 - 1.0)
- CC 9: Direction Y (-1.0 - 1.0)

## Animation Parameters (CC 10-11)
- CC 10: Animation Speed (0.01 - 0.2)
- CC 11: Noise Offset (0.0 - 10.0)

## Color Parameters (CC 12-20)
### Cloud Color (RGB)
- CC 12: Cloud Color R (0.0 - 1.0)
- CC 13: Cloud Color G (0.0 - 1.0)
- CC 14: Cloud Color B (0.0 - 1.0)

### Sky Color Top (RGB)
- CC 15: Sky Color Top R (0.0 - 1.0)
- CC 16: Sky Color Top G (0.0 - 1.0)
- CC 17: Sky Color Top B (0.0 - 1.0)

### Sky Color Bottom (RGB)
- CC 18: Sky Color Bottom R (0.0 - 1.0)
- CC 19: Sky Color Bottom G (0.0 - 1.0)
- CC 20: Sky Color Bottom B (0.0 - 1.0)

## Parameter Smoothing
Each parameter has temporal smoothing applied to increase effective resolution beyond MIDI's 7-bit limitation. Smoothing factors are optimized for each parameter type:

### Smoothing Factors
- Movement parameters (Direction X/Y): 0.02 (high smoothing)
- Core visual parameters (Scale, Cover, Alpha): 0.05 (medium smoothing)
- Color parameters: 0.1 (medium-low smoothing)
- Speed parameters: 0.2 (low smoothing)

## Implementation Notes
- MIDI values (0-127) are mapped to parameter ranges automatically
- All parameters use temporal smoothing for higher effective resolution
- Color parameters combine three MIDI CCs (R,G,B) into a single vec3
- Web MIDI API requires Chrome or Edge browser