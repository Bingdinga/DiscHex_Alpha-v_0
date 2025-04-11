// src/server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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

            const defaultTerrain = generateDefaultTerrain();

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

            // Clean up empty rooms
            if (Object.keys(rooms[roomId].users).length === 0) {
                console.log(`Deleting empty room: ${roomId}`);
                delete rooms[roomId];
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

function generateDefaultTerrain() {
    const terrain = {};
    const radius = 8;

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

            // Simple noise function for terrain variety (server-side adaptation)
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

            // Add the hex to the terrain data
            const hexId = `${q},${r},${s}`;
            terrain[hexId] = {
                q, r, s,
                type: terrainType,
                elevation
            };
        }
    }

    return terrain;
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});