// public/js/turnSystem.js
export class TurnSystem {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.currentTurn = null;
        this.turnOrder = [];
        this.turnIndex = -1;
        this.actionPoints = {}; // Character ID -> AP

        this.createTurnPanel();
    }

    createTurnPanel() {
        const turnPanel = document.createElement('div');
        turnPanel.id = 'turn-panel';
        turnPanel.classList.add('turn-panel');
        turnPanel.innerHTML = `
        <h3>Turn Manager</h3>
        <div class="turn-controls">
          <button id="start-combat-btn">Start Combat</button>
          <button id="end-combat-btn" disabled>End Combat</button>
        </div>
        <div class="turn-order" id="turn-order">
          <p>No combat active</p>
        </div>
        <div class="turn-actions" id="turn-actions">
          <div class="action-points">AP: <span id="action-points">0</span></div>
          <div class="action-buttons">
            <button class="action-btn" data-cost="1" disabled>Move (1 AP)</button>
            <button class="action-btn" data-cost="2" disabled>Attack (2 AP)</button>
            <button class="action-btn" data-cost="3" disabled>Special (3 AP)</button>
            <button class="action-btn" data-cost="0" disabled>End Turn</button>
          </div>
        </div>
      `;

        document.body.appendChild(turnPanel);

        // Add CSS for the turn panel
        const style = document.createElement('style');
        style.textContent = `
        .turn-panel {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 15px;
          border-radius: 5px;
          width: 300px;
          z-index: 100;
          display: none;
        }
        
        .turn-panel.active {
          display: block;
        }
        
        .turn-controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .turn-order {
          margin-bottom: 15px;
          border: 1px solid #555;
          padding: 10px;
          min-height: 100px;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .turn-character {
          padding: 5px;
          margin-bottom: 5px;
          border-radius: 3px;
        }
        
        .turn-character.active {
          background-color: rgba(0, 255, 0, 0.3);
          font-weight: bold;
        }
        
        .turn-actions {
          display: none;
        }
        
        .turn-actions.active {
          display: block;
        }
        
        .action-points {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px;
        }
        
        .action-btn {
          padding: 8px;
          margin-bottom: 5px;
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;

        document.head.appendChild(style);

        // Set up event listeners
        const startBtn = document.getElementById('start-combat-btn');
        const endBtn = document.getElementById('end-combat-btn');
        const actionButtons = document.querySelectorAll('.action-btn');

        startBtn.addEventListener('click', () => {
            this.startCombat();
        });

        endBtn.addEventListener('click', () => {
            this.endCombat();
        });

        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const cost = parseInt(button.dataset.cost);

                if (button.textContent.includes('End Turn')) {
                    this.endTurn();
                } else {
                    this.useAction(cost, button.textContent.split(' ')[0]);
                }
            });
        });
    }

    startCombat() {
        this.isActive = true;
        document.getElementById('turn-panel').classList.add('active');
        document.getElementById('start-combat-btn').disabled = true;
        document.getElementById('end-combat-btn').disabled = false;

        // Initialize turn order with all characters
        this.turnOrder = [];
        for (const characterId in this.game.characterManager.characters) {
            this.turnOrder.push({
                id: characterId,
                name: characterId.substring(0, 8), // Short ID as name
                initiative: Math.floor(Math.random() * 20) + 1 // Random initiative for demo
            });
        }

        // Sort by initiative (highest first)
        this.turnOrder.sort((a, b) => b.initiative - a.initiative);

        // Initialize action points
        this.actionPoints = {};
        this.turnOrder.forEach(character => {
            this.actionPoints[character.id] = 5; // Default 5 AP
        });

        // Start first turn
        this.turnIndex = -1;
        this.nextTurn();

        // Notify server
        this.game.socketManager.startCombat(this.turnOrder);
    }

    endCombat() {
        this.isActive = false;
        document.getElementById('turn-panel').classList.remove('active');
        document.getElementById('start-combat-btn').disabled = false;
        document.getElementById('end-combat-btn').disabled = true;

        document.getElementById('turn-order').innerHTML = '<p>No combat active</p>';
        document.getElementById('turn-actions').classList.remove('active');

        // Reset variables
        this.currentTurn = null;
        this.turnOrder = [];
        this.turnIndex = -1;
        this.actionPoints = {};

        // Notify server
        this.game.socketManager.endCombat();
    }

    nextTurn() {
        // Update turn index
        this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
        this.currentTurn = this.turnOrder[this.turnIndex];

        // Reset AP for the new turn
        this.actionPoints[this.currentTurn.id] = 5; // Default 5 AP

        // Update UI
        this.updateTurnOrderUI();

        // Show action controls if it's the local player's turn
        const isLocalPlayerTurn = this.currentTurn.id === this.game.userId;
        document.getElementById('turn-actions').classList.toggle('active', isLocalPlayerTurn);

        if (isLocalPlayerTurn) {
            // Enable/disable action buttons based on available AP
            this.updateActionButtons();
        }

        // Notify server
        this.game.socketManager.updateTurn(this.currentTurn.id);
    }

    endTurn() {
        if (!this.isActive || !this.currentTurn) return;

        // Skip to next turn
        this.nextTurn();
    }

    useAction(cost, actionType) {
        if (!this.isActive || !this.currentTurn) return;
        if (this.currentTurn.id !== this.game.userId) return;

        // Check if enough AP
        if (this.actionPoints[this.currentTurn.id] < cost) {
            alert('Not enough Action Points!');
            return;
        }

        // Deduct AP
        this.actionPoints[this.currentTurn.id] -= cost;

        // Update UI
        document.getElementById('action-points').textContent = this.actionPoints[this.currentTurn.id];
        this.updateActionButtons();

        // Notify server about the action
        this.game.socketManager.useAction(actionType, cost);

        // Automatically end turn if no more AP
        if (this.actionPoints[this.currentTurn.id] === 0) {
            setTimeout(() => this.endTurn(), 1000);
        }
    }

    updateTurnOrderUI() {
        const turnOrderEl = document.getElementById('turn-order');
        let html = '';

        this.turnOrder.forEach((character, index) => {
            const isActive = index === this.turnIndex;
            html += `
          <div class="turn-character ${isActive ? 'active' : ''}">
            ${character.name} (Initiative: ${character.initiative})
            ${isActive ? '- Current Turn' : ''}
          </div>
        `;
        });

        turnOrderEl.innerHTML = html;

        // Update AP display
        if (this.currentTurn) {
            document.getElementById('action-points').textContent =
                this.actionPoints[this.currentTurn.id] || 0;
        }
    }

    updateActionButtons() {
        const ap = this.actionPoints[this.currentTurn.id];
        const actionButtons = document.querySelectorAll('.action-btn');

        actionButtons.forEach(button => {
            const cost = parseInt(button.dataset.cost);
            button.disabled = button.textContent.includes('End Turn') ? false : cost > ap;
        });
    }

    // Method to update from server
    updateFromServer(currentTurnId, turnOrder, actionPoints) {
        if (!this.isActive) {
            this.isActive = true;
            document.getElementById('turn-panel').classList.add('active');
            document.getElementById('start-combat-btn').disabled = true;
            document.getElementById('end-combat-btn').disabled = false;
        }

        this.turnOrder = turnOrder;
        this.actionPoints = actionPoints;

        // Find the current turn index
        this.turnIndex = this.turnOrder.findIndex(char => char.id === currentTurnId);
        this.currentTurn = this.turnOrder[this.turnIndex];

        // Update UI
        this.updateTurnOrderUI();

        // Show action controls if it's the local player's turn
        const isLocalPlayerTurn = this.currentTurn.id === this.game.userId;
        document.getElementById('turn-actions').classList.toggle('active', isLocalPlayerTurn);

        if (isLocalPlayerTurn) {
            // Enable/disable action buttons based on available AP
            this.updateActionButtons();
        }
    }
}