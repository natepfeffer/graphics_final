import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PoseReceiver } from './poseExporter.js';

class PoseModelViewer {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Pose visualization
    this.skeletonGroup = new THREE.Group();
    this.jointSpheres = {};
    this.boneCylinders = [];
    this.showSkeleton = true;
    this.showGrid = true;
    
    // Body model (simplified stick figure)
    this.bodyModel = null;
    
    // Data reception
    this.poseReceiver = null;
    this.lastPoseData = null;
    this.isReceivingData = false;
    
    // FPS counter
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    
    this.init();
    this.setupPoseReceiver();
    this.setupEventListeners();
    this.animate();
  }
  
  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 3);
    this.camera.lookAt(0, 1, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1, 0);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0x6699ff, 0.4);
    backLight.position.set(-5, 5, -5);
    this.scene.add(backLight);
    
    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.name = 'grid';
    this.scene.add(gridHelper);
    
    // Add skeleton group to scene
    this.scene.add(this.skeletonGroup);
    
    // Create initial skeleton structure
    this.createSkeletonStructure();
    
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  createSkeletonStructure() {
    // Create spheres for each joint
    const jointMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.3
    });
    
    const jointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    
    // We'll create 33 joints (MediaPipe pose landmarks)
    for (let i = 0; i < 33; i++) {
      const sphere = new THREE.Mesh(jointGeometry, jointMaterial.clone());
      sphere.visible = false;
      this.jointSpheres[i] = sphere;
      this.skeletonGroup.add(sphere);
    }
    
    // Define bone connections (MediaPipe pose connections)
    this.boneConnections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7],
      [0, 4], [4, 5], [5, 6], [6, 8],
      [9, 10],
      
      // Upper body
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [15, 17], [15, 19], [15, 21], // left hand
      [16, 18], [16, 20], [16, 22], // right hand
      
      // Torso
      [11, 23], [12, 24], [23, 24],
      
      // Lower body
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28], // right leg
      [27, 29], [27, 31], // left foot
      [28, 30], [28, 32]  // right foot
    ];
  }
  
  setupPoseReceiver() {
    this.poseReceiver = new PoseReceiver((poseData) => {
      this.lastPoseData = poseData;
      this.updateVisualization(poseData);
      this.updateStatus(true);
    });
  }
  
  updateVisualization(poseData) {
    if (!poseData.poses || poseData.poses.length === 0) return;
    
    // Use the first detected pose
    const pose = poseData.poses[0];
    const landmarks = pose.worldLandmarks.length > 0 ? pose.worldLandmarks : pose.landmarks;
    
    // Update joint positions
    landmarks.forEach((landmark, index) => {
      if (this.jointSpheres[index]) {
        // MediaPipe world landmarks are in meters, centered at hips
        // We need to transform them to our coordinate system
        let x, y, z;
        
        if (pose.worldLandmarks.length > 0) {
          // Use world coordinates (3D space in meters)
          x = -landmark.x; // Mirror X
          y = -landmark.y; // Invert Y (MediaPipe Y points down)
          z = -landmark.z; // Mirror Z for facing camera
        } else {
          // Use normalized screen coordinates
          x = (landmark.x - 0.5) * 2;
          y = -(landmark.y - 0.5) * 2;
          z = -landmark.z;
        }
        
        this.jointSpheres[index].position.set(x, y + 1, z);
        this.jointSpheres[index].visible = landmark.visibility > 0.5;
        
        // Color based on visibility
        const material = this.jointSpheres[index].material;
        const hue = THREE.MathUtils.lerp(0, 120, landmark.visibility) / 360;
        material.color.setHSL(hue, 1, 0.5);
      }
    });
    
    // Update bones
    this.updateBones();
    
    // Update UI
    document.getElementById('pose-count').textContent = poseData.poses.length;
  }
  
  updateBones() {
    // Remove old bone cylinders
    this.boneCylinders.forEach(bone => this.skeletonGroup.remove(bone));
    this.boneCylinders = [];
    
    if (!this.showSkeleton) return;
    
    const boneMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.2
    });
    
    // Create cylinders for each bone connection
    this.boneConnections.forEach(([startIdx, endIdx]) => {
      const start = this.jointSpheres[startIdx];
      const end = this.jointSpheres[endIdx];
      
      if (start.visible && end.visible) {
        const direction = new THREE.Vector3().subVectors(
          end.position,
          start.position
        );
        const length = direction.length();
        
        if (length > 0.01) {
          const cylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, length, 8),
            boneMaterial
          );
          
          // Position cylinder between joints
          cylinder.position.copy(start.position).add(direction.multiplyScalar(0.5));
          
          // Rotate cylinder to point from start to end
          const axis = new THREE.Vector3(0, 1, 0);
          cylinder.quaternion.setFromUnitVectors(axis, direction.normalize());
          
          this.skeletonGroup.add(cylinder);
          this.boneCylinders.push(cylinder);
        }
      }
    });
  }
  
  updateStatus(receiving) {
    this.isReceivingData = receiving;
    const indicator = document.getElementById('indicator');
    const statusText = document.getElementById('status-text');
    
    if (receiving) {
      indicator.className = 'status-indicator connected';
      statusText.textContent = 'Receiving pose data';
    } else {
      indicator.className = 'status-indicator disconnected';
      statusText.textContent = 'Waiting for pose data...';
    }
  }
  
  setupEventListeners() {
    document.getElementById('reset-camera').addEventListener('click', () => {
      this.camera.position.set(0, 1, 3);
      this.controls.target.set(0, 1, 0);
      this.controls.update();
    });
    
    document.getElementById('toggle-skeleton').addEventListener('click', () => {
      this.showSkeleton = !this.showSkeleton;
      this.updateBones();
    });
    
    document.getElementById('toggle-grid').addEventListener('click', () => {
      this.showGrid = !this.showGrid;
      const grid = this.scene.getObjectByName('grid');
      if (grid) grid.visible = this.showGrid;
    });
    
    // Check if we're still receiving data
    setInterval(() => {
      const timeSinceLastPose = performance.now() - (this.poseReceiver?.lastReceivedTime || 0);
      if (timeSinceLastPose > 1000) {
        this.updateStatus(false);
      }
    }, 1000);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update controls
    this.controls.update();
    
    // Calculate FPS
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      document.getElementById('fps').textContent = this.fps;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize viewer when page loads
window.addEventListener('DOMContentLoaded', () => {
  new PoseModelViewer();
});
