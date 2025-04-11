// public/js/socketManager.js
export class SocketManager {
    constructor(game) {
        this.game = game;
        this.socket = io();
        this.localChanges = new Set(); // Track local changes to avoid double processing
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            alert('Failed to connect to server. Please try again.');
        });

        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data);

            if (!data || !data.roomId) {
                console.error('Invalid room data received');
                alert('Failed to create room. Please try again.');
                return;
            }

            this.game.roomId = data.roomId;
            this.game.userId = data.userId;

            // Update UI
            this.game.ui.updateRoomInfo(data.roomId);
            this.game.ui.showGameControls();

            // If we received room state, update it
            if (data.roomState) {
                console.log(`Received room state with ${data.roomState.terrain ? Object.keys(data.roomState.terrain).length : 0} terrain hexes`);
                this.game.updateState(data.roomState);
            }

            console.log('Successfully joined new room:', data.roomId);
        });

        this.socket.on('roomJoined', ({ roomId, userId, state }) => {
            console.log(`Joined room ${roomId} with ${state.terrain ? Object.keys(state.terrain).length : 0} terrain hexes`);

            this.game.roomId = roomId;
            this.game.userId = userId;

            // Update UI
            this.game.ui.updateRoomInfo(roomId);
            this.game.ui.showGameControls();

            // Update game state with received data
            this.game.updateState(state);
        });

        this.socket.on('userJoined', ({ userId }) => {
            console.log(`User ${userId} joined the room`);
        });

        this.socket.on('userLeft', ({ userId }) => {
            console.log(`User ${userId} left the room`);
        });

        this.socket.on('terrainUpdate', (updateData) => {
            console.log('Received terrain update:', updateData);
            this.game.hexGrid.updateTerrain(updateData);
        });

        this.socket.on('error', ({ message }) => {
            console.error('Socket error:', message);
            alert(`Error: ${message}`);
        });

        this.socket.on('characterPositionUpdate', ({ characterId, position }) => {
            if (characterId !== this.game.userId) { // Only update remote characters
                this.game.characterManager.updateCharacterPosition(
                    characterId,
                    position.q,
                    position.r,
                    position.s
                );
            }
        });

        this.socket.on('characterJoined', ({ characterId }) => {
            if (characterId !== this.game.userId) {
                this.game.characterManager.createRemoteCharacter(characterId);
            }
        });

        this.socket.on('characterLeft', ({ characterId }) => {
            this.game.characterManager.removeCharacter(characterId);
        });

        this.socket.on('diceRollResult', ({ userId, results, total }) => {
            if (userId !== this.game.userId) {
                // Show dice results from another player
                const playerName = userId.substring(0, 8); // Short ID as name
                this.game.diceSystem.showRemoteDiceResults(playerName, results, total);
            }
        });

        this.socket.on('combatStarted', ({ currentTurnId, turnOrder, actionPoints }) => {
            this.game.turnSystem.updateFromServer(currentTurnId, turnOrder, actionPoints);
        });

        this.socket.on('combatEnded', () => {
            this.game.turnSystem.endCombat();
        });

        this.socket.on('turnUpdated', ({ currentTurnId, actionPoints }) => {
            if (this.game.turnSystem.isActive) {
                // Update current turn
                this.game.turnSystem.updateFromServer(
                    currentTurnId,
                    this.game.turnSystem.turnOrder,
                    actionPoints
                );
            }
        });

        this.socket.on('actionUsed', ({ characterId, actionType, cost }) => {
            if (characterId !== this.game.userId) {
                // Show action notification
                const playerName = characterId.substring(0, 8);
                const notification = document.createElement('div');
                notification.classList.add('action-notification');
                notification.textContent = `${playerName} used ${actionType} (${cost} AP)`;

                document.body.appendChild(notification);

                // Add style
                const style = document.createElement('style');
                style.textContent = `
                .action-notification {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  background-color: rgba(0, 0, 0, 0.7);
                  color: white;
                  padding: 10px;
                  border-radius: 5px;
                  z-index: 1000;
                }
              `;
                document.head.appendChild(style);

                // Remove after a few seconds
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 3000);
            }
        });

        // Add this to the setupEventListeners method
        this.socket.on('weatherUpdated', ({ weatherType, weatherIntensity }) => {
            this.game.weatherSystem.setWeather(weatherType, weatherIntensity);
        });
    }

    createRoom() {
        try {
            console.log('Attempting to create room...');
            this.socket.emit('createRoom');
        } catch (error) {
            console.error('Error sending createRoom event:', error);
            alert('Failed to create room. Please try again.');
        }
    }

    joinRoom(roomId) {
        this.socket.emit('joinRoom', { roomId });
    }

    updateHex(q, r, s, data, hexId) {
        // For stacked hexes, we need the explicit hexId with the stack level
        const actualHexId = hexId || `${q},${r},${s}`;

        // Ensure the hexData contains both the coordinates and any additional data
        this.socket.emit('updateHex', {
            roomId: this.game.roomId,
            hexId: actualHexId,
            hexData: {
                q, r, s,
                ...data
            }
        });

        // Debug to track what we're sending
        console.log(`Sending hex update for ${actualHexId}:`, data);
    }

    removeHex(hexId) {
        this.socket.emit('removeHex', {
            roomId: this.game.roomId,
            hexId
        });
    }

    updateFullTerrain(terrainData) {
        this.socket.emit('updateFullTerrain', {
            roomId: this.game.roomId,
            terrainData
        });
    }

    sendChatMessage(message) {
        this.socket.emit('chatMessage', {
            roomId: this.game.roomId,
            userId: this.game.userId,
            message
        });
    }
    updateCharacterPosition(characterId, q, r, s) {
        this.socket.emit('updateCharacterPosition', {
            roomId: this.game.roomId,
            characterId,
            position: { q, r, s }
        });
    }

    sendDiceResults(results, total) {
        this.socket.emit('diceRoll', {
            roomId: this.game.roomId,
            userId: this.game.userId,
            results,
            total
        });
    }

    startCombat(turnOrder) {
        this.socket.emit('startCombat', {
            roomId: this.game.roomId,
            turnOrder
        });
    }

    endCombat() {
        this.socket.emit('endCombat', {
            roomId: this.game.roomId
        });
    }

    updateTurn(characterId) {
        this.socket.emit('updateTurn', {
            roomId: this.game.roomId,
            characterId
        });
    }

    useAction(actionType, cost) {
        this.socket.emit('useAction', {
            roomId: this.game.roomId,
            characterId: this.game.userId,
            actionType,
            cost
        });
    }

    updateWeather(type, intensity) {
        this.socket.emit('updateWeather', {
            roomId: this.game.roomId,
            weatherType: type,
            weatherIntensity: intensity
        });
    }


}