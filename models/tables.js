// load the things we need
var mongoose = require('mongoose');
var shuffle = require('shuffle-array');
var cardsArr = require('./cards');

// define the schema for our tables model
var tableSchema = mongoose.Schema({

    cards: {
        type: Array,
        default: shuffleCardsArr
    },
    arhCards: Array,
    croupier: {
        hand: Array,
        points: {
            type: Number,
            default: 0
        }
    },
    players: [{
        player: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fullName: {
            type: String,
            default: "Аноним"
        },
        avatarFile: String,
        hand: Array,
        balance: Number,
        bet: {
            type: Number,
            default: 0
        },
        points: {
            type: Number,
            default: 0
        },
        socketId: String,
        isPlaying: {
            type: Boolean,
            default: true
        }
    }],
    isTheGame: {
        type: Boolean,
        default: false
    },
    nextPlayer: {
        type: Number,
        default: 0
    }

});

//methods ======================
tableSchema.methods.setPlayerPoints = function (playersInd) {
    this.players[playersInd].points = calculatePoints(this.players[playersInd].hand);
};

tableSchema.methods.setCroupierPoints = function () {
    this.croupier.points = calculatePoints(this.croupier.hand);
};

tableSchema.methods.setBet = function (bet, userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    this.players[ind].balance -= bet;
    this.players[ind].bet += bet;
};

tableSchema.methods.returnBet = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    this.players[ind].balance += this.players[ind].bet;
    this.players[ind].bet = 0;
};

tableSchema.methods.setToZeroBet = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    this.players[ind].bet = 0;
};

tableSchema.methods.uppedBet = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    this.players[ind].bet = this.players[ind].bet * 1.5;
};

tableSchema.methods.getPlayerBalance = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return this.players[ind].balance
};

tableSchema.methods.getPlayerFullName = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return this.players[ind].fullName
};

tableSchema.methods.addPlayer = function(user, socketId) {
    if (this.canJoin()) {
        var newPlayer = {
            player: user._id,
            avatarFile: user.local.avatarFile,
            balance: user.local.balance,
            socketId: socketId
        };
        if (user.local.fName || user.local.lName) newPlayer.fullName = user.local.fName + " " + user.local.lName ;
        this.players.push(newPlayer);
    }
};

//при выходе если игра не начата удаляем его из стола, если игра начата - меняем свойство isPlaying
//если за столом неосталось играющих игроков, то удаляем его.
tableSchema.methods.quitPlayer = function(userId, callback) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    var balance = this.players[ind].balance + this.players[ind].bet;
    if (this.isTheGame) {
        this.players[ind].isPlaying = false;
    } else {
        this.players.splice(ind, 1);
    }
    if (this.players.length == 0 || !this.playersIsPresent()) {
        this.remove(callback(balance))
    } else {
        this.save(callback(balance));
    }
};

tableSchema.methods.playersIsPresent = function () {
    var ind = this.players.findIndex(function(i){
        if (i['isPlaying']) {
            return true
        }
    });
    return (ind >= 0)
};

tableSchema.methods.getCardForPlayer = function (userId) {
    var newCard = this.cards.shift();
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    this.players[ind].hand.push(newCard);
    this.setPlayerPoints(ind);
};

tableSchema.methods.getCardForCroupier = function () {
    var newCard = this.cards.shift();
    this.croupier.hand.push(newCard);
    this.setCroupierPoints();
};

//крупье должен брать карту если у него 16 или меньше очков
tableSchema.methods.isMustDrawCroupier = function () {
     return (this.croupier.points <= 16)
};

tableSchema.methods.cardsIsPresent = function () {
    return (this.cards.length > 0)
};

tableSchema.methods.movePlayerCardsToArh = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    this.arhCards = this.arhCards.concat(this.players[ind].hand);
    this.players[ind].hand = [];
};

tableSchema.methods.moveCroupierCardsToArh = function () {
    this.arhCards = this.arhCards.concat(this.croupier.hand);
    this.croupier.hand = [];
};

tableSchema.methods.isBusted = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return (this.players[ind].points > 21);
};

tableSchema.methods.isBlackjack = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return (this.players[ind].points == 21);
};

tableSchema.methods.isWorn = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return (this.players[ind].points <= 21
            && (this.players[ind].points > this.croupier.points
            || this.croupier.points > 21));
};

tableSchema.methods.isLost = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return ((this.players[ind].points < 21
            && this.players[ind].points < this.croupier.points
            && this.croupier.points <= 21)
            || (this.players[ind].points > 21));
};

tableSchema.methods.isDraw = function (userId) {
    var ind = this.players.findIndex(function(i){
        if (i['player'].equals(userId)) {
            return true
        }
    });
    return (this.players[ind].points <= 21
            && this.players[ind].points == this.croupier.points);
};

tableSchema.methods.canJoin = function () {
    if (!this.isTheGame)
        return (this.players.length < 5)
};

tableSchema.methods.startGame = function () {
    this.isTheGame = true;
};

//Подбираем индекс того чей следующий ход среди играющих игроков
tableSchema.methods.whoseTurn = function () {
    while (this.nextPlayer >= 0
            && this.nextPlayer < this.players.length
            && !this.players[this.nextPlayer].isPlaying)
    { this.nextPlayer++ }
    if (this.nextPlayer == this.players.length) this.nextPlayer = -1;
     return this.nextPlayer++;
};

tableSchema.statics.findActiveTables = function(callback){
    return this.find({isTheGame : false}).$where('this.players.length < 5').exec(callback)
};

//functions=====================
//перемешиваем карты
function shuffleCardsArr() {
    return shuffle(cardsArr)
}

//считаем очки. Туз по удобству 11, 10 или 1
function calculatePoints(hand) {
    var points = 0,
        countAce = 0;
    hand.forEach(function (card) {
        if (card.nominal == 'T') countAce += 1;
        points += card.point;
    });
    if (points > 21 && countAce > 0) points = reCalculatePointsWithAce(points, countAce);
    return points
}

//пересчет очков за тузы
function reCalculatePointsWithAce(points, countAce) {
    for (var i = 0; i < countAce; i++) {
        if (points > 21) points -= 1;
        if (points > 21) points -= 9;
    }
    return points;
}

// create the model for users and expose it to our app
module.exports = mongoose.model('Table', tableSchema);