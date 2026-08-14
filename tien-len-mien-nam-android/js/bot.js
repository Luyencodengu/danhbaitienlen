(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const Cards = app.Cards;
    const Rules = app.Rules;

    function combinations(cards) {
        const result = [];
        const maximumMask = Math.pow(2, cards.length);

        for (let mask = 1; mask < maximumMask; mask += 1) {
            const selected = [];

            for (let index = 0; index < cards.length; index += 1) {
                if ((mask & (1 << index)) !== 0) {
                    selected.push(cards[index]);
                }
            }

            result.push(selected);
        }

        return result;
    }

    function comboKey(combo) {
        return combo.type + ":" + combo.length + ":" + combo.sequenceLength + ":" + combo.score;
    }

    function getLegalMoves(hand, currentCombo, requiredCardId) {
        const seen = new Set();
        const moves = [];

        combinations(hand).forEach(function (cards) {
            if (requiredCardId && !cards.some(function (card) { return card.id === requiredCardId; })) {
                return;
            }

            const combo = Rules.classify(cards);
            if (!combo.valid || !Rules.canBeat(combo, currentCombo)) {
                return;
            }

            const key = comboKey(combo);
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            moves.push({ cards: cards, combo: combo });
        });

        return moves;
    }

    function dangerCost(move) {
        const combo = move.combo;
        let cost = 0;

        if (combo.type === "quad") {
            cost += 400;
        }
        if (combo.type === "pairSequence") {
            cost += combo.sequenceLength >= 4 ? 350 : 250;
        }
        if (combo.containsTwo) {
            cost += 120;
        }

        return cost;
    }

    function chooseLeadMove(moves, handSize) {
        return moves.sort(function (first, second) {
            const firstFinishes = first.cards.length === handSize ? -10000 : 0;
            const secondFinishes = second.cards.length === handSize ? -10000 : 0;
            const firstValue = firstFinishes + dangerCost(first) - first.cards.length * 35 + first.combo.score;
            const secondValue = secondFinishes + dangerCost(second) - second.cards.length * 35 + second.combo.score;
            return firstValue - secondValue;
        })[0];
    }

    function chooseResponseMove(moves, handSize, opponents) {
        const rivalAlmostOut = opponents.some(function (player) {
            return !player.finished && player.hand.length <= 2;
        });

        return moves.sort(function (first, second) {
            const firstFinishes = first.cards.length === handSize ? -10000 : 0;
            const secondFinishes = second.cards.length === handSize ? -10000 : 0;
            const pressure = rivalAlmostOut ? 0.35 : 1;
            const firstValue = firstFinishes + dangerCost(first) * pressure + first.combo.score + first.cards.length * 5;
            const secondValue = secondFinishes + dangerCost(second) * pressure + second.combo.score + second.cards.length * 5;
            return firstValue - secondValue;
        })[0];
    }

    function chooseMove(hand, currentCombo, options) {
        const settings = options || {};
        const legalMoves = getLegalMoves(hand, currentCombo, settings.requiredCardId);

        if (legalMoves.length === 0) {
            return null;
        }

        if (!currentCombo) {
            return chooseLeadMove(legalMoves, hand.length);
        }

        return chooseResponseMove(legalMoves, hand.length, settings.opponents || []);
    }

    app.Bot = {
        getLegalMoves: getLegalMoves,
        chooseMove: chooseMove
    };
}());
