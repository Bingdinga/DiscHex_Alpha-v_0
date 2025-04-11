// public/js/weatherSystem.js
export class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.weatherType = 'clear'; // clear, rain, snow, fog
        this.weatherIntensity = 0.5; // 0.0 to 1.0
        this.particles = [];
        this.particleCount = 1000;
        this.enabled = false;

        this.createToggleControl();
    }

    createToggleControl() {
        const weatherControl = document.createElement('div');
        weatherControl.id = 'weather-control';
        weatherControl.classList.add('weather-control');
        weatherControl.innerHTML = `
        <h3>Weather</h3>
        <select id="weather-type">
          <option value="clear">Clear</option>
          <option value="rain">Rain</option>
          <option value="snow">Snow</option>
          <option value="fog">Fog</option>
        </select>
        <div class="weather-slider">
          <label>Intensity: </label>
          <input type="range" id="weather-intensity" min="0" max="100" value="50">
        </div>
        <button id="toggle-weather">Enable Weather</button>
      `;

        document.body.appendChild(weatherControl);

        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
        .weather-control {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 15px;
          border-radius: 5px;
          width: 200px;
          z-index: 100;
        }
        
        .weather-slider {
          margin: 10px 0;
          display: flex;
          align-items: center;
        }
        
        .weather-slider input {
          flex: 1;
          margin-left: 10px;
        }
        
        #toggle-weather {
          width: 100%;
          padding: 5px;
          margin-top: 10px;
        }
        
        #weather-type {
          width: 100%;
          padding: 5px;
        }
      `;

        document.head.appendChild(style);

        // Set up event listeners
        const weatherTypeSelect = document.getElementById('weather-type');
        const intensitySlider = document.getElementById('weather-intensity');
        const toggleButton = document.getElementById('toggle-weather');

        weatherTypeSelect.addEventListener('change', () => {
            this.weatherType = weatherTypeSelect.value;
            this.updateWeather();

            // Broadcast to server
            if (this.enabled) {
                this.game.socketManager.updateWeather(this.weatherType, this.weatherIntensity);
            }
        });

        intensitySlider.addEventListener('input', () => {
            this.weatherIntensity = intensitySlider.value / 100;
            this.updateWeather();

            // Broadcast to server
            if (this.enabled) {
                this.game.socketManager.updateWeather(this.weatherType, this.weatherIntensity);
            }
        });

        toggleButton.addEventListener('click', () => {
            this.enabled = !this.enabled;
            toggleButton.textContent = this.enabled ? 'Disable Weather' : 'Enable Weather';

            if (this.enabled) {
                this.createWeatherParticles();
                this.game.socketManager.updateWeather(this.weatherType, this.weatherIntensity);
            } else {
                this.removeWeatherParticles();
                this.game.socketManager.updateWeather('clear', 0);
            }
        });
    }

    createWeatherParticles() {
        // Clear any existing particles
        this.removeWeatherParticles();

        // Create weather effect based on type
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = Math.floor(this.particleCount * this.weatherIntensity);
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        // Create particles in a volume above the grid
        const size = 20; // Size of the area
        const height = 15; // Height above the grid

        for (let i = 0; i < particleCount; i++) {
            // Random position in a box above the grid
            positions[i * 3] = (Math.random() - 0.5) * size * 2;
            positions[i * 3 + 1] = Math.random() * height + 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * size * 2;

            // Add velocity based on weather type
            if (this.weatherType === 'rain') {
                velocities.push({
                    x: 0,
                    y: -0.2 - Math.random() * 0.3 * this.weatherIntensity,
                    z: 0
                });
            } else if (this.weatherType === 'snow') {
                velocities.push({
                    x: (Math.random() - 0.5) * 0.02,
                    y: -0.05 - Math.random() * 0.05 * this.weatherIntensity,
                    z: (Math.random() - 0.5) * 0.02
                });
            } else if (this.weatherType === 'fog') {
                velocities.push({
                    x: (Math.random() - 0.5) * 0.01,
                    y: 0,
                    z: (Math.random() - 0.5) * 0.01
                });
            }
        }

        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        // Create material based on weather type
        let particleMaterial;

        if (this.weatherType === 'rain') {
            particleMaterial = new THREE.PointsMaterial({
                color: 0x7777ff,
                size: 0.1,
                transparent: true,
                opacity: 0.6
            });
        } else if (this.weatherType === 'snow') {
            particleMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.2,
                transparent: true,
                opacity: 0.8
            });
        } else if (this.weatherType === 'fog') {
            // For fog, use a different approach
            const fogColor = 0xcccccc;
            this.game.scene.fog = new THREE.FogExp2(fogColor, 0.02 * this.weatherIntensity);
            return;
        }

        // Create the particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        particleSystem.userData = { velocities };

        this.particles.push(particleSystem);
        this.game.scene.add(particleSystem);

        // Add animation update to the game loop
        this.game.weatherUpdateCallback = () => this.updateParticles();
    }

    removeWeatherParticles() {
        // Remove all particle systems
        this.particles.forEach(particle => {
            this.game.scene.remove(particle);
        });
        this.particles = [];

        // Remove fog if present
        this.game.scene.fog = null;

        // Remove update callback
        this.game.weatherUpdateCallback = null;
    }

    updateParticles() {
        if (!this.enabled || this.particles.length === 0) return;

        this.particles.forEach(particleSystem => {
            const positions = particleSystem.geometry.attributes.position.array;
            const velocities = particleSystem.userData.velocities;

            for (let i = 0; i < positions.length / 3; i++) {
                // Update position based on velocity
                positions[i * 3] += velocities[i].x;
                positions[i * 3 + 1] += velocities[i].y;
                positions[i * 3 + 2] += velocities[i].z;

                // Reset particles that fall below the grid
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3] = (Math.random() - 0.5) * 40;
                    positions[i * 3 + 1] = 20;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
                }
            }

            particleSystem.geometry.attributes.position.needsUpdate = true;
        });
    }

    updateWeather() {
        if (this.enabled) {
            this.removeWeatherParticles();
            this.createWeatherParticles();
        }
    }

    // Update weather from server
    setWeather(type, intensity) {
        // Update controls
        document.getElementById('weather-type').value = type;
        document.getElementById('weather-intensity').value = intensity * 100;

        // Update internal state
        this.weatherType = type;
        this.weatherIntensity = intensity;

        // Update weather effects if enabled
        if (this.enabled) {
            this.updateWeather();
        }
    }
}