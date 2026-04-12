from flask import Flask, render_template, request, jsonify, session
from src.game import Game
import os
import uuid
import threading
import queue
import time

app = Flask(__name__)
app.secret_key = os.urandom(24)

class ThreadedGame:
    def __init__(self, player_names):
        from src.player import Player
        self.players = [Player(name) for name in player_names]
        self.game = Game(player_names)
        self.game.players = self.players # Ensure shared players

        self.input_queue = queue.Queue()
        self.status_queue = queue.Queue()
        self.messages = []

        # Override game methods
        self.game.get_input = self._get_input
        self.game.log = self._log

        self.thread = threading.Thread(target=self._run)
        self.thread.daemon = True
        self.pending_input = None
        self.thread.start()

    def _log(self, msg):
        self.messages.append(msg)
        print(msg)

    def _get_input(self, prompt):
        self.pending_input = prompt
        self.status_queue.put("NEED_INPUT")
        return self.input_queue.get()

    def _run(self):
        while not self.game.game_over:
            self.status_queue.put("WAITING_FOR_TURN")
            # Wait for trigger to start turn
            cmd = self.input_queue.get()
            if cmd == "PLAY_TURN":
                self.game.play_turn()
        self.status_queue.put("GAME_OVER")

    def play_turn(self):
        self.messages = []
        self.input_queue.put("PLAY_TURN")

    def send_input(self, val):
        self.messages = []
        self.pending_input = None
        self.input_queue.put(val)

games = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start():
    data = request.json
    player_names = data.get('names', ["Player 1"])
    game_id = str(uuid.uuid4())
    games[game_id] = ThreadedGame(player_names)
    session['game_id'] = game_id
    # Wait for initial status
    games[game_id].status_queue.get()
    return jsonify({"game_id": game_id})

@app.route('/state')
def state():
    game_id = session.get('game_id')
    if not game_id or game_id not in games:
        return jsonify({"error": "No game found"}), 404

    tg = games[game_id]
    game = tg.game
    players_data = [{
        "name": p.name,
        "money": p.money,
        "debt": p.debt,
        "position": p.position,
        "inventory": p.inventory
    } for p in game.players]

    return jsonify({
        "players": players_data,
        "current_player_idx": game.current_player_idx,
        "messages": tg.messages,
        "game_over": game.game_over,
        "pending_input": tg.pending_input,
        "board": [t.name for t in game.board]
    })

@app.route('/action', methods=['POST'])
def action():
    game_id = session.get('game_id')
    if not game_id or game_id not in games:
        return jsonify({"error": "No game found"}), 404

    tg = games[game_id]
    data = request.json
    user_input = data.get('input')

    if tg.pending_input:
        tg.send_input(user_input)
    else:
        tg.play_turn()

    status = tg.status_queue.get()
    return jsonify({"status": status, "messages": tg.messages})

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
