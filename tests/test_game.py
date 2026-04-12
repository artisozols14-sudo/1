import unittest
from unittest.mock import MagicMock, patch
from src.player import Player
from src.tiles import RehabTile, CasinoTile, BackAlleyTile, ShopTile
from src.game import Game

class TestGameMechanics(unittest.TestCase):

    def setUp(self):
        self.player = Player("TestPlayer")
        self.game = Game(["TestPlayer"])
        self.game.players = [self.player]
        # Mock get_input to avoid blocking
        self.game.get_input = MagicMock(return_value="")

    def test_rehab_getting_help(self):
        self.player.debt = 50000
        rehab = RehabTile()
        self.game.get_input.return_value = "1"
        rehab.on_land(self.player, self.game)
        self.assertEqual(self.player.debt, 49000)

    def test_rehab_no_problem(self):
        self.player.money = 0
        rehab = RehabTile()
        self.game.get_input.return_value = "2"
        rehab.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 5000)

        # Test unavailable if money > 0
        self.player.money = 100
        self.game.get_input.return_value = "2"
        rehab.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 100) # Should not add 5000

    def test_rehab_pay_off_debt(self):
        self.player.money = 5000
        self.player.debt = 50000
        rehab = RehabTile()
        self.game.get_input.side_effect = ["3", "5000"]
        rehab.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 0)
        self.assertEqual(self.player.debt, 45000)

    @patch('random.randint')
    def test_casino_payout_win(self, mock_randint):
        # Mock rolls to get 21: 6, 5, then hit 5, 5
        mock_randint.side_effect = [6, 5, 5, 5]
        casino = CasinoTile()
        # Need to hit twice to get 21 (6+5=11, 11+5=16, 16+5=21)
        self.game.get_input.side_effect = ["h", "h", "s"]

        casino.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 4000)

    @patch('random.randint')
    def test_casino_bust_insurance(self, mock_randint):
        mock_randint.side_effect = [6, 6, 6, 6] # 6+6=12, +6=18, +6=24 (Bust)
        casino = CasinoTile()
        self.player.add_item("Insurance")
        self.player.money = 0
        # Hit twice to bust, then use insurance
        self.game.get_input.side_effect = ["h", "h", "y"]

        casino.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 0)
        self.assertFalse(self.player.has_item("Insurance"))

    def test_back_alley_loan_shark(self):
        self.player.money = 0
        self.player.debt = 50000
        alley = BackAlleyTile()
        self.game.get_input.return_value = "event"

        with patch('random.choice', return_value="Loan shark"):
            alley.on_land(self.player, self.game)

        self.assertEqual(self.player.money, 2500)
        self.assertEqual(self.player.debt, 52500)

    @patch('random.randint')
    def test_back_alley_shady_bets_loaded_dice(self, mock_randint):
        self.player.money = 1000
        self.player.add_item("Loaded Dice")
        alley = BackAlleyTile()
        # skip turn or event -> event, then use loaded dice -> y
        self.game.get_input.side_effect = ["event", "y"]
        mock_randint.return_value = 5 # 5 + 1 = 6 (Double next casino win)

        with patch('random.choice', return_value="Shady bets"):
            alley.on_land(self.player, self.game)

        self.assertTrue(self.player.shady_bet_bonus)
        self.assertFalse(self.player.has_item("Loaded Dice"))

    def test_shop_buy_item(self):
        self.player.money = 1000
        shop = ShopTile()
        self.game.get_input.return_value = "3" # Loaded Dice (500)

        shop.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 500)
        self.assertTrue(self.player.has_item("Loaded Dice"))

    @patch('random.randint')
    def test_shop_lottery_win(self, mock_randint):
        self.player.money = 500
        mock_randint.return_value = 6
        shop = ShopTile()
        self.game.get_input.return_value = "6" # Lottery Ticket (500)

        shop.on_land(self.player, self.game)
        self.assertEqual(self.player.money, 3500)
        self.assertFalse(self.player.has_item("Lottery Ticket")) # Used immediately

if __name__ == '__main__':
    unittest.main()
