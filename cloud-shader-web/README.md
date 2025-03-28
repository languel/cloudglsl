# Cloud Shader Web

This project is a minimal webpage that displays a cloud shader using WebGL. It allows users to control various dynamic parameters of the shader through a simple user interface that can be toggled on and off.

## Project Structure

- **index.html**: The main HTML document that sets up the structure of the webpage, including a canvas element for rendering the cloud shader.
- **styles.css**: Contains styles for the webpage, including layout and visibility settings for the UI elements that control the shader parameters.
- **js/main.js**: Responsible for initializing the WebGL context, loading the shaders, and handling the rendering loop. It also manages the UI for controlling the shader parameters and toggling their visibility.
- **js/shader.js**: Contains the shader code in GLSL format, including the fragment and vertex shaders used to render the cloud effect.
- **shaders/fragment.glsl**: Contains the GLSL code for the fragment shader, implementing the cloud shader logic based on the provided Shadertoy shader code.
- **shaders/vertex.glsl**: Contains the GLSL code for the vertex shader, setting up the vertex positions and passing necessary data to the fragment shader.

## Running the Project

To run the project, follow these steps:

1. Clone the repository or download the project files.
2. Open `index.html` in a web browser that supports WebGL.
3. Use the UI controls to adjust the shader parameters and observe the changes in real-time.

## Dynamic Parameters

The following parameters can be controlled through the UI:

- **Cloud Scale**: Adjusts the scale of the clouds.
- **Speed**: Controls the speed of cloud movement.
- **Cloud Darkness**: Sets the darkness level of the clouds.
- **Cloud Lightness**: Sets the lightness level of the clouds.
- **Cloud Cover**: Adjusts the overall cloud coverage.
- **Cloud Alpha**: Controls the transparency of the clouds.
- **Sky Tint**: Adjusts the tint of the sky.

Feel free to experiment with these parameters to create different cloud effects.

## Initial inspiration

[Shadertoy: 2D Clouds by drift](https://www.shadertoy.com/view/4tdSWr)
