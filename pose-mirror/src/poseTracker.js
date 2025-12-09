// Pose Tracker using MediaPipe Pose
//------------------------------------------------------------------------------
// Handles webcam access and MediaPipe Pose detection
//------------------------------------------------------------------------------

export class PoseTracker {
  constructor(videoId, canvasId, onResultsCallback) {
    this.videoElement = document.getElementById(videoId);
    this.canvasElement = document.getElementById(canvasId);
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.onResultsCallback = onResultsCallback;
    
    this.camera = null;
    this.pose = null;
    this.isRunning = false;
    
    this.init();
  }

  async init() {
    // Wait for MediaPipe to be loaded
    if (typeof Pose === 'undefined') {
      console.error('MediaPipe Pose not loaded. Make sure script tags are in the HTML.');
      return;
    }

    // Initialize MediaPipe Pose
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => {
      this.drawWebcam(results);
      if (this.onResultsCallback) {
        this.onResultsCallback(results);
      }
    });

    // Set canvas dimensions
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvasElement.parentElement;
    const width = container.clientWidth;
    const height = width * 0.75; // 4:3 aspect ratio
    this.canvasElement.width = width;
    this.canvasElement.height = height;
  }

  async start() {
    if (this.isRunning) return;

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      this.videoElement.srcObject = stream;
      this.videoElement.style.display = 'block';
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      // Initialize camera (MediaPipe Camera utility)
      if (typeof Camera === 'undefined') {
        throw new Error('MediaPipe Camera utility not loaded');
      }
      
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await this.pose.send({ image: this.videoElement });
        },
        width: 640,
        height: 480
      });

      this.camera.start();
      this.isRunning = true;

    } catch (error) {
      throw new Error('Could not access camera: ' + error.message);
    }
  }

  stop() {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }

    if (this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }

    this.videoElement.style.display = 'none';
    this.isRunning = false;
    
    // Clear canvas
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  drawWebcam(results) {
    // Clear canvas
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Draw video frame
    if (results.image) {
      this.canvasCtx.drawImage(
        results.image,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
    } else if (this.videoElement && this.videoElement.readyState >= 2) {
      // Fallback: draw video element directly
      this.canvasCtx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
    }

    // Draw pose landmarks
    if (results.poseLandmarks) {
      this.drawConnections(results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      });
      this.drawLandmarks(results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 1,
        radius: 3
      });
    }

    this.canvasCtx.restore();
  }

  drawConnections(landmarks, connections, style) {
    this.canvasCtx.strokeStyle = style.color;
    this.canvasCtx.lineWidth = style.lineWidth;
    
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      if (startPoint && endPoint) {
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(
          startPoint.x * this.canvasElement.width,
          startPoint.y * this.canvasElement.height
        );
        this.canvasCtx.lineTo(
          endPoint.x * this.canvasElement.width,
          endPoint.y * this.canvasElement.height
        );
        this.canvasCtx.stroke();
      }
    });
  }

  drawLandmarks(landmarks, style) {
    this.canvasCtx.fillStyle = style.color;
    
    landmarks.forEach((landmark) => {
      if (landmark.visibility > 0.5) {
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
          landmark.x * this.canvasElement.width,
          landmark.y * this.canvasElement.height,
          style.radius,
          0,
          2 * Math.PI
        );
        this.canvasCtx.fill();
      }
    });
  }
}

// MediaPipe Pose connections (skeleton structure)
// Standard MediaPipe Pose 33-point model connections
const POSE_CONNECTIONS = [
  // Face outline (simplified)
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  // Upper body
  [9, 10],  // Shoulders
  [11, 12],  // Shoulders connection
  // Left arm
  [11, 13], [13, 15],  // Left shoulder -> elbow -> wrist
  // Right arm  
  [12, 14], [14, 16],  // Right shoulder -> elbow -> wrist
  // Torso
  [11, 23], [12, 24], [23, 24],  // Shoulders to hips
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31],  // Left hip -> knee -> ankle -> foot
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32]   // Right hip -> knee -> ankle -> foot
];

