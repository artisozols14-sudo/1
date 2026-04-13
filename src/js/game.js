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
            new RehabTile(), // 0
            new CasinoTile(), // 1
            new BackAlleyTile(), // 2
            new ShopTile() // 3
        ];
    }

    log(msg) {
        this.messages.push(msg);
    }

    async getInput(prompt) {
        throw new Error("getInput not implemented");
    }

    async getChoice(prompt, choices) {
        throw new Error("getChoice not implemented");
    }

    async waitForRoll(prompt) {
        throw new Error("waitForRoll not implemented");
    }

    async getIntInput(prompt, min, max) {
        // Fallback or use getChoice if range is small
        const val = parseInt(await this.getInput(prompt));
        return val;
    }

    async getBoolInput(prompt) {
        const choice = await this.getChoice(prompt, ["Yes", "No"]);
        return choice === "Yes";
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

    async rollDice(player, prompt = "Roll the dice!") {
        await this.waitForRoll(prompt);
        let roll = Math.floor(Math.random() * 6) + 1;
        if (player) {
            const bonus = await this.useLoadedDice(player);
            if (bonus) {
                roll += bonus;
                this.log(`🎲 Loaded Dice used! Roll: ${roll}`);
            }
        }
        return roll;
    }

    async movePlayer(player) {
        await this.waitForRoll(`${player.name}'s turn! Roll to move! 🎲`);
        const roll = Math.floor(Math.random() * 6) + 1;
        this.log(`🚶 ${player.name} rolled a ${roll} for movement.`);
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
