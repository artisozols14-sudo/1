import random

class Tile:
    def __init__(self, name):
        self.name = name

    def on_land(self, player, game):
        print(f"{player.name} landed on {self.name}")

class RehabTile(Tile):
    def __init__(self):
        super().__init__("Rehab Center")

    def on_land(self, player, game):
        super().on_land(player, game)
        player.has_getting_help_this_visit = False
        print("Welcome to Rehab. Options:")
        print("1. Getting Help (-1000 debt)")
        if player.money <= 0:
            print("2. I Don't Have a Problem (+5000 cash)")
        print("3. Pay off debt (1:1 ratio)")

        choice = game.get_input("Choose an option (or enter anything else to skip): ")
        if choice == "1":
            if not player.has_getting_help_this_visit:
                player.debt -= 1000
                player.has_getting_help_this_visit = True
                print("Debt reduced by 1000.")
            else:
                print("You already got help this visit.")
        elif choice == "2" and player.money <= 0:
            player.money += 5000
            print("Received 5000 cash. Good luck!")
        elif choice == "3":
            amount = game.get_int_input(f"How much debt do you want to pay off? (You have {player.money} money): ", 0, player.money)
            player.money -= amount
            player.debt -= amount
            print(f"Paid off {amount} debt.")

class CasinoTile(Tile):
    def __init__(self):
        super().__init__("Casino")

    def roll_die(self):
        return random.randint(1, 6)

    def handle_ace(self, game):
        print("You rolled a 1! It can be 1 or 6.")
        choice = game.get_int_input("Choose value for Ace (1 or 6): ", 1, 6)
        if choice == 6:
            return 6
        return 1

    def play_round(self, player, game):
        print(f"--- {player.name}'s Casino Turn ---")

        d1 = game.roll_dice(player)
        if d1 == 1: d1 = self.handle_ace(game)
        d2 = game.roll_dice(player)
        if d2 == 1: d2 = self.handle_ace(game)

        total = d1 + d2
        print(f"Initial rolls: {d1}, {d2}. Total: {total}")

        while total < 21:
            # Peek usage
            if player.has_item("Peek"):
                if game.get_bool_input("Use Peek? (y/n): "):
                    player.remove_item("Peek")
                    next_die = self.roll_die()
                    print(f"Next die would be: {next_die}")
                    if game.get_bool_input("Use it? (y/n): "):
                        if next_die == 1: next_die = self.handle_ace(game)
                        total += next_die
                        print(f"New total: {total}")
                        if total >= 21: break
                        continue
                    else:
                        print("Discarded.")

            action = game.get_input("Hit or Stand? (h/s): ").lower()
            if action == 'h':
                die = game.roll_dice(player)
                if die == 1: die = self.handle_ace(game)
                total += die
                print(f"Rolled {die}. New total: {total}")
            else:
                break

        return total

    def on_land(self, player, game):
        super().on_land(player, game)

        total = self.play_round(player, game)

        # Second Chance usage
        if player.has_item("Second Chance"):
            if game.get_bool_input("Use Second Chance to reroll whole turn? (y/n): "):
                player.remove_item("Second Chance")
                total = self.play_round(player, game)

        # Result calculation
        payout = 0
        bust = False
        if total < 15:
            payout = -500
        elif total == 15:
            payout = -250
        elif total == 16:
            payout = 0
        elif total == 17:
            payout = 500
        elif total <= 20:
            payout = 2000
        elif total == 21:
            payout = 4000
        else:
            print("BUST!")
            bust = True
            payout = -1000

        # Rigged Game / Insurance logic
        if bust:
            if player.rigged_game:
                print("Rigged Game effect activated! You avoided the bust.")
                player.rigged_game = False
                payout = 4000 # Assume winning if you don't bust? Or just 0? Rule says "can not bust".
                # Re-reading rules: "only next casino visit... can not bust". Usually means you get the best outcome or just avoid loss.
                # Let's say you get 21.
            elif player.has_item("Insurance"):
                if game.get_bool_input("Use Insurance to prevent bust? (y/n): "):
                    player.remove_item("Insurance")
                    print("Insurance used. No loss.")
                    payout = 0

        if not bust and player.shady_bet_bonus:
            print("Shady Bets bonus! Doubling your win.")
            payout *= 2
            player.shady_bet_bonus = False

        player.money += payout
        print(f"Final total: {total}. Payout: {payout}. Current money: {player.money}")

class BackAlleyTile(Tile):
    SHADY_BET_LOSS = 500
    RIG_GAME_COST = 1000

    def __init__(self):
        super().__init__("Back Alley")

    def on_land(self, player, game):
        super().on_land(player, game)

        if game.get_input("Do you want to skip your turn or receive an event? (skip/event): ").lower() == 'skip':
            print("You chose to skip your turn.")
            return

        events = [
            "Loan shark",
            "Shady bets",
            "Rig the game",
            "Getting robbed",
            "Illegal gambling",
            "Hippodrome"
        ]

        if player.has_item("X-Ray Glasses"):
            print("X-Ray Glasses allow you to choose your event!")
            for i, event in enumerate(events):
                print(f"{i+1}. {event}")
            choice = game.get_int_input("Choose an event: ", 1, len(events)) - 1
            event = events[choice]
            player.remove_item("X-Ray Glasses")
        else:
            event = random.choice(events)

        print(f"Event: {event}")
        self.handle_event(event, player, game)

    def handle_event(self, event, player, game):
        if event == "Loan shark":
            player.money += 2500
            player.debt += 2500
            print("Received 2500 money, debt increased by 2500.")

        elif event == "Shady bets":
            roll = game.roll_dice(player)
            print(f"Rolled {roll}")
            if roll <= 2:
                player.money -= self.SHADY_BET_LOSS
                print(f"Lost {self.SHADY_BET_LOSS} money.")
            elif roll <= 4:
                print("Nothing happened.")
            else:
                player.shady_bet_bonus = True
                print("Double next casino win!")

        elif event == "Rig the game":
            if player.money >= self.RIG_GAME_COST:
                player.money -= self.RIG_GAME_COST
                player.rigged_game = True
                print(f"Paid {self.RIG_GAME_COST}. You cannot bust in your next casino visit.")
            else:
                print("Not enough money to rig the game.")

        elif event == "Getting robbed":
            player.money -= 1000
            print("Lost 1000 money.")

        elif event == "Illegal gambling":
            if len(game.players) < 2:
                print("Not enough players for illegal gambling. Event skipped.")
                return

            opponents = [p for p in game.players if p != player]
            print("Choose an opponent:")
            for i, p in enumerate(opponents):
                print(f"{i+1}. {p.name}")
            opp_choice = game.get_int_input("Opponent index: ", 1, len(opponents)) - 1
            opponent = opponents[opp_choice]

            bet = game.get_int_input("Enter bet amount (up to 5000): ", 0, min(5000, max(0, player.money)))

            player_roll = game.roll_dice(player)
            opp_roll = game.roll_dice(opponent)
            print(f"{player.name} rolled {player_roll}, {opponent.name} rolled {opp_roll}")

            if player_roll > opp_roll:
                player.money += bet
                opponent.money -= bet
                print(f"{player.name} wins {bet}!")
            elif opp_roll > player_roll:
                player.money -= bet
                opponent.money += bet
                print(f"{opponent.name} wins {bet}!")
            else:
                print("It's a tie! No money exchanged.")

        elif event == "Hippodrome":
            bet = game.get_int_input("Enter bet amount: ", 0, max(0, player.money))
            guess = game.get_int_input("Choose a dice number (1-6): ", 1, 6)
            roll = game.roll_dice(player)
            print(f"Rolled {roll}")
            if roll == guess:
                player.money += bet * 10
                print(f"Correct! You won {bet * 10}!")
            else:
                player.money -= bet
                print(f"Wrong! You lost {bet}.")

class ShopTile(Tile):
    XRAY_GLASSES_PRICE = 1000
    PRICES = {
        "Second Chance": 1000,
        "Insurance": 800,
        "Loaded Dice": 500,
        "Peek": 700,
        "X-Ray Glasses": 1000, # Using the price constant directly in the dict
        "Lottery Ticket": 500
    }

    def __init__(self):
        super().__init__("Shop")

    def on_land(self, player, game):
        super().on_land(player, game)
        print("Welcome to the Shop! Items available (one per turn):")

        available_items = list(self.PRICES.keys())
        for i, item in enumerate(available_items):
            print(f"{i+1}. {item} ({self.PRICES[item]})")

        choice = game.get_input("Choose an item to buy (or enter anything else to leave): ")
        try:
            choice_idx = int(choice) - 1
            if 0 <= choice_idx < len(available_items):
                item_name = available_items[choice_idx]
                price = self.PRICES[item_name]

                if player.money >= price:
                    player.money -= price
                    print(f"Bought {item_name} for {price}.")

                    if item_name == "Lottery Ticket":
                        print("Using Lottery Ticket immediately...")
                        roll = game.roll_dice(player)
                        print(f"Rolled {roll}")
                        if roll >= 6: # Loaded Dice could make it 7
                            player.money += 3500
                            print("JACKPOT! You won 3500!")
                        else:
                            print("Better luck next time.")
                    else:
                        player.add_item(item_name)
                else:
                    print("Not enough money!")
            else:
                print("Invalid choice. Leaving shop.")
        except ValueError:
            print("Leaving shop.")
