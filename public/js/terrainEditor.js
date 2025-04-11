// public/js/terrainEditor.js
export class TerrainEditor {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.editorMode = 'type'; // 'type', 'elevation', 'stack'
    this.selectedType = 'grass';
    this.currentElevation = 0;

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
        <div class="editor-mode-tabs">
          <button class="mode-tab active" data-mode="type">Terrain Type</button>
          <button class="mode-tab" data-mode="elevation">Elevation</button>
          <button class="mode-tab" data-mode="stack">Stack</button>
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
        
        <div class="editor-content" id="elevation-editor">
          <div class="elevation-controls">
            <button id="elevation-down">-</button>
            <span id="elevation-value">0</span>
            <button id="elevation-up">+</button>
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
        
        <button id="toggle-editor">Toggle Editor</button>
        <button id="save-terrain">Save Terrain</button>
        <button id="load-terrain">Load Terrain</button>
      `;

    document.getElementById('ui-container').appendChild(editorPanel);

    // Add CSS for the editor
    const style = document.createElement('style');
    style.textContent = `
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

    toggleBtn.addEventListener('click', () => {
      this.active = !this.active;
      editorPanel.classList.toggle('active', this.active);
      this.game.hexGrid.clearSelection();
    });

    stackHexBtn.addEventListener('click', () => {
      if (this.game.hexGrid.selectedHex) {
        const { q, r, s } = this.game.hexGrid.selectedHex;
        const newHex = this.game.hexGrid.stackHex(q, r, s, this.selectedType, 0);

        if (newHex) {
          // Update stack info
          const stackedHexes = this.game.hexGrid.getStackedHexes(q, r, s);
          stackInfo.innerHTML = `Stacked hexes: ${stackedHexes.length}`;

          // Send update to server
          this.game.socketManager.updateHex(q, r, s, {
            type: this.selectedType,
            elevation: newHex.userData.elevation,
            isStacked: true,
            stackLevel: newHex.userData.stackLevel
          }, newHex.userData.stackLevel > 0 ? `${q},${r},${s}:${newHex.userData.stackLevel}` : undefined);
        }
      }
    });

    removeHexBtn.addEventListener('click', () => {
      if (this.game.hexGrid.selectedHex) {
        const { q, r, s } = this.game.hexGrid.selectedHex;
        const stackedHexes = this.game.hexGrid.getStackedHexes(q, r, s);

        if (stackedHexes.length > 0) {
          // Remove the top hex
          const topHex = stackedHexes[stackedHexes.length - 1];
          const hexId = topHex.userData.isStacked ?
            `${q},${r},${s}:${topHex.userData.stackLevel}` :
            `${q},${r},${s}`;

          const removed = this.game.hexGrid.removeHex(q, r, s, topHex.userData.stackLevel);

          if (removed) {
            // Update stack info
            const updatedStackedHexes = this.game.hexGrid.getStackedHexes(q, r, s);
            stackInfo.innerHTML = `Stacked hexes: ${updatedStackedHexes.length}`;

            // Send update to server
            this.game.socketManager.removeHex(hexId);
          }
        }
      }
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

        // If a hex is selected, update it
        if (this.game.hexGrid.selectedHex && this.editorMode === 'type') {
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

    // Elevation controls
    const elevationUp = document.getElementById('elevation-up');
    const elevationDown = document.getElementById('elevation-down');
    const elevationValue = document.getElementById('elevation-value');

    elevationUp.addEventListener('click', () => {
      this.currentElevation++;
      elevationValue.textContent = this.currentElevation;

      // If a hex is selected, update it
      if (this.game.hexGrid.selectedHex && this.editorMode === 'elevation') {
        this.updateSelectedHex({ elevation: this.currentElevation });
      }
    });

    elevationDown.addEventListener('click', () => {
      if (this.currentElevation > 0) {
        this.currentElevation--;
        elevationValue.textContent = this.currentElevation;

        // If a hex is selected, update it
        if (this.game.hexGrid.selectedHex && this.editorMode === 'elevation') {
          this.updateSelectedHex({ elevation: this.currentElevation });
        }
      }
    });

    // Set up raycaster for hex selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      if (!this.active) return;

      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster
      raycaster.setFromCamera(mouse, this.game.cameraManager.camera);

      // Filter objects to include only hex meshes
      const hexMeshes = Object.values(this.game.hexGrid.hexMeshes);

      // Find intersections
      const intersects = raycaster.intersectObjects(hexMeshes);

      if (intersects.length > 0) {
        // Get the first intersected hex
        const hexMesh = intersects[0].object;
        const { q, r, s } = hexMesh.userData.coordinates;

        // Select the hex
        this.game.hexGrid.selectHex(q, r, s);

        // If in appropriate mode, update the hex
        if (this.editorMode === 'type') {
          this.updateSelectedHex({ type: this.selectedType });
        } else if (this.editorMode === 'elevation') {
          this.updateSelectedHex({ elevation: this.currentElevation });
        }
      } else {
        // Deselect when clicking on empty space
        this.game.hexGrid.clearSelection();
      }
    });
  }

  updateSelectedHex(data) {
    if (!this.game.hexGrid.selectedHex) return;

    const { q, r, s } = this.game.hexGrid.selectedHex;
    const updatedData = this.game.hexGrid.updateSelectedHex(data);

    if (updatedData) {
      // Send update to server
      this.game.socketManager.updateHex(q, r, s, updatedData);
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
}