// Pose Mirror: Real-time Body Tracking
//------------------------------------------------------------------------------
// Main entry point for the pose mirror application
// Integrates MediaPipe Pose detection with Three.js 3D rendering
//------------------------------------------------------------------------------

import { PoseTracker } from './src/poseTracker.js';
import { SkeletonRenderer } from './src/skeletonRenderer.js';
import { UIController } from './src/uiController.js';

class PoseMirrorApp {
  constructor() {
    this.poseTracker = null;
    this.skeletonRenderer = null;
    this.uiController = null;
    this.isRunning = false;
    
    this.init();
  }

  async init() {
    try {
      // Initialize UI controller
      this.uiController = new UIController();
      
      // Initialize Three.js skeleton renderer
      this.skeletonRenderer = new SkeletonRenderer('threeCanvas');
      await this.skeletonRenderer.init();
      
      // Initialize MediaPipe pose tracker
      this.poseTracker = new PoseTracker(
        'webcam',
        'webcamCanvas',
        (results) => this.onPoseDetected(results)
      );
      
      // Set up UI event handlers
      this.setupUIHandlers();
      
      // Update status
      this.uiController.updateStatus('Ready. Click "Start Camera" to begin.');
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.uiController.updateStatus('Error initializing: ' + error.message);
    }
  }

  setupUIHandlers() {
    // Camera controls
    document.getElementById('startCameraBtn').addEventListener('click', () => {
      this.startTracking();
    });
    
    document.getElementById('stopCameraBtn').addEventListener('click', () => {
      this.stopTracking();
    });

    // Skeleton scale
    const scaleSlider = document.getElementById('skeletonScaleSlider');
    const scaleVal = document.getElementById('skeletonScaleVal');
    scaleSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      scaleVal.textContent = value.toFixed(1);
      if (this.skeletonRenderer) {
        this.skeletonRenderer.setScale(value);
      }
    });

    // Bone thickness
    const thicknessSlider = document.getElementById('boneThicknessSlider');
    const thicknessVal = document.getElementById('boneThicknessVal');
    thicknessSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      thicknessVal.textContent = value.toFixed(2);
      if (this.skeletonRenderer) {
        this.skeletonRenderer.setBoneThickness(value);
      }
    });

    // Show/hide joints
    document.getElementById('showJointsCheckbox').addEventListener('change', (e) => {
      if (this.skeletonRenderer) {
        this.skeletonRenderer.setShowJoints(e.target.checked);
      }
    });

    // Show/hide bones
    document.getElementById('showBonesCheckbox').addEventListener('change', (e) => {
      if (this.skeletonRenderer) {
        this.skeletonRenderer.setShowBones(e.target.checked);
      }
    });
  }

  async startTracking() {
    if (this.isRunning) return;
    
    try {
      this.uiController.updateStatus('Starting camera...');
      
      await this.poseTracker.start();
      
      this.isRunning = true;
      this.uiController.setCameraRunning(true);
      this.uiController.updateStatus('Camera active. Pose detection running.');
      
    } catch (error) {
      console.error('Error starting camera:', error);
      this.uiController.updateStatus('Error starting camera: ' + error.message);
    }
  }

  stopTracking() {
    if (!this.isRunning) return;
    
    this.poseTracker.stop();
    this.isRunning = false;
    this.uiController.setCameraRunning(false);
    this.uiController.updateStatus('Camera stopped.');
  }

  onPoseDetected(results) {
    if (this.skeletonRenderer && results.poseLandmarks) {
      this.skeletonRenderer.updatePose(results.poseLandmarks);
    }
  }
}

// Initialize app when page loads
window.addEventListener('load', () => {
  new PoseMirrorApp();
});

