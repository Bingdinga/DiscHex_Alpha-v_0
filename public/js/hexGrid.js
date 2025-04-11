// public/js/hexGrid.js
export class HexGrid {
    constructor(scene) {
        this.scene = scene;
        this.hexSize = 1;
        this.hexHeight = 0.2;
        this.hexMaterials = {};
        this.hexMeshes = {};
        this.selectedHex = null;

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

            // UVs
            uvs.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
            uvs.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
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
        // Create basic terrain type materials
        this.hexMaterials = {
            grass: new THREE.MeshStandardMaterial({ color: 0x7cfc00, flatShading: true }),
            forest: new THREE.MeshStandardMaterial({ color: 0x228b22, flatShading: true }),
            water: new THREE.MeshStandardMaterial({
                color: 0x1e90ff,
                flatShading: true,
                transparent: true,
                opacity: 0.8,
            }),
            mountain: new THREE.MeshStandardMaterial({ color: 0x808080, flatShading: true }),
            desert: new THREE.MeshStandardMaterial({ color: 0xf4a460, flatShading: true }),
            snow: new THREE.MeshStandardMaterial({ color: 0xfffafa, flatShading: true }),
            lava: new THREE.MeshStandardMaterial({
                color: 0xff4500,
                flatShading: true,
                emissive: 0xff0000,
                emissiveIntensity: 0.5,
            }),
            acid: new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                flatShading: true,
                transparent: true,
                opacity: 0.7,
            }),
            magic: new THREE.MeshStandardMaterial({
                color: 0x9370db,
                flatShading: true,
                emissive: 0x8a2be2,
                emissiveIntensity: 0.3,
            }),
            corrupted: new THREE.MeshStandardMaterial({ color: 0x4b0082, flatShading: true }),
        };
    }

    createDefaultGrid() {
        // Create a more interesting terrain with various types
        const radius = 8; // Larger radius for more space

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

        return hexMesh;
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

                // Remove existing hex
                if (this.hexMeshes[hexId]) {
                    this.scene.remove(this.hexMeshes[hexId]);
                    delete this.hexMeshes[hexId];
                }

                // Create new hex with the updated data
                if (hexData.isStacked) {
                    this.createHexWithId(hexData.q, hexData.r, hexData.s, hexData.type, hexData.elevation, hexId);
                } else {
                    this.createHex(hexData.q, hexData.r, hexData.s, hexData.type, hexData.elevation);
                }
            }
        } else if (terrainData.type && terrainData.type === 'hexRemove') {
            // Remove a hex
            if (terrainData.hexId && this.hexMeshes[terrainData.hexId]) {
                this.scene.remove(this.hexMeshes[terrainData.hexId]);
                delete this.hexMeshes[terrainData.hexId];
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
        // Create a wireframe hexagon for selection highlighting
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

    selectHex(q, r, s) {
        const hexId = this.getHexId(q, r, s);
        const hexMesh = this.hexMeshes[hexId];

        if (hexMesh) {
            this.selectedHex = { q, r, s };
            this.selectionMesh.position.copy(hexMesh.position);
            this.selectionMesh.position.y += 0.01; // Slightly above the hex to avoid z-fighting
            this.selectionMesh.visible = true;

            return hexMesh.userData;
        }

        return null;
    }

    clearSelection() {
        this.selectedHex = null;
        this.selectionMesh.visible = false;
    }

    updateSelectedHex(data) {
        if (!this.selectedHex) return;

        const { q, r, s } = this.selectedHex;
        const hexId = this.getHexId(q, r, s);
        const hexMesh = this.hexMeshes[hexId];

        if (hexMesh) {
            // Update the mesh material if type changed
            if (data.type && data.type !== hexMesh.userData.type) {
                hexMesh.material = this.hexMaterials[data.type];
                hexMesh.userData.type = data.type;
            }

            // Update elevation if changed
            if (data.elevation !== undefined && data.elevation !== hexMesh.userData.elevation) {
                hexMesh.position.y = data.elevation * this.hexHeight;
                hexMesh.userData.elevation = data.elevation;

                // Update selection mesh position
                this.selectionMesh.position.y = hexMesh.position.y + 0.01;
            }

            // Update any other properties
            Object.assign(hexMesh.userData, data);

            return hexMesh.userData;
        }

        return null;
    }

    // public/js/hexGrid.js
    // Add these methods to the HexGrid class

    // Add a method to stack hexes on top of each other
    stackHex(q, r, s, type, elevation) {
        // Check if there's already a hex at this position
        const hexId = this.getHexId(q, r, s);
        const existingHex = this.hexMeshes[hexId];

        if (existingHex) {
            // Find the highest elevation at this position
            let maxElevation = existingHex.userData.elevation;
            let stackId = hexId;
            let level = 1;

            // Check for stacked hexes
            while (true) {
                const nextStackId = `${hexId}:${level}`;
                if (this.hexMeshes[nextStackId]) {
                    maxElevation = this.hexMeshes[nextStackId].userData.elevation;
                    stackId = nextStackId;
                    level++;
                } else {
                    break;
                }
            }

            // Create a new hex on top of the stack
            const newStackId = `${hexId}:${level}`;
            return this.createHexWithId(q, r, s, type, maxElevation + 1, newStackId);
        } else {
            // No hex at this position, create a new one
            return this.createHex(q, r, s, type, elevation);
        }
    }

    // Create a hex with a specific ID (for stacked hexes)
    createHexWithId(q, r, s, type = 'grass', elevation = 0, hexId) {
        // Validate cube coordinates
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
            elevation,
            isStacked: hexId.includes(':'),
            stackLevel: hexId.includes(':') ? parseInt(hexId.split(':')[1]) : 0
        };

        this.hexMeshes[hexId] = hexMesh;
        this.scene.add(hexMesh);

        return hexMesh;
    }

    // Remove a hex at a specific position and level
    removeHex(q, r, s, level = 0) {
        const baseHexId = this.getHexId(q, r, s);
        const hexId = level > 0 ? `${baseHexId}:${level}` : baseHexId;

        if (this.hexMeshes[hexId]) {
            this.scene.remove(this.hexMeshes[hexId]);
            delete this.hexMeshes[hexId];
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

        // Clear existing hexes
        for (const hexId in this.hexMeshes) {
            this.scene.remove(this.hexMeshes[hexId]);
        }
        this.hexMeshes = {};

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