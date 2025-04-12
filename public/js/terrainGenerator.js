// public/js/terrainGenerator.js
export class TerrainGenerator {
    constructor() {
        // Create new noise generators with random seeds
        this.elevationNoise = new SimplexNoise(Math.random());
        this.moistureNoise = new SimplexNoise(Math.random());
        this.temperatureNoise = new SimplexNoise(Math.random());

        // Default scale values for noise
        this.elevationScale = 0.01;
        this.moistureScale = 0.01;
        this.temperatureScale = 0.005;

        // Default terrain parameters
        this.seaLevel = 0.3;
        this.mountainLevel = 0.7;
        this.hillLevel = 0.5;
    }

    // Get noise value scaled to 0-1 range with multiple octaves for more detail
    getNoise(noise, x, y, scale, octaves = 4, persistence = 0.5) {
        let value = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += noise.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        // Normalize to 0-1
        return (value / maxValue + 1) / 2;
    }

    // Generate terrain type based on elevation, moisture, and temperature
    getTerrainType(elevation, moisture, temperature, options = {}) {
        const hillFrequency = options.hillFrequency || 0.5;

        if (elevation < this.seaLevel) {
            if (temperature < 0.2) return 'snow'; // Ice
            if (temperature > 0.8) return 'acid'; // Acid lakes in hot areas
            return 'water';
        }

        // Mountains - make these more rare or common based on hillFrequency
        if (elevation > this.mountainLevel + (1 - hillFrequency) * 0.1) {
            if (temperature < 0.3) return 'snow'; // Snow-capped mountains
            if (moisture > 0.7) return 'corrupted'; // Corrupted high peaks
            return 'mountain';
        }

        // Hills - adjust threshold based on hillFrequency
        if (elevation > this.hillLevel - (hillFrequency - 0.5) * 0.1) {
            if (moisture > 0.6) return 'forest'; // Forested hills
            if (temperature > 0.7) return 'desert'; // Desert highlands
            return 'mountain'; // Rocky hills
        }

        // Lowlands
        if (moisture > 0.7) {
            if (temperature > 0.7) return 'corrupted'; // Swamps
            return 'forest';
        }

        if (temperature > 0.7) {
            if (moisture < 0.3) return 'desert'; // Desert
            return 'grass'; // Savanna
        }

        if (temperature < 0.3) {
            if (moisture > 0.4) return 'snow'; // Tundra
            return 'grass'; // Cold plains
        }

        // Default
        return 'grass';
    }

    // Generate terrain data for a hexagonal grid
    generateTerrain(radius, options = {}) {
        // Apply custom options
        const opts = {
            elevationScale: options.elevationScale || this.elevationScale,
            moistureScale: options.moistureScale || this.moistureScale,
            temperatureScale: options.temperatureScale || this.temperatureScale,
            seaLevel: options.seaLevel || this.seaLevel,
            mountainLevel: options.mountainLevel || this.mountainLevel,
            hillLevel: options.hillLevel || this.hillLevel,
            seed: options.seed || Math.random()
        };

        // Set new seeds if provided
        if (options.seed) {
            this.elevationNoise = new SimplexNoise(options.seed);
            this.moistureNoise = new SimplexNoise(options.seed + 1);
            this.temperatureNoise = new SimplexNoise(options.seed + 2);
        }

        const terrain = {};

        // Generate terrain for hexagonal grid
        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);

            for (let r = r1; r <= r2; r++) {
                const s = -q - r;

                // Use cube coordinates for noise input
                // We can adjust these mappings to get different terrain patterns
                const nx = q * 0.866 + r * 0.866; // Adjusted for hex grid
                const ny = r * 1.5;

                // Get noise values
                const elevation = this.getNoise(this.elevationNoise, nx, ny, opts.elevationScale);
                const moisture = this.getNoise(this.moistureNoise, nx, ny, opts.moistureScale);
                const temperature = this.getNoise(this.temperatureNoise, nx, ny, opts.temperatureScale);

                // Determine terrain type
                const type = this.getTerrainType(elevation, moisture, temperature, {
                    hillFrequency: options.hillFrequency || 0.5
                });

                // Determine elevation levels (0-4)
                let elevationLevel = 0;

                if (elevation > opts.mountainLevel) {
                    // Mountains (elevationLevel 2-32)
                    // Scale to provide more range
                    elevationLevel = Math.floor((elevation - opts.mountainLevel) / (1 - opts.mountainLevel) * 30) + 2;
                } else if (elevation > opts.hillLevel) {
                    // Hills (elevationLevel 1)
                    elevationLevel = 1;
                }

                // Cap elevation level at 32 instead of 4
                elevationLevel = Math.min(elevationLevel, 32);

                // Create base hex
                const hexId = `${q},${r},${s}`;
                terrain[hexId] = {
                    q, r, s,
                    type,
                    elevation: 0 // Base elevation is always 0
                };

                // Create stacked hexes for elevation
                for (let level = 1; level <= elevationLevel; level++) {
                    const stackId = `${q},${r},${s}:${level}`;
                    terrain[stackId] = {
                        q, r, s,
                        type, // Same type for all stacked hexes
                        isStacked: true,
                        stackLevel: level,
                        stackHeight: level * 0.4 // Match your hexHeight
                    };
                }

                // Special features (lava pools, magic spots) with very low probability
                if (type === 'mountain' && Math.random() < 0.05) {
                    // Small chance of lava in mountains
                    const stackId = `${q},${r},${s}:${elevationLevel + 1}`;
                    terrain[stackId] = {
                        q, r, s,
                        type: 'lava',
                        isStacked: true,
                        stackLevel: elevationLevel + 1,
                        stackHeight: (elevationLevel + 1) * 0.4
                    };
                } else if (type === 'forest' && Math.random() < 0.03) {
                    // Small chance of magic in forests
                    const stackId = `${q},${r},${s}:${elevationLevel + 1}`;
                    terrain[stackId] = {
                        q, r, s,
                        type: 'magic',
                        isStacked: true,
                        stackLevel: elevationLevel + 1,
                        stackHeight: (elevationLevel + 1) * 0.4
                    };
                }
            }
        }
        console.log(`Generated terrain with ${Object.keys(terrain).length} total hexes`);
        console.log(`Base hexes: ${Object.keys(terrain).filter(id => !id.includes(':')).length}`);
        console.log(`Stacked hexes: ${Object.keys(terrain).filter(id => id.includes(':')).length}`);
        return terrain;
    }
}