// Fragment shader source code
var fragmentShaderSource = `
precision mediump float;

// Uniform variables for dynamic parameters
uniform vec3 iResolution;
uniform float iTime;
uniform float cloudscale;
uniform float speed;
uniform float clouddark;
uniform float cloudlight;
uniform float cloudcover;
uniform float cloudalpha;
uniform float skytint;
uniform vec3 skycolour1;
uniform vec3 skycolour2;
uniform vec3 cloudcolour;  // New: Custom cloud color
uniform vec2 moveDirection; // Cloud movement (x,y)
// Existing seed; used to shift the noise pattern
uniform float u_seed;
// NEW: Continuous noise offset to morph clouds smoothly
uniform float u_noiseOffset;

const mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );

vec2 hash( vec2 p ) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p ) {
    // shift the input coordinates with the seed
    p += vec2(u_seed);
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2 i = floor(p + (p.x+p.y)*K1);   
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3 n = h*h*h*h*vec3( dot(a, hash(i+0.0)), dot(b, hash(i+o)), dot(c, hash(i+1.0)));
    return dot(n, vec3(70.0));   
}

// reduced number of iterations in fbm
float fbm(vec2 n) {
    float total = 0.0, amplitude = 0.1;
    for (int i = 0; i < 7; i++) {  // was 7 iterations
        total += noise(n) * amplitude;
        n = m * n;
        amplitude *= 0.4;
    }
    return total;
}

// Varying for passing texture coordinates
varying vec2 vTextureCoord;

void main() {
    vec2 p = vTextureCoord.xy;
    // Add the continuous noise offset here so you can tweak the evolution directly
    vec2 uv = p * vec2(iResolution.x/iResolution.y, 1.0) + vec2(u_noiseOffset);
    float time = iTime * speed;
    float q = fbm(uv * cloudscale * 0.5);
    
    // Ridged noise shape: restore iterations for more realistic clouds
    float r = 0.0;
    uv *= cloudscale;
    uv -= q - time * moveDirection;
    float weight = 0.8;
    for (int i=0; i<8; i++){
        r += abs(weight * noise(uv));
        uv = m * uv + time * moveDirection;
        weight *= 0.7;
    }
    
    // Noise shape: restored iterations
    float f = 0.0;
    uv = p * vec2(iResolution.x/iResolution.y, 1.0) + vec2(u_noiseOffset);
    uv *= cloudscale;
    uv -= q - time * moveDirection;
    weight = 0.7;
    for (int i=0; i<8; i++){
        f += weight * noise(uv);
        uv = m * uv + time * moveDirection;
        weight *= 0.6;
    }
    
    f *= r + f;
    
    // Noise colour: restore iterations for richer colour gradients
    float c = 0.0;
    time = iTime * speed * 2.0;
    uv = p * vec2(iResolution.x/iResolution.y, 1.0) + vec2(u_noiseOffset);
    uv *= cloudscale * 2.0;
    uv -= q - time * moveDirection;
    weight = 0.4;
    for (int i=0; i<7; i++){
        c += weight * noise(uv);
        uv = m * uv + time * moveDirection;
        weight *= 0.6;
    }
    
    // Noise ridge colour: restore iterations
    float c1 = 0.0;
    time = iTime * speed * 3.0;
    uv = p * vec2(iResolution.x/iResolution.y, 1.0) + vec2(u_noiseOffset);
    uv *= cloudscale * 3.0;
    uv -= q - time * moveDirection;
    weight = 0.4;
    for (int i=0; i<7; i++){
        c1 += abs(weight * noise(uv));
        uv = m * uv + time * moveDirection;
        weight *= 0.6;
    }
    
    c += c1;
    
    vec3 skycolour = mix(skycolour2, skycolour1, p.y);
    // Use the custom cloud color instead of hardcoded value
    vec3 cloudcolor = cloudcolour * clamp((clouddark + cloudlight * c), 0.0, 1.0);
    f = cloudcover + cloudalpha * f * r;
    vec3 result = mix(skycolour, clamp(skytint * skycolour + cloudcolor, 0.0, 1.0), clamp(f + c, 0.0, 1.0));
    
    gl_FragColor = vec4(result, 1.0);
}
`;

var vertexShaderSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vTextureCoord;
    
    void main() {
        gl_Position = aVertexPosition;
        vTextureCoord = aVertexPosition.xy * 0.5 + 0.5;
    }
`;