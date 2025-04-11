// public/js/terrainEditor.js
export class TerrainEditor {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.editorMode = 'type'; // 'type', 'stack'
    this.selectedType = 'grass';
    // this.currentElevation = 0;
    this.isProcessingStack = false;
    // Create the editor UI
    this.createEditorUI();

    // Create a separate, always-visible toggle button
    this.createToggleButton();

    // Set up event listeners
    this.setupEventListeners();
  }

  createEditorUI() {
    // Create editor panel
    const editorPanel = document.createElement('div');
    editorPanel.id = 'terrain-editor';
    editorPanel.classList.add('editor-panel');
    editorPanel.innerHTML = `
        <h3>Terrain Editor</h3>
        <div class="editor-tip">
          Hold Ctrl/Cmd to select multiple hexes
        </div>
        <div class="editor-mode-tabs">
          <button class="mode-tab active" data-mode="type">Terrain Type</button>
          <button class="mode-tab" data-mode="stack">Stack</button>
          <button class="mode-tab" data-mode="generate">Generate</button>
        </div>
        
        <div class="editor-content active" id="type-editor">
          <div class="terrain-types">
            <button class="terrain-type active" data-type="grass">Grass</button>
            <button class="terrain-type" data-type="forest">Forest</button>
            <button class="terrain-type" data-type="water">Water</button>
            <button class="terrain-type" data-type="mountain">Mountain</button>
            <button class="terrain-type" data-type="desert">Desert</button>
            <button class="terrain-type" data-type="snow">Snow</button>
            <button class="terrain-type" data-type="lava">Lava</button>
            <button class="terrain-type" data-type="acid">Acid</button>
            <button class="terrain-type" data-type="magic">Magic</button>
            <button class="terrain-type" data-type="corrupted">Corrupted</button>
          </div>
        </div>
        
        <div class="editor-content" id="stack-editor">
          <div class="stack-controls">
            <button id="stack-hex" class="stack-action">Stack Hex</button>
            <button id="remove-hex" class="stack-action">Remove Hex</button>
          </div>
          <div class="stack-info">
            <span>Select a hex to stack or remove</span>
          </div>
        </div>

        <div class="editor-content" id="generate-editor">
          <h4>Terrain Generation</h4>
          <div class="generation-controls">
            <div class="slider-control">
              <label>Map Size:</label>
              <input type="range" id="map-size" min="10" max="50" value="17">
              <span class="value-display">17</span>
            </div>
            <div class="slider-control">
              <label>Sea Level:</label>
              <input type="range" id="sea-level" min="0" max="100" value="30">
              <span class="value-display">0.3</span>
            </div>
            <div class="slider-control">
              <label>Hill Level:</label>
              <input type="range" id="hill-level" min="0" max="100" value="50">
              <span class="value-display">0.5</span>
            </div>
            <div class="slider-control">
              <label>Mountain Level:</label>
              <input type="range" id="mountain-level" min="0" max="100" value="70">
              <span class="value-display">0.7</span>
            </div>
            <div class="slider-control">
              <label>Feature Size:</label>
              <input type="range" id="feature-size" min="1" max="100" value="30">
              <span class="value-display">30</span>
            </div>
            <div class="slider-control">
              <label>Hill Frequency:</label>
              <input type="range" id="hill-frequency" min="1" max="100" value="50">
              <span class="value-display">50</span>
            </div>
            <div class="generation-buttons">
              <button id="random-seed-btn">Random Seed</button>
              <button id="generate-terrain-btn">Generate Terrain</button>
            </div>
          </div>
        </div>
        
        <button id="toggle-editor">Toggle Editor</button>
        <button id="save-terrain">Save Terrain</button>
        <button id="load-terrain">Load Terrain</button>
      `;

    document.getElementById('ui-container').appendChild(editorPanel);

    // Add CSS for the editor
    const style = document.createElement('style');
    style.textContent = `
        .editor-tip {
          font-size: 0.8em;
          color: #aaa;
          margin-bottom: 10px;
          text-align: center;
        }

        .generation-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .slider-control {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .slider-control label {
          width: 100px;
          font-size: 12px;
        }
        
        .slider-control input {
          flex: 1;
        }
        
        .value-display {
          width: 40px;
          text-align: right;
        }
        
        .generation-buttons {
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }
        
        .generation-buttons button {
          flex: 1;
        }

        .editor-panel {
            position: fixed;
            top: 60px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
            width: 250px;
            z-index: 999;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
          }
          
        .editor-panel.active {
          display: block;
        }
        
        .editor-mode-tabs {
          display: flex;
          margin-bottom: 10px;
        }
        
        .mode-tab {
          flex: 1;
          padding: 5px;
          background-color: #444;
          border: none;
          color: #ccc;
          cursor: pointer;
        }
        
        .mode-tab.active {
          background-color: #666;
          color: white;
          font-weight: bold;
        }
        
        .editor-content {
          display: none;
          margin-bottom: 15px;
        }
        
        .editor-content.active {
          display: block;
        }
        
        .terrain-types {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px;
        }
        
        .terrain-type {
          padding: 5px;
          border: none;
          cursor: pointer;
        }
        
        .terrain-type.active {
          font-weight: bold;
          border: 2px solid white;
        }
        
        .elevation-controls, .stack-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
        }
        
        .elevation-controls button {
          width: 30px;
          height: 30px;
          font-size: 18px;
          margin: 0 10px;
        }
        
        #elevation-value {
          font-weight: bold;
          min-width: 30px;
          text-align: center;
        }
        
        .stack-action {
          margin: 0 5px;
          padding: 5px 10px;
        }
        
        .stack-info {
          margin-top: 10px;
          font-size: 14px;
          text-align: center;
        }
        
        #save-terrain, #load-terrain {
          width: 100%;
          margin-top: 10px;
          padding: 5px;
        }
      `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Editor toggle
    const toggleBtn = document.getElementById('toggle-editor');
    const editorPanel = document.getElementById('terrain-editor');
    const stackHexBtn = document.getElementById('stack-hex');
    const removeHexBtn = document.getElementById('remove-hex');
    const stackInfo = document.querySelector('.stack-info');

    const mapSizeSlider = document.getElementById('map-size');
    const seaLevelSlider = document.getElementById('sea-level');
    const hillLevelSlider = document.getElementById('hill-level');
    const mountainLevelSlider = document.getElementById('mountain-level');
    const noiseScaleSlider = document.getElementById('noise-scale');
    const randomSeedBtn = document.getElementById('random-seed-btn');
    const generateTerrainBtn = document.getElementById('generate-terrain-btn');


    const updateSliderDisplay = (slider, valueDisplaySelector, factor = 1) => {
      // Make sure slider exists before attaching event listener
      if (!slider) return;

      // Find the value display element using a selector instead of nextElementSibling
      const valueDisplay = document.querySelector(valueDisplaySelector);
      if (!valueDisplay) return;

      slider.addEventListener('input', () => {
        const value = slider.value * factor;
        valueDisplay.textContent = value.toFixed(factor === 1 ? 0 : 2);
      });
    };

    updateSliderDisplay(document.getElementById('map-size'), '#map-size + .value-display');
    updateSliderDisplay(document.getElementById('sea-level'), '#sea-level + .value-display', 0.01);
    updateSliderDisplay(document.getElementById('hill-level'), '#hill-level + .value-display', 0.01);
    updateSliderDisplay(document.getElementById('mountain-level'), '#mountain-level + .value-display', 0.01);
    updateSliderDisplay(document.getElementById('feature-size'), '#feature-size + .value-display');
    updateSliderDisplay(document.getElementById('hill-frequency'), '#hill-frequency + .value-display', 0.01);

    // Generate terrain with random seed
    randomSeedBtn.addEventListener('click', () => {
      this.generateRandomSeed();
    });

    // Generate terrain with current settings
    generateTerrainBtn.addEventListener('click', () => {
      this.generateNewTerrain();
    });

    toggleBtn.addEventListener('click', () => {
      this.active = !this.active;
      editorPanel.classList.toggle('active', this.active);
      this.game.hexGrid.clearSelection();
    });

    stackHexBtn.addEventListener('click', (event) => {
      // Prevent double execution
      if (this.isProcessingStack) {
        console.log('Already processing a stack operation');
        return;
      }

      this.isProcessingStack = true;
      console.log('Stack button clicked');

      // Disable the button to visually indicate processing
      stackHexBtn.disabled = true;
      stackHexBtn.textContent = 'Stacking...';

      if (!this.game.hexGrid.selectedHexes || this.game.hexGrid.selectedHexes.size === 0) {
        this.isProcessingStack = false;
        stackHexBtn.disabled = false;
        stackHexBtn.textContent = 'Stack Hex';
        return;
      }

      try {
        // Get the selected hexes
        const selectedHexIds = Array.from(this.game.hexGrid.selectedHexes);

        // Process each selected hex
        selectedHexIds.forEach(hexId => {
          const hexMesh = this.game.hexGrid.hexMeshes[hexId];
          if (!hexMesh) return;

          const { q, r, s } = hexMesh.userData.coordinates;
          console.log(`Processing selected hex ${q},${r},${s}`);

          // Stack a new hex on top
          const newHex = this.game.hexGrid.stackHex(q, r, s, this.selectedType);

          if (newHex) {
            // Update stack info
            const stackedHexes = this.game.hexGrid.getStackedHexes(q, r, s);
            const stackInfo = document.querySelector('.stack-info');
            if (stackInfo) {
              stackInfo.innerHTML = `Stacked hexes: ${stackedHexes.length}`;
            }

            // Important: For stacked hexes, we need to pass the stack-specific hexId
            const newStackId = newHex.userData.stackLevel > 0
              ? `${q},${r},${s}:${newHex.userData.stackLevel}`
              : `${q},${r},${s}`;

            // Send update to server with the correct hexId
            this.game.socketManager.updateHex(q, r, s, {
              type: this.selectedType,
              isStacked: newHex.userData.isStacked,
              stackLevel: newHex.userData.stackLevel,
              stackHeight: newHex.position.y
            }, newStackId);
          }
        });
      } catch (error) {
        console.error('Error in stack operation:', error);
      } finally {
        // Re-enable the button with a delay to prevent double-clicks
        setTimeout(() => {
          this.isProcessingStack = false;
          stackHexBtn.disabled = false;
          stackHexBtn.textContent = 'Stack Hex';
        }, 300);
      }
    });

    removeHexBtn.addEventListener('click', () => {
      if (!this.game.hexGrid.selectedHexes || this.game.hexGrid.selectedHexes.size === 0) return;

      // Process each selected hex
      this.game.hexGrid.selectedHexes.forEach(hexId => {
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
        const removed = this.game.hexGrid.removeHex(q, r, s, stackLevel);

        if (removed) {
          // Update stack info
          const stackedHexes = this.game.hexGrid.getStackedHexes(q, r, s);
          const stackInfo = document.querySelector('.stack-info');
          if (stackInfo) {
            stackInfo.innerHTML = `Stacked hexes: ${stackedHexes.length}`;
          }

          // Send update to server
          this.game.socketManager.removeHex(hexId);
        }
      });

      // Clear selection since the selected hexes have been removed
      this.game.hexGrid.clearSelection();
    });

    // Mode tabs
    const modeTabs = document.querySelectorAll('.mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        this.editorMode = tab.dataset.mode;

        // Show the correct editor content
        document.querySelectorAll('.editor-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(`${this.editorMode}-editor`).classList.add('active');
      });
    });

    // Terrain type selection
    const terrainButtons = document.querySelectorAll('.terrain-type');
    terrainButtons.forEach(button => {
      button.addEventListener('click', () => {
        terrainButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        this.selectedType = button.dataset.type;

        // Explicitly apply changes to all selected hexes if in type mode
        if (this.editorMode === 'type') {
          this.updateSelectedHex({ type: this.selectedType });
        }
      });
    });

    // Save/load terrain buttons
    const saveTerrainBtn = document.getElementById('save-terrain');
    const loadTerrainBtn = document.getElementById('load-terrain');

    saveTerrainBtn.addEventListener('click', () => {
      const terrainData = this.game.hexGrid.serializeTerrain();
      const terrainJson = JSON.stringify(terrainData);

      // Create a download link
      const blob = new Blob([terrainJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'terrain.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    loadTerrainBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const terrainData = JSON.parse(e.target.result);
            this.game.hexGrid.loadTerrain(terrainData);

            // Send terrain update to server
            this.game.socketManager.updateFullTerrain(terrainData);
          } catch (error) {
            console.error('Error loading terrain:', error);
            alert('Error loading terrain file');
          }
        };

        reader.readAsText(file);
      };

      input.click();
    });

    // Set up raycaster for hex selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      if (!this.active) return;

      // Skip UI element clicks
      if (event.target.closest('.editor-panel') ||
        event.target.closest('#editor-toggle-btn') ||
        event.target.closest('#toggle-fog') ||
        event.target.closest('.turn-panel') ||
        event.target.closest('.dice-panel') ||
        event.target.closest('.weather-control')) {
        return;
      }

      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster
      raycaster.setFromCamera(mouse, this.game.cameraManager.camera);

      // Get all hex meshes, including stacked ones
      const hexMeshes = Object.values(this.game.hexGrid.hexMeshes);

      // Find intersections
      const intersects = raycaster.intersectObjects(hexMeshes);

      if (intersects.length > 0) {
        // Get the first intersected hex
        const hexMesh = intersects[0].object;
        const { q, r, s } = hexMesh.userData.coordinates;

        // Get the hex ID to correctly identify which hex in the stack was clicked
        let hexId;
        for (const id in this.game.hexGrid.hexMeshes) {
          if (this.game.hexGrid.hexMeshes[id] === hexMesh) {
            hexId = id;
            break;
          }
        }

        if (hexId) {
          // Check if control key is pressed for multi-select
          const multiSelect = event.ctrlKey || event.metaKey;

          // Select the specific hex that was clicked
          if (hexId.includes(':')) {
            // For stacked hexes, we need to pass the stack level
            const stackLevel = parseInt(hexId.split(':')[1]);
            this.game.hexGrid.selectStackedHex(q, r, s, stackLevel, multiSelect);
          } else {
            // For base hexes
            this.game.hexGrid.selectHex(q, r, s, multiSelect);
          }
        }
      } else if (!event.ctrlKey && !event.metaKey) {
        // Only clear selection when clicking empty space without control key
        this.game.hexGrid.clearSelection();
      }
    });
  }

  updateSelectedHex(data) {
    // Get all selected hexes
    const selectedHexMeshes = this.game.hexGrid.getSelectedHexes();

    if (selectedHexMeshes.length === 0) return;

    // Update each selected hex
    for (const hexMesh of selectedHexMeshes) {
      const { q, r, s } = hexMesh.userData.coordinates;
      const hexId = this.game.hexGrid.getHexId(q, r, s);

      // Apply updates to the hex in the grid
      const updatedData = this.game.hexGrid.updateSelectedHex(data);

      if (updatedData) {
        // Send update to server for each hex
        this.game.socketManager.updateHex(q, r, s, updatedData);
      }
    }
  }

  createToggleButton() {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'editor-toggle-btn';
    toggleBtn.textContent = 'Terrain Editor';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.top = '10px';
    toggleBtn.style.right = '10px';
    toggleBtn.style.zIndex = '1000';
    toggleBtn.style.padding = '8px 12px';
    toggleBtn.style.backgroundColor = '#444';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = 'none';
    toggleBtn.style.borderRadius = '4px';
    toggleBtn.style.cursor = 'pointer';

    document.body.appendChild(toggleBtn);

    // Set up click event
    toggleBtn.addEventListener('click', () => {
      this.active = !this.active;
      document.getElementById('terrain-editor').classList.toggle('active', this.active);
      toggleBtn.textContent = this.active ? 'Hide Editor' : 'Terrain Editor';
    });
  }

  generateRandomSeed() {
    this.currentSeed = Math.random() * 1000;
    this.generateNewTerrain();
  }

  generateNewTerrain() {
    const mapSize = parseInt(document.getElementById('map-size').value);
    const seaLevel = parseFloat(document.getElementById('sea-level').value) / 100;
    const hillLevel = parseFloat(document.getElementById('hill-level').value) / 100;
    const mountainLevel = parseFloat(document.getElementById('mountain-level').value) / 100;

    const featureSize = parseInt(document.getElementById('feature-size').value);
    const hillFrequency = parseInt(document.getElementById('hill-frequency').value) / 100;

    const noiseScale = 0.1 / (featureSize / 10);

    // Generate new terrain
    const options = {
      radius: mapSize,
      seaLevel,
      hillLevel,
      mountainLevel,
      elevationScale: noiseScale,
      moistureScale: noiseScale * 0.8,
      temperatureScale: noiseScale * 0.6,
      hillFrequency: hillFrequency,
      seed: this.currentSeed || Math.random() * 1000
    };

    console.log("Generating terrain with options:", options);

    // Clear current terrain
    for (const hexId in this.game.hexGrid.hexMeshes) {
      this.game.scene.remove(this.game.hexGrid.hexMeshes[hexId]);
      if (this.game.hexGrid.wireframeMeshes[hexId]) {
        this.game.scene.remove(this.game.hexGrid.wireframeMeshes[hexId]);
      }
    }
    this.game.hexGrid.hexMeshes = {};
    this.game.hexGrid.wireframeMeshes = {};

    // Generate new terrain
    this.game.hexGrid.createDefaultGrid(options);

    // Send full terrain update to server
    const terrainData = this.game.hexGrid.serializeTerrain();
    this.game.socketManager.updateFullTerrain(terrainData);
  }
}