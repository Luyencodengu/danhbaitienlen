(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const Cards = app.Cards;

    const elements = {};
    let handlers = {};
    let toastTimer = null;
    let renderedDealSequence = 0;
    let renderedPlaySequence = 0;

    function cacheElements() {
        elements.gameBoard = document.getElementById("gameBoard");
        elements.turnBadge = document.getElementById("turnBadge");
        elements.tableMessage = document.getElementById("tableMessage");
        elements.playedCards = document.getElementById("playedCards");
        elements.lastPlayer = document.getElementById("lastPlayer");
        elements.humanHand = document.getElementById("humanHand");
        elements.selectedTray = document.getElementById("selectedTray");
        elements.selectedCount = document.getElementById("selectedCount");
        elements.playButton = document.getElementById("playButton");
        elements.passButton = document.getElementById("passButton");
        elements.sortButton = document.getElementById("sortButton");
        elements.rulesModal = document.getElementById("rulesModal");
        elements.resultModal = document.getElementById("resultModal");
        elements.resultTitle = document.getElementById("resultTitle");
        elements.resultIcon = document.getElementById("resultIcon");
        elements.rankingList = document.getElementById("rankingList");
        elements.tokenResult = document.getElementById("tokenResult");
        elements.toast = document.getElementById("toast");
    }

    function bindEvents() {
        document.getElementById("newGameButton").addEventListener("click", handlers.onNewGame);
        document.getElementById("playAgainButton").addEventListener("click", function () {
            closeModal(elements.resultModal);
            handlers.onNewGame();
        });
        document.getElementById("rulesButton").addEventListener("click", function () {
            openModal(elements.rulesModal);
        });
        document.getElementById("closeRulesButton").addEventListener("click", function () {
            closeModal(elements.rulesModal);
        });
        document.getElementById("understoodButton").addEventListener("click", function () {
            closeModal(elements.rulesModal);
        });

        elements.playButton.addEventListener("click", handlers.onPlay);
        elements.passButton.addEventListener("click", handlers.onPass);
        elements.sortButton.addEventListener("click", handlers.onSort);

        elements.humanHand.addEventListener("click", function (event) {
            const cardButton = event.target.closest("[data-card-id]");
            if (cardButton) {
                handlers.onCardToggle(cardButton.dataset.cardId);
            }
        });

        elements.selectedTray.addEventListener("click", function (event) {
            const cardButton = event.target.closest("[data-card-id]");
            if (cardButton) {
                handlers.onCardToggle(cardButton.dataset.cardId);
            }
        });

        [elements.rulesModal].forEach(function (modal) {
            modal.addEventListener("click", function (event) {
                if (event.target === modal) {
                    closeModal(modal);
                }
            });
        });
    }

    function init(callbacks) {
        handlers = callbacks;
        cacheElements();
        bindEvents();
    }

    function openModal(modal) {
        modal.classList.add("open");
    }

    function closeModal(modal) {
        modal.classList.remove("open");
    }

    function cardMarkup(card, options) {
        const settings = options || {};
        const suit = Cards.getSuit(card.suit);
        const selectedClass = settings.selected ? " selected" : "";
        const compactClass = settings.compact ? " compact" : "";
        const hintClass = settings.hint ? " hint" : "";
        const disabled = settings.disabled ? " disabled" : "";
        const dataAttribute = settings.clickable ? " data-card-id=\"" + card.id + "\"" : "";
        const tag = settings.clickable ? "button" : "div";
        const type = settings.clickable ? " type=\"button\"" : "";
        const label = Cards.cardName(card);

        return "<" + tag + type + dataAttribute + disabled +
            " class=\"playing-card " + suit.color + selectedClass + compactClass + hintClass + "\"" +
            " aria-label=\"" + label + (settings.selected ? ", đã chọn" : "") + "\">" +
            "<span class=\"card-corner top\"><strong>" + Cards.rankLabel(card.rank) + "</strong><i>" + suit.symbol + "</i></span>" +
            "<span class=\"card-suit\">" + suit.symbol + "</span>" +
            "<span class=\"card-corner bottom\"><strong>" + Cards.rankLabel(card.rank) + "</strong><i>" + suit.symbol + "</i></span>" +
            "</" + tag + ">";
    }

    function backCardsMarkup(count, vertical) {
        const visible = Math.min(count, 5);
        let html = "";

        for (let index = 0; index < visible; index += 1) {
            html += "<span class=\"card-back" + (vertical ? " vertical" : "") + "\" style=\"--card-index:" + index + "\"></span>";
        }

        return html;
    }

    function renderPlayer(player, isCurrent) {
        const seat = document.getElementById("player" + player.id);
        const count = seat.querySelector(".card-count");
        const status = seat.querySelector(".status-chip");
        const backCards = seat.querySelector(".back-cards");

        seat.classList.toggle("current", isCurrent && !player.finished);
        seat.classList.toggle("finished", player.finished);
        count.textContent = player.finished ? "Đã về" : player.hand.length + " lá";

        if (status) {
            if (player.finished) {
                status.textContent = "Hạng " + player.rank;
                status.className = "status-chip visible rank-chip";
            } else if (player.passed) {
                status.textContent = "Bỏ lượt";
                status.className = "status-chip visible pass-chip";
            } else if (isCurrent) {
                status.textContent = "Đang đánh";
                status.className = "status-chip visible turn-chip";
            } else {
                status.textContent = "";
                status.className = "status-chip";
            }
        }

        if (backCards) {
            backCards.innerHTML = player.finished ? "" : backCardsMarkup(player.hand.length, player.id === 1 || player.id === 3);
        }
    }

    function renderHumanHand(state) {
        const human = state.players[0];
        const disabled = state.currentPlayer !== 0 || state.gameOver || human.finished;

        const selectedCards = human.hand.filter(function (card) {
            return state.selectedCardIds.has(card.id);
        });

        const handCards = human.hand.filter(function (card) {
            return !state.selectedCardIds.has(card.id);
        });

        elements.humanHand.innerHTML = handCards.map(function (card) {
            return cardMarkup(card, {
                clickable: true,
                selected: false,
                hint: state.hintCardIds && state.hintCardIds.has(card.id),
                disabled: disabled
            });
        }).join("");

        elements.selectedTray.innerHTML = selectedCards.length ? selectedCards.map(function (card) {
            return cardMarkup(card, {
                clickable: true,
                selected: false,
                disabled: disabled
            });
        }).join("") : "<span>Chạm vào bài để đưa lên</span>";

        elements.selectedCount.textContent = state.selectedCardIds.size;
    }

    function renderTable(state) {
        if (state.tablePlay) {
            elements.playedCards.innerHTML = state.tablePlay.cards.map(function (card) {
                return cardMarkup(card, { compact: true });
            }).join("");
            elements.tableMessage.textContent = state.tablePlay.combo.name;
            elements.lastPlayer.textContent = state.players[state.tablePlay.playerId].name + " vừa đánh";
            if (state.playSequence && state.playSequence !== renderedPlaySequence) {
                renderedPlaySequence = state.playSequence;
                animatePlayedCards(elements.playedCards, state.tablePlay.playerId);
            }
        } else {
            elements.playedCards.innerHTML = "";
            elements.tableMessage.textContent = state.started ? "Vòng mới – được đánh bộ bất kỳ" : "Nhấn “Bắt đầu chơi” để chia bài";
            elements.lastPlayer.textContent = "";
        }
    }

    function staggerCards(container, className) {
        if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        container.querySelectorAll(".playing-card, .card-back").forEach(function (card, index) {
            card.style.setProperty("--animation-index", index);
            card.classList.add(className);
        });
    }

    function animatePlayedCards(container, playerId) {
        container.dataset.playOrigin = String(playerId);
        staggerCards(container, "card-play-in");
    }

    function animateDeal(state) {
        staggerCards(elements.humanHand, "card-deal-in");
        state.players.forEach(function (player) {
            const seat = document.getElementById("player" + player.id);
            if (seat) staggerCards(seat.querySelector(".back-cards"), "card-deal-in");
        });
    }

    function renderControls(state) {
        const humanTurn = state.started && !state.gameOver && state.currentPlayer === 0 && !state.players[0].finished;
        const hasSelection = state.selectedCardIds.size > 0;

        elements.playButton.disabled = !humanTurn || !hasSelection;
        elements.passButton.disabled = !humanTurn || !state.tablePlay;
        elements.sortButton.disabled = !state.started || state.players[0].finished;

        if (!state.started) {
            elements.turnBadge.textContent = "Chưa bắt đầu";
        } else if (state.gameOver) {
            elements.turnBadge.textContent = "Đã kết thúc";
        } else if (state.currentPlayer === 0) {
            elements.turnBadge.textContent = "Lượt của bạn";
        } else {
            elements.turnBadge.textContent = "Lượt " + state.players[state.currentPlayer].name;
        }
    }

    function render(state) {
        state.players.forEach(function (player) {
            renderPlayer(player, state.currentPlayer === player.id);
        });
        renderHumanHand(state);
        renderTable(state);
        renderControls(state);
        elements.gameBoard.classList.toggle("human-turn", state.currentPlayer === 0 && state.started && !state.gameOver);
        if (state.dealSequence && state.dealSequence !== renderedDealSequence) {
            renderedDealSequence = state.dealSequence;
            animateDeal(state);
        }
    }

    function toast(message, type) {
        window.clearTimeout(toastTimer);
        elements.toast.textContent = message;
        elements.toast.className = "toast show " + (type || "info");
        toastTimer = window.setTimeout(function () {
            elements.toast.className = "toast";
        }, 2600);
    }

    function showResult(rankings, settlement) {
        const humanRank = rankings.findIndex(function (player) { return player.id === 0; }) + 1;
        const medals = ["🥇", "🥈", "🥉", "4"];

        elements.resultIcon.textContent = humanRank === 1 ? "🏆" : humanRank === 2 ? "🎉" : "🎴";
        elements.resultTitle.textContent = humanRank === 1 ? "Bạn chiến thắng!" : "Bạn về hạng " + humanRank;
        elements.rankingList.innerHTML = rankings.map(function (player, index) {
            const payout = settlement && settlement.payouts ? settlement.payouts[index] : null;
            return "<div class=\"ranking-item" + (player.id === 0 ? " human" : "") + "\">" +
                "<span class=\"medal\">" + medals[index] + "</span>" +
                "<strong>" + player.name + "</strong>" +
                "<span>Hạng " + (index + 1) + (payout === null ? "" : " • " + (payout >= 0 ? "+" : "") + payout.toLocaleString("vi-VN") + " token") + "</span>" +
                "</div>";
        }).join("");

        if (settlement) {
            elements.tokenResult.className = "token-result" + (settlement.delta < 0 ? " loss" : "");
            elements.tokenResult.textContent = (settlement.delta >= 0 ? "+" : "") +
                settlement.delta.toLocaleString("vi-VN") + " token • Số dư " +
                settlement.balance.toLocaleString("vi-VN");
        } else {
            elements.tokenResult.textContent = "";
        }
        openModal(elements.resultModal);
        if (settlement && app.Portal && app.Portal.animateTokenResult) {
            app.Portal.animateTokenResult(elements.tokenResult, settlement);
        }
    }

    app.UI = {
        init: init,
        render: render,
        toast: toast,
        showResult: showResult,
        openModal: openModal,
        closeModal: closeModal,
        cardMarkup: cardMarkup
    };
}());
