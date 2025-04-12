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
    this.setupKeyboardShortcuts();

    // Start animation loop
    this.animate();
  }

  onWindowResize() {
    this.cameraManager.camera.aspect = window.innerWidth / window.innerHeight;
    this.cameraManager.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (event) => {
      // Delete key pressed
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only process if the terrain editor is active
        if (!this.terrainEditor.active) return;

        // Skip if no hexes are selected
        if (!this.hexGrid.selectedHexes || this.hexGrid.selectedHexes.size === 0) return;

        // Process each selected hex
        this.hexGrid.selectedHexes.forEach(hexId => {
          // Extract q, r, s and potentially the stackLevel
          let q, r, s, stackLevel = 0;

          if (hexId.includes(':')) {
            // This is a stacked hex
            const [baseId, level] = hexId.split(':');
            const coords = baseId.split(',');
            q = parseInt(coords[0]);
            r = parseInt(coords[1]);
            s = parseInt(coords[2]);
            stackLevel = parseInt(level);
          } else {
            // This is a base hex
            const coords = hexId.split(',');
            q = parseInt(coords[0]);
            r = parseInt(coords[1]);
            s = parseInt(coords[2]);
          }

          // Remove the hex
          const removed = this.hexGrid.removeHex(q, r, s, stackLevel);

          if (removed) {
            // Send update to server
            this.socketManager.removeHex(hexId);
          }
        });

        // Clear selection since the selected hexes have been removed
        this.hexGrid.clearSelection();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Control' || event.key === 'Meta') {
        // Disable camera controls when Ctrl/Cmd is pressed
        if (this.cameraManager && this.cameraManager.controls) {
          this.cameraManager.controls.enableRotate = false;
          this.cameraManager.controls.enablePan = false;
          this.cameraManager.controls.enableZoom = false;
        }
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Control' || event.key === 'Meta') {
        // Re-enable camera controls when Ctrl/Cmd is released
        if (this.cameraManager && this.cameraManager.controls) {
          this.cameraManager.controls.enableRotate = true;
          this.cameraManager.controls.enablePan = true;
          this.cameraManager.controls.enableZoom = true;
        }
      }
    });

  }

  setupHexClickListener() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let lastSelectedHex = null;
    let isCtrlPressed = false;
    // Track already selected hexes to avoid deselecting them
    let processedHexes = new Set();

    // Track control key state
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Control' || event.key === 'Meta') {
        isCtrlPressed = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Control' || event.key === 'Meta') {
        isCtrlPressed = false;
        isDragging = false;
        lastSelectedHex = null;
        // Clear the processed hexes when control is released
        processedHexes.clear();
      }
    });

    // Track mouse down for drag selection
    window.addEventListener('mousedown', (event) => {
      // Only initiate drag if Ctrl/Cmd key is pressed and it's a left click
      if (isCtrlPressed && event.button === 0) {
        isDragging = true;

        // Clear the processed hexes set when starting a new drag
        processedHexes.clear();

        // Prevent the default behavior to avoid camera movement
        event.preventDefault();
      }
    });

    // Track mouse up to end drag selection
    window.addEventListener('mouseup', (event) => {
      if (isDragging) {
        isDragging = false;
        lastSelectedHex = null;
        // Clear the processed hexes set when ending a drag
        processedHexes.clear();
      }
    });

    // Track mouse movement for drag selection
    window.addEventListener('mousemove', (event) => {
      if (isDragging && isCtrlPressed) {
        // Skip if terrain editor is not active
        if (!this.terrainEditor.active) return;

        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster
        raycaster.setFromCamera(mouse, this.cameraManager.camera);

        // Get all hex meshes
        const hexMeshes = Object.values(this.hexGrid.hexMeshes);

        // Find intersections
        const intersects = raycaster.intersectObjects(hexMeshes);

        if (intersects.length > 0) {
          // Get the intersected hex
          const hexMesh = intersects[0].object;

          // Skip if this is the same hex we just processed
          if (lastSelectedHex === hexMesh) return;

          lastSelectedHex = hexMesh;

          const { q, r, s } = hexMesh.userData.coordinates;

          // Get the hex ID to correctly identify which hex in the stack was clicked
          let hexId;
          for (const id in this.hexGrid.hexMeshes) {
            if (this.hexGrid.hexMeshes[id] === hexMesh) {
              hexId = id;
              break;
            }
          }

          if (hexId) {
            // Check if this hex is already in our processed set
            if (processedHexes.has(hexId)) {
              return; // Skip if we've already processed this hex
            }

            // Add to our processed set
            processedHexes.add(hexId);

            // Check if the hex is already in the selection
            const isAlreadySelected = this.hexGrid.selectedHexes &&
              this.hexGrid.selectedHexes.has(hexId);

            // Only add to selection, don't remove
            if (!isAlreadySelected) {
              if (hexId.includes(':')) {
                // For stacked hexes, we need to pass the stack level
                const stackLevel = parseInt(hexId.split(':')[1]);
                this.hexGrid.selectStackedHex(q, r, s, stackLevel, true);
              } else {
                // For base hexes
                this.hexGrid.selectHex(q, r, s, true);
              }
            }
          }
        }
      }
    });

    // Keep the original click handler for individual selections
    window.addEventListener('click', (event) => {
      // Skip if terrain editor is active (since your original code has this check)
      if (this.terrainEditor.active) return;

      // Skip if we're dragging
      if (isDragging) return;

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

      // Send the generated terrain to the server
      const terrainData = this.hexGrid.serializeTerrain();
      if (this.socketManager && this.roomId) {
        console.log('Sending generated terrain to server');
        this.socketManager.updateFullTerrain(terrainData);
      }
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

window.addEventListener('DOMContentLoaded', () => {
  // Dynamically import Three.js and related modules
  const threeScript = document.createElement('script');
  threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js';
  threeScript.onload = () => {
    // Load SimplexNoise after Three.js
    const simplexNoiseScript = document.createElement('script');
    simplexNoiseScript.src = 'https://cdn.jsdelivr.net/npm/simplex-noise@2.4.0/simplex-noise.min.js';
    simplexNoiseScript.onload = () => {
      // Load OrbitControls after SimplexNoise
      const orbitControlsScript = document.createElement('script');
      orbitControlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js';
      orbitControlsScript.onload = () => {
        new Game();
      };
      document.head.appendChild(orbitControlsScript);
    };
    document.head.appendChild(simplexNoiseScript);
  };
  document.head.appendChild(threeScript);
});