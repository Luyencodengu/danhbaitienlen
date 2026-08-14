(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const Cards = app.Cards;

    const TYPE_NAMES = {
        single: "Bài lẻ",
        pair: "Đôi",
        triple: "Sám cô",
        straight: "Sảnh",
        quad: "Tứ quý",
        pairSequence: "Đôi thông"
    };

    function invalidCombo(reason) {
        return {
            valid: false,
            type: "invalid",
            name: "Không hợp lệ",
            reason: reason || "Các lá đã chọn chưa tạo thành một bộ hợp lệ."
        };
    }

    function highestCard(cards) {
        return cards.slice().sort(Cards.compareCards).at(-1);
    }

    function rankCounts(cards) {
        return cards.reduce(function (counts, card) {
            counts[card.rank] = (counts[card.rank] || 0) + 1;
            return counts;
        }, {});
    }

    function isStraight(cards) {
        if (cards.length < 3 || cards.some(function (card) { return card.rank === 15; })) {
            return false;
        }

        const ranks = cards.map(function (card) { return card.rank; });
        const uniqueRanks = Array.from(new Set(ranks)).sort(function (a, b) { return a - b; });

        if (uniqueRanks.length !== cards.length) {
            return false;
        }

        return uniqueRanks.every(function (rank, index) {
            return index === 0 || rank === uniqueRanks[index - 1] + 1;
        });
    }

    function pairSequenceLength(cards) {
        if (cards.length < 6 || cards.length % 2 !== 0) {
            return 0;
        }

        const counts = rankCounts(cards);
        const ranks = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });

        if (ranks.includes(15) || ranks.length !== cards.length / 2) {
            return 0;
        }

        const allPairs = ranks.every(function (rank) { return counts[rank] === 2; });
        const consecutive = ranks.every(function (rank, index) {
            return index === 0 || rank === ranks[index - 1] + 1;
        });

        return allPairs && consecutive ? ranks.length : 0;
    }

    function classify(cards) {
        if (!Array.isArray(cards) || cards.length === 0) {
            return invalidCombo("Bạn chưa chọn lá bài nào.");
        }

        const sorted = cards.slice().sort(Cards.compareCards);
        const count = sorted.length;
        const counts = rankCounts(sorted);
        const ranks = Object.keys(counts).map(Number);
        const sameRank = ranks.length === 1;
        const topCard = highestCard(sorted);
        let type = "";
        let sequenceLength = 0;

        if (count === 1) {
            type = "single";
        } else if (count === 2 && sameRank) {
            type = "pair";
        } else if (count === 3 && sameRank) {
            type = "triple";
        } else if (count === 4 && sameRank) {
            type = "quad";
        } else if (isStraight(sorted)) {
            type = "straight";
        } else {
            sequenceLength = pairSequenceLength(sorted);
            if (sequenceLength >= 3) {
                type = "pairSequence";
            }
        }

        if (!type) {
            return invalidCombo();
        }

        return {
            valid: true,
            type: type,
            name: type === "pairSequence" ? sequenceLength + " đôi thông" : TYPE_NAMES[type],
            length: count,
            sequenceLength: sequenceLength,
            highestRank: topCard.rank,
            highestSuit: topCard.suit,
            score: Cards.cardStrength(topCard),
            containsTwo: sorted.some(function (card) { return card.rank === 15; }),
            cards: sorted
        };
    }

    function isSingleTwo(combo) {
        return combo.type === "single" && combo.highestRank === 15;
    }

    function isPairOfTwos(combo) {
        return combo.type === "pair" && combo.highestRank === 15;
    }

    function canChop(candidate, current) {
        if (candidate.type === "pairSequence" && candidate.sequenceLength === 3) {
            return isSingleTwo(current);
        }

        if (candidate.type === "quad") {
            return isSingleTwo(current) ||
                isPairOfTwos(current) ||
                (current.type === "pairSequence" && current.sequenceLength === 3);
        }

        if (candidate.type === "pairSequence" && candidate.sequenceLength >= 4) {
            return isSingleTwo(current) ||
                isPairOfTwos(current) ||
                current.type === "quad" ||
                (current.type === "pairSequence" && current.sequenceLength < candidate.sequenceLength);
        }

        return false;
    }

    function canBeat(candidate, current) {
        if (!candidate || !candidate.valid) {
            return false;
        }

        if (!current || !current.valid) {
            return true;
        }

        if (canChop(candidate, current)) {
            return true;
        }

        if (candidate.type !== current.type) {
            return false;
        }

        if (candidate.type === "straight" && candidate.length !== current.length) {
            return false;
        }

        if (candidate.type === "pairSequence" && candidate.sequenceLength !== current.sequenceLength) {
            return false;
        }

        if (["single", "pair", "triple", "straight", "quad", "pairSequence"].includes(candidate.type)) {
            return candidate.score > current.score;
        }

        return false;
    }

    function explainWhyCannotBeat(candidate, current) {
        if (!candidate.valid) {
            return candidate.reason;
        }

        if (candidate.type !== current.type && !canChop(candidate, current)) {
            return "Bạn cần đánh cùng loại với " + current.name.toLowerCase() + " hoặc dùng một bộ có thể chặt.";
        }

        if (candidate.type === "straight" && candidate.length !== current.length) {
            return "Sảnh chặn phải có cùng số lá với sảnh trên bàn.";
        }

        return "Bộ bài của bạn chưa lớn hơn bộ đang nằm trên bàn.";
    }

    app.Rules = {
        TYPE_NAMES: TYPE_NAMES,
        classify: classify,
        canBeat: canBeat,
        canChop: canChop,
        explainWhyCannotBeat: explainWhyCannotBeat
    };
}());
