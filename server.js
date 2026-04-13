const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Game = require('./src/js/game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const gameRooms = new Map();
const inputResolvers = new Map();

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('create_room', (playerNames) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const game = new Game(playerNames);

        setupGame(game, roomId);
        gameRooms.set(roomId, game);

        socket.join(roomId);
        socket.emit('room_created', roomId);

        runGame(roomId);
    });

    socket.on('join_room', (roomId) => {
        roomId = roomId.toUpperCase();
        if (gameRooms.has(roomId)) {
            socket.join(roomId);
            socket.emit('joined_room', roomId);
            socket.emit('game_state', getGameState(roomId));
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('submit_input', ({ roomId, val }) => {
        const resolve = inputResolvers.get(roomId);
        if (resolve) {
            resolve(val);
            inputResolvers.delete(roomId);
        }
    });
});

function setupGame(game, roomId) {
    game.log = (msg) => {
        console.log(`[${roomId}] ${msg}`);
        io.to(roomId).emit('game_message', msg);
    };

    game.getChoice = async (prompt, choices, player) => {
        const usableItems = player ? player.inventory.filter(item => ["Peek", "Insurance", "Second", "Loaded"].some(k => item.includes(k))) : [];
        io.to(roomId).emit('need_choice', { prompt, choices, usableItems, playerName: player ? player.name : null });
        return new Promise((resolve) => {
            inputResolvers.set(roomId, resolve);
        });
    };

    game.waitForRoll = async (prompt, player) => {
        const usableItems = player ? player.inventory.filter(item => ["Peek", "Insurance", "Second", "Loaded"].some(k => item.includes(k))) : [];
        io.to(roomId).emit('need_roll', { prompt, usableItems, playerName: player ? player.name : null });
        return new Promise((resolve) => {
            inputResolvers.set(roomId, resolve);
        });
    };

    game.getInput = async (prompt) => {
        io.to(roomId).emit('need_input', prompt);
        return new Promise((resolve) => {
            inputResolvers.set(roomId, resolve);
        });
    };
}

async function runGame(roomId) {
    const game = gameRooms.get(roomId);
    while (game && !game.gameOver) {
        io.to(roomId).emit('game_state', getGameState(roomId));
        await game.playTurn();
    }
    io.to(roomId).emit('game_state', getGameState(roomId));
    io.to(roomId).emit('game_over');
}

function getGameState(roomId) {
    const game = gameRooms.get(roomId);
    if (!game) return null;
    return {
        players: game.players,
        currentPlayerIdx: game.currentPlayerIdx,
        board: game.board.map(t => t.name)
    };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`listening on *:${PORT}`);
});
