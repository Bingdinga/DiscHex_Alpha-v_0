// public/js/main.js
import { HexGrid } from './hexGrid.js';
import { CameraManager } from './cameraManager.js';
import { SocketManager } from './socketManager.js';
import { UI } from './ui.js';
import { TerrainEditor } from './terrainEditor.js';
import { CharacterManager } from './characterManager.js';
import { FogOfWar } from './fogOfWar.js';
import { DiceSystem } from './diceSystem.js';
import { TurnSystem } from './turnSystem.js';
import { WeatherSystem } from './weatherSystem.js';
import { WireframeToggle } from './wireframeToggle.js';

class Game {
  constructor() {
    this.hexGrid = null;
    this.cameraManager = null;
    this.socketManager = null;
    this.ui = null;
    this.terrainEditor = null;
    this.characterManager = null;
    this.fogOfWar = null;
    this.diceSystem = null;
    this.turnSystem = null;
    this.scene = null;
    this.renderer = null;
    this.roomId = null;
    this.userId = null;
    this.weatherSystem = null;
    this.weatherUpdateCallback = null;
    this.wireframeToggle = null;

    this.init();
  }

  init() {
    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    // Initialize components
    this.hexGrid = new HexGrid(this.scene);
    this.terrainEditor = new TerrainEditor(this);
    this.cameraManager = new CameraManager(this.renderer);
    this.socketManager = new SocketManager(this);
    this.characterManager = new CharacterManager(this);
    this.ui = new UI(this);
    this.fogOfWar = new FogOfWar(this);
    this.diceSystem = new DiceSystem(this);
    this.turnSystem = new TurnSystem(this);
    this.wireframeToggle = new WireframeToggle(this);

    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.setupHexClickListener();

    // Start animation loop
    this.animate();
  }

  onWindowResize() {
    this.cameraManager.camera.aspect = window.innerWidth / window.innerHeight;
    this.cameraManager.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupHexClickListener() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      // Skip if terrain editor is active
      if (this.terrainEditor.active) return;

      // Skip if no local character or not in a room
      if (!this.characterManager.localCharacter || !this.roomId) return;

      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster
      raycaster.setFromCamera(mouse, this.cameraManager.camera);

      // Filter objects to include only hex meshes
      const hexMeshes = Object.values(this.hexGrid.hexMeshes);

      // Find intersections
      const intersects = raycaster.intersectObjects(hexMeshes);

      if (intersects.length > 0) {
        // Get the intersected hex
        const hexMesh = intersects[0].object;
        const { q, r, s } = hexMesh.userData.coordinates;

        // Try to move character to this hex
        this.characterManager.moveLocalCharacter(q, r, s);
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Update components
    this.cameraManager.update();

    // Animate water and lava textures
    const time = Date.now() * 0.001; // Time in seconds
    if (this.hexGrid.hexMaterials.water.map) {
      this.hexGrid.hexMaterials.water.map.offset.y = Math.sin(time) * 0.05;
    }
    if (this.hexGrid.hexMaterials.lava.map) {
      this.hexGrid.hexMaterials.lava.map.offset.x = Math.sin(time * 0.5) * 0.05;
      this.hexGrid.hexMaterials.lava.map.offset.y = Math.cos(time * 0.5) * 0.05;
    }

    // Update fog of war if a local character exists
    if (this.characterManager && this.characterManager.localCharacter) {
      this.fogOfWar.updateVisibility(this.characterManager.localCharacter.position);
    }

    // Update weather particles if callback exists
    if (this.weatherUpdateCallback) {
      this.weatherUpdateCallback();
    }

    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  updateState(state) {
    console.log('Updating game state:', state);

    // Update terrain if provided
    if (state.terrain && Object.keys(state.terrain).length > 0) {
      console.log(`Loading ${Object.keys(state.terrain).length} terrain hexes`);
      this.hexGrid.loadTerrain(state.terrain);
    } else {
      console.log('No terrain data in state, using default terrain');
      this.hexGrid.createDefaultGrid();
    }

    // Update characters
    if (state.users) {
      // Create the local character if it doesn't exist
      if (!this.characterManager.localCharacter) {
        this.characterManager.createLocalCharacter(this.userId);
      }

      // Create or update remote characters
      for (const userId in state.users) {
        if (userId !== this.userId) {
          const user = state.users[userId];
          let character = this.characterManager.characters[userId];

          if (!character) {
            character = this.characterManager.createRemoteCharacter(userId);
          }

          character.placeOnHex(user.position.q, user.position.r, user.position.s);
        }
      }

      // Remove characters that are no longer in the room
      for (const characterId in this.characterManager.characters) {
        if (!state.users[characterId]) {
          this.characterManager.removeCharacter(characterId);
        }
      }
    }

    // Update combat state if present
    if (state.combat && state.combat.active) {
      this.turnSystem.updateFromServer(
        state.combat.turnOrder[state.combat.currentTurnIndex].id,
        state.combat.turnOrder,
        state.combat.actionPoints
      );
    }

    // Update weather if present
    if (state.gameSettings && state.gameSettings.weatherType && this.weatherSystem) {
      this.weatherSystem.setWeather(
        state.gameSettings.weatherType,
        state.gameSettings.weatherIntensity || 0
      );
    }
  }

  createRoom() {
    if (this.socketManager) {
      this.socketManager.createRoom();
    } else {
      console.error('Socket manager not initialized');
    }
  }

}

// Wait for Three.js to load
window.addEventListener('DOMContentLoaded', () => {
  // Dynamically import Three.js and related modules
  const threeScript = document.createElement('script');
  threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js';
  threeScript.onload = () => {
    // Load OrbitControls after Three.js
    const orbitControlsScript = document.createElement('script');
    orbitControlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js';
    orbitControlsScript.onload = () => {
      new Game();
    };
    document.head.appendChild(orbitControlsScript);
  };
  document.head.appendChild(threeScript);
});