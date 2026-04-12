class Player:
    def __init__(self, name):
        self.name = name
        self.money = 0
        self.debt = 50000
        self.position = 0
        self.inventory = []
        self.rigged_game = False
        self.shady_bet_bonus = False
        self.has_getting_help_this_visit = False

    def __str__(self):
        return f"Player({self.name}, Money: {self.money}, Debt: {self.debt}, Pos: {self.position})"

    def add_item(self, item_name):
        self.inventory.append(item_name)

    def has_item(self, item_name):
        return item_name in self.inventory

    def remove_item(self, item_name):
        if item_name in self.inventory:
            self.inventory.remove(item_name)
            return True
        return False
