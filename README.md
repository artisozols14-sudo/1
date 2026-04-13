# Debt Escape Board Game

A circular board game where players must navigate various locations to escape a starting debt of 50,000.

## How to Launch (NPM)

### Option 1: Using NPM (Recommended)
Run the following commands in your terminal:
```bash
npm install
npm start
```
Then visit `http://localhost:3000` in your browser.

## How to Launch (Python)

### Option 1: Using the Shell Script (Recommended)
Simply run the following command in your terminal:
```bash
./run.sh
```
Then visit `http://localhost:5000` in your browser.

### Option 2: Using Docker
If you have Docker installed, you can build and run the container:
```bash
docker build -t debt-escape .
docker run -p 5000:5000 debt-escape
```
Then visit `http://localhost:5000` in your browser.

### Option 3: Manual Python Execution
If you prefer running it manually:
```bash
pip install flask
python3 app.py
```

## Features
- **Casino**: Dice-based Blackjack with items like Peek and Insurance.
- **Back Alley**: High-risk, high-reward events.
- **Shop**: One-time use items to boost your odds.
- **Rehab Center**: Get help with debt or financial injections.

## Development
- **Tests**: `python3 -m unittest tests/test_game.py`
- **CLI Version**: `python3 src/main.py`
- **Demo Script**: `python3 demo.py`
