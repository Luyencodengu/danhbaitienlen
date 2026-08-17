(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const Cards = app.Cards;
    const Rules = app.Rules;
    const UI = app.UI;
    const state = {
        playerCount: 4,
        players: [],
        currentPlayer: 0,
        tablePlay: null,
        roundOwner: null,
        firstMove: true,
        passedIds: new Set(),
        selectedIds: new Set(),
        rankings: [],
        started: false,
        overlayAction: "reveal"
    };

    function showSetup() {
        state.started = false;
        document.getElementById("friendsSetup").hidden = false;
        document.getElementById("friendsGame").hidden = true;
        document.getElementById("passDeviceOverlay").hidden = true;
        renderNameInputs();
    }

    function renderNameInputs() {
        document.getElementById("friendNames").innerHTML = Array.from({ length: state.playerCount }, function (_, index) {
            return "<input type=\"text\" maxlength=\"18\" value=\"Người chơi " + (index + 1) + "\" aria-label=\"Tên người chơi " + (index + 1) + "\">";
        }).join("");
    }

    function createHands(count) {
        const deck = Cards.shuffle(Cards.createDeck());
        const limit = count * 13;
        const threeIndex = deck.findIndex(Cards.isThreeSpades);
        if (threeIndex >= limit) {
            const temporary = deck[0];
            deck[0] = deck[threeIndex];
            deck[threeIndex] = temporary;
        }
        return Array.from({ length: count }, function (_, playerIndex) {
            return Cards.sortCards(deck.slice(playerIndex * 13, playerIndex * 13 + 13));
        });
    }

    function startGame() {
        const names = Array.from(document.querySelectorAll("#friendNames input")).map(function (input, index) {
            return input.value.trim() || "Người chơi " + (index + 1);
        });
        const hands = createHands(state.playerCount);
        state.players = names.map(function (name, index) {
            return { id: index, name: name, hand: hands[index], finished: false, rank: null, passed: false };
        });
        state.currentPlayer = state.players.find(function (player) {
            return player.hand.some(Cards.isThreeSpades);
        }).id;
        state.tablePlay = null;
        state.roundOwner = null;
        state.firstMove = true;
        state.passedIds.clear();
        state.selectedIds.clear();
        state.rankings = [];
        state.started = true;
        document.getElementById("friendsSetup").hidden = true;
        document.getElementById("friendsGame").hidden = false;
        hidePrivateCards();
        showPassOverlay();
    }

    function hidePrivateCards() {
        document.getElementById("friendHand").innerHTML = "";
        document.getElementById("friendSelectedTray").innerHTML = "<span>Bài đã chọn</span>";
    }

    function showPassOverlay() {
        hidePrivateCards();
        const player = state.players[state.currentPlayer];
        state.overlayAction = "reveal";
        document.getElementById("passPlayerName").textContent = player.name;
        document.getElementById("revealFriendHand").textContent = "Tôi đã sẵn sàng • Xem bài";
        document.getElementById("passDeviceOverlay").hidden = false;
    }

    function revealHand() {
        if (state.overlayAction === "setup") {
            showSetup();
            return;
        }
        document.getElementById("passDeviceOverlay").hidden = true;
        render();
    }

    function render() {
        if (!state.started) {
            return;
        }
        const player = state.players[state.currentPlayer];
        const selected = player.hand.filter(function (card) { return state.selectedIds.has(card.id); });
        const remaining = player.hand.filter(function (card) { return !state.selectedIds.has(card.id); });
        document.getElementById("friendTurnName").textContent = "Lượt của " + player.name + " • " + player.hand.length + " lá";
        document.getElementById("friendTableInfo").textContent = state.tablePlay ? state.tablePlay.combo.name + " • " + state.players[state.tablePlay.playerId].name + " vừa đánh" : "Vòng mới – được đánh bộ bất kỳ";
        document.getElementById("friendHand").innerHTML = remaining.map(function (card) {
            return UI.cardMarkup(card, { clickable: true });
        }).join("");
        document.getElementById("friendSelectedTray").innerHTML = selected.length ? selected.map(function (card) {
            return UI.cardMarkup(card, { clickable: true });
        }).join("") : "<span>Chạm vào bài để đưa lên</span>";
        document.getElementById("friendSelectedCount").textContent = selected.length;
        document.getElementById("friendPass").disabled = !state.tablePlay;
        renderTable();
    }

    function renderTable() {
        document.getElementById("friendPlayedCards").innerHTML = state.tablePlay ? state.tablePlay.cards.map(function (card) {
            return UI.cardMarkup(card, { compact: true });
        }).join("") : "";
    }

    function toggleCard(cardId) {
        if (state.selectedIds.has(cardId)) {
            state.selectedIds.delete(cardId);
        } else {
            state.selectedIds.add(cardId);
        }
        render();
    }

    function selectedCards() {
        return state.players[state.currentPlayer].hand.filter(function (card) {
            return state.selectedIds.has(card.id);
        });
    }

    function clearPasses() {
        state.passedIds.clear();
        state.players.forEach(function (player) { player.passed = false; });
    }

    function nextActive(fromId) {
        for (let offset = 1; offset <= state.players.length; offset += 1) {
            const candidate = (fromId + offset) % state.players.length;
            if (!state.players[candidate].finished) {
                return candidate;
            }
        }
        return fromId;
    }

    function finishPlayer(player) {
        player.finished = true;
        player.rank = state.rankings.length + 1;
        state.rankings.push(player);
        const remaining = state.players.filter(function (item) { return !item.finished; });
        if (remaining.length === 1) {
            remaining[0].finished = true;
            remaining[0].rank = state.rankings.length + 1;
            state.rankings.push(remaining[0]);
            showWinner();
            return true;
        }
        return false;
    }

    function showWinner() {
        state.started = false;
        hidePrivateCards();
        state.overlayAction = "setup";
        document.getElementById("passPlayerName").textContent = state.rankings[0].name + " chiến thắng!";
        document.getElementById("revealFriendHand").textContent = "Về tạo bàn mới";
        document.getElementById("passDeviceOverlay").hidden = false;
    }

    function playCards() {
        const player = state.players[state.currentPlayer];
        const cards = selectedCards();
        const combo = Rules.classify(cards);
        if (!combo.valid) {
            app.Portal.toast(combo.reason, "error");
            return;
        }
        if (state.firstMove && !cards.some(Cards.isThreeSpades)) {
            app.Portal.toast("Nước đầu tiên phải chứa 3♠.", "error");
            return;
        }
        if (state.tablePlay && !Rules.canBeat(combo, state.tablePlay.combo)) {
            app.Portal.toast(Rules.explainWhyCannotBeat(combo, state.tablePlay.combo), "error");
            return;
        }
        const ids = new Set(cards.map(function (card) { return card.id; }));
        player.hand = player.hand.filter(function (card) { return !ids.has(card.id); });
        clearPasses();
        state.tablePlay = { playerId: player.id, cards: cards.slice().sort(Cards.compareCards), combo: combo };
        state.roundOwner = player.id;
        state.firstMove = false;
        state.selectedIds.clear();
        if (player.hand.length === 0 && finishPlayer(player)) {
            return;
        }
        state.currentPlayer = nextActive(player.id);
        showPassOverlay();
    }

    function passTurn() {
        if (!state.tablePlay) {
            return;
        }
        const player = state.players[state.currentPlayer];
        player.passed = true;
        state.passedIds.add(player.id);
        state.selectedIds.clear();
        const active = state.players.filter(function (item) { return !item.finished; });
        const ownerActive = !state.players[state.roundOwner].finished;
        const passesNeeded = active.length - (ownerActive ? 1 : 0);
        if (state.passedIds.size >= passesNeeded) {
            const leader = ownerActive ? state.roundOwner : nextActive(state.roundOwner);
            state.tablePlay = null;
            state.roundOwner = null;
            clearPasses();
            state.currentPlayer = leader;
        } else {
            state.currentPlayer = nextActive(player.id);
        }
        showPassOverlay();
    }

    document.querySelectorAll("[data-count]").forEach(function (button) {
        button.addEventListener("click", function () {
            state.playerCount = Number(button.dataset.count);
            document.querySelectorAll("[data-count]").forEach(function (item) {
                item.classList.toggle("active", item === button);
            });
            renderNameInputs();
        });
    });

    [document.getElementById("friendHand"), document.getElementById("friendSelectedTray")].forEach(function (container) {
        container.addEventListener("click", function (event) {
            const card = event.target.closest("[data-card-id]");
            if (card) {
                toggleCard(card.dataset.cardId);
            }
        });
    });

    document.getElementById("startFriendsButton").addEventListener("click", startGame);
    document.getElementById("friendPlay").addEventListener("click", playCards);
    document.getElementById("friendPass").addEventListener("click", passTurn);
    document.getElementById("revealFriendHand").addEventListener("click", revealHand);
    document.getElementById("friendsNewGame").addEventListener("click", showSetup);

    app.Friends = {
        showSetup: showSetup,
        stop: function () {
            state.started = false;
            document.getElementById("passDeviceOverlay").hidden = true;
        }
    };
}());
