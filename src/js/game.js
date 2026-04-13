const Player = require('./player');
const { Tile, RehabTile, CasinoTile, BackAlleyTile, ShopTile } = require('./tiles');

class Game {
    constructor(playerNames) {
        this.players = playerNames.map(name => new Player(name));
        this.board = this.createBoard();
        this.currentPlayerIdx = 0;
        this.gameOver = false;
        this.messages = [];
    }

    createBoard() {
        return [
            new RehabTile(), new CasinoTile(), new BackAlleyTile(), new ShopTile(),
            new CasinoTile(), new BackAlleyTile(), new Tile("Plain Tile"), new CasinoTile(),
            new ShopTile(), new BackAlleyTile(), new CasinoTile(), new BackAlleyTile(),
            new ShopTile(), new Tile("Plain Tile"), new CasinoTile(), new BackAlleyTile()
        ];
    }

    log(msg) {
        this.messages.push(msg);
    }

    async getInput(prompt) {
        // To be implemented by the server/client interface
        throw new Error("getInput not implemented");
    }

    async getIntInput(prompt, min, max) {
        while (true) {
            const val = parseInt(await this.getInput(prompt));
            if (!isNaN(val) && (min === undefined || val >= min) && (max === undefined || val <= max)) {
                return val;
            }
            this.log("Invalid input. Please enter a valid number.");
        }
    }

    async getBoolInput(prompt) {
        while (true) {
            const val = (await this.getInput(prompt)).toLowerCase();
            if (['y', 'yes'].includes(val)) return true;
            if (['n', 'no'].includes(val)) return false;
            this.log("Please enter 'y' or 'n'.");
        }
    }

    async useLoadedDice(player) {
        if (player.hasItem("Loaded Dice")) {
            if (await this.getBoolInput("Use Loaded Dice for +1 to this roll? (y/n): ")) {
                player.removeItem("Loaded Dice");
                return 1;
            }
        }
        return 0;
    }

    async rollDice(player) {
        let roll = Math.floor(Math.random() * 6) + 1;
        if (player) {
            const bonus = await this.useLoadedDice(player);
            if (bonus) {
                roll += bonus;
                this.log(`Loaded Dice used! Roll: ${roll}`);
            }
        }
        return roll;
    }

    async movePlayer(player) {
        const roll = Math.floor(Math.random() * 6) + 1;
        this.log(`${player.name} rolled a ${roll} for movement.`);
        player.position = (player.position + roll) % this.board.length;
        const tile = this.board[player.position];
        await tile.onLand(player, this);
    }

    async playTurn() {
        const player = this.players[this.currentPlayerIdx];
        this.log(`--- ${player.name}'s Turn ---`);
        this.log(`Money: ${player.money}, Debt: ${player.debt}, Pos: ${player.position}`);
        await this.movePlayer(player);

        if (player.debt <= 0) {
            this.log(`CONGRATULATIONS ${player.name}! You escaped debt and won the game!`);
            this.gameOver = true;
        }

        if (!this.gameOver) {
            this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
        }
    }
}

module.exports = Game;
