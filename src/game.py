import random
from src.tiles import RehabTile, CasinoTile, BackAlleyTile, ShopTile, Tile

class Game:
    def __init__(self, player_names):
        from src.player import Player
        self.players = [Player(name) for name in player_names]
        self.board = self.create_board()
        self.current_player_idx = 0
        self.game_over = False
        self.messages = []
        self.pending_input = None # Store info about what input is needed

    def log(self, message):
        self.messages.append(message)
        print(message)

    def create_board(self):
        # Create a circular board with a mix of locations
        board = [
            RehabTile(),
            CasinoTile(),
            BackAlleyTile(),
            ShopTile(),
            CasinoTile(),
            BackAlleyTile(),
            Tile("Plain Tile"),
            CasinoTile(),
            ShopTile(),
            BackAlleyTile(),
            CasinoTile(),
            BackAlleyTile(),
            ShopTile(),
            Tile("Plain Tile"),
            CasinoTile(),
            BackAlleyTile()
        ]
        return board

    def get_input(self, prompt):
        # In UI-agnostic mode, we might need to pause execution here.
        # For now, let's keep it but ideally we move to a request/response model.
        return input(prompt)

    def get_int_input(self, prompt, min_val=None, max_val=None):
        while True:
            try:
                val = int(self.get_input(prompt))
                if min_val is not None and val < min_val:
                    self.log(f"Minimum value is {min_val}.")
                    continue
                if max_val is not None and val > max_val:
                    self.log(f"Maximum value is {max_val}.")
                    continue
                return val
            except ValueError:
                self.log("Invalid input. Please enter a number.")

    def get_bool_input(self, prompt):
        while True:
            val = self.get_input(prompt).lower()
            if val in ['y', 'yes']:
                return True
            if val in ['n', 'no']:
                return False
            self.log("Please enter 'y' or 'n'.")

    def use_loaded_dice(self, player):
        if player.has_item("Loaded Dice"):
            if self.get_bool_input(f"Use Loaded Dice for +1 to this roll? (y/n): "):
                player.remove_item("Loaded Dice")
                return 1
        return 0

    def roll_dice(self, player=None):
        roll = random.randint(1, 6)
        if player:
            bonus = self.use_loaded_dice(player)
            if bonus:
                roll += bonus
                self.log(f"Loaded Dice used! Roll: {roll}")
        return roll

    def move_player(self, player):
        roll = random.randint(1, 6)
        self.log(f"{player.name} rolled a {roll} for movement.")
        player.position = (player.position + roll) % len(self.board)
        tile = self.board[player.position]
        tile.on_land(player, self)

    def play_turn(self):
        player = self.players[self.current_player_idx]
        self.log(f"--- {player.name}'s Turn ---")
        self.log(str(player))
        self.move_player(player)

        if player.debt <= 0:
            self.log(f"CONGRATULATIONS {player.name}! You escaped debt and won the game!")
            self.game_over = True

        if not self.game_over:
            self.current_player_idx = (self.current_player_idx + 1) % len(self.players)

    def start(self):
        while not self.game_over:
            self.play_turn()
            if all(p.money < -100000 for p in self.players): # Arbitrary loss condition or just loop
                 print("Everyone is too far in debt. Game over.")
                 break
