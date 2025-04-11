// public/js/fogOfWar.js
export class FogOfWar {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.visibleHexes = new Set();
        this.fogMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        this.fogMeshes = {};

        this.visibilityRadius = 5; // Default visibility radius

        this.createToggleControl();
    }

    createToggleControl() {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-fog';
        toggleBtn.textContent = 'Toggle Fog of War';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.bottom = '10px';
        toggleBtn.style.right = '10px';
        toggleBtn.style.zIndex = '100';
        toggleBtn.style.padding = '8px';

        toggleBtn.addEventListener('click', () => {
            this.enabled = !this.enabled;
            this.updateFogOfWar();
        });

        document.body.appendChild(toggleBtn);
    }

    updateVisibility(characterPosition) {
        if (!this.enabled) return;

        this.visibleHexes.clear();

        const { q, r, s } = characterPosition;

        // Get all hexes within visibility radius
        const hexesInRange = this.game.hexGrid.getHexesInRange(q, r, s, this.visibilityRadius);

        for (const hex of hexesInRange) {
            // Check line of sight
            if (this.hasLineOfSight(q, r, s, hex.q, hex.r, hex.s)) {
                const hexId = this.game.hexGrid.getHexId(hex.q, hex.r, hex.s);
                this.visibleHexes.add(hexId);

                // Also add stacked hexes
                let level = 1;
                while (true) {
                    const stackId = `${hexId}:${level}`;
                    if (this.game.hexGrid.hexMeshes[stackId]) {
                        this.visibleHexes.add(stackId);
                        level++;
                    } else {
                        break;
                    }
                }
            }
        }

        // Update fog visualization
        this.updateFogOfWar();
    }

    hasLineOfSight(q1, r1, s1, q2, r2, s2) {
        // Simple line of sight implementation
        // In a real implementation, you'd want to check for obstacles along the line

        // Get interpolated hexes along the line
        const n = this.game.hexGrid.getDistance(q1, r1, s1, q2, r2, s2);
        const hexesOnLine = [];

        for (let i = 0; i <= n; i++) {
            const t = i / Math.max(1, n);

            // Lerp between the two points
            const q = Math.round(q1 * (1 - t) + q2 * t);
            const r = Math.round(r1 * (1 - t) + r2 * t);
            const s = Math.round(s1 * (1 - t) + s2 * t);

            hexesOnLine.push({ q, r, s });
        }

        // Check for blocking terrain
        for (let i = 1; i < hexesOnLine.length - 1; i++) {
            const { q, r, s } = hexesOnLine[i];
            const topHex = this.game.hexGrid.getTopHex(q, r, s);

            if (topHex && topHex.userData.type === 'mountain') {
                // Mountains block line of sight
                return false;
            }
        }

        return true;
    }

    updateFogOfWar() {
        if (!this.enabled) {
            // Remove all fog meshes when disabled
            for (const hexId in this.fogMeshes) {
                this.game.scene.remove(this.fogMeshes[hexId]);
            }
            this.fogMeshes = {};
            return;
        }

        // Create or update fog meshes for all hexes
        for (const hexId in this.game.hexGrid.hexMeshes) {
            const hexMesh = this.game.hexGrid.hexMeshes[hexId];

            // Skip if hex is visible
            if (this.visibleHexes.has(hexId)) {
                if (this.fogMeshes[hexId]) {
                    this.game.scene.remove(this.fogMeshes[hexId]);
                    delete this.fogMeshes[hexId];
                }
                continue;
            }

            // Create fog mesh if it doesn't exist
            if (!this.fogMeshes[hexId]) {
                const fogMesh = new THREE.Mesh(
                    this.game.hexGrid.hexGeometry,
                    this.fogMaterial
                );

                this.fogMeshes[hexId] = fogMesh;
                this.game.scene.add(fogMesh);
            }

            // Update fog mesh position to match hex
            this.fogMeshes[hexId].position.copy(hexMesh.position);
            // Add a small offset to avoid z-fighting
            this.fogMeshes[hexId].position.y += 0.02;
        }

        // Remove fog meshes for hexes that no longer exist
        for (const hexId in this.fogMeshes) {
            if (!this.game.hexGrid.hexMeshes[hexId]) {
                this.game.scene.remove(this.fogMeshes[hexId]);
                delete this.fogMeshes[hexId];
            }
        }
    }
}