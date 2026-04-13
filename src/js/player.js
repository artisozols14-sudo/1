class Player {
    constructor(name) {
        this.name = name;
        this.money = 0;
        this.debt = 50000;
        this.position = 0;
        this.inventory = [];
        this.riggedGame = false;
        this.shadyBetBonus = false;
        this.hasGettingHelpThisVisit = false;
    }

    addItem(item) {
        this.inventory.push(item);
    }

    hasItem(item) {
        return this.inventory.includes(item);
    }

    removeItem(item) {
        const index = this.inventory.indexOf(item);
        if (index > -1) {
            this.inventory.splice(index, 1);
            return true;
        }
        return false;
    }
}

module.exports = Player;
