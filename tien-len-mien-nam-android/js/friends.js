(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const Cards = app.Cards;
    const Rules = app.Rules;
    const Bot = app.Bot;
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
        hintIds: new Set(),
        rankings: [],
        started: false,
        overlayAction: "reveal",
        dealSequence: 0,
        playSequence: 0
    };
    let renderedDealSequence = 0;
    let renderedPlaySequence = 0;

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
        state.hintIds.clear();
        state.rankings = [];
        state.started = true;
        state.dealSequence += 1;
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
        updateHints(player);
        document.getElementById("friendTurnName").textContent = "Lượt của " + player.name + " • " + player.hand.length + " lá";
        document.getElementById("friendTableInfo").textContent = state.tablePlay ? state.tablePlay.combo.name + " • " + state.players[state.tablePlay.playerId].name + " vừa đánh" : "Vòng mới – được đánh bộ bất kỳ";
        document.getElementById("friendHand").innerHTML = remaining.map(function (card) {
            return UI.cardMarkup(card, { clickable: true, hint: state.hintIds.has(card.id) });
        }).join("");
        document.getElementById("friendSelectedTray").innerHTML = selected.length ? selected.map(function (card) {
            return UI.cardMarkup(card, { clickable: true });
        }).join("") : "<span>Chạm vào bài để đưa lên</span>";
        document.getElementById("friendSelectedCount").textContent = selected.length;
        document.getElementById("friendPass").disabled = !state.tablePlay;
        renderTable();
        if (state.dealSequence !== renderedDealSequence) {
            renderedDealSequence = state.dealSequence;
            animateFriendCards(document.getElementById("friendHand"), "card-deal-in");
        }
    }

    function updateHints(player) {
        state.hintIds.clear();
        if (state.selectedIds.size) return;
        const move = Bot.chooseMove(player.hand, state.tablePlay ? state.tablePlay.combo : null, {
            requiredCardId: state.firstMove ? "3-0" : null,
            opponents: state.players.filter(function (item) { return item.id !== player.id; }),
            difficulty: "hard"
        });
        if (move) move.cards.forEach(function (card) { state.hintIds.add(card.id); });
    }

    function renderTable() {
        const table = document.getElementById("friendPlayedCards");
        table.innerHTML = state.tablePlay ? state.tablePlay.cards.map(function (card) {
            return UI.cardMarkup(card, { compact: true });
        }).join("") : "";
        if (state.tablePlay && state.playSequence !== renderedPlaySequence) {
            renderedPlaySequence = state.playSequence;
            table.dataset.playOrigin = "0";
            animateFriendCards(table, "card-play-in");
        }
    }

    function animateFriendCards(container, className) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        container.querySelectorAll(".playing-card").forEach(function (card, index) {
            card.style.setProperty("--animation-index", index);
            card.classList.add(className);
        });
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
            state.started = false;
            window.setTimeout(showWinner, 600);
            return true;
        }
        return false;
    }

    function showWinner() {
        state.started = false;
        hidePrivateCards();
        document.getElementById("passDeviceOverlay").hidden = true;
        const payouts = [40000, 20000, -5000, -10000];
        const medals = ["🥇", "🥈", "🥉", "4"];
        document.getElementById("friendResultTitle").textContent = state.rankings[0].name + " chiến thắng!";
        document.getElementById("friendRankingList").innerHTML = state.rankings.map(function (player, index) {
            const payout = payouts[index];
            return "<div class=\"ranking-item\"><span class=\"medal\">" + medals[index] + "</span><strong>" +
                player.name + "</strong><span>Hạng " + (index + 1) + " • " + (payout >= 0 ? "+" : "") +
                payout.toLocaleString("vi-VN") + " token</span></div>";
        }).join("");
        UI.openModal(document.getElementById("friendResultModal"));
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
        state.playSequence += 1;
        state.roundOwner = player.id;
        state.firstMove = false;
        state.selectedIds.clear();
        renderTable();
        if (player.hand.length === 0 && finishPlayer(player)) {
            return;
        }
        state.currentPlayer = nextActive(player.id);
        document.getElementById("friendsGame").classList.add("play-animating");
        window.setTimeout(function () {
            document.getElementById("friendsGame").classList.remove("play-animating");
            if (state.started) showPassOverlay();
        }, 520);
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

    function sortCurrentHand() {
        if (!state.started) return;
        Cards.sortCards(state.players[state.currentPlayer].hand);
        render();
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
    document.getElementById("friendSort").addEventListener("click", sortCurrentHand);
    document.getElementById("friendRules").addEventListener("click", function () { UI.openModal(document.getElementById("rulesModal")); });
    document.getElementById("friendResultNewGame").addEventListener("click", function () {
        UI.closeModal(document.getElementById("friendResultModal"));
        showSetup();
    });
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
