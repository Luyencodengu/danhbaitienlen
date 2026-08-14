(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};

    const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const SUITS = [
        { value: 0, key: "spades", name: "Bích", symbol: "♠", color: "black" },
        { value: 1, key: "clubs", name: "Tép", symbol: "♣", color: "black" },
        { value: 2, key: "diamonds", name: "Rô", symbol: "♦", color: "red" },
        { value: 3, key: "hearts", name: "Cơ", symbol: "♥", color: "red" }
    ];

    function createDeck() {
        const deck = [];

        RANKS.forEach(function (rank) {
            SUITS.forEach(function (suit) {
                deck.push({
                    id: rank + "-" + suit.value,
                    rank: rank,
                    suit: suit.value
                });
            });
        });

        return deck;
    }

    function shuffle(deck) {
        const result = deck.slice();

        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const temporary = result[i];
            result[i] = result[j];
            result[j] = temporary;
        }

        return result;
    }

    function deal(playerCount) {
        const numberOfPlayers = playerCount || 4;
        const hands = Array.from({ length: numberOfPlayers }, function () { return []; });
        const deck = shuffle(createDeck());

        deck.forEach(function (card, index) {
            hands[index % numberOfPlayers].push(card);
        });

        hands.forEach(sortCards);
        return hands;
    }

    function cardStrength(card) {
        return card.rank * 4 + card.suit;
    }

    function compareCards(firstCard, secondCard) {
        return cardStrength(firstCard) - cardStrength(secondCard);
    }

    function sortCards(cards) {
        cards.sort(compareCards);
        return cards;
    }

    function rankLabel(rank) {
        const labels = {
            11: "J",
            12: "Q",
            13: "K",
            14: "A",
            15: "2"
        };

        return labels[rank] || String(rank);
    }

    function getSuit(suitValue) {
        return SUITS.find(function (suit) {
            return suit.value === suitValue;
        });
    }

    function cardName(card) {
        const suit = getSuit(card.suit);
        return rankLabel(card.rank) + " " + suit.name;
    }

    function isThreeSpades(card) {
        return card.rank === 3 && card.suit === 0;
    }

    app.Cards = {
        RANKS: RANKS,
        SUITS: SUITS,
        createDeck: createDeck,
        shuffle: shuffle,
        deal: deal,
        sortCards: sortCards,
        compareCards: compareCards,
        cardStrength: cardStrength,
        rankLabel: rankLabel,
        getSuit: getSuit,
        cardName: cardName,
        isThreeSpades: isThreeSpades
    };
}());
