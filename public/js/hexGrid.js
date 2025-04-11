// public/js/hexGrid.js
export class HexGrid {
    constructor(scene) {
        this.scene = scene;
        this.hexSize = 1;
        this.hexHeight = 0.4;
        this.hexMaterials = {};
        this.hexMeshes = {};

        this.wireframeMeshes = {}; // Store wireframe meshes
        this.wireframeVisible = false; // Track wireframe visibility
        this.wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 1.5,
            transparent: false,
            opacity: 1.0
        });


        this.selectedHexes = new Set(); // Store multiple selected hexes
        this.selectionMeshes = {}; // Store selection meshes by hex ID

        // Initialize the geometry first
        this.initGeometry();

        // Create materials 
        this.createBasicMaterials();

        // Now create the selection mesh after geometry is initialized
        this.selectionMesh = this.createSelectionMesh();

        // Create the default grid
        this.createDefaultGrid();
    }

    initGeometry() {
        // Create a hexagonal prism geometry
        const vertices = [];
        const indices = [];
        const uvs = [];

        // Create a flat hexagon
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            vertices.push(
                this.hexSize * Math.cos(angle),
                0,
                this.hexSize * Math.sin(angle)
            );

            // Same hexagon but raised
            vertices.push(
                this.hexSize * Math.cos(angle),
                this.hexHeight,
                this.hexSize * Math.sin(angle)
            );

            // Better UV mapping for hexagonal top and bottom faces
            // Map each vertex to a position in the texture
            const u = 0.5 + 0.4 * Math.cos(angle);  // Reduced from 0.5 to 0.4 to avoid texture edge artifacts
            const v = 0.5 + 0.4 * Math.sin(angle);  // Reduced from 0.5 to 0.4 to avoid texture edge artifacts
            uvs.push(u, v); // Bottom vertex UV
            uvs.push(u, v);
        }

        // Create the top and bottom faces
        for (let i = 0; i < 6; i++) {
            // Bottom face (counter-clockwise)
            if (i < 4) {
                indices.push(0, (i + 1) * 2, (i + 2) * 2);
            }

            // Top face (clockwise)
            if (i < 4) {
                indices.push(1, (i + 2) * 2 + 1, (i + 1) * 2 + 1);
            }

            // Side faces
            const nextI = (i + 1) % 6;
            // For side faces, we want UV coordinates that map the texture horizontally
            // around the hex side

            // Bottom left vertex of side face
            const u1 = i / 6;
            const v1 = 0;

            // Top left vertex of side face
            const u2 = i / 6;
            const v2 = 1;

            // Top right vertex of side face
            const u3 = (i + 1) / 6;
            const v3 = 1;

            // Bottom right vertex of side face
            const u4 = (i + 1) / 6;
            const v4 = 0;

            // We need to add these UVs to our UV array, but we need to account for
            // the existing UVs for top and bottom faces

            // Simplification: For now, we'll keep using the existing UVs for simplicity
            // In a complete implementation, you would create a new BufferGeometry for each face
            // or use an indexed BufferGeometry with custom UV attributes

            indices.push(i * 2, i * 2 + 1, nextI * 2 + 1);
            indices.push(i * 2, nextI * 2 + 1, nextI * 2);
        }

        // Create the geometry
        this.hexGeometry = new THREE.BufferGeometry();
        this.hexGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.hexGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        this.hexGeometry.setIndex(indices);

        // Calculate vertex normals
        this.hexGeometry.computeVertexNormals();
    }

    createBasicMaterials() {

        const textureLoader = new THREE.TextureLoader();

        const grassTexture = textureLoader.load('textures/terrain/moss_block.png');
        const forestTexture = textureLoader.load('textures/terrain/azalea_leaves.png');
        const waterTexture = textureLoader.load('textures/terrain/blue_wool.png');
        const mountainTexture = textureLoader.load('textures/terrain/cobblestone.png');
        const desertTexture = textureLoader.load('textures/terrain/sand.png');
        const snowTexture = textureLoader.load('textures/terrain/snow.png');
        const lavaTexture = textureLoader.load('textures/terrain/magma.png');
        const acidTexture = textureLoader.load('textures/terrain/slime_block.png');
        const magicTexture = textureLoader.load('textures/terrain/amethyst_block.png');
        const corruptedTexture = textureLoader.load('textures/terrain/netherrack.png');

        const setupTexture = (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            // Smaller repeat values make the texture appear "zoomed out"
            // Adjust these values based on your texture size and desired look
            texture.repeat.set(3, 3);
            return texture;
        };

        // Apply configuration to all textures
        [grassTexture, forestTexture, waterTexture, mountainTexture, desertTexture,
            snowTexture, lavaTexture, acidTexture, magicTexture, corruptedTexture]
            .forEach(setupTexture);

        // Create materials with textures
        this.hexMaterials = {
            grass: new THREE.MeshStandardMaterial({
                map: grassTexture,
                flatShading: true
            }),
            forest: new THREE.MeshStandardMaterial({
                map: forestTexture,
                flatShading: true
            }),
            water: new THREE.MeshStandardMaterial({
                map: waterTexture,
                flatShading: true,
                transparent: true,
                opacity: 0.8,
            }),
            mountain: new THREE.MeshStandardMaterial({
                map: mountainTexture,
                flatShading: true
            }),
            desert: new THREE.MeshStandardMaterial({
                map: desertTexture,
                flatShading: true
            }),
            snow: new THREE.MeshStandardMaterial({
                map: snowTexture,
                flatShading: true
            }),
            lava: new THREE.MeshStandardMaterial({
                map: lavaTexture,
                flatShading: true,
                emissive: 0xff0000,
                emissiveIntensity: 0.5,
            }),
            acid: new THREE.MeshStandardMaterial({
                map: acidTexture,
                flatShading: true,
                transparent: true,
                opacity: 0.7,
            }),
            magic: new THREE.MeshStandardMaterial({
                map: magicTexture,
                flatShading: true,
                emissive: 0x8a2be2,
                emissiveIntensity: 0.3,
            }),
            corrupted: new THREE.MeshStandardMaterial({
                map: corruptedTexture,
                flatShading: true
            }),
        };
    }

    createDefaultGrid() {
        // Create a more interesting terrain with various types
        const radius = 17; // Larger radius for more space

        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);

            for (let r = r1; r <= r2; r++) {
                const s = -q - r;

                // Determine terrain type based on position
                let terrainType = 'grass'; // Default type
                let elevation = 0;

                // Calculate distance from center for terrain distribution
                const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));

                // Simple noise function for terrain variety
                const noise = Math.sin(q * 0.5) * Math.cos(r * 0.5) * Math.sin(s * 0.3);

                // Create some mountains at medium distance
                if (dist > 3 && dist < 6 && noise > 0.2) {
                    terrainType = 'mountain';
                    elevation = Math.floor(noise * 3) + 1;
                }
                // Create a water area in one quadrant
                else if (q < -2 && r > 2 && noise < 0) {
                    terrainType = 'water';
                }
                // Create some forest patches
                else if ((q > 0 && r < 0) || (noise > 0.1 && dist < 5)) {
                    terrainType = 'forest';
                }
                // Create a desert area in another quadrant
                else if (q > 3 && r < -1) {
                    terrainType = 'desert';
                }
                // Create a small snow area
                else if (q < -3 && r < -3 && noise > 0) {
                    terrainType = 'snow';
                }
                // Add a small lava area
                else if (dist > 6 && q > 3 && r > 1) {
                    terrainType = 'lava';
                }

                // Create the hex with determined type and elevation
                this.createHex(q, r, s, terrainType, elevation);
            }
        }
    }

    createHex(q, r, s, type = 'grass', elevation = 0) {
        // Validate cube coordinates (q + r + s should equal 0)
        if (q + r + s !== 0) {
            console.error('Invalid cube coordinates:', q, r, s);
            return;
        }

        const position = this.cubeToWorld(q, r, s);
        const hexMesh = new THREE.Mesh(this.hexGeometry, this.hexMaterials[type]);

        hexMesh.position.set(position.x, elevation * this.hexHeight, position.z);
        hexMesh.userData = {
            coordinates: { q, r, s },
            type,
            elevation
        };

        const hexId = this.getHexId(q, r, s);
        this.hexMeshes[hexId] = hexMesh;
        this.scene.add(hexMesh);

        this.createWireframeForHex(hexMesh, hexId);

        return hexMesh;
    }

    createWireframeForHex(hexMesh, hexId) {
        // Create wireframe geometry from hex geometry
        const wireframeGeometry = new THREE.EdgesGeometry(this.hexGeometry);
        const wireframe = new THREE.LineSegments(wireframeGeometry, this.wireframeMaterial);

        // Copy position from the hex mesh
        wireframe.position.copy(hexMesh.position);

        // Set to not visible initially unless wireframes are toggled on
        wireframe.visible = this.wireframeVisible || false;

        // Store a reference back to the parent hex for synchronization
        wireframe.userData = {
            parentHexId: hexId
        };

        // Add to scene and store in wireframeMeshes
        this.scene.add(wireframe);
        this.wireframeMeshes[hexId] = wireframe;

        return wireframe;
    }

    getHex(q, r, s) {
        const hexId = this.getHexId(q, r, s);
        return this.hexMeshes[hexId];
    }

    getHexId(q, r, s) {
        return `${q},${r},${s}`;
    }

    cubeToWorld(q, r, s) {
        // Convert cube coordinates to world position
        const x = this.hexSize * (3 / 2 * q);
        const z = this.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);

        return { x, z };
    }

    worldToCube(x, z) {
        // Convert world position to cube coordinates (approximate)
        const q = (2 / 3) * x / this.hexSize;
        const r = (-1 / 3) * x / this.hexSize + (Math.sqrt(3) / 3) * z / this.hexSize;
        const s = -q - r;

        // Round to nearest hex
        return this.cubeRound(q, r, s);
    }

    cubeRound(q, r, s) {
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);

        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        } else {
            rs = -rq - rr;
        }

        return { q: rq, r: rr, s: rs };
    }

    updateTerrain(terrainData) {
        if (!terrainData) {
            console.error('No terrain data provided to updateTerrain');
            return;
        }

        // Process update based on type
        if (terrainData.type && terrainData.type === 'hexUpdate') {
            // Single hex update
            if (terrainData.hexId && terrainData.hexData) {
                const hexId = terrainData.hexId;
                const hexData = terrainData.hexData;

                // Validate cube coordinates
                if (hexData.q === undefined || hexData.r === undefined || hexData.s === undefined) {
                    console.error('Invalid cube coordinates in hexData:', hexData);
                    return;
                }

                // Remove existing hex and its wireframe
                if (this.hexMeshes[hexId]) {
                    this.scene.remove(this.hexMeshes[hexId]);
                    delete this.hexMeshes[hexId];

                    // Also remove wireframe
                    if (this.wireframeMeshes[hexId]) {
                        this.scene.remove(this.wireframeMeshes[hexId]);
                        delete this.wireframeMeshes[hexId];
                    }
                }

                // Create new hex with the updated data
                let newHex;
                if (hexData.isStacked) {
                    newHex = this.createHexWithId(hexData.q, hexData.r, hexData.s, hexData.type,
                        hexData.stackHeight || hexData.stackLevel * this.hexHeight,
                        hexId);
                } else {
                    newHex = this.createHex(hexData.q, hexData.r, hexData.s, hexData.type, hexData.elevation);
                }

                // Log debug info
                if (newHex) {
                    console.log(`Updated hex ${hexId}, visible: ${newHex.visible}`);
                }
            }
        } else if (terrainData.type && terrainData.type === 'hexRemove') {
            // Remove a hex
            if (terrainData.hexId) {
                this.removeHexById(terrainData.hexId);
            }
        } else if (terrainData.type && terrainData.type === 'fullUpdate' && terrainData.terrainData) {
            // Full terrain update
            this.loadTerrain(terrainData.terrainData);
        } else {
            // Assume it's a direct terrain object (for backward compatibility)
            this.loadTerrain(terrainData);
        }
    }

    getNeighbors(q, r, s) {
        const directions = [
            { q: 1, r: -1, s: 0 },
            { q: 1, r: 0, s: -1 },
            { q: 0, r: 1, s: -1 },
            { q: -1, r: 1, s: 0 },
            { q: -1, r: 0, s: 1 },
            { q: 0, r: -1, s: 1 }
        ];

        return directions.map(dir => ({
            q: q + dir.q,
            r: r + dir.r,
            s: s + dir.s
        }));
    }

    getHexesInRange(q, r, s, range) {
        const results = [];

        for (let dq = -range; dq <= range; dq++) {
            for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
                const ds = -dq - dr;
                results.push({
                    q: q + dq,
                    r: r + dr,
                    s: s + ds
                });
            }
        }

        return results;
    }

    getDistance(q1, r1, s1, q2, r2, s2) {
        return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
    }

    createSelectionMesh() {
        const geometry = new THREE.EdgesGeometry(this.hexGeometry);
        const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        const wireframe = new THREE.LineSegments(geometry, material);
        wireframe.visible = false;
        this.scene.add(wireframe);

        return wireframe;
    }

    selectHex(q, r, s, multiSelect = false) {
        const hexId = this.getHexId(q, r, s);
        const hexMesh = this.hexMeshes[hexId];

        if (!hexMesh) return null;

        if (!multiSelect) {
            // Clear previous selections if not multi-selecting
            this.clearSelection();
        }

        // If this hex is already selected and we're multi-selecting, deselect it
        if (multiSelect && this.selectedHexes.has(hexId)) {
            this.deselectHex(hexId);
            return null;
        }

        // Add to selected set
        this.selectedHexes.add(hexId);

        // Create selection mesh if it doesn't exist
        if (!this.selectionMeshes[hexId]) {
            const selectionMesh = this.createSelectionMesh();
            this.selectionMeshes[hexId] = selectionMesh;
        }

        // Position the selection mesh
        const selectionMesh = this.selectionMeshes[hexId];
        selectionMesh.position.copy(hexMesh.position);
        selectionMesh.position.y += 0.01; // Slightly above the hex
        selectionMesh.visible = true;

        // For backward compatibility, set selectedHex to the last one selected
        this.selectedHex = { q, r, s };

        return hexMesh.userData;
    }

    clearSelection() {
        this.selectedHexes.forEach(hexId => {
            if (this.selectionMeshes[hexId]) {
                this.selectionMeshes[hexId].visible = false;
            }
        });

        this.selectedHexes.clear();
        this.selectedHex = null;
    }

    deselectHex(hexId) {
        if (this.selectionMeshes[hexId]) {
            this.selectionMeshes[hexId].visible = false;
            this.selectedHexes.delete(hexId);
        }
    }

    getSelectedHexes() {
        const selectedHexMeshes = [];
        this.selectedHexes.forEach(hexId => {
            if (this.hexMeshes[hexId]) {
                selectedHexMeshes.push(this.hexMeshes[hexId]);
            }
        });
        return selectedHexMeshes;
    }

    updateSelectedHex(data) {
        if (!this.selectedHex) return null;

        const { q, r, s } = this.selectedHex;
        const level = this.selectedHex.level || 0;
        const hexId = level > 0 ? `${this.getHexId(q, r, s)}:${level}` : this.getHexId(q, r, s);
        const hexMesh = this.hexMeshes[hexId];

        if (!hexMesh) return null;

        // Handle elevation changes with special logic
        if (data.elevation !== undefined && data.elevation !== hexMesh.userData.elevation) {
            const newElevation = data.elevation;
            const oldElevation = hexMesh.userData.elevation;

            // Check if there are hexes above this one
            if (level > 0) {
                // This is a stacked hex
                const aboveStackId = `${this.getHexId(q, r, s)}:${level + 1}`;
                const aboveHex = this.hexMeshes[aboveStackId];

                if (aboveHex) {
                    // There's a hex above this one
                    if (newElevation >= aboveHex.userData.elevation) {
                        // If we're raising to or above the hex above, we need to remove the hex above
                        this.removeHex(q, r, s, level + 1);
                    } else {
                        // Otherwise, adjust the gap between them
                        aboveHex.position.y = newElevation * this.hexHeight + this.hexHeight;
                    }
                }
            } else {
                // This is a base hex
                const aboveStackId = `${this.getHexId(q, r, s)}:1`;
                const aboveHex = this.hexMeshes[aboveStackId];

                if (aboveHex) {
                    // There's a hex above this one
                    if (newElevation >= aboveHex.userData.elevation) {
                        // If we're raising to or above the hex above, we need to remove the hex above
                        this.removeHex(q, r, s, 1);
                    } else {
                        // Otherwise, adjust the gap between them
                        aboveHex.position.y = newElevation * this.hexHeight + this.hexHeight;
                    }
                }
            }

            // Update the hex's elevation
            hexMesh.position.y = newElevation * this.hexHeight;
            hexMesh.userData.elevation = newElevation;

            // Update wireframe position if it exists
            if (this.wireframeMeshes && this.wireframeMeshes[hexId]) {
                this.wireframeMeshes[hexId].position.copy(hexMesh.position);
            }

            // Update selection mesh position
            if (this.selectionMeshes && this.selectionMeshes[hexId]) {
                this.selectionMeshes[hexId].position.y = hexMesh.position.y + 0.01;
            }
        }

        // Update the mesh material if type changed
        if (data.type && data.type !== hexMesh.userData.type) {
            hexMesh.material = this.hexMaterials[data.type];
            hexMesh.userData.type = data.type;
        }

        // Update any other properties
        Object.assign(hexMesh.userData, data);

        return hexMesh.userData;
    }

    selectStackedHex(q, r, s, level, multiSelect = false) {
        const baseHexId = this.getHexId(q, r, s);
        const hexId = level > 0 ? `${baseHexId}:${level}` : baseHexId;
        const hexMesh = this.hexMeshes[hexId];

        if (!hexMesh) return null;

        if (!multiSelect) {
            // Clear previous selections if not multi-selecting
            this.clearSelection();
        }

        // If this hex is already selected and we're multi-selecting, deselect it
        if (multiSelect && this.selectedHexes && this.selectedHexes.has(hexId)) {
            this.deselectHex(hexId);
            return null;
        }

        // Ensure selectedHexes is initialized
        if (!this.selectedHexes) {
            this.selectedHexes = new Set();
        }

        // Add to selected set
        this.selectedHexes.add(hexId);

        // Ensure selectionMeshes is initialized
        if (!this.selectionMeshes) {
            this.selectionMeshes = {};
        }

        // Create selection mesh if it doesn't exist
        if (!this.selectionMeshes[hexId]) {
            const selectionMesh = this.createSelectionMesh();
            this.selectionMeshes[hexId] = selectionMesh;
        }

        // Position the selection mesh
        const selectionMesh = this.selectionMeshes[hexId];
        selectionMesh.position.copy(hexMesh.position);
        selectionMesh.position.y += 0.01; // Slightly above the hex
        selectionMesh.visible = true;

        // For backward compatibility, set selectedHex to the last one selected
        this.selectedHex = { q, r, s, level };

        return hexMesh.userData;
    }

    // Add a method to stack hexes on top of each other
    stackHex(q, r, s, type) {
        console.log(`Stacking hex at ${q},${r},${s}`);

        // Check if there's already a hex at this position
        const hexId = this.getHexId(q, r, s);
        const baseHex = this.hexMeshes[hexId];

        if (!baseHex) {
            console.log(`No base hex found at ${q},${r},${s}, creating one`);
            // Create a base hex if it doesn't exist
            return this.createHex(q, r, s, type, 0);
        }

        // Find the highest hex in the stack
        let highestLevel = 0;
        let highestHex = baseHex;

        // Check for existing stacked hexes
        for (let level = 1; ; level++) {
            const stackId = `${hexId}:${level}`;
            if (this.hexMeshes[stackId]) {
                highestLevel = level;
                highestHex = this.hexMeshes[stackId];
            } else {
                break;
            }
        }

        console.log(`Found highest hex at level ${highestLevel}`);

        // Create one new hex on top of the stack
        const newStackLevel = highestLevel + 1;
        const newStackId = `${hexId}:${newStackLevel}`;

        // Calculate height based on stack level
        const newHeight = newStackLevel * this.hexHeight;
        console.log(`Creating new hex at level ${newStackLevel}, height ${newHeight}`);

        // Create the new hex
        const newHex = this.createHexWithId(q, r, s, type, newHeight, newStackId);

        // Ensure visibility
        if (newHex) {
            newHex.visible = true;
            if (this.wireframeMeshes[newStackId]) {
                this.wireframeMeshes[newStackId].visible = this.wireframeVisible;
            }
        }

        return newHex;
    }

    // Create a hex with a specific ID (for stacked hexes)
    createHexWithId(q, r, s, type = 'grass', height = 0, hexId) {
        // Validate cube coordinates
        if (q + r + s !== 0) {
            console.error('Invalid cube coordinates:', q, r, s);
            return;
        }

        const position = this.cubeToWorld(q, r, s);
        const hexMesh = new THREE.Mesh(this.hexGeometry, this.hexMaterials[type]);

        // Set position based on height
        hexMesh.position.set(position.x, height, position.z);

        // Parse the stack level from the hexId
        const isStacked = hexId && hexId.includes(':');
        const stackLevel = isStacked ? parseInt(hexId.split(':')[1]) : 0;

        console.log(`Creating hex ${hexId} at position ${position.x}, ${height}, ${position.z}`);

        // Ensure the mesh is visible
        hexMesh.visible = true;

        hexMesh.userData = {
            coordinates: { q, r, s },
            type,
            isStacked,
            stackLevel,
            stackHeight: height
        };

        // Add to hexMeshes collection
        this.hexMeshes[hexId] = hexMesh;
        this.scene.add(hexMesh);

        // Create wireframe for this hex
        const wireframe = this.createWireframeForHex(hexMesh, hexId);

        // Ensure wireframe is visible only if global wireframe setting allows
        if (wireframe) {
            wireframe.visible = this.wireframeVisible;
        }

        return hexMesh;
    }

    toggleWireframes(visible) {
        // If visible parameter is not provided, toggle the current state
        if (visible === undefined) {
            this.wireframeVisible = !this.wireframeVisible;
        } else {
            this.wireframeVisible = visible;
        }

        console.log(`Toggling wireframes to ${this.wireframeVisible ? 'visible' : 'hidden'}`);

        // Update visibility of all wireframes
        if (this.wireframeMeshes) {
            for (const hexId in this.wireframeMeshes) {
                if (this.wireframeMeshes[hexId]) {
                    this.wireframeMeshes[hexId].visible = this.wireframeVisible;
                }
            }
        }

        return this.wireframeVisible;
    }

    // Remove a hex at a specific position and level
    removeHex(q, r, s, level = 0) {
        const baseHexId = this.getHexId(q, r, s);
        const hexId = level > 0 ? `${baseHexId}:${level}` : baseHexId;

        // Remove hex mesh
        if (this.hexMeshes[hexId]) {
            this.scene.remove(this.hexMeshes[hexId]);
            delete this.hexMeshes[hexId];

            // Remove wireframe mesh
            if (this.wireframeMeshes && this.wireframeMeshes[hexId]) {
                this.scene.remove(this.wireframeMeshes[hexId]);
                delete this.wireframeMeshes[hexId];
            }

            // Remove selection mesh if exists
            if (this.selectionMeshes && this.selectionMeshes[hexId]) {
                this.scene.remove(this.selectionMeshes[hexId]);
                delete this.selectionMeshes[hexId];
            }

            // Update selectedHexes if needed
            if (this.selectedHexes && this.selectedHexes.has(hexId)) {
                this.selectedHexes.delete(hexId);
            }

            return true;
        }
        return false;
    }

    removeHexById(hexId) {
        if (this.hexMeshes[hexId]) {
            this.scene.remove(this.hexMeshes[hexId]);
            delete this.hexMeshes[hexId];

            // Also remove wireframe
            if (this.wireframeMeshes[hexId]) {
                this.scene.remove(this.wireframeMeshes[hexId]);
                delete this.wireframeMeshes[hexId];
            }

            // Also remove selection mesh if it exists
            if (this.selectionMeshes && this.selectionMeshes[hexId]) {
                this.scene.remove(this.selectionMeshes[hexId]);
                delete this.selectionMeshes[hexId];
            }

            // Update selectedHexes if needed
            if (this.selectedHexes && this.selectedHexes.has(hexId)) {
                this.selectedHexes.delete(hexId);
            }

            console.log(`Removed hex and wireframe for ${hexId}`);
            return true;
        }
        return false;
    }

    // Get all hexes stacked at a position
    getStackedHexes(q, r, s) {
        const baseHexId = this.getHexId(q, r, s);
        const stackedHexes = [];

        // Check for base hex
        if (this.hexMeshes[baseHexId]) {
            stackedHexes.push(this.hexMeshes[baseHexId]);
        }

        // Check for stacked hexes
        let level = 1;
        while (true) {
            const stackId = `${baseHexId}:${level}`;
            if (this.hexMeshes[stackId]) {
                stackedHexes.push(this.hexMeshes[stackId]);
                level++;
            } else {
                break;
            }
        }

        return stackedHexes;
    }

    // Get the top hex at a position
    getTopHex(q, r, s) {
        const stackedHexes = this.getStackedHexes(q, r, s);
        return stackedHexes.length > 0 ? stackedHexes[stackedHexes.length - 1] : null;
    }

    // Serialize all terrain to a JSON object
    serializeTerrain() {
        const terrainData = {};

        for (const hexId in this.hexMeshes) {
            const hexMesh = this.hexMeshes[hexId];
            const { coordinates, type, elevation, isStacked, stackLevel } = hexMesh.userData;

            terrainData[hexId] = {
                q: coordinates.q,
                r: coordinates.r,
                s: coordinates.s,
                type,
                elevation,
                isStacked: isStacked || false,
                stackLevel: stackLevel || 0
            };
        }

        return terrainData;
    }

    // Load terrain from a serialized JSON object
    loadTerrain(terrainData) {
        console.log(`Loading terrain with ${Object.keys(terrainData).length} hexes`);

        // Clear existing hexes and wireframes
        for (const hexId in this.hexMeshes) {
            this.scene.remove(this.hexMeshes[hexId]);
            if (this.wireframeMeshes[hexId]) {
                this.scene.remove(this.wireframeMeshes[hexId]);
            }
        }
        this.hexMeshes = {};
        this.wireframeMeshes = {};

        // Create new hexes from terrain data
        for (const hexId in terrainData) {
            const hex = terrainData[hexId];

            // Handle stacked hexes
            if (hex.isStacked) {
                this.createHexWithId(hex.q, hex.r, hex.s, hex.type, hex.elevation, hexId);
            } else {
                this.createHex(hex.q, hex.r, hex.s, hex.type, hex.elevation);
            }
        }

        console.log(`Created ${Object.keys(this.hexMeshes).length} hex meshes`);
    }
}