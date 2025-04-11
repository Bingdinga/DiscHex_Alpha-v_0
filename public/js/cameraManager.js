// public/js/cameraManager.js
export class CameraManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.camera = null;
    this.controls = null;
    this.viewMode = 'orbital'; // 'orbital', 'birds-eye', 'first-person'
    
    this.initCamera();
    this.initControls();
  }
  
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);
  }
  
  initControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2.1; // Slightly less than 90 degrees to prevent going below the grid
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
  }
  
  setViewMode(mode, target = { x: 0, y: 0, z: 0 }) {
    this.viewMode = mode;
    
    switch (mode) {
      case 'orbital':
        this.camera.position.set(15, 15, 15);
        this.controls.enabled = true;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        break;
        
      case 'birds-eye':
        this.camera.position.set(target.x, 20, target.z);
        this.controls.enabled = true;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 6; // Restrict to top-down view
        break;
        
      case 'first-person':
        this.camera.position.set(target.x, target.y + 1.7, target.z); // Approximate human height
        this.controls.enabled = true;
        this.controls.minPolarAngle = Math.PI / 3; // Restrict looking too far up
        this.controls.maxPolarAngle = Math.PI / 1.8; // Restrict looking too far down
        break;
    }
    
    this.camera.lookAt(target.x, target.y, target.z);
    this.controls.target.set(target.x, target.y, target.z);
    this.controls.update();
  }
  
  update() {
    if (this.controls) {
      this.controls.update();
    }
  }
  
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}