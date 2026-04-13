const Player = require('./player');
const { Tile, RehabTile, CasinoTile, BackAlleyTile, ShopTile, TaxiTile } = require('./tiles');

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
            new ShopTile(), // 3
            new TaxiTile() // 4
        ];
    }

    log(msg) {
        this.messages.push(msg);
    }

    async getInput(prompt) {
        throw new Error("getInput not implemented");
    }

    async getChoice(prompt, choices, player) {
        throw new Error("getChoice not implemented");
    }

    async waitForRoll(prompt, player) {
        throw new Error("waitForRoll not implemented");
    }

    async getIntInput(prompt, min, max) {
        let val = parseInt(await this.getInput(`${prompt} (Min: ${min}, Max: ${max})`));
        if (isNaN(val)) val = min;
        return Math.min(max, Math.max(min, val));
    }

    async getBoolInput(prompt, player) {
        const choice = await this.getChoice(prompt, ["Yes ✅", "No ❌"], player);
        return choice.includes("Yes");
    }

    async useLoadedDice(player) {
        // This is now handled in the waitForRoll loop
        return 0;
    }

    async rollDice(player, prompt = "Roll the dice!") {
        let input = "";
        while(true) {
            input = await this.waitForRoll(prompt, player);
            if (input === 'roll') break;

            if (input.includes("Loaded Dice")) {
                player.removeItem("Loaded Dice");
                const roll = Math.floor(Math.random() * 6) + 1 + 1;
                this.log(`🎲 Loaded Dice used! Roll: ${roll}`);
                return roll;
            }
            this.log(`⚠️ ${input} cannot be used here.`);
        }

        return Math.floor(Math.random() * 6) + 1;
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
        await this.movePlayer(player);

        if (player.debt <= 0) {
            this.log(`CONGRATULATIONS ${player.name}! You escaped debt and won the game!`);
            this.gameOver = true;
        } else {
            await this.getChoice("Turn complete.", ["End Turn 🏁"], player);
        }

        if (!this.gameOver) {
            this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
        }
    }
}

module.exports = Game;
