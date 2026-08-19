(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const SUITS = ["♠", "♥", "♣", "♦"];
    const state = {
        tableau: [],
        stock: [],
        completed: 0,
        moves: 0,
        selected: null,
        difficulty: "easy",
        ended: false
    };
    let drag = null;
    let suppressClick = false;

    function rankLabel(rank) {
        return ({ 1: "A", 11: "J", 12: "Q", 13: "K" })[rank] || String(rank);
    }

    function shuffle(cards) {
        const result = cards.slice();
        for (let index = result.length - 1; index > 0; index -= 1) {
            const target = Math.floor(Math.random() * (index + 1));
            const temporary = result[index];
            result[index] = result[target];
            result[target] = temporary;
        }
        return result;
    }

    function createDeck(difficulty) {
        const cards = [];
        let id = 0;
        if (difficulty === "easy") {
            for (let copy = 0; copy < 8; copy += 1) {
                for (let rank = 1; rank <= 13; rank += 1) {
                    cards.push({ id: "sp-" + (id += 1), rank: rank, suit: 0, faceUp: false });
                }
            }
        } else {
            for (let copy = 0; copy < 2; copy += 1) {
                for (let suit = 0; suit < 4; suit += 1) {
                    for (let rank = 1; rank <= 13; rank += 1) {
                        cards.push({ id: "sp-" + (id += 1), rank: rank, suit: suit, faceUp: false });
                    }
                }
            }
        }
        return shuffle(cards);
    }

    function start(difficulty) {
        const deck = createDeck(difficulty || "easy");
        const counts = [6, 6, 6, 6, 5, 5, 5, 5, 5, 5];
        state.tableau = Array.from({ length: 10 }, function () { return []; });
        state.completed = 0;
        state.moves = 0;
        state.selected = null;
        state.difficulty = difficulty || "easy";
        state.ended = false;

        counts.forEach(function (count, columnIndex) {
            for (let cardIndex = 0; cardIndex < count; cardIndex += 1) {
                const card = deck.pop();
                card.faceUp = cardIndex === count - 1;
                state.tableau[columnIndex].push(card);
            }
        });
        state.stock = deck;
        render();
        animateDeal("#spiderTableau .sol-card", 22);
    }

    function animateDeal(selector, step) {
        document.querySelectorAll(selector).forEach(function (card, index) {
            card.style.setProperty("--deal-delay", (index * step) + "ms");
            card.classList.add("dealing");
        });
    }

    function celebrateSet() {
        const board = document.querySelector("#spiderScreen .solitaire-board");
        const effect = document.createElement("div");
        effect.className = "set-complete-fx";
        effect.innerHTML = "<strong>HOÀN TẤT BỘ K → A</strong>" + Array.from({ length: 18 }, function (_, index) {
            return "<i style=\"--star-angle:" + (index * 20) + "deg\">✦</i>";
        }).join("");
        board.appendChild(effect);
        window.setTimeout(function () { effect.remove(); }, 1500);
    }

    function cardMarkup(card, columnIndex, cardIndex, top, selected) {
        if (!card.faceUp) {
            return "<button class=\"sol-card face-down\" type=\"button\" data-col=\"" + columnIndex +
                "\" data-index=\"" + cardIndex + "\" style=\"--card-top:" + top + "px\" aria-label=\"Bài úp\"></button>";
        }
        const isRed = card.suit === 1 || card.suit === 3;
        return "<button class=\"sol-card " + (isRed ? "red " : "") + (selected ? "selected" : "") +
            "\" type=\"button\" data-col=\"" + columnIndex + "\" data-index=\"" + cardIndex +
            "\" style=\"--card-top:" + top + "px\" aria-label=\"" + rankLabel(card.rank) + SUITS[card.suit] + "\">" +
            "<span class=\"sol-corner top\"><b>" + rankLabel(card.rank) + "</b><i>" + SUITS[card.suit] + "</i></span>" +
            "<span class=\"sol-center-suit\">" + SUITS[card.suit] + "</span>" +
            "<span class=\"sol-corner bottom\"><b>" + rankLabel(card.rank) + "</b><i>" + SUITS[card.suit] + "</i></span></button>";
    }

    function render() {
        const tableau = document.getElementById("spiderTableau");
        const compact = window.innerHeight < 650;
        tableau.innerHTML = state.tableau.map(function (column, columnIndex) {
            let top = 0;
            const cards = column.map(function (card, cardIndex) {
                const selected = state.selected && state.selected.col === columnIndex && cardIndex >= state.selected.index;
                const html = cardMarkup(card, columnIndex, cardIndex, top, selected);
                top += card.faceUp ? (compact ? 27 : 34) : (compact ? 12 : 16);
                return html;
            }).join("");
            return "<div class=\"solitaire-column" + (column.length ? "" : " empty") + "\" data-spider-column=\"" + columnIndex + "\">" + cards + "</div>";
        }).join("");

        document.getElementById("spiderMoves").textContent = state.moves;
        document.getElementById("spiderCompleted").textContent = state.completed + "/8";
        document.getElementById("spiderDeals").textContent = Math.floor(state.stock.length / 10);
        document.getElementById("spiderStock").disabled = state.stock.length < 10;
        document.getElementById("spiderFoundations").innerHTML = Array.from({ length: 8 }, function (_, index) {
            return "<span class=\"foundation-mini" + (index < state.completed ? " done" : "") + "\">" + (index < state.completed ? "K♠" : "♠") + "</span>";
        }).join("");
    }

    function isPackedSequence(column, startIndex) {
        if (!column[startIndex] || !column[startIndex].faceUp) {
            return false;
        }
        for (let index = startIndex; index < column.length - 1; index += 1) {
            if (!column[index + 1].faceUp || column[index].rank !== column[index + 1].rank + 1 || column[index].suit !== column[index + 1].suit) {
                return false;
            }
        }
        return true;
    }

    function selectCard(columnIndex, cardIndex) {
        const column = state.tableau[columnIndex];
        if (!isPackedSequence(column, cardIndex)) {
            app.Portal.toast("Chỉ có thể kéo một dãy giảm dần cùng chất.", "error");
            return;
        }
        state.selected = { col: columnIndex, index: cardIndex };
        render();
    }

    function flipLast(column) {
        if (column.length && !column[column.length - 1].faceUp) {
            column[column.length - 1].faceUp = true;
        }
    }

    function canPlace(cards, targetColumn) {
        return targetColumn.length === 0 || targetColumn[targetColumn.length - 1].rank === cards[0].rank + 1;
    }

    function tryMove(targetColumnIndex) {
        const source = state.tableau[state.selected.col];
        const target = state.tableau[targetColumnIndex];
        const moving = source.slice(state.selected.index);

        if (targetColumnIndex === state.selected.col || !canPlace(moving, target)) {
            app.Portal.toast("Cột đích phải trống hoặc có lá lớn hơn đúng một bậc.", "error");
            state.selected = null;
            render();
            return;
        }

        source.splice(state.selected.index, moving.length);
        target.push.apply(target, moving);
        flipLast(source);
        state.selected = null;
        state.moves += 1;
        checkCompleted(targetColumnIndex);
        render();
        checkEnd();
    }

    function checkCompleted(columnIndex) {
        const column = state.tableau[columnIndex];
        if (column.length < 13) {
            return;
        }
        const sequence = column.slice(-13);
        const suit = sequence[0].suit;
        const complete = sequence.every(function (card, index) {
            return card.faceUp && card.suit === suit && card.rank === 13 - index;
        });
        if (!complete) {
            return;
        }
        column.splice(-13, 13);
        state.completed += 1;
        flipLast(column);
        celebrateSet();
        app.Portal.toast("Hoàn thành một bộ K → A!", "success");
        checkCompleted(columnIndex);
    }

    function dealStock() {
        if (state.stock.length < 10) {
            return;
        }
        if (state.tableau.some(function (column) { return column.length === 0; })) {
            app.Portal.toast("Hãy đặt ít nhất một lá vào mọi cột trống trước khi chia.", "error");
            return;
        }
        state.tableau.forEach(function (column, index) {
            const card = state.stock.pop();
            card.faceUp = true;
            column.push(card);
            checkCompleted(index);
        });
        state.selected = null;
        state.moves += 1;
        render();
        animateDeal("#spiderTableau .solitaire-column .sol-card:last-child", 75);
        checkEnd();
    }

    function hasLegalMove() {
        if (state.stock.length >= 10 && state.tableau.every(function (column) { return column.length > 0; })) {
            return true;
        }
        return state.tableau.some(function (column, sourceIndex) {
            return column.some(function (card, cardIndex) {
                if (!card.faceUp || !isPackedSequence(column, cardIndex)) {
                    return false;
                }
                const moving = column.slice(cardIndex);
                return state.tableau.some(function (target, targetIndex) {
                    return targetIndex !== sourceIndex && canPlace(moving, target);
                });
            });
        });
    }

    function checkEnd() {
        if (state.ended) {
            return;
        }
        if (state.completed === 8) {
            state.ended = true;
            window.setTimeout(function () {
                app.Portal.finishGeneric("spider", true, "Bạn đã hoàn thành đủ 8 bộ bài trong " + state.moves + " nước.");
            }, 450);
        } else if (!hasLegalMove()) {
            state.ended = true;
            window.setTimeout(function () {
                app.Portal.finishGeneric("spider", false, "Không còn nước đi hợp lệ và chồng bài đã hết.");
            }, 450);
        }
    }

    document.getElementById("spiderTableau").addEventListener("click", function (event) {
        if (suppressClick) { suppressClick = false; return; }
        if (state.ended) {
            return;
        }
        const card = event.target.closest("[data-col]");
        const columnElement = event.target.closest("[data-spider-column]");
        if (!columnElement) {
            return;
        }
        const columnIndex = Number(columnElement.dataset.spiderColumn);
        if (state.selected) {
            if (card && columnIndex === state.selected.col && Number(card.dataset.index) === state.selected.index) {
                state.selected = null;
                render();
            } else {
                tryMove(columnIndex);
            }
        } else if (card) {
            selectCard(Number(card.dataset.col), Number(card.dataset.index));
        }
    });

    function clearDragVisual() {
        document.querySelectorAll(".drag-source, .drop-target").forEach(function (element) { element.classList.remove("drag-source", "drop-target"); });
        const ghost = document.querySelector(".card-drag-ghost");
        if (ghost) ghost.remove();
    }

    document.getElementById("spiderTableau").addEventListener("pointerdown", function (event) {
        const card = event.target.closest("[data-col]");
        if (!card || state.ended || event.button > 0) return;
        const col = Number(card.dataset.col);
        const index = Number(card.dataset.index);
        if (!isPackedSequence(state.tableau[col], index)) return;
        drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, col: col, index: index, active: false };
    });

    window.addEventListener("pointermove", function (event) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
        if (!drag.active) {
            drag.active = true;
            state.selected = { col: drag.col, index: drag.index };
            const sourceCards = document.querySelectorAll("[data-col=\"" + drag.col + "\"]");
            const ghost = document.createElement("div");
            ghost.className = "card-drag-ghost";
            Array.from(sourceCards).slice(drag.index).forEach(function (element, offset) {
                const clone = element.cloneNode(true);
                clone.style.top = (offset * 29) + "px";
                clone.style.setProperty("--card-top", "0px");
                ghost.appendChild(clone);
                element.classList.add("drag-source");
            });
            document.body.appendChild(ghost);
        }
        event.preventDefault();
        const ghost = document.querySelector(".card-drag-ghost");
        if (ghost) ghost.style.transform = "translate(" + (event.clientX + 10) + "px," + (event.clientY + 10) + "px)";
        document.querySelectorAll(".drop-target").forEach(function (element) { element.classList.remove("drop-target"); });
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const column = target && target.closest("[data-spider-column]");
        if (column && Number(column.dataset.spiderColumn) !== drag.col) column.classList.add("drop-target");
    }, { passive: false });

    window.addEventListener("pointerup", function (event) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const source = drag;
        drag = null;
        if (!source.active) return;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const column = target && target.closest("[data-spider-column]");
        clearDragVisual();
        suppressClick = true;
        window.setTimeout(function () { suppressClick = false; }, 0);
        state.selected = { col: source.col, index: source.index };
        if (column) tryMove(Number(column.dataset.spiderColumn));
        else { state.selected = null; render(); }
    });

    window.addEventListener("pointercancel", function () {
        if (!drag) return;
        drag = null;
        clearDragVisual();
        state.selected = null;
        render();
    });

    document.getElementById("spiderStock").addEventListener("click", dealStock);
    document.getElementById("spiderRestart").addEventListener("click", function () {
        start(state.difficulty);
    });

    app.Spider = { start: start };
}());
