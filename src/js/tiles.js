class Tile {
    constructor(name) {
        this.name = name;
    }

    async onLand(player, game) {
        game.log(`${player.name} landed on ${this.name}`);
    }
}

class RehabTile extends Tile {
    constructor() {
        super("Rehab Center");
    }

    async onLand(player, game) {
        await super.onLand(player, game);
        player.hasGettingHelpThisVisit = false;
        game.log("Welcome to Rehab. Options:");
        game.log("1. Getting Help (-1000 debt)");
        if (player.money <= 0) {
            game.log("2. I Don't Have a Problem (+5000 cash)");
        }
        game.log("3. Pay off debt (1:1 ratio)");

        const choice = await game.getInput("Choose an option (or enter anything else to skip): ");
        if (choice === "1") {
            if (!player.hasGettingHelpThisVisit) {
                player.debt -= 1000;
                player.hasGettingHelpThisVisit = true;
                game.log("Debt reduced by 1000.");
            } else {
                game.log("You already got help this visit.");
            }
        } else if (choice === "2" && player.money <= 0) {
            player.money += 5000;
            game.log("Received 5000 cash. Good luck!");
        } else if (choice === "3") {
            const amount = await game.getIntInput(`How much debt do you want to pay off? (You have ${player.money} money): `, 0, player.money);
            player.money -= amount;
            player.debt -= amount;
            game.log(`Paid off ${amount} debt.`);
        }
    }
}

class CasinoTile extends Tile {
    constructor() {
        super("Casino");
    }

    rollDie() {
        return Math.floor(Math.random() * 6) + 1;
    }

    async handleAce(game) {
        game.log("You rolled a 1! It can be 1 or 6.");
        const choice = await game.getIntInput("Choose value for Ace (1 or 6): ", 1, 6);
        return choice === 6 ? 6 : 1;
    }

    async playRound(player, game) {
        game.log(`--- ${player.name}'s Casino Turn ---`);

        let d1 = await game.rollDice(player);
        if (d1 === 1) d1 = await this.handleAce(game);
        let d2 = await game.rollDice(player);
        if (d2 === 1) d2 = await this.handleAce(game);

        let total = d1 + d2;
        game.log(`Initial rolls: ${d1}, ${d2}. Total: ${total}`);

        while (total < 21) {
            if (player.hasItem("Peek")) {
                if (await game.getBoolInput("Use Peek? (y/n): ")) {
                    player.removeItem("Peek");
                    let nextDie = this.rollDie();
                    game.log(`Next die would be: ${nextDie}`);
                    if (await game.getBoolInput("Use it? (y/n): ")) {
                        if (nextDie === 1) nextDie = await this.handleAce(game);
                        total += nextDie;
                        game.log(`New total: ${total}`);
                        if (total >= 21) break;
                        continue;
                    } else {
                        game.log("Discarded.");
                    }
                }
            }

            const action = (await game.getInput("Hit or Stand? (h/s): ")).toLowerCase();
            if (action === 'h') {
                let die = await game.rollDice(player);
                if (die === 1) die = await this.handleAce(game);
                total += die;
                game.log(`Rolled ${die}. New total: ${total}`);
            } else {
                break;
            }
        }
        return total;
    }

    async onLand(player, game) {
        await super.onLand(player, game);
        let total = await this.playRound(player, game);

        if (player.hasItem("Second Chance")) {
            if (await game.getBoolInput("Use Second Chance to reroll whole turn? (y/n): ")) {
                player.removeItem("Second Chance");
                total = await this.playRound(player, game);
            }
        }

        let payout = 0;
        let bust = false;
        if (total < 15) payout = -500;
        else if (total === 15) payout = -250;
        else if (total === 16) payout = 0;
        else if (total === 17) payout = 500;
        else if (total <= 20) payout = 2000;
        else if (total === 21) payout = 4000;
        else {
            game.log("BUST!");
            bust = true;
            payout = -1000;
        }

        if (bust) {
            if (player.riggedGame) {
                game.log("Rigged Game effect activated! You avoided the bust.");
                player.riggedGame = false;
                payout = 4000;
            } else if (player.hasItem("Insurance")) {
                if (await game.getBoolInput("Use Insurance to prevent bust? (y/n): ")) {
                    player.removeItem("Insurance");
                    game.log("Insurance used. No loss.");
                    payout = 0;
                }
            }
        }

        if (!bust && player.shadyBetBonus) {
            game.log("Shady Bets bonus! Doubling your win.");
            payout *= 2;
            player.shadyBetBonus = false;
        }

        player.money += payout;
        game.log(`Final total: ${total}. Payout: ${payout}. Current money: ${player.money}`);
    }
}

class BackAlleyTile extends Tile {
    constructor() {
        super("Back Alley");
        this.shadyBetLoss = 500;
        this.rigGameCost = 1000;
    }

    async onLand(player, game) {
        await super.onLand(player, game);

        if ((await game.getInput("Do you want to skip your turn or receive an event? (skip/event): ")).toLowerCase() === 'skip') {
            game.log("You chose to skip your turn.");
            return;
        }

        const events = ["Loan shark", "Shady bets", "Rig the game", "Getting robbed", "Illegal gambling", "Hippodrome"];
        let event;

        if (player.hasItem("X-Ray Glasses")) {
            game.log("X-Ray Glasses allow you to choose your event!");
            events.forEach((ev, i) => game.log(`${i + 1}. ${ev}`));
            const choice = await game.getIntInput("Choose an event: ", 1, events.length) - 1;
            event = events[choice];
            player.removeItem("X-Ray Glasses");
        } else {
            event = events[Math.floor(Math.random() * events.length)];
        }

        game.log(`Event: ${event}`);
        await this.handleEvent(event, player, game);
    }

    async handleEvent(event, player, game) {
        switch (event) {
            case "Loan shark":
                player.money += 2500;
                player.debt += 2500;
                game.log("Received 2500 money, debt increased by 2500.");
                break;
            case "Shady bets":
                const roll = await game.rollDice(player);
                game.log(`Rolled ${roll}`);
                if (roll <= 2) {
                    player.money -= this.shadyBetLoss;
                    game.log(`Lost ${this.shadyBetLoss} money.`);
                } else if (roll <= 4) {
                    game.log("Nothing happened.");
                } else {
                    player.shadyBetBonus = true;
                    game.log("Double next casino win!");
                }
                break;
            case "Rig the game":
                if (player.money >= this.rigGameCost) {
                    player.money -= this.rigGameCost;
                    player.riggedGame = true;
                    game.log(`Paid ${this.rigGameCost}. You cannot bust in your next casino visit.`);
                } else {
                    game.log("Not enough money to rig the game.");
                }
                break;
            case "Getting robbed":
                player.money -= 1000;
                game.log("Lost 1000 money.");
                break;
            case "Illegal gambling":
                if (game.players.length < 2) {
                    game.log("Not enough players for illegal gambling. Event skipped.");
                    return;
                }
                const opponents = game.players.filter(p => p !== player);
                game.log("Choose an opponent:");
                opponents.forEach((p, i) => game.log(`${i + 1}. ${p.name}`));
                const oppChoice = await game.getIntInput("Opponent index: ", 1, opponents.length) - 1;
                const opponent = opponents[oppChoice];
                const bet = await game.getIntInput("Enter bet amount (up to 5000): ", 0, Math.min(5000, Math.max(0, player.money)));
                const pRoll = await game.rollDice(player);
                const oRoll = await game.rollDice(opponent);
                game.log(`${player.name} rolled ${pRoll}, ${opponent.name} rolled ${oRoll}`);
                if (pRoll > oRoll) {
                    player.money += bet;
                    opponent.money -= bet;
                    game.log(`${player.name} wins ${bet}!`);
                } else if (oRoll > pRoll) {
                    player.money -= bet;
                    opponent.money += bet;
                    game.log(`${opponent.name} wins ${bet}!`);
                } else {
                    game.log("It's a tie! No money exchanged.");
                }
                break;
            case "Hippodrome":
                const hBet = await game.getIntInput("Enter bet amount: ", 0, Math.max(0, player.money));
                const guess = await game.getIntInput("Choose a dice number (1-6): ", 1, 6);
                const hRoll = await game.rollDice(player);
                game.log(`Rolled ${hRoll}`);
                if (hRoll === guess) {
                    player.money += hBet * 10;
                    game.log(`Correct! You won ${hBet * 10}!`);
                } else {
                    player.money -= hBet;
                    game.log(`Wrong! You lost ${hBet}.`);
                }
                break;
        }
    }
}

class ShopTile extends Tile {
    constructor() {
        super("Shop");
        this.prices = {
            "Second Chance": 1000,
            "Insurance": 800,
            "Loaded Dice": 500,
            "Peek": 700,
            "X-Ray Glasses": 1000,
            "Lottery Ticket": 500
        };
    }

    async onLand(player, game) {
        await super.onLand(player, game);
        game.log("Welcome to the Shop! Items available (one per turn):");
        const items = Object.keys(this.prices);
        items.forEach((item, i) => game.log(`${i + 1}. ${item} (${this.prices[item]})`));

        const choice = await game.getInput("Choose an item to buy (or enter anything else to leave): ");
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < items.length) {
            const item = items[idx];
            const price = this.prices[item];
            if (player.money >= price) {
                player.money -= price;
                game.log(`Bought ${item} for ${price}.`);
                if (item === "Lottery Ticket") {
                    game.log("Using Lottery Ticket immediately...");
                    const roll = await game.rollDice(player);
                    game.log(`Rolled ${roll}`);
                    if (roll >= 6) {
                        player.money += 3500;
                        game.log("JACKPOT! You won 3500!");
                    } else {
                        game.log("Better luck next time.");
                    }
                } else {
                    player.addItem(item);
                }
            } else {
                game.log("Not enough money!");
            }
        } else {
            game.log("Leaving shop.");
        }
    }
}

module.exports = { Tile, RehabTile, CasinoTile, BackAlleyTile, ShopTile };
