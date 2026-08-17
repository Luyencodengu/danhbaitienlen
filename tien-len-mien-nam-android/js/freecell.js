(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const SUITS = ["♠", "♥", "♣", "♦"];
    const state = {
        columns: [],
        cells: [],
        foundations: [[], [], [], []],
        selected: null,
        moves: 0,
        difficulty: "easy",
        ended: false
    };

    function rankLabel(rank) {
        return ({ 1: "A", 11: "J", 12: "Q", 13: "K" })[rank] || String(rank);
    }

    function isRed(card) {
        return card.suit === 1 || card.suit === 3;
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

    function createDeck() {
        const cards = [];
        for (let suit = 0; suit < 4; suit += 1) {
            for (let rank = 1; rank <= 13; rank += 1) {
                cards.push({ id: "fc-" + suit + "-" + rank, rank: rank, suit: suit });
            }
        }
        return shuffle(cards);
    }

    function start(difficulty) {
        const deck = createDeck();
        state.columns = Array.from({ length: 8 }, function () { return []; });
        deck.forEach(function (card, index) {
            state.columns[index % 8].push(card);
        });
        state.cells = Array.from({ length: difficulty === "hard" ? 4 : 6 }, function () { return null; });
        state.foundations = [[], [], [], []];
        state.selected = null;
        state.moves = 0;
        state.difficulty = difficulty || "easy";
        state.ended = false;
        render();
    }

    function cardMarkup(card, attributes, selected, top) {
        return "<button class=\"sol-card " + (isRed(card) ? "red " : "") + (selected ? "selected" : "") +
            "\" type=\"button\" " + attributes + (top === undefined ? "" : " style=\"--card-top:" + top + "px\"") +
            " aria-label=\"" + rankLabel(card.rank) + SUITS[card.suit] + "\"><span class=\"sol-rank\">" + rankLabel(card.rank) +
            "</span><span class=\"sol-suit\">" + SUITS[card.suit] + "</span></button>";
    }

    function render() {
        const cardGap = window.innerHeight < 650 ? 20 : 29;
        document.getElementById("freecellTableau").innerHTML = state.columns.map(function (column, columnIndex) {
            const cards = column.map(function (card, cardIndex) {
                const selected = state.selected && state.selected.type === "column" && state.selected.source === columnIndex && cardIndex >= state.selected.index;
                return cardMarkup(card, "data-free-col=\"" + columnIndex + "\" data-free-index=\"" + cardIndex + "\"", selected, cardIndex * cardGap);
            }).join("");
            return "<div class=\"solitaire-column" + (column.length ? "" : " empty") + "\" data-free-column=\"" + columnIndex + "\">" + cards + "</div>";
        }).join("");

        document.getElementById("freeCells").innerHTML = state.cells.map(function (card, cellIndex) {
            const selected = state.selected && state.selected.type === "cell" && state.selected.source === cellIndex;
            return "<div class=\"free-zone\" role=\"button\" tabindex=\"0\" data-free-cell=\"" + cellIndex + "\">" +
                (card ? cardMarkup(card, "tabindex=\"-1\"", selected) : "") + "</div>";
        }).join("");

        document.getElementById("freeFoundations").innerHTML = state.foundations.map(function (foundation, suit) {
            const card = foundation[foundation.length - 1];
            return "<div class=\"free-zone\" role=\"button\" tabindex=\"0\" data-foundation=\"" + suit + "\">" +
                (card ? cardMarkup(card, "tabindex=\"-1\"", false) : "<span class=\"foundation-symbol\">" + SUITS[suit] + "</span>") + "</div>";
        }).join("");

        document.getElementById("freecellMoves").textContent = state.moves;
    }

    function validSequence(column, startIndex) {
        if (!column[startIndex]) {
            return false;
        }
        for (let index = startIndex; index < column.length - 1; index += 1) {
            if (column[index].rank !== column[index + 1].rank + 1 || isRed(column[index]) === isRed(column[index + 1])) {
                return false;
            }
        }
        return true;
    }

    function selectColumn(columnIndex, cardIndex) {
        if (!validSequence(state.columns[columnIndex], cardIndex)) {
            app.Portal.toast("Dãy chọn phải giảm dần và xen kẽ đỏ–đen.", "error");
            return;
        }
        state.selected = { type: "column", source: columnIndex, index: cardIndex };
        render();
    }

    function selectCell(cellIndex) {
        if (!state.cells[cellIndex]) {
            return;
        }
        state.selected = { type: "cell", source: cellIndex };
        render();
    }

    function selectedCards() {
        if (!state.selected) {
            return [];
        }
        if (state.selected.type === "cell") {
            return [state.cells[state.selected.source]];
        }
        return state.columns[state.selected.source].slice(state.selected.index);
    }

    function removeSelected() {
        if (state.selected.type === "cell") {
            const card = state.cells[state.selected.source];
            state.cells[state.selected.source] = null;
            return [card];
        }
        return state.columns[state.selected.source].splice(state.selected.index);
    }

    function maxMovable(targetColumnIndex) {
        const emptyCells = state.cells.filter(function (card) { return !card; }).length;
        let emptyColumns = state.columns.filter(function (column) { return column.length === 0; }).length;
        if (state.columns[targetColumnIndex].length === 0) {
            emptyColumns = Math.max(0, emptyColumns - 1);
        }
        return (emptyCells + 1) * Math.pow(2, emptyColumns);
    }

    function canPlaceOnColumn(cards, target) {
        if (!target.length) {
            return true;
        }
        const top = target[target.length - 1];
        return top.rank === cards[0].rank + 1 && isRed(top) !== isRed(cards[0]);
    }

    function moveToColumn(targetIndex) {
        const cards = selectedCards();
        if (!cards.length) {
            return;
        }
        if (state.selected.type === "column" && state.selected.source === targetIndex) {
            state.selected = null;
            render();
            return;
        }
        if (cards.length > maxMovable(targetIndex)) {
            app.Portal.toast("Bạn chưa có đủ ô hoặc cột trống để chuyển dãy này.", "error");
            return;
        }
        if (!canPlaceOnColumn(cards, state.columns[targetIndex])) {
            app.Portal.toast("Cần xếp giảm dần và xen kẽ đỏ–đen.", "error");
            return;
        }
        const moving = removeSelected();
        state.columns[targetIndex].push.apply(state.columns[targetIndex], moving);
        state.selected = null;
        state.moves += 1;
        render();
        checkEnd();
    }

    function moveToCell(cellIndex) {
        const cards = selectedCards();
        if (!state.selected) {
            selectCell(cellIndex);
            return;
        }
        if (state.selected.type === "cell" && state.selected.source === cellIndex) {
            state.selected = null;
            render();
            return;
        }
        if (state.cells[cellIndex] || cards.length !== 1) {
            app.Portal.toast("Mỗi ô trống chỉ giữ được một lá.", "error");
            return;
        }
        state.cells[cellIndex] = removeSelected()[0];
        state.selected = null;
        state.moves += 1;
        render();
        checkEnd();
    }

    function moveToFoundation(suit) {
        const cards = selectedCards();
        if (cards.length !== 1) {
            app.Portal.toast("Chỉ đưa từng lá lên nền móng.", "error");
            return;
        }
        const card = cards[0];
        const foundation = state.foundations[suit];
        const expectedRank = foundation.length + 1;
        if (card.suit !== suit || card.rank !== expectedRank) {
            app.Portal.toast("Nền móng phải xếp cùng chất theo thứ tự A → K.", "error");
            return;
        }
        foundation.push(removeSelected()[0]);
        state.selected = null;
        state.moves += 1;
        render();
        checkEnd();
    }

    function hasLegalMove() {
        const available = state.columns.map(function (column) { return column[column.length - 1]; }).filter(Boolean)
            .concat(state.cells.filter(Boolean));

        if (available.some(function (card) {
            if (state.foundations[card.suit].length + 1 === card.rank) {
                return true;
            }
            if (state.cells.some(function (cell) { return !cell; })) {
                return true;
            }
            return state.columns.some(function (column) {
                const top = column[column.length - 1];
                return top && top.rank === card.rank + 1 && isRed(top) !== isRed(card);
            });
        })) {
            return true;
        }

        return state.columns.some(function (column, sourceIndex) {
            return column.some(function (_, startIndex) {
                if (!validSequence(column, startIndex)) {
                    return false;
                }
                const cards = column.slice(startIndex);
                return state.columns.some(function (target, targetIndex) {
                    return targetIndex !== sourceIndex && cards.length <= maxMovable(targetIndex) && canPlaceOnColumn(cards, target);
                });
            });
        });
    }

    function checkEnd() {
        if (state.ended) {
            return;
        }
        const completed = state.foundations.reduce(function (sum, foundation) { return sum + foundation.length; }, 0);
        if (completed === 52) {
            state.ended = true;
            window.setTimeout(function () {
                app.Portal.finishGeneric("freecell", true, "Bạn đã đưa đủ 52 lá lên nền móng trong " + state.moves + " nước.");
            }, 400);
        } else if (!hasLegalMove()) {
            state.ended = true;
            window.setTimeout(function () {
                app.Portal.finishGeneric("freecell", false, "Không còn ô trống hoặc nước xếp hợp lệ.");
            }, 400);
        }
    }

    document.getElementById("freecellTableau").addEventListener("click", function (event) {
        if (state.ended) {
            return;
        }
        const columnElement = event.target.closest("[data-free-column]");
        if (!columnElement) {
            return;
        }
        const targetIndex = Number(columnElement.dataset.freeColumn);
        const cardElement = event.target.closest("[data-free-col]");
        if (state.selected) {
            moveToColumn(targetIndex);
        } else if (cardElement) {
            selectColumn(Number(cardElement.dataset.freeCol), Number(cardElement.dataset.freeIndex));
        }
    });

    document.getElementById("freeCells").addEventListener("click", function (event) {
        const zone = event.target.closest("[data-free-cell]");
        if (zone && !state.ended) {
            if (!state.selected && state.cells[Number(zone.dataset.freeCell)]) {
                selectCell(Number(zone.dataset.freeCell));
            } else {
                moveToCell(Number(zone.dataset.freeCell));
            }
        }
    });

    document.getElementById("freeFoundations").addEventListener("click", function (event) {
        const zone = event.target.closest("[data-foundation]");
        if (zone && state.selected && !state.ended) {
            moveToFoundation(Number(zone.dataset.foundation));
        }
    });

    document.getElementById("freecellRestart").addEventListener("click", function () {
        start(state.difficulty);
    });

    app.FreeCell = { start: start };
}());
