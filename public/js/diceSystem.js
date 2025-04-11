// public/js/diceSystem.js
export class DiceSystem {
    constructor(game) {
        this.game = game;
        this.diceTypes = {
            d4: { sides: 4, mesh: null, result: null },
            d6: { sides: 6, mesh: null, result: null },
            d8: { sides: 8, mesh: null, result: null },
            d10: { sides: 10, mesh: null, result: null },
            d12: { sides: 12, mesh: null, result: null },
            d20: { sides: 20, mesh: null, result: null },
            d100: { sides: 100, mesh: null, result: null }
        };

        this.activeDice = [];
        this.isRolling = false;
        this.rollDuration = 2000; // ms

        this.loadDiceModels();
        this.createDicePanel();
    }

    loadDiceModels() {
        // In a real implementation, you'd load 3D models for each die
        // For simplicity, we'll create basic geometric shapes

        // d4 (tetrahedron)
        const d4Geometry = new THREE.TetrahedronGeometry(0.7);
        const d4Material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.diceTypes.d4.mesh = new THREE.Mesh(d4Geometry, d4Material);

        // d6 (cube)
        const d6Geometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const d6Material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        this.diceTypes.d6.mesh = new THREE.Mesh(d6Geometry, d6Material);

        // d8 (octahedron)
        const d8Geometry = new THREE.OctahedronGeometry(0.7);
        const d8Material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.diceTypes.d8.mesh = new THREE.Mesh(d8Geometry, d8Material);

        // d10 (modified dodecahedron)
        const d10Geometry = new THREE.DodecahedronGeometry(0.7);
        const d10Material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
        this.diceTypes.d10.mesh = new THREE.Mesh(d10Geometry, d10Material);

        // d12 (dodecahedron)
        const d12Geometry = new THREE.DodecahedronGeometry(0.7);
        const d12Material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.diceTypes.d12.mesh = new THREE.Mesh(d12Geometry, d12Material);

        // d20 (icosahedron)
        const d20Geometry = new THREE.IcosahedronGeometry(0.7);
        const d20Material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
        this.diceTypes.d20.mesh = new THREE.Mesh(d20Geometry, d20Material);

        // d100 (two d10s)
        const d100Geometry = new THREE.DodecahedronGeometry(0.7);
        const d100Material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.diceTypes.d100.mesh = new THREE.Mesh(d100Geometry, d100Material);

        // Hide all dice initially
        for (const type in this.diceTypes) {
            this.diceTypes[type].mesh.visible = false;
            this.game.scene.add(this.diceTypes[type].mesh);
        }
    }

    // public/js/diceSystem.js (continued)
    createDicePanel() {
        const dicePanel = document.createElement('div');
        dicePanel.id = 'dice-panel';
        dicePanel.classList.add('dice-panel');
        dicePanel.innerHTML = `
      <h3>Dice Roller</h3>
      <div class="dice-buttons">
        <button class="dice-btn" data-type="d4">D4</button>
        <button class="dice-btn" data-type="d6">D6</button>
        <button class="dice-btn" data-type="d8">D8</button>
        <button class="dice-btn" data-type="d10">D10</button>
        <button class="dice-btn" data-type="d12">D12</button>
        <button class="dice-btn" data-type="d20">D20</button>
        <button class="dice-btn" data-type="d100">D100</button>
      </div>
      <div class="roll-controls">
        <input type="number" id="dice-count" value="1" min="1" max="10">
        <button id="roll-dice-btn">Roll</button>
        <button id="clear-dice-btn">Clear</button>
      </div>
      <div class="roll-results">
        <div id="dice-results"></div>
        <div id="dice-total"></div>
      </div>
      <button id="toggle-dice-panel">Hide</button>
    `;

        document.body.appendChild(dicePanel);

        // Add CSS for the dice panel
        const style = document.createElement('style');
        style.textContent = `
      .dice-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 15px;
        border-radius: 5px;
        width: 250px;
        z-index: 100;
      }
      
      .dice-buttons {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        margin-bottom: 10px;
      }
      
      .dice-btn {
        padding: 5px;
        cursor: pointer;
      }
      
      .roll-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      #dice-count {
        width: 50px;
        text-align: center;
      }
      
      .roll-results {
        margin-top: 10px;
        min-height: 60px;
        border-top: 1px solid #555;
        padding-top: 10px;
      }
      
      #dice-results {
        margin-bottom: 5px;
      }
      
      #dice-total {
        font-weight: bold;
        font-size: 18px;
      }
      
      #toggle-dice-panel {
        width: 100%;
        margin-top: 10px;
      }
      
      .dice-panel.minimized {
        height: 40px;
        overflow: hidden;
      }
    `;

        document.head.appendChild(style);

        // Set up event listeners
        const diceButtons = document.querySelectorAll('.dice-btn');
        const rollButton = document.getElementById('roll-dice-btn');
        const clearButton = document.getElementById('clear-dice-btn');
        const toggleButton = document.getElementById('toggle-dice-panel');
        const diceCount = document.getElementById('dice-count');

        diceButtons.forEach(button => {
            button.addEventListener('click', () => {
                const diceType = button.dataset.type;
                const count = parseInt(diceCount.value) || 1;
                this.rollDice(diceType, count);
            });
        });

        rollButton.addEventListener('click', () => {
            if (this.activeDice.length > 0) {
                this.rollActiveDice();
            } else {
                alert('Select at least one dice type first');
            }
        });

        clearButton.addEventListener('click', () => {
            this.clearDice();
        });

        toggleButton.addEventListener('click', () => {
            dicePanel.classList.toggle('minimized');
            toggleButton.textContent = dicePanel.classList.contains('minimized') ? 'Show' : 'Hide';
        });
    }

    rollDice(type, count = 1) {
        // Maximum 10 dice at once
        count = Math.min(count, 10);

        // Clear previous dice
        this.clearDice();

        // Position in a circle around the center
        const radius = 3;
        const angleStep = (2 * Math.PI) / count;

        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);

            // Clone the original mesh
            const diceMesh = this.diceTypes[type].mesh.clone();
            diceMesh.position.set(x, 5, z); // Start position above the table
            diceMesh.visible = true;
            diceMesh.diceType = type;

            // Add to the scene
            this.game.scene.add(diceMesh);
            this.activeDice.push(diceMesh);
        }

        // Start rolling animation
        this.rollActiveDice();
    }

    rollActiveDice() {
        if (this.isRolling) return;
        this.isRolling = true;

        // Reset results display
        document.getElementById('dice-results').textContent = 'Rolling...';
        document.getElementById('dice-total').textContent = '';

        // Apply random rotational velocity to each die
        this.activeDice.forEach(dice => {
            dice.userData = {
                rotationSpeed: {
                    x: Math.random() * 10 - 5,
                    y: Math.random() * 10 - 5,
                    z: Math.random() * 10 - 5
                },
                verticalSpeed: -9.8, // Gravity
                verticalPosition: dice.position.y,
                result: null
            };
        });

        // Start animation
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.rollDuration, 1);

            // Update each die
            this.activeDice.forEach(dice => {
                // Apply rotation
                dice.rotation.x += dice.userData.rotationSpeed.x * (0.02 * (1 - progress));
                dice.rotation.y += dice.userData.rotationSpeed.y * (0.02 * (1 - progress));
                dice.rotation.z += dice.userData.rotationSpeed.z * (0.02 * (1 - progress));

                // Apply gravity and bouncing
                if (dice.userData.verticalPosition > 0.7) {
                    dice.userData.verticalPosition += dice.userData.verticalSpeed * 0.02;
                    dice.userData.verticalSpeed += -9.8 * 0.02; // Gravity

                    // Bounce
                    if (dice.userData.verticalPosition <= 0.7) {
                        dice.userData.verticalPosition = 0.7;
                        dice.userData.verticalSpeed = -dice.userData.verticalSpeed * 0.3; // Damping

                        // Stop small bounces
                        if (Math.abs(dice.userData.verticalSpeed) < 1) {
                            dice.userData.verticalSpeed = 0;
                        }
                    }
                }

                dice.position.y = dice.userData.verticalPosition;
            });

            // Continue animation if not finished
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete, calculate results
                this.calculateResults();
                this.isRolling = false;
            }
        };

        animate();
    }

    calculateResults() {
        const results = [];
        let total = 0;

        this.activeDice.forEach(dice => {
            // Calculate random result based on dice type
            const sides = this.diceTypes[dice.diceType].sides;
            const result = Math.floor(Math.random() * sides) + 1;

            dice.userData.result = result;
            results.push(`${dice.diceType}: ${result}`);
            total += result;

            // Fix final rotation to "show" the result
            // In a real implementation, you'd align the die to show the actual face with the result

            // For now, just slightly randomize the final position
            dice.rotation.set(
                Math.random() * 0.2,
                Math.random() * 0.2,
                Math.random() * 0.2
            );
        });

        // Display results
        document.getElementById('dice-results').innerHTML = results.join('<br>');
        document.getElementById('dice-total').textContent = `Total: ${total}`;

        // Broadcast results to other players
        this.game.socketManager.sendDiceResults(results, total);
    }

    clearDice() {
        // Remove all active dice from the scene
        this.activeDice.forEach(dice => {
            this.game.scene.remove(dice);
        });

        this.activeDice = [];

        // Clear results display
        document.getElementById('dice-results').textContent = '';
        document.getElementById('dice-total').textContent = '';
    }

    // Method to show dice results from other players
    showRemoteDiceResults(playerName, results, total) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.classList.add('dice-notification');
        notification.innerHTML = `
      <h4>${playerName} rolled:</h4>
      <div class="remote-dice-results">${results.join('<br>')}</div>
      <div class="remote-dice-total">Total: ${total}</div>
    `;

        document.body.appendChild(notification);

        // Add CSS for the notification
        const notifStyle = document.createElement('style');
        notifStyle.textContent = `
      .dice-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        text-align: center;
        min-width: 200px;
      }
      
      .remote-dice-results {
        margin: 10px 0;
      }
      
      .remote-dice-total {
        font-weight: bold;
      }
    `;

        document.head.appendChild(notifStyle);

        // Remove notification after a few seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}