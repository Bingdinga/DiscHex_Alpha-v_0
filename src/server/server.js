// src/server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
// const { generateServerTerrain } = require('./terrainGenerator');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        roomCount: Object.keys(rooms).length
    });
});

// Room management
const rooms = {};

// Socket connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });

    // Create a new room
    socket.on('createRoom', () => {
        try {
            const roomId = uuidv4();

            // Initialize with minimal default terrain - just a flat area
            const defaultTerrain = {};

            // Create a small platform for players to start on
            // Just 7 hexes - center hex and its immediate neighbors
            const centerCoords = [
                { q: 0, r: 0, s: 0 },
                { q: 1, r: -1, s: 0 },
                { q: 1, r: 0, s: -1 },
                { q: 0, r: 1, s: -1 },
                { q: -1, r: 1, s: 0 },
                { q: -1, r: 0, s: 1 },
                { q: 0, r: -1, s: 1 }
            ];

            // Add these hexes to the terrain
            centerCoords.forEach(({ q, r, s }) => {
                const hexId = `${q},${r},${s}`;
                defaultTerrain[hexId] = {
                    q, r, s,
                    type: 'grass',
                    elevation: 0
                };
            });

            // Initialize the room with all required properties
            rooms[roomId] = {
                id: roomId,
                users: {},
                terrain: defaultTerrain,
                combat: null,
                gameSettings: {
                    fogOfWar: false,
                    weatherEnabled: false,
                    dayNightCycle: false,
                    weatherType: 'clear',
                    weatherIntensity: 0
                }
            };

            // Add the creator to the room
            socket.join(roomId);
            socket.roomId = roomId;

            // Set up the user in the room
            rooms[roomId].users[socket.id] = {
                id: socket.id,
                position: { q: 0, r: 0, s: 0 },
                isGM: true
            };

            // Confirm room creation to the client
            socket.emit('roomCreated', {
                roomId,
                userId: socket.id,
                roomState: rooms[roomId] // Send full room state
            });

            console.log(`Room created: ${roomId} by user ${socket.id}`);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', { message: 'Failed to create room' });
        }
    });

    // Join existing room
    socket.on('joinRoom', ({ roomId }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        rooms[roomId].users[socket.id] = {
            id: socket.id,
            position: { q: 0, r: 0, s: 0 },
            isGM: false
        };

        socket.emit('roomJoined', {
            roomId,
            userId: socket.id,
            state: rooms[roomId]
        });

        // Broadcast to all users in the room
        socket.to(roomId).emit('userJoined', { userId: socket.id });
        socket.to(roomId).emit('characterJoined', { characterId: socket.id });

        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected (${socket.id}). Reason: ${reason}`);

        if (socket.roomId && rooms[socket.roomId]) {
            const roomId = socket.roomId;

            console.log(`Removing user ${socket.id} from room ${roomId}`);
            delete rooms[roomId].users[socket.id];

            socket.to(roomId).emit('userLeft', { userId: socket.id });
            socket.to(roomId).emit('characterLeft', { characterId: socket.id });

            // Clean up empty rooms after a delay
            if (Object.keys(rooms[roomId].users).length === 0) {
                console.log(`Room ${roomId} is empty. Will delete in 1 minute if still empty.`);

                // Set a timeout to delete the room after 1 minute if still empty
                setTimeout(() => {
                    if (rooms[roomId] && Object.keys(rooms[roomId].users).length === 0) {
                        console.log(`Deleting empty room: ${roomId}`);
                        delete rooms[roomId];
                    }
                }, 60000); // 1 minute delay
            }
        }
    });

    socket.on('updateHex', ({ roomId, hexId, hexData }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Validate coordinates
        if (hexData.q === undefined || hexData.r === undefined || hexData.s === undefined) {
            socket.emit('error', { message: 'Invalid cube coordinates' });
            return;
        }

        // Store the hex data in room state - make sure this is using hexId correctly
        rooms[roomId].terrain[hexId] = hexData;

        // Broadcast terrain update to all users in the room
        io.to(roomId).emit('terrainUpdate', {
            type: 'hexUpdate',
            hexId,
            hexData
        });
    });

    socket.on('removeHex', ({ roomId, hexId }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Remove the hex from room state
        if (rooms[roomId].terrain[hexId]) {
            delete rooms[roomId].terrain[hexId];

            // Broadcast hex removal to all users in the room
            io.to(roomId).emit('terrainUpdate', {
                type: 'hexRemove',
                hexId
            });
        }
    });

    socket.on('updateFullTerrain', ({ roomId, terrainData }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Replace entire terrain data
        rooms[roomId].terrain = terrainData;

        // Broadcast full terrain update to all users in the room
        io.to(roomId).emit('terrainUpdate', {
            type: 'fullUpdate',
            terrainData
        });
    });

    socket.on('updateCharacterPosition', ({ roomId, characterId, position }) => {
        if (!rooms[roomId] || !rooms[roomId].users[socket.id]) {
            socket.emit('error', { message: 'Room not found or user not in room' });
            return;
        }

        // Update user position in the room state
        rooms[roomId].users[socket.id].position = position;

        // Broadcast to all users in the room
        io.to(roomId).emit('characterPositionUpdate', {
            characterId: socket.id,
            position
        });
    });

    socket.on('diceRoll', ({ roomId, userId, results, total }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Broadcast dice results to all users in the room
        io.to(roomId).emit('diceRollResult', {
            userId,
            results,
            total
        });
    });

    socket.on('startCombat', ({ roomId, turnOrder }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Store combat state in the room
        rooms[roomId].combat = {
            active: true,
            turnOrder,
            currentTurnIndex: 0,
            actionPoints: {}
        };

        // Initialize action points
        turnOrder.forEach(character => {
            rooms[roomId].combat.actionPoints[character.id] = 5; // Default 5 AP
        });

        // Broadcast combat start to all users in the room
        io.to(roomId).emit('combatStarted', {
            currentTurnId: turnOrder[0].id,
            turnOrder,
            actionPoints: rooms[roomId].combat.actionPoints
        });
    });

    socket.on('endCombat', ({ roomId }) => {
        if (!rooms[roomId] || !rooms[roomId].combat) {
            socket.emit('error', { message: 'Room not found or combat not active' });
            return;
        }

        // Clear combat state
        rooms[roomId].combat = null;

        // Broadcast combat end to all users in the room
        io.to(roomId).emit('combatEnded');
    });

    socket.on('updateTurn', ({ roomId, characterId }) => {
        if (!rooms[roomId] || !rooms[roomId].combat) {
            socket.emit('error', { message: 'Room not found or combat not active' });
            return;
        }

        // Update current turn
        const combat = rooms[roomId].combat;
        const turnIndex = combat.turnOrder.findIndex(char => char.id === characterId);

        if (turnIndex !== -1) {
            combat.currentTurnIndex = turnIndex;

            // Reset AP for the new turn
            combat.actionPoints[characterId] = 5; // Default 5 AP

            // Broadcast turn update to all users in the room
            io.to(roomId).emit('turnUpdated', {
                currentTurnId: characterId,
                actionPoints: combat.actionPoints
            });
        }
    });

    socket.on('useAction', ({ roomId, characterId, actionType, cost }) => {
        if (!rooms[roomId] || !rooms[roomId].combat) {
            socket.emit('error', { message: 'Room not found or combat not active' });
            return;
        }

        // Validate character turn
        const combat = rooms[roomId].combat;
        const currentCharId = combat.turnOrder[combat.currentTurnIndex].id;

        if (characterId !== currentCharId) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        // Validate AP
        if (combat.actionPoints[characterId] < cost) {
            socket.emit('error', { message: 'Not enough AP' });
            return;
        }

        // Deduct AP
        combat.actionPoints[characterId] -= cost;

        // Broadcast action to all users in the room
        io.to(roomId).emit('actionUsed', {
            characterId,
            actionType,
            cost
        });

        // Update action points
        io.to(roomId).emit('turnUpdated', {
            currentTurnId: characterId,
            actionPoints: combat.actionPoints
        });
    });

    socket.on('updateWeather', ({ roomId, weatherType, weatherIntensity }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Update room weather state
        rooms[roomId].gameSettings.weatherType = weatherType;
        rooms[roomId].gameSettings.weatherIntensity = weatherIntensity;

        // Broadcast weather update to all users in the room
        io.to(roomId).emit('weatherUpdated', {
            weatherType,
            weatherIntensity
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});