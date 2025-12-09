// Skeleton Renderer using Three.js
//------------------------------------------------------------------------------
// Creates and renders a 3D skeleton model that mirrors the detected pose
//------------------------------------------------------------------------------

export class SkeletonRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.skeleton = null;
    this.joints = [];
    this.bones = [];
    this.scale = 1.0;
    this.boneThickness = 0.05;
    this.showJoints = true;
    this.showBones = true;
  }

  async init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Create camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 1.5, 3);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    const canvas = document.getElementById(this.canvasId);
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true 
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Create skeleton
    this.createSkeleton();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start animation loop
    this.animate();
  }

  createSkeleton() {
    // Clear existing skeleton
    if (this.skeleton) {
      this.scene.remove(this.skeleton);
    }

    this.skeleton = new THREE.Group();
    this.joints = [];
    this.bones = [];

    // Create joint geometry (small spheres)
    const jointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const jointMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff6b6b,
      emissive: 0x330000
    });

    // Create bone geometry (cylinders)
    const boneGeometry = new THREE.CylinderGeometry(
      this.boneThickness,
      this.boneThickness,
      1,
      8
    );
    const boneMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4ecdc4,
      emissive: 0x003333
    });

    // Create joints for all 33 MediaPipe pose landmarks
    for (let i = 0; i < 33; i++) {
      const joint = new THREE.Mesh(jointGeometry, jointMaterial.clone());
      joint.visible = this.showJoints;
      this.joints.push(joint);
      this.skeleton.add(joint);
    }

    // Define bone connections (matching MediaPipe pose connections)
    const connections = [
      // Face (simplified - just key points)
      [0, 2], [0, 5],
      // Torso
      [11, 12], // Shoulders
      [11, 23], [12, 24], // Shoulders to hips
      [23, 24], // Hips
      // Left arm
      [11, 13], [13, 15], // Left shoulder to wrist
      // Right arm
      [12, 14], [14, 16], // Right shoulder to wrist
      // Left leg
      [23, 25], [25, 27], [27, 29], [27, 31], // Left hip to foot
      // Right leg
      [24, 26], [26, 28], [28, 30], [28, 32]  // Right hip to foot
    ];

    // Create bones
    connections.forEach(([start, end]) => {
      const bone = new THREE.Mesh(boneGeometry, boneMaterial.clone());
      bone.visible = this.showBones;
      this.bones.push({ mesh: bone, start, end });
      this.skeleton.add(bone);
    });

    // Apply initial scale
    this.skeleton.scale.set(this.scale, this.scale, this.scale);

    this.scene.add(this.skeleton);
  }

  updatePose(landmarks) {
    if (!landmarks || landmarks.length !== 33) return;

    // Update joint positions
    // MediaPipe landmarks are normalized (0-1), we need to convert to 3D space
    // Flip X and Y to match our coordinate system
    this.joints.forEach((joint, i) => {
      if (landmarks[i] && landmarks[i].visibility > 0.3) {
        // Convert normalized coordinates to 3D space
        // MediaPipe: x=left-right (0=left, 1=right), y=top-bottom (0=top, 1=bottom), z=depth
        const x = (landmarks[i].x - 0.5) * 2; // -1 to 1
        const y = (0.5 - landmarks[i].y) * 2; // 1 to -1 (flip Y)
        const z = -landmarks[i].z * 2; // Depth (negative for forward)

        joint.position.set(x * this.scale, y * this.scale, z * this.scale);
        joint.visible = this.showJoints;
      } else {
        joint.visible = false;
      }
    });

    // Update bone positions and rotations
    this.bones.forEach(({ mesh, start, end }) => {
      const startJoint = this.joints[start];
      const endJoint = this.joints[end];

      if (startJoint.visible && endJoint.visible) {
        // Calculate bone position (midpoint)
        const midX = (startJoint.position.x + endJoint.position.x) / 2;
        const midY = (startJoint.position.y + endJoint.position.y) / 2;
        const midZ = (startJoint.position.z + endJoint.position.z) / 2;
        mesh.position.set(midX, midY, midZ);

        // Calculate bone rotation
        const dx = endJoint.position.x - startJoint.position.x;
        const dy = endJoint.position.y - startJoint.position.y;
        const dz = endJoint.position.z - startJoint.position.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (length > 0) {
          mesh.scale.y = length;
          mesh.visible = this.showBones;

          // Calculate rotation to align bone with joint positions
          // Cylinder default orientation is along Y axis
          const direction = new THREE.Vector3(dx, dy, dz).normalize();
          const yAxis = new THREE.Vector3(0, 1, 0);
          const quaternion = new THREE.Quaternion();
          quaternion.setFromUnitVectors(yAxis, direction);
          mesh.quaternion.copy(quaternion);
        } else {
          mesh.visible = false;
        }
      } else {
        mesh.visible = false;
      }
    });
  }

  setScale(scale) {
    this.scale = scale;
    if (this.skeleton) {
      this.skeleton.scale.set(scale, scale, scale);
    }
  }

  setBoneThickness(thickness) {
    this.boneThickness = thickness;
    // Recreate skeleton with new bone thickness
    this.createSkeleton();
  }

  setShowJoints(show) {
    this.showJoints = show;
    this.joints.forEach(joint => {
      if (joint.userData.visible !== false) {
        joint.visible = show;
      }
    });
  }

  setShowBones(show) {
    this.showBones = show;
    this.bones.forEach(({ mesh }) => {
      if (mesh.userData.visible !== false) {
        mesh.visible = show;
      }
    });
  }

  onWindowResize() {
    const canvas = document.getElementById(this.canvasId);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Rotate camera around scene (optional - can be removed or made optional)
    // const time = Date.now() * 0.0005;
    // this.camera.position.x = Math.sin(time) * 3;
    // this.camera.position.z = Math.cos(time) * 3;
    // this.camera.lookAt(0, 0, 0);
    
    this.renderer.render(this.scene, this.camera);
  }
}

