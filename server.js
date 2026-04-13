const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Game = require('./src/js/game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let game = null;
let inputResolvers = new Map();

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('start_game', (playerNames) => {
        game = new Game(playerNames);

        // Inject Socket.io into game for input/output
        game.log = (msg) => {
            console.log(msg);
            io.emit('game_message', msg);
        };

        game.getInput = async (prompt) => {
            io.emit('need_input', prompt);
            return new Promise((resolve) => {
                inputResolvers.set(socket.id, resolve);
            });
        };

        runGame();
    });

    socket.on('submit_input', (val) => {
        const resolve = inputResolvers.get(socket.id);
        if (resolve) {
            resolve(val);
            inputResolvers.delete(socket.id);
        }
    });

    socket.on('next_turn', () => {
        if (game && !game.gameOver) {
            // This is actually handled in the runGame loop
        }
    });
});

async function runGame() {
    while (game && !game.gameOver) {
        io.emit('game_state', getGameState());
        await game.playTurn();
    }
    io.emit('game_state', getGameState());
    io.emit('game_over');
}

function getGameState() {
    if (!game) return null;
    return {
        players: game.players,
        currentPlayerIdx: game.currentPlayerIdx,
        board: game.board.map(t => t.name)
    };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});
