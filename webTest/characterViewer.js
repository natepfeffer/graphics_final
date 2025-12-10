import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PoseReceiver } from './poseExporter.js';

class CharacterPoseViewer {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Character model
    this.characterModel = null;
    this.characterMesh = null;
    this.bones = {};
    this.showWireframe = false;
    
    // GLTF Loader for custom models
    this.gltfLoader = new GLTFLoader();
    this.loadedGLTFModel = null;
    this.gltfBones = {};
    
    // Pose skeleton (for reference)
    this.skeletonGroup = new THREE.Group();
    this.jointSpheres = {};
    this.boneCylinders = [];
    this.showSkeleton = false;
    this.showGrid = true;
    
    // Pose data
    this.poseReceiver = null;
    this.lastPoseData = null;
    this.currentPose = null;
    
    // Model type
    this.modelType = 'humanoid';
    
    // FPS counter
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    
    this.init();
    this.createProceduralCharacter();
    this.setupPoseReceiver();
    this.setupEventListeners();
    this.animate();
  }
  
  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1e);
    this.scene.fog = new THREE.Fog(0x0f0f1e, 5, 15);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 1, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1, 0);
    this.controls.maxDistance = 10;
    this.controls.minDistance = 1;
    
    // Lighting setup (for graphics class relevance)
    this.setupLighting();
    
    // Grid and ground
    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    gridHelper.name = 'grid';
    this.scene.add(gridHelper);
    
    // Ground plane with shadow receiving
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add skeleton group to scene
    this.scene.add(this.skeletonGroup);
    
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  setupLighting() {
    // Key light (main directional light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);
    
    // Fill light (softer, from the side)
    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.5);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);
    
    // Rim light (back light for edge definition)
    const rimLight = new THREE.DirectionalLight(0xff8844, 0.6);
    rimLight.position.set(0, 3, -5);
    this.scene.add(rimLight);
    
    // Ambient light (global illumination simulation)
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);
    
    // Hemisphere light (sky/ground color)
    const hemisphereLight = new THREE.HemisphereLight(0x4488ff, 0x221100, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  createProceduralCharacter() {
    // Create a procedural humanoid character using geometry primitives
    // This demonstrates mesh construction and hierarchical modeling
    
    this.characterModel = new THREE.Group();
    this.characterModel.name = 'character';
    
    // Material with physically-based rendering properties
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      roughness: 0.7,
      metalness: 0.2,
      flatShading: false
    });
    
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.5,
      metalness: 0.3
    });
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.castShadow = true;
    head.position.set(0, 1.5, 0);
    this.bones.head = head;
    this.characterModel.add(head);
    
    // Torso
    const torsoGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.castShadow = true;
    torso.position.set(0, 1.1, 0);
    this.bones.torso = torso;
    this.characterModel.add(torso);
    
    // Hips
    const hipsGeometry = new THREE.BoxGeometry(0.45, 0.2, 0.25);
    const hips = new THREE.Mesh(hipsGeometry, bodyMaterial);
    hips.castShadow = true;
    hips.position.set(0, 0.75, 0);
    this.bones.hips = hips;
    this.characterModel.add(hips);
    
    // Create limbs with proper hierarchy
    this.createLimb('leftArm', new THREE.Vector3(-0.25, 1.3, 0), bodyMaterial, jointMaterial, 0.4);
    this.createLimb('rightArm', new THREE.Vector3(0.25, 1.3, 0), bodyMaterial, jointMaterial, 0.4);
    this.createLimb('leftLeg', new THREE.Vector3(-0.15, 0.65, 0), bodyMaterial, jointMaterial, 0.5);
    this.createLimb('rightLeg', new THREE.Vector3(0.15, 0.65, 0), bodyMaterial, jointMaterial, 0.5);
    
    this.scene.add(this.characterModel);
    this.characterMesh = this.characterModel;
  }
  
  createLimb(name, startPos, bodyMaterial, jointMaterial, length) {
    const limbGroup = new THREE.Group();
    
    // Upper limb
    const upperGeometry = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
    const upperLimb = new THREE.Mesh(upperGeometry, bodyMaterial);
    upperLimb.castShadow = true;
    upperLimb.position.copy(startPos);
    upperLimb.position.y -= length / 2;
    this.bones[name + 'Upper'] = upperLimb;
    limbGroup.add(upperLimb);
    
    // Joint (elbow/knee)
    const jointGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    const joint = new THREE.Mesh(jointGeometry, jointMaterial);
    joint.castShadow = true;
    joint.position.copy(startPos);
    joint.position.y -= length;
    this.bones[name + 'Joint'] = joint;
    limbGroup.add(joint);
    
    // Lower limb
    const lowerGeometry = new THREE.CylinderGeometry(0.045, 0.04, length, 8);
    const lowerLimb = new THREE.Mesh(lowerGeometry, bodyMaterial);
    lowerLimb.castShadow = true;
    lowerLimb.position.copy(startPos);
    lowerLimb.position.y -= length * 1.5;
    this.bones[name + 'Lower'] = lowerLimb;
    limbGroup.add(lowerLimb);
    
    // Hand/Foot
    const endGeometry = new THREE.SphereGeometry(0.05, 12, 12);
    const endPart = new THREE.Mesh(endGeometry, jointMaterial);
    endPart.castShadow = true;
    endPart.position.copy(startPos);
    endPart.position.y -= length * 2;
    this.bones[name + 'End'] = endPart;
    limbGroup.add(endPart);
    
    this.characterModel.add(limbGroup);
  }
  
  setupPoseReceiver() {
    this.poseReceiver = new PoseReceiver((poseData) => {
      this.lastPoseData = poseData;
      this.currentPose = poseData;
      this.updateCharacterFromPose(poseData);
      this.updateStatus(true);
      document.getElementById('pose-count').textContent = poseData.poses.length;
    });
  }
  
  updateCharacterFromPose(poseData) {
    if (!poseData.poses || poseData.poses.length === 0) return;
    
    const pose = poseData.poses[0];
    const landmarks = pose.worldLandmarks.length > 0 ? pose.worldLandmarks : pose.landmarks;
    
    if (landmarks.length < 33) return;
    
    // If using GLTF model, use different update method
    if (this.modelType === 'custom' && this.loadedGLTFModel) {
      this.updateGLTFModelFromPose(landmarks, pose.worldLandmarks.length > 0);
      return;
    }
    
    // Helper function to get landmark position
    const getPos = (index) => {
      const lm = landmarks[index];
      if (pose.worldLandmarks.length > 0) {
        return new THREE.Vector3(-lm.x, -lm.y + 1.5, -lm.z);
      } else {
        return new THREE.Vector3(
          (lm.x - 0.5) * 2,
          -(lm.y - 0.5) * 2 + 1.5,
          -lm.z * 2
        );
      }
    };
    
    // MediaPipe landmark indices
    const NOSE = 0;
    const LEFT_SHOULDER = 11, RIGHT_SHOULDER = 12;
    const LEFT_ELBOW = 13, RIGHT_ELBOW = 14;
    const LEFT_WRIST = 15, RIGHT_WRIST = 16;
    const LEFT_HIP = 23, RIGHT_HIP = 24;
    const LEFT_KNEE = 25, RIGHT_KNEE = 26;
    const LEFT_ANKLE = 27, RIGHT_ANKLE = 28;
    
    // Update head
    if (this.bones.head && landmarks[NOSE].visibility > 0.5) {
      this.bones.head.position.copy(getPos(NOSE));
    }
    
    // Update torso (between shoulders and hips)
    if (this.bones.torso) {
      const shoulderCenter = getPos(LEFT_SHOULDER).lerp(getPos(RIGHT_SHOULDER), 0.5);
      const hipCenter = getPos(LEFT_HIP).lerp(getPos(RIGHT_HIP), 0.5);
      const torsoPos = shoulderCenter.lerp(hipCenter, 0.5);
      this.bones.torso.position.copy(torsoPos);
      
      // Orient torso
      const torsoDir = new THREE.Vector3().subVectors(shoulderCenter, hipCenter).normalize();
      this.bones.torso.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), torsoDir);
    }
    
    // Update hips
    if (this.bones.hips) {
      const hipCenter = getPos(LEFT_HIP).lerp(getPos(RIGHT_HIP), 0.5);
      this.bones.hips.position.copy(hipCenter);
    }
    
    // Update limbs
    this.updateLimb('leftArm', LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST, getPos);
    this.updateLimb('rightArm', RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST, getPos);
    this.updateLimb('leftLeg', LEFT_HIP, LEFT_KNEE, LEFT_ANKLE, getPos);
    this.updateLimb('rightLeg', RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE, getPos);
  }
  
  updateLimb(name, startIdx, midIdx, endIdx, getPos) {
    const start = getPos(startIdx);
    const mid = getPos(midIdx);
    const end = getPos(endIdx);
    
    // Upper limb
    if (this.bones[name + 'Upper']) {
      const upperMid = start.clone().lerp(mid, 0.5);
      this.bones[name + 'Upper'].position.copy(upperMid);
      
      const upperDir = new THREE.Vector3().subVectors(mid, start).normalize();
      this.bones[name + 'Upper'].quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), upperDir);
      
      const upperLength = start.distanceTo(mid);
      this.bones[name + 'Upper'].scale.y = upperLength / 0.4;
    }
    
    // Joint
    if (this.bones[name + 'Joint']) {
      this.bones[name + 'Joint'].position.copy(mid);
    }
    
    // Lower limb
    if (this.bones[name + 'Lower']) {
      const lowerMid = mid.clone().lerp(end, 0.5);
      this.bones[name + 'Lower'].position.copy(lowerMid);
      
      const lowerDir = new THREE.Vector3().subVectors(end, mid).normalize();
      this.bones[name + 'Lower'].quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), lowerDir);
      
      const lowerLength = mid.distanceTo(end);
      this.bones[name + 'Lower'].scale.y = lowerLength / 0.4;
    }
    
    // End (hand/foot)
    if (this.bones[name + 'End']) {
      this.bones[name + 'End'].position.copy(end);
    }
  }
  
  updateStatus(receiving) {
    const indicator = document.getElementById('indicator');
    const statusText = document.getElementById('status-text');
    
    if (receiving) {
      indicator.className = 'status-indicator connected';
      statusText.textContent = 'Receiving pose data ✓';
    } else {
      indicator.className = 'status-indicator disconnected';
      statusText.textContent = 'Waiting for pose data...';
    }
  }
  
  setupEventListeners() {
    document.getElementById('reset-camera').addEventListener('click', () => {
      this.camera.position.set(0, 1.6, 3);
      this.controls.target.set(0, 1, 0);
      this.controls.update();
    });
    
    document.getElementById('toggle-skeleton').addEventListener('click', (e) => {
      this.showSkeleton = !this.showSkeleton;
      e.target.classList.toggle('active');
      e.target.textContent = this.showSkeleton ? 'Hide Skeleton' : 'Show Skeleton';
    });
    
    document.getElementById('toggle-grid').addEventListener('click', () => {
      this.showGrid = !this.showGrid;
      const grid = this.scene.getObjectByName('grid');
      if (grid) grid.visible = this.showGrid;
    });
    
    document.getElementById('toggle-wireframe').addEventListener('click', (e) => {
      this.showWireframe = !this.showWireframe;
      e.target.classList.toggle('active');
      
      if (this.characterMesh) {
        this.characterMesh.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.wireframe = this.showWireframe;
          }
        });
      }
    });
    
    document.getElementById('model-choice').addEventListener('change', (e) => {
      const modelType = e.target.value;
      if (modelType !== 'custom') {
        this.changeModel(modelType);
      }
    });
    
    document.getElementById('load-model').addEventListener('click', () => {
      const modelPath = document.getElementById('model-path').value.trim();
      if (modelPath) {
        this.loadGLTFModel(modelPath);
      } else {
        alert('Please enter a model filename or path');
      }
    });
    
    // Allow Enter key to load model
    document.getElementById('model-path').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('load-model').click();
      }
    });
    
    // Check if still receiving data
    setInterval(() => {
      const timeSinceLastPose = performance.now() - (this.poseReceiver?.lastReceivedTime || 0);
      if (timeSinceLastPose > 1000) {
        this.updateStatus(false);
      }
    }, 1000);
  }
  
  changeModel(modelType) {
    this.modelType = modelType;
    document.getElementById('current-model').textContent = modelType;
    
    // Remove old model
    if (this.characterModel) {
      this.scene.remove(this.characterModel);
      this.bones = {};
      this.gltfBones = {};
    }
    
    // Create new model based on type
    switch(modelType) {
      case 'humanoid':
        this.createProceduralCharacter();
        break;
      case 'robot':
        this.createRobotCharacter();
        break;
      case 'stickman':
        this.createStickman();
        break;
    }
  }
  
  loadGLTFModel(modelPath) {
    console.log('Attempting to load model:', modelPath);
    
    // Remove old model
    if (this.characterModel) {
      this.scene.remove(this.characterModel);
      this.bones = {};
      this.gltfBones = {};
    }
    
    const loadingDiv = document.getElementById('loading');
    loadingDiv.classList.remove('hidden');
    loadingDiv.textContent = 'Loading Model...';
    
    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        // Success
        console.log('GLTF Model loaded successfully!', gltf);
        loadingDiv.classList.add('hidden');
        
        this.modelType = 'custom';
        this.loadedGLTFModel = gltf.scene;
        this.characterModel = gltf.scene;
        this.characterMesh = gltf.scene;
        
        // Calculate bounding box to auto-scale
        const box = new THREE.Box3().setFromObject(this.characterModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Scale to approximately 2 units tall
        const targetHeight = 2;
        const scale = targetHeight / maxDim;
        this.characterModel.scale.set(scale, scale, scale);
        
        console.log('Model size:', size, 'Scale:', scale);
        
        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        this.characterModel.position.set(-center.x * scale, 0, -center.z * scale);
        
        // Enable shadows
        this.characterModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Ensure materials work with our lighting
            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });
        
        // Find bones if model is rigged
        this.findGLTFBones(gltf);
        
        this.scene.add(this.characterModel);
        document.getElementById('current-model').textContent = modelPath.split('/').pop();
        
        console.log('Model added to scene. Bones found:', Object.keys(this.gltfBones).length);
      },
      (progress) => {
        // Loading progress
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        loadingDiv.textContent = `Loading Model... ${percent}%`;
      },
      (error) => {
        // Error
        loadingDiv.classList.add('hidden');
        console.error('Error loading GLTF model:', error);
        
        const errorMsg = `Failed to load: ${modelPath}\n\nPossible issues:\n` +
                        `1. File doesn't exist in webTest folder\n` +
                        `2. File name is incorrect (case-sensitive)\n` +
                        `3. CORS issue (must use http server)\n` +
                        `4. File is corrupted\n\n` +
                        `Check browser console (F12) for details.`;
        
        alert(errorMsg);
        console.error('Full error:', error);
        
        // Fallback to humanoid
        document.getElementById('model-choice').value = 'humanoid';
        this.createProceduralCharacter();
      }
    );
  }
  
  findGLTFBones(gltf) {
    // First, list ALL objects in the model for debugging
    console.log('=== MODEL STRUCTURE ===');
    const allObjects = [];
    gltf.scene.traverse((object) => {
      allObjects.push({
        name: object.name,
        type: object.type,
        isBone: object.isBone,
        isMesh: object.isMesh
      });
      console.log(`${object.type}: "${object.name}" ${object.isBone ? '[BONE]' : ''}`);
    });
    
    // Try to find common bone names in the armature
    const commonBoneNames = {
      head: ['head', 'Head', 'HEAD', 'neck', 'Neck', 'cranium', 'mixamorigHead', 'mixamorigNeck'],
      spine: ['spine', 'Spine', 'SPINE', 'torso', 'Torso', 'chest', 'Chest', 'back', 'mixamorigSpine', 'mixamorigSpine1', 'mixamorigSpine2'],
      hips: ['hips', 'Hips', 'HIPS', 'pelvis', 'Pelvis', 'root', 'mixamorigHips'],
      leftShoulder: ['LeftShoulder', 'L_Shoulder', 'shoulder.L', 'LeftArm', 'shoulder_L', 'upperarm_l', 'mixamorigLeftShoulder', 'mixamorigLeftArm'],
      rightShoulder: ['RightShoulder', 'R_Shoulder', 'shoulder.R', 'RightArm', 'shoulder_R', 'upperarm_r', 'mixamorigRightShoulder', 'mixamorigRightArm'],
      leftElbow: ['LeftElbow', 'L_Elbow', 'elbow.L', 'LeftForeArm', 'forearm_l', 'lowerarm_l', 'mixamorigLeftForeArm'],
      rightElbow: ['RightElbow', 'R_Elbow', 'elbow.R', 'RightForeArm', 'forearm_r', 'lowerarm_r', 'mixamorigRightForeArm'],
      leftWrist: ['LeftHand', 'L_Hand', 'hand.L', 'LeftWrist', 'hand_l', 'mixamorigLeftHand'],
      rightWrist: ['RightHand', 'R_Hand', 'hand.R', 'RightWrist', 'hand_r', 'mixamorigRightHand'],
      leftHip: ['LeftHip', 'L_Hip', 'hip.L', 'LeftUpLeg', 'thigh_l', 'upperleg_l', 'mixamorigLeftUpLeg'],
      rightHip: ['RightHip', 'R_Hip', 'hip.R', 'RightUpLeg', 'thigh_r', 'upperleg_r', 'mixamorigRightUpLeg'],
      leftKnee: ['LeftKnee', 'L_Knee', 'knee.L', 'LeftLeg', 'shin_l', 'lowerleg_l', 'calf_l', 'mixamorigLeftLeg'],
      rightKnee: ['RightKnee', 'R_Knee', 'knee.R', 'RightLeg', 'shin_r', 'lowerleg_r', 'calf_r', 'mixamorigRightLeg'],
      leftAnkle: ['LeftAnkle', 'L_Ankle', 'ankle.L', 'LeftFoot', 'foot_l', 'mixamorigLeftFoot'],
      rightAnkle: ['RightAnkle', 'R_Ankle', 'ankle.R', 'RightFoot', 'foot_r', 'mixamorigRightFoot']
    };
    
    this.gltfBones = {};
    
    // Search through the model's skeleton
    gltf.scene.traverse((object) => {
      if (object.isBone || object.isObject3D) {
        const name = object.name;
        
        // Try to match bone names
        for (const [key, aliases] of Object.entries(commonBoneNames)) {
          for (const alias of aliases) {
            if (name.toLowerCase().includes(alias.toLowerCase())) {
              if (!this.gltfBones[key]) { // Only set if not already found
                this.gltfBones[key] = object;
                console.log(`✓ Matched bone: ${key} -> ${name}`);
              }
              break;
            }
          }
        }
      }
    });
    
    console.log('=== BONES FOUND ===');
    console.log('Total bones matched:', Object.keys(this.gltfBones).length);
    console.log('Bone mapping:', this.gltfBones);
    
    // If no bones found, try to find SkinnedMesh
    if (Object.keys(this.gltfBones).length === 0) {
      console.log('No bones found by name matching. Checking for SkinnedMesh...');
      gltf.scene.traverse((object) => {
        if (object.isSkinnedMesh) {
          console.log('Found SkinnedMesh:', object.name);
          console.log('Skeleton:', object.skeleton);
          if (object.skeleton && object.skeleton.bones) {
            console.log('Bones in skeleton:', object.skeleton.bones.length);
            object.skeleton.bones.forEach((bone, idx) => {
              console.log(`  Bone ${idx}: ${bone.name}`);
            });
          }
        }
      });
    }
  }
  
  createRobotCharacter() {
    this.characterModel = new THREE.Group();
    this.characterModel.name = 'robot';
    
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.9
    });
    
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5
    });
    
    // Head (cubic robot head)
    const headGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const head = new THREE.Mesh(headGeometry, metalMaterial);
    head.castShadow = true;
    head.position.set(0, 1.5, 0);
    this.bones.head = head;
    this.characterModel.add(head);
    
    // Eyes (glowing)
    const eyeGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeometry, glowMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, glowMaterial);
    leftEye.position.set(-0.07, 1.52, 0.12);
    rightEye.position.set(0.07, 1.52, 0.12);
    this.characterModel.add(leftEye, rightEye);
    
    // Body
    const torsoGeometry = new THREE.BoxGeometry(0.45, 0.6, 0.3);
    const torso = new THREE.Mesh(torsoGeometry, metalMaterial);
    torso.castShadow = true;
    torso.position.set(0, 1.1, 0);
    this.bones.torso = torso;
    this.characterModel.add(torso);
    
    // Power core (glowing chest)
    const coreGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const core = new THREE.Mesh(coreGeometry, glowMaterial);
    core.position.set(0, 1.1, 0.16);
    this.characterModel.add(core);
    
    // Hips
    const hipsGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.25);
    const hips = new THREE.Mesh(hipsGeometry, metalMaterial);
    hips.castShadow = true;
    hips.position.set(0, 0.75, 0);
    this.bones.hips = hips;
    this.characterModel.add(hips);
    
    this.createLimb('leftArm', new THREE.Vector3(-0.27, 1.3, 0), metalMaterial, glowMaterial, 0.35);
    this.createLimb('rightArm', new THREE.Vector3(0.27, 1.3, 0), metalMaterial, glowMaterial, 0.35);
    this.createLimb('leftLeg', new THREE.Vector3(-0.15, 0.65, 0), metalMaterial, glowMaterial, 0.45);
    this.createLimb('rightLeg', new THREE.Vector3(0.15, 0.65, 0), metalMaterial, glowMaterial, 0.45);
    
    this.scene.add(this.characterModel);
    this.characterMesh = this.characterModel;
  }
  
  createStickman() {
    this.characterModel = new THREE.Group();
    this.characterModel.name = 'stickman';
    
    const stickMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0xffff00,
      emissiveIntensity: 0.3
    });
    
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.2
    });
    
    // Very simple stick figure
    const headGeometry = new THREE.SphereGeometry(0.12, 12, 12);
    const head = new THREE.Mesh(headGeometry, jointMaterial);
    head.castShadow = true;
    head.position.set(0, 1.5, 0);
    this.bones.head = head;
    this.characterModel.add(head);
    
    const torsoGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const torso = new THREE.Mesh(torsoGeometry, stickMaterial);
    torso.castShadow = true;
    torso.position.set(0, 1.05, 0);
    this.bones.torso = torso;
    this.characterModel.add(torso);
    
    const hipsGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    const hips = new THREE.Mesh(hipsGeometry, jointMaterial);
    hips.castShadow = true;
    hips.position.set(0, 0.7, 0);
    this.bones.hips = hips;
    this.characterModel.add(hips);
    
    this.createLimb('leftArm', new THREE.Vector3(-0.15, 1.35, 0), stickMaterial, jointMaterial, 0.35);
    this.createLimb('rightArm', new THREE.Vector3(0.15, 1.35, 0), stickMaterial, jointMaterial, 0.35);
    this.createLimb('leftLeg', new THREE.Vector3(-0.1, 0.7, 0), stickMaterial, jointMaterial, 0.45);
    this.createLimb('rightLeg', new THREE.Vector3(0.1, 0.7, 0), stickMaterial, jointMaterial, 0.45);
    
    this.scene.add(this.characterModel);
    this.characterMesh = this.characterModel;
  }
  
  updateGLTFModelFromPose(landmarks, useWorldCoords) {
    // Helper function to get landmark position
    const getPos = (index) => {
      const lm = landmarks[index];
      if (useWorldCoords) {
        return new THREE.Vector3(-lm.x, -lm.y + 1.5, -lm.z);
      } else {
        return new THREE.Vector3(
          (lm.x - 0.5) * 2,
          -(lm.y - 0.5) * 2 + 1.5,
          -lm.z * 2
        );
      }
    };
    
    // MediaPipe landmark indices
    const NOSE = 0;
    const LEFT_SHOULDER = 11, RIGHT_SHOULDER = 12;
    const LEFT_ELBOW = 13, RIGHT_ELBOW = 14;
    const LEFT_WRIST = 15, RIGHT_WRIST = 16;
    const LEFT_HIP = 23, RIGHT_HIP = 24;
    const LEFT_KNEE = 25, RIGHT_KNEE = 26;
    const LEFT_ANKLE = 27, RIGHT_ANKLE = 28;
    
    // Calculate center point for positioning the whole model
    const hipCenter = getPos(LEFT_HIP).lerp(getPos(RIGHT_HIP), 0.5);
    
    // Position the entire model at the hip center
    if (this.characterModel) {
      this.characterModel.position.copy(hipCenter);
      this.characterModel.position.y -= 1.0; // Adjust so feet are on ground
    }
    
    // If we found bones, apply rotations
    if (Object.keys(this.gltfBones).length > 0) {
      console.log('Updating bones with pose data');
      
      // Helper to calculate rotation between two points
      const setLimbRotation = (bone, startPos, endPos) => {
        if (!bone) return;
        
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        if (length > 0.01) {
          direction.normalize();
          
          // Get current bone direction (usually points down Y)
          const boneDirection = new THREE.Vector3(0, 1, 0);
          
          // Calculate rotation quaternion
          const quaternion = new THREE.Quaternion();
          quaternion.setFromUnitVectors(boneDirection, direction);
          
          bone.quaternion.copy(quaternion);
        }
      };
      
      // Update head
      if (this.gltfBones.head) {
        const nosePos = getPos(NOSE);
        const shoulderCenter = getPos(LEFT_SHOULDER).lerp(getPos(RIGHT_SHOULDER), 0.5);
        setLimbRotation(this.gltfBones.head, shoulderCenter, nosePos);
      }
      
      // Update spine/torso
      if (this.gltfBones.spine) {
        const shoulderCenter = getPos(LEFT_SHOULDER).lerp(getPos(RIGHT_SHOULDER), 0.5);
        setLimbRotation(this.gltfBones.spine, hipCenter, shoulderCenter);
      }
      
      // Update arms
      if (this.gltfBones.leftShoulder) {
        setLimbRotation(this.gltfBones.leftShoulder, getPos(LEFT_SHOULDER), getPos(LEFT_ELBOW));
      }
      if (this.gltfBones.leftElbow) {
        setLimbRotation(this.gltfBones.leftElbow, getPos(LEFT_ELBOW), getPos(LEFT_WRIST));
      }
      if (this.gltfBones.rightShoulder) {
        setLimbRotation(this.gltfBones.rightShoulder, getPos(RIGHT_SHOULDER), getPos(RIGHT_ELBOW));
      }
      if (this.gltfBones.rightElbow) {
        setLimbRotation(this.gltfBones.rightElbow, getPos(RIGHT_ELBOW), getPos(RIGHT_WRIST));
      }
      
      // Update legs
      if (this.gltfBones.leftHip) {
        setLimbRotation(this.gltfBones.leftHip, getPos(LEFT_HIP), getPos(LEFT_KNEE));
      }
      if (this.gltfBones.leftKnee) {
        setLimbRotation(this.gltfBones.leftKnee, getPos(LEFT_KNEE), getPos(LEFT_ANKLE));
      }
      if (this.gltfBones.rightHip) {
        setLimbRotation(this.gltfBones.rightHip, getPos(RIGHT_HIP), getPos(RIGHT_KNEE));
      }
      if (this.gltfBones.rightKnee) {
        setLimbRotation(this.gltfBones.rightKnee, getPos(RIGHT_KNEE), getPos(RIGHT_ANKLE));
      }
    } else {
      console.warn('No bones found - model may not be rigged or bone names don\'t match');
    }
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
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
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize viewer
window.addEventListener('DOMContentLoaded', () => {
  new CharacterPoseViewer();
});
