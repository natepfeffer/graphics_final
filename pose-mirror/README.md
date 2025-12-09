# Pose Mirror - Real-time Body Tracking

A web-based application that uses your laptop camera to capture body pose data and displays a 3D skeleton model that mirrors your movements in real-time.

## Features

- **Real-time Pose Detection**: Uses MediaPipe Pose to detect 33 body landmarks from webcam video
- **3D Skeleton Visualization**: Renders a 3D skeleton model using Three.js that mirrors your body movements
- **Interactive Controls**: Adjustable skeleton scale, bone thickness, and visibility toggles
- **Webcam Preview**: See your pose detection overlay in the sidebar

## Technologies

- **Three.js**: 3D graphics rendering
- **MediaPipe Pose**: Real-time body pose estimation
- **WebGL**: Hardware-accelerated graphics
- **Web APIs**: getUserMedia for camera access

## Getting Started

### Prerequisites

- A modern web browser with WebGL support (Chrome, Firefox, Edge, Safari)
- A webcam connected to your computer
- A local web server (required for ES6 modules)

### Running the Project

1. **Start a local web server** (choose one method):

   **Python 3:**
   ```bash
   python -m http.server 8000
   ```

   **Node.js (with http-server):**
   ```bash
   npx http-server -p 8000
   ```

   **VS Code Live Server:**
   - Install the "Live Server" extension
   - Right-click `index.html` and select "Open with Live Server"

2. **Open in browser:**
   Navigate to `http://localhost:8000/pose-mirror/`

3. **Grant camera permissions:**
   When prompted, allow the browser to access your camera

4. **Start tracking:**
   Click the "Start Camera" button to begin pose detection

## Usage

1. Click **"Start Camera"** to begin pose detection
2. Stand in front of your webcam so your full body is visible
3. Watch as the 3D skeleton in the main view mirrors your movements
4. Adjust settings in the sidebar:
   - **Scale**: Make the skeleton larger or smaller
   - **Bone Thickness**: Adjust the thickness of skeleton bones
   - **Show Joints/Bones**: Toggle visibility of skeleton components

## Project Structure

```
pose-mirror/
├── index.html          # Main HTML file
├── main.js            # Application entry point
├── styles/
│   └── style.css      # Application styling
├── src/
│   ├── poseTracker.js      # MediaPipe pose detection
│   ├── skeletonRenderer.js # Three.js 3D skeleton rendering
│   └── uiController.js     # UI state management
└── README.md          # This file
```

## Architecture

- **PoseTracker**: Handles webcam access and MediaPipe Pose detection
- **SkeletonRenderer**: Manages Three.js scene, camera, and skeleton model
- **UIController**: Manages UI state and user interactions
- **PoseMirrorApp**: Main application class that coordinates all components

## MediaPipe Pose Landmarks

The application tracks 33 body landmarks:
- Face (0-10): Eyes, nose, mouth
- Upper body (11-16): Shoulders, elbows, wrists
- Torso (23-24): Hips
- Lower body (25-32): Knees, ankles, feet

See [MediaPipe Pose documentation](https://google.github.io/mediapipe/solutions/pose.html) for more details.

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require HTTPS for camera access)
- Mobile browsers: Limited (camera access may vary)

## Notes

- The application requires HTTPS or localhost to access the camera in most browsers
- Performance may vary based on your computer's processing power
- For best results, ensure good lighting and stand 3-6 feet from the camera

## Future Enhancements

- Add pose smoothing/filtering for more stable movements
- Support for multiple pose models (human segmentation)
- Recording and playback of pose sequences
- Export pose data to common formats
- Additional visualization modes (stick figure, mesh, etc.)

## License

This project is for educational purposes as part of a Computer Graphics course.

