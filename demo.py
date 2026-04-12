from unittest.mock import patch
from src.game import Game
from src.player import Player
import random

def run_demo():
    print("=== DEBT ESCAPE: PLAYABLE DEMO ===\n")

    # Setup game
    game = Game(["Alice"])
    alice = game.players[0]

    # Manually trigger some events to show them off

    print("--- Scenario 1: Rehab Center ---")
    print(f"Initial State: {alice}")
    # Alice starts with 0 money.
    with patch('builtins.input', side_effect=["2"]): # I Don't Have a Problem
        game.board[0].on_land(alice, game)
    print(f"After Rehab: {alice}\n")

    print("--- Scenario 2: Shop ---")
    # Alice now has 5000 money.
    with patch('builtins.input', side_effect=["6"]): # Buy Lottery Ticket
        with patch('random.randint', return_value=6): # Roll a 6 for lottery
            game.board[3].on_land(alice, game)
    print(f"After Shop: {alice}\n")

    print("--- Scenario 3: Casino ---")
    # Alice has 5000 - 500 + 3500 = 8000 money.
    print("Alice enters the Casino. She rolls two dice.")
    with patch('builtins.input', side_effect=["h", "s"]): # Hit then Stand
        with patch('random.randint', side_effect=[6, 5, 10]): # 6+5=11, then hit 10 (Wait, 1-6 only)
            with patch('src.tiles.random.randint', side_effect=[6, 5, 5]): # 6+5=11, hit 5 = 16
                game.board[1].on_land(alice, game)
    print(f"After Casino: {alice}\n")

    print("--- Scenario 4: Back Alley ---")
    # Alice has 8000 money.
    with patch('builtins.input', side_effect=["event"]):
        with patch('random.choice', return_value="Loan shark"):
            game.board[2].on_land(alice, game)
    print(f"After Back Alley: {alice}\n")

    print("--- Scenario 5: Paying off Debt at Rehab ---")
    with patch('builtins.input', side_effect=["3", "5000"]): # Pay off 5000 debt
        game.board[0].on_land(alice, game)
    print(f"Final State: {alice}\n")

    print("=== DEMO COMPLETE ===")

if __name__ == "__main__":
    run_demo()
