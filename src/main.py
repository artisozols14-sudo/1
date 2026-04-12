from src.game import Game

def main():
    print("Welcome to the Debt Escape Board Game!")
    try:
        num_players = int(input("Enter number of players: "))
        player_names = []
        for i in range(num_players):
            name = input(f"Enter name for Player {i+1}: ")
            player_names.append(name)

        game = Game(player_names)
        game.start()
    except ValueError:
        print("Invalid input. Please restart the game.")
    except KeyboardInterrupt:
        print("\nGame exited.")

if __name__ == "__main__":
    main()
