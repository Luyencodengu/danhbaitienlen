(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const Cards = app.Cards;
    const Rules = app.Rules;
    const Bot = app.Bot;
    const UI = app.UI;

    let botTimer = null;

    const state = {
        started: false,
        gameOver: false,
        firstMove: true,
        currentPlayer: 0,
        roundOwner: null,
        tablePlay: null,
        selectedCardIds: new Set(),
        passedPlayerIds: new Set(),
        rankings: [],
        players: createPlayers()
    };

    function createPlayers() {
        return [
            { id: 0, name: "Bạn", isBot: false, hand: [], passed: false, finished: false, rank: null },
            { id: 1, name: "Máy 1", isBot: true, hand: [], passed: false, finished: false, rank: null },
            { id: 2, name: "Máy 2", isBot: true, hand: [], passed: false, finished: false, rank: null },
            { id: 3, name: "Máy 3", isBot: true, hand: [], passed: false, finished: false, rank: null }
        ];
    }

    function resetPlayers() {
        const hands = Cards.deal(4);
        state.players = createPlayers();
        state.players.forEach(function (player, index) {
            player.hand = hands[index];
        });
    }

    function findStartingPlayer() {
        return state.players.find(function (player) {
            return player.hand.some(Cards.isThreeSpades);
        }).id;
    }

    function startGame() {
        window.clearTimeout(botTimer);
        resetPlayers();

        state.started = true;
        state.gameOver = false;
        state.firstMove = true;
        state.currentPlayer = findStartingPlayer();
        state.roundOwner = null;
        state.tablePlay = null;
        state.selectedCardIds.clear();
        state.passedPlayerIds.clear();
        state.rankings = [];

        UI.render(state);

        if (state.currentPlayer === 0) {
            UI.toast("Bạn có 3♠ nên được đi trước.", "success");
        } else {
            UI.toast(state.players[state.currentPlayer].name + " có 3♠ và được đi trước.");
        }

        scheduleCurrentTurn();
    }

    function isHumanTurn() {
        return state.started && !state.gameOver && state.currentPlayer === 0 && !state.players[0].finished;
    }

    function toggleCard(cardId) {
        if (!isHumanTurn()) {
            return;
        }

        if (state.selectedCardIds.has(cardId)) {
            state.selectedCardIds.delete(cardId);
        } else {
            state.selectedCardIds.add(cardId);
        }

        UI.render(state);
    }

    function selectedCards() {
        return state.players[0].hand.filter(function (card) {
            return state.selectedCardIds.has(card.id);
        });
    }

    function playSelectedCards() {
        if (!isHumanTurn()) {
            return;
        }

        const cards = selectedCards();
        const combo = Rules.classify(cards);

        if (!combo.valid) {
            UI.toast(combo.reason, "error");
            return;
        }

        if (state.firstMove && !cards.some(Cards.isThreeSpades)) {
            UI.toast("Nước đầu tiên của ván phải có lá 3♠.", "error");
            return;
        }

        if (state.tablePlay && !Rules.canBeat(combo, state.tablePlay.combo)) {
            UI.toast(Rules.explainWhyCannotBeat(combo, state.tablePlay.combo), "error");
            return;
        }

        commitPlay(0, cards, combo);
    }

    function removeCardsFromHand(player, playedCards) {
        const playedIds = new Set(playedCards.map(function (card) { return card.id; }));
        player.hand = player.hand.filter(function (card) {
            return !playedIds.has(card.id);
        });
    }

    function clearPasses() {
        state.passedPlayerIds.clear();
        state.players.forEach(function (player) {
            player.passed = false;
        });
    }

    function commitPlay(playerId, cards, combo) {
        const player = state.players[playerId];

        removeCardsFromHand(player, cards);
        clearPasses();
        state.tablePlay = {
            playerId: playerId,
            cards: cards.slice().sort(Cards.compareCards),
            combo: combo
        };
        state.roundOwner = playerId;
        state.firstMove = false;
        state.selectedCardIds.clear();

        if (player.hand.length === 0) {
            finishPlayer(player);
        }

        if (state.gameOver) {
            UI.render(state);
            botTimer = window.setTimeout(function () {
                UI.showResult(state.rankings);
            }, 700);
            return;
        }

        state.currentPlayer = nextActivePlayer(playerId);
        UI.render(state);

        if (combo.type === "quad" || combo.type === "pairSequence") {
            UI.toast(player.name + " đánh " + combo.name + "!", "warning");
        }

        scheduleCurrentTurn();
    }

    function finishPlayer(player) {
        if (player.finished) {
            return;
        }

        player.finished = true;
        player.rank = state.rankings.length + 1;
        state.rankings.push(player);

        const remaining = state.players.filter(function (item) { return !item.finished; });

        if (remaining.length === 1) {
            remaining[0].finished = true;
            remaining[0].rank = state.rankings.length + 1;
            state.rankings.push(remaining[0]);
            state.gameOver = true;
        }
    }

    function nextActivePlayer(fromPlayerId) {
        for (let offset = 1; offset <= state.players.length; offset += 1) {
            const candidateId = (fromPlayerId + offset) % state.players.length;
            if (!state.players[candidateId].finished) {
                return candidateId;
            }
        }

        return fromPlayerId;
    }

    function passTurn(playerId) {
        if (!state.tablePlay || state.gameOver || state.currentPlayer !== playerId) {
            return;
        }

        const player = state.players[playerId];
        player.passed = true;
        state.passedPlayerIds.add(playerId);
        state.selectedCardIds.clear();

        const activePlayers = state.players.filter(function (item) { return !item.finished; });
        const ownerIsActive = !state.players[state.roundOwner].finished;
        const passesNeeded = activePlayers.length - (ownerIsActive ? 1 : 0);

        if (state.passedPlayerIds.size >= passesNeeded) {
            const newLeader = ownerIsActive ? state.roundOwner : nextActivePlayer(state.roundOwner);
            state.tablePlay = null;
            state.roundOwner = null;
            clearPasses();
            state.currentPlayer = newLeader;
            UI.toast(state.players[newLeader].name + " mở vòng mới.", "success");
        } else {
            state.currentPlayer = nextActivePlayer(playerId);
        }

        UI.render(state);
        scheduleCurrentTurn();
    }

    function humanPass() {
        if (isHumanTurn()) {
            passTurn(0);
        }
    }

    function sortHumanCards() {
        Cards.sortCards(state.players[0].hand);
        UI.render(state);
    }

    function scheduleCurrentTurn() {
        window.clearTimeout(botTimer);

        if (state.gameOver || !state.started) {
            return;
        }

        const current = state.players[state.currentPlayer];
        if (!current.isBot) {
            return;
        }

        botTimer = window.setTimeout(function () {
            makeBotMove(current.id);
        }, 650 + Math.floor(Math.random() * 450));
    }

    function makeBotMove(playerId) {
        if (state.gameOver || state.currentPlayer !== playerId) {
            return;
        }

        const player = state.players[playerId];
        const currentCombo = state.tablePlay ? state.tablePlay.combo : null;
        const move = Bot.chooseMove(player.hand, currentCombo, {
            requiredCardId: state.firstMove ? "3-0" : null,
            opponents: state.players.filter(function (item) { return item.id !== playerId; })
        });

        if (!move) {
            passTurn(playerId);
            return;
        }

        commitPlay(playerId, move.cards, move.combo);
    }

    UI.init({
        onStart: startGame,
        onNewGame: startGame,
        onCardToggle: toggleCard,
        onPlay: playSelectedCards,
        onPass: humanPass,
        onSort: sortHumanCards
    });

    UI.render(state);
}());
