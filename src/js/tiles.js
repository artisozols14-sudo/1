class Tile {
    constructor(name, emoji = "") {
        this.name = name;
        this.emoji = emoji;
    }

    async onLand(player, game) {
        game.log(`📍 ${player.name} landed on ${this.emoji} ${this.name}`);
    }
}

class RehabTile extends Tile {
    constructor() {
        super("Rehab Center", "🏥");
    }

    async onLand(player, game) {
        await super.onLand(player, game);
        player.hasGettingHelpThisVisit = false;
        game.log("Welcome to Rehab. Options:");

        const choices = ["Getting Help (-1000 debt) 📉"];
        if (player.money <= 0) {
            choices.push("I Don't Have a Problem (+5000 cash) 💵");
        }
        choices.push("Pay off debt (1:1 ratio) 💸");
        choices.push("Skip ⏭️");

        const choice = await game.getChoice("Choose an option:", choices);

        if (choice.includes("Getting Help")) {
            if (!player.hasGettingHelpThisVisit) {
                player.debt -= 1000;
                player.hasGettingHelpThisVisit = true;
                game.log("✅ Debt reduced by 1000.");
            } else {
                game.log("⚠️ You already got help this visit.");
            }
        } else if (choice.includes("I Don't Have a Problem")) {
            player.money += 5000;
            game.log("💰 Received 5000 cash. Good luck!");
        } else if (choice.includes("Pay off debt")) {
            const amount = await game.getIntInput(`How much debt do you want to pay off? (You have ${player.money} money): `, 0, player.money);
            player.money -= amount;
            player.debt -= amount;
            game.log(`💸 Paid off ${amount} debt.`);
        }
    }
}

class CasinoTile extends Tile {
    constructor() {
        super("Casino", "🎰");
    }

    async handleAce(game) {
        game.log("🃏 You rolled a 1! It can be 1 or 6.");
        const choice = await game.getChoice("Choose value for Ace:", ["1", "6"]);
        return parseInt(choice);
    }

    async playRound(player, game) {
        game.log(`--- ${player.name}'s Casino Turn 🎰 ---`);

        let d1 = await game.rollDice(player, "Roll first die! 🎲");
        if (d1 === 1) d1 = await this.handleAce(game);
        let d2 = await game.rollDice(player, "Roll second die! 🎲");
        if (d2 === 1) d2 = await this.handleAce(game);

        let total = d1 + d2;
        game.log(`🎲 Initial rolls: ${d1}, ${d2}. Total: ${total}`);

        while (total < 21) {
            if (player.hasItem("Peek")) {
                if (await game.getBoolInput("Use Peek? 🔍")) {
                    player.removeItem("Peek");
                    let nextDie = Math.floor(Math.random() * 6) + 1;
                    game.log(`👁️ Next die would be: ${nextDie}`);
                    if (await game.getBoolInput("Use it? ✅")) {
                        if (nextDie === 1) nextDie = await this.handleAce(game);
                        total += nextDie;
                        game.log(`📈 New total: ${total}`);
                        if (total >= 21) break;
                        continue;
                    } else {
                        game.log("❌ Discarded.");
                    }
                }
            }

            const action = await game.getChoice("Hit or Stand?", ["Hit ➕", "Stand ✋"]);
            if (action.includes("Hit")) {
                let die = await game.rollDice(player, "Roll for Hit! 🎲");
                if (die === 1) die = await this.handleAce(game);
                total += die;
                game.log(`🎲 Rolled ${die}. New total: ${total}`);
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
            if (await game.getBoolInput("Use Second Chance to reroll whole turn? 🔄")) {
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
            game.log("💥 BUST!");
            bust = true;
            payout = -1000;
        }

        if (bust) {
            if (player.riggedGame) {
                game.log("🛠️ Rigged Game effect activated! You avoided the bust.");
                player.riggedGame = false;
                payout = 4000;
            } else if (player.hasItem("Insurance")) {
                if (await game.getBoolInput("Use Insurance to prevent bust? 🛡️")) {
                    player.removeItem("Insurance");
                    game.log("🛡️ Insurance used. No loss.");
                    payout = 0;
                }
            }
        }

        if (!bust && player.shadyBetBonus) {
            game.log("😈 Shady Bets bonus! Doubling your win.");
            payout *= 2;
            player.shadyBetBonus = false;
        }

        player.money += payout;
        game.log(`💰 Final total: ${total}. Payout: ${payout}. Current money: ${player.money}`);
    }
}

class BackAlleyTile extends Tile {
    constructor() {
        super("Back Alley", "🌑");
        this.shadyBetLoss = 500;
        this.rigGameCost = 1000;
    }

    async onLand(player, game) {
        await super.onLand(player, game);

        const choice = await game.getChoice("Choose your fate:", ["Receive Event 🎭", "Skip Turn ⏭️"]);
        if (choice.includes("Skip")) {
            game.log("⏭️ You chose to skip your turn.");
            return;
        }

        const events = ["Loan shark 🦈", "Shady bets 🎲", "Rig the game 🛠️", "Getting robbed 🔫", "Illegal gambling 🃏", "Hippodrome 🏇"];
        let event;

        if (player.hasItem("X-Ray Glasses")) {
            game.log("🕶️ X-Ray Glasses allow you to choose your event!");
            event = await game.getChoice("Choose an event:", events);
            player.removeItem("X-Ray Glasses");
        } else {
            event = events[Math.floor(Math.random() * events.length)];
        }

        game.log(`🎭 Event: ${event}`);
        await this.handleEvent(event, player, game);
    }

    async handleEvent(event, player, game) {
        if (event.includes("Loan shark")) {
            player.money += 2500;
            player.debt += 2500;
            game.log("🦈 Received 2500 money, debt increased by 2500.");
        } else if (event.includes("Shady bets")) {
            const roll = await game.rollDice(player, "Roll for Shady Bets! 🎲");
            game.log(`🎲 Rolled ${roll}`);
            if (roll <= 2) {
                player.money -= this.shadyBetLoss;
                game.log(`💸 Lost ${this.shadyBetLoss} money.`);
            } else if (roll <= 4) {
                game.log("😐 Nothing happened.");
            } else {
                player.shadyBetBonus = true;
                game.log("🔥 Double next casino win!");
            }
        } else if (event.includes("Rig the game")) {
            if (player.money >= this.rigGameCost) {
                player.money -= this.rigGameCost;
                player.riggedGame = true;
                game.log(`🛠️ Paid ${this.rigGameCost}. You cannot bust in your next casino visit.`);
            } else {
                game.log("❌ Not enough money to rig the game.");
            }
        } else if (event.includes("Getting robbed")) {
            player.money -= 1000;
            game.log("🔫 Lost 1000 money.");
        } else if (event.includes("Illegal gambling")) {
            if (game.players.length < 2) {
                game.log("⚠️ Not enough players for illegal gambling. Event skipped.");
                return;
            }
            const opponents = game.players.filter(p => p !== player);
            const opponentName = await game.getChoice("Choose an opponent:", opponents.map(p => p.name));
            const opponent = opponents.find(p => p.name === opponentName);

            const bet = await game.getIntInput("Enter bet amount (up to 5000): ", 0, Math.min(5000, Math.max(0, player.money)));
            const pRoll = await game.rollDice(player, `${player.name}, roll! 🎲`);
            const oRoll = await game.rollDice(opponent, `${opponent.name}, roll! 🎲`);
            game.log(`🃏 ${player.name} rolled ${pRoll}, ${opponent.name} rolled ${oRoll}`);
            if (pRoll > oRoll) {
                player.money += bet;
                opponent.money -= bet;
                game.log(`🏆 ${player.name} wins ${bet}!`);
            } else if (oRoll > pRoll) {
                player.money -= bet;
                opponent.money += bet;
                game.log(`🏆 ${opponent.name} wins ${bet}!`);
            } else {
                game.log("🤝 It's a tie! No money exchanged.");
            }
        } else if (event.includes("Hippodrome")) {
            const hBet = await game.getIntInput("Enter bet amount: ", 0, Math.max(0, player.money));
            const guessChoices = ["1", "2", "3", "4", "5", "6"];
            const guess = parseInt(await game.getChoice("Choose a dice number:", guessChoices));
            const hRoll = await game.rollDice(player, "Horse racing roll! 🎲");
            game.log(`🎲 Rolled ${hRoll}`);
            if (hRoll === guess) {
                player.money += hBet * 10;
                game.log(`🏇 Correct! You won ${hBet * 10}!`);
            } else {
                player.money -= hBet;
                game.log(`🏇 Wrong! You lost ${hBet}.`);
            }
        }
    }
}

class ShopTile extends Tile {
    constructor() {
        super("Shop", "🛍️");
        this.prices = {
            "Second Chance 🔄": 1000,
            "Insurance 🛡️": 800,
            "Loaded Dice 🎲": 500,
            "Peek 🔍": 700,
            "X-Ray Glasses 🕶️": 1000,
            "Lottery Ticket 🎫": 500
        };
    }

    async onLand(player, game) {
        await super.onLand(player, game);
        game.log("Welcome to the Shop! Items available (one per turn):");
        const items = Object.keys(this.prices);

        const choices = items.map(item => `${item} (${this.prices[item]})`);
        choices.push("Leave 🚪");

        const choice = await game.getChoice("Choose an item to buy:", choices);
        if (choice.includes("Leave")) {
            game.log("🚪 Leaving shop.");
            return;
        }

        const selectedItemKey = items.find(k => choice.startsWith(k));
        const price = this.prices[selectedItemKey];

        if (player.money >= price) {
            player.money -= price;
            game.log(`🛍️ Bought ${selectedItemKey} for ${price}.`);
            if (selectedItemKey.includes("Lottery Ticket")) {
                game.log("🎫 Using Lottery Ticket immediately...");
                const roll = await game.rollDice(player, "Lottery roll! 🎲");
                game.log(`🎲 Rolled ${roll}`);
                if (roll >= 6) {
                    player.money += 3500;
                    game.log("🎊 JACKPOT! You won 3500!");
                } else {
                    game.log("😢 Better luck next time.");
                }
            } else {
                // Strip emoji for internal storage if needed, or keep it
                player.addItem(selectedItemKey.split(' ')[0]);
            }
        } else {
            game.log("❌ Not enough money!");
        }
    }
}

module.exports = { Tile, RehabTile, CasinoTile, BackAlleyTile, ShopTile };
