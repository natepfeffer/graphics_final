# Live Pose Export System

This system allows you to capture pose data from your webcam and export it in real-time to other applications or browser tabs, enabling you to control 3D body models with your movements.

## 🎯 Features

- **Real-time Pose Detection** - Uses MediaPipe to detect 33 body landmarks
- **Live Data Export** - Broadcasts pose data using BroadcastChannel API
- **3D Visualization** - View your movements mirrored on a 3D skeleton model
- **Multiple Export Options** - BroadcastChannel, WebSocket, and Custom Events
- **Cross-tab Communication** - Run pose detection in one tab and visualization in another

## 📁 Files Overview

- **index.html** - Main pose detection interface with webcam
- **renderer.js** - MediaPipe pose detection and rendering
- **poseExporter.js** - Exports pose data to other applications
- **viewer.html** - 3D model viewer interface
- **modelViewer.js** - Three.js 3D visualization that receives pose data

## 🚀 Quick Start

### Method 1: Same Computer (Browser Tabs)

1. **Start a local server** (required for ES6 modules):
   ```powershell
   # Using Python
   python -m http.server 8000
   
   # OR using Node.js
   npx http-server -p 8000
   ```

2. **Open the pose detection page**:
   - Navigate to `http://localhost:8000/index.html`
   - Click "ENABLE WEBCAM" and allow camera access
   - You should see your pose being detected

3. **Open the 3D viewer in a new tab**:
   - Open `http://localhost:8000/viewer.html` in a **NEW TAB** (same browser)
   - You should immediately see your movements mirrored in 3D!

### Method 2: WebSocket (Cross-Application)

To send pose data to external applications (Unity, Blender, Processing, etc.):

1. **Set up a WebSocket server** (example in Python):
   ```python
   # websocket_server.py
   import asyncio
   import websockets
   import json

   async def handler(websocket, path):
       print("Client connected")
       try:
           async for message in websocket:
               data = json.loads(message)
               print(f"Received pose data: {len(data['poses'])} poses")
               # Process pose data here
       except websockets.exceptions.ConnectionClosed:
           print("Client disconnected")

   async def main():
       async with websockets.serve(handler, "localhost", 8080):
           print("WebSocket server started on ws://localhost:8080")
           await asyncio.Future()

   asyncio.run(main())
   ```

2. **Modify renderer.js** to enable WebSocket:
   ```javascript
   const poseExporter = new PoseExporter({
     enabled: true,
     format: 'normalized',
     websocketUrl: 'ws://localhost:8080'  // Add this line
   });
   ```

## 📊 Pose Data Format

The exported pose data has the following structure:

```javascript
{
  timestamp: 1234567890,        // Performance timestamp
  frameCount: 42,               // Frame number
  poses: [                      // Array of detected people
    {
      personId: 0,              // Person index
      landmarks: [              // Normalized 2D coordinates (0-1)
        {
          id: 0,
          name: "nose",
          x: 0.5,               // Horizontal position (0=left, 1=right)
          y: 0.3,               // Vertical position (0=top, 1=bottom)
          z: -0.1,              // Depth (negative = closer)
          visibility: 0.95      // Confidence (0-1)
        },
        // ... 32 more landmarks
      ],
      worldLandmarks: [         // 3D coordinates in meters
        {
          id: 0,
          name: "nose",
          x: 0.0,               // Meters (world space)
          y: 0.5,
          z: -0.2,
          visibility: 0.95
        },
        // ... 32 more landmarks
      ]
    }
  ],
  videoInfo: {
    width: 1280,
    height: 720
  }
}
```

## 🎨 Landmark Names (33 Points)

MediaPipe detects these body points:

**Face** (0-10):
- nose, eyes (inner/outer/center), ears, mouth corners

**Upper Body** (11-22):
- shoulders, elbows, wrists, fingers (pinky, index, thumb)

**Lower Body** (23-32):
- hips, knees, ankles, heels, foot indices

## 🎮 3D Viewer Controls

- **Left Mouse** - Rotate camera
- **Right Mouse** - Pan camera
- **Scroll Wheel** - Zoom in/out
- **Reset Camera** - Return to default view
- **Toggle Skeleton** - Show/hide bone connections
- **Toggle Grid** - Show/hide ground grid

## 🔧 Integration Examples

### Unity (C#)

```csharp
using UnityEngine;
using WebSocketSharp;
using Newtonsoft.Json;

public class PoseReceiver : MonoBehaviour {
    private WebSocket ws;
    
    void Start() {
        ws = new WebSocket("ws://localhost:8080");
        ws.OnMessage += (sender, e) => {
            var poseData = JsonConvert.DeserializeObject<PoseData>(e.Data);
            UpdateModel(poseData);
        };
        ws.Connect();
    }
    
    void UpdateModel(PoseData data) {
        // Apply pose to your 3D model
    }
}
```

### Blender (Python)

```python
import bpy
import json
from websocket import create_connection

ws = create_connection("ws://localhost:8080")

def update_armature(pose_data):
    armature = bpy.data.objects['Armature']
    for landmark in pose_data['poses'][0]['worldLandmarks']:
        # Map landmarks to bone positions
        pass

while True:
    result = ws.recv()
    data = json.loads(result)
    update_armature(data)
```

### Processing (Java)

```java
import websockets.*;

WebsocketClient ws;

void setup() {
  ws = new WebsocketClient(this, "ws://localhost:8080");
}

void webSocketEvent(String msg) {
  JSONObject data = parseJSONObject(msg);
  JSONArray poses = data.getJSONArray("poses");
  // Use pose data to control your sketch
}
```

## 🌐 Browser API - Custom Events

You can also receive pose data on the same page using custom events:

```javascript
window.addEventListener('pose-data', (event) => {
  const poseData = event.detail;
  console.log('Received pose:', poseData);
  
  // Access landmarks
  const firstPose = poseData.poses[0];
  const nose = firstPose.landmarks.find(l => l.name === 'nose');
  console.log('Nose position:', nose.x, nose.y, nose.z);
});
```

## ⚙️ Configuration Options

### PoseExporter Options

```javascript
const exporter = new PoseExporter({
  enabled: true,              // Enable/disable export
  format: 'normalized',       // 'normalized' or 'pixel'
  websocketUrl: null          // Optional WebSocket server URL
});

// Control at runtime
exporter.setEnabled(false);   // Pause export
exporter.setEnabled(true);    // Resume export
```

## 🐛 Troubleshooting

**No data received in viewer.html:**
- Ensure both tabs are open in the **same browser**
- BroadcastChannel doesn't work across different browsers
- Check browser console for errors

**Webcam not working:**
- Make sure you're using HTTPS or localhost
- Check browser permissions
- Try a different browser (Chrome/Edge recommended)

**3D model not updating:**
- Check the status indicator (should be green and pulsing)
- Refresh the viewer.html page
- Make sure pose detection is running

**CORS errors:**
- Must use a local server (not file://)
- Use Python's http.server or similar

## 📚 Technical Details

- **MediaPipe Pose**: Detects 33 3D body landmarks at 30+ FPS
- **BroadcastChannel API**: Zero-latency cross-tab communication
- **Three.js**: WebGL-based 3D rendering
- **ES6 Modules**: Modern JavaScript module system

## 🎯 Next Steps

1. **Add more body models** - Import GLTF/FBX models
2. **Inverse Kinematics** - Use IK solvers for realistic movement
3. **Record & Playback** - Save pose sequences
4. **Multi-person support** - Handle multiple people
5. **VR/AR integration** - Use with WebXR

## 📝 License

Based on MediaPipe examples - Apache 2.0 License

---

**Happy Motion Capturing! 🎭**
