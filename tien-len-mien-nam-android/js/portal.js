(function () {
    "use strict";

    const app = window.TienLen = window.TienLen || {};
    const TOKEN_KEY = "sanh-game-bai-viet-token-v1";
    const STARTING_BALANCE = 100000;
    const ECONOMY = {
        easy: { reward: 40000, penalty: 10000, label: "Dễ" },
        hard: { reward: 400000, penalty: 100000, label: "Siêu khó" }
    };

    const tutorials = {
        tienlen: {
            title: "Tiến Lên Miền Nam",
            steps: [
                ["1", "Đi trước", "Ván đầu, người giữ 3♠ đi trước và nước đầu phải chứa lá này."],
                ["2", "Chặn bài", "Đánh cùng loại nhưng lớn hơn. Có thể dùng tứ quý hoặc đôi thông để chặt 2."],
                ["3", "Chọn bài mới", "Lá được chọn sẽ chuyển lên khay riêng. Chạm lại để trả lá xuống tay."],
                ["4", "Chiến thắng", "Người đánh hết 13 lá đầu tiên thắng và nhận token theo độ khó."]
            ]
        },
        spider: {
            title: "Spider Solitaire",
            steps: [
                ["1", "Xếp giảm dần", "Đặt lá nhỏ hơn lên lá lớn hơn đúng một bậc, ví dụ Q lên K."],
                ["2", "Di chuyển dãy", "Chỉ di chuyển cùng lúc một dãy giảm dần và cùng chất."],
                ["3", "Chia thêm", "Khi không còn nước phù hợp, chạm chồng bài để chia thêm một hàng."],
                ["4", "Hoàn thành", "Xếp đủ dãy K → A cùng chất. Hoàn thành 8 dãy để chiến thắng."]
            ]
        },
        freecell: {
            title: "FreeCell Solitaire",
            steps: [
                ["1", "Xếp xen màu", "Trong cột, xếp giảm dần và xen kẽ đỏ–đen: 8 đen lên 9 đỏ."],
                ["2", "Dùng ô trống", "Mỗi ô trống giữ tạm một lá. Mức Dễ có thêm hai ô hỗ trợ."],
                ["3", "Nền móng", "Đưa từng chất lên nền móng theo thứ tự A, 2, 3 … K."],
                ["4", "Di chuyển dãy", "Số lá có thể chuyển cùng lúc phụ thuộc vào số ô trống và cột trống."]
            ]
        },
        friends: {
            title: "Chơi cùng bạn bè",
            steps: [
                ["1", "Chọn người", "Tạo bàn từ 2 đến 4 người và nhập tên từng người chơi."],
                ["2", "Giữ kín bài", "Sau mỗi lượt, chuyền thiết bị. Người mới phải bấm xác nhận mới thấy bài."],
                ["3", "Luật Tiến Lên", "Bộ hợp lệ và luật chặt giống Tiến Lên Miền Nam ở bàn với máy."],
                ["4", "Không tính token", "Bàn bạn bè không cộng hoặc trừ token, bất kể kết quả."]
            ]
        }
    };

    let balance = readBalance();
    let currentDifficulty = "easy";
    let selectedGame = null;
    let lastGenericGame = null;
    const numberAnimations = new WeakMap();

    function readBalance() {
        const value = Number(localStorage.getItem(TOKEN_KEY));
        return Number.isFinite(value) && value >= 0 ? value : STARTING_BALANCE;
    }

    function saveBalance() {
        localStorage.setItem(TOKEN_KEY, String(balance));
    }

    function format(value) {
        return Number(value).toLocaleString("vi-VN");
    }

    function updateWallets() {
        document.querySelectorAll(".token-value").forEach(function (element) {
            element.textContent = format(balance);
        });
    }

    function animateNumber(element, from, to, duration, render) {
        if (!element) return;
        const previousFrame = numberAnimations.get(element);
        if (previousFrame) window.cancelAnimationFrame(previousFrame);

        const draw = render || function (value) { element.textContent = format(value); };
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            draw(to);
            return;
        }

        const startedAt = performance.now();
        element.classList.remove("token-counting");
        void element.offsetWidth;
        element.classList.add("token-counting");

        function frame(now) {
            const progress = Math.min(1, (now - startedAt) / (duration || 900));
            const eased = 1 - Math.pow(1 - progress, 3);
            draw(Math.round(from + (to - from) * eased));
            if (progress < 1) {
                numberAnimations.set(element, window.requestAnimationFrame(frame));
            } else {
                numberAnimations.delete(element);
                window.setTimeout(function () { element.classList.remove("token-counting"); }, 350);
            }
        }

        numberAnimations.set(element, window.requestAnimationFrame(frame));
    }

    function animateWallets(from) {
        document.querySelectorAll(".token-value").forEach(function (element) {
            animateNumber(element, Number(from) || 0, balance, 950);
        });
    }

    function animateTokenResult(element, settlement) {
        if (!element || !settlement) return;
        const prefix = settlement.delta >= 0 ? "+" : "";
        animateNumber(element, 0, settlement.delta, 1050, function (value) {
            element.textContent = prefix + format(value) + " token • Số dư " + format(settlement.balance);
        });
    }

    function updateDifficultyBadges() {
        document.querySelectorAll(".difficulty-badge").forEach(function (element) {
            element.textContent = ECONOMY[currentDifficulty].label;
        });
    }

    function openModal(id) {
        document.getElementById(id).classList.add("open");
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove("open");
        }
    }

    function closeAllModals() {
        document.querySelectorAll(".modal.open").forEach(function (modal) {
            modal.classList.remove("open");
        });
    }

    function toast(message, type) {
        if (app.UI && app.UI.toast) {
            app.UI.toast(message, type);
        }
    }

    function showScreen(id) {
        document.querySelectorAll(".page-screen").forEach(function (screen) {
            screen.classList.toggle("active", screen.id === id);
        });
        document.body.classList.toggle("in-game", id !== "lobbyScreen");
        window.scrollTo(0, 0);
    }

    function showLobby() {
        if (app.Game && app.Game.stop) {
            app.Game.stop();
        }
        if (app.Friends && app.Friends.stop) {
            app.Friends.stop();
        }
        closeAllModals();
        showScreen("lobbyScreen");
        animateWallets(0);
    }

    function tutorialMarkup(steps) {
        return steps.map(function (step) {
            return "<div class=\"tutorial-step\"><b>" + step[0] + "</b><div><strong>" +
                step[1] + "</strong>" + step[2] + "</div></div>";
        }).join("");
    }

    function showTutorial(game) {
        const tutorial = tutorials[game];
        document.getElementById("tutorialTitle").textContent = tutorial.title;
        document.getElementById("tutorialContent").innerHTML = tutorialMarkup(tutorial.steps);
        openModal("tutorialModal");
    }

    function chooseGame(game) {
        selectedGame = game;
        if (game === "friends") {
            showTutorial(game);
        } else {
            document.getElementById("difficultyTitle").textContent = "Độ khó • " + tutorials[game].title;
            openModal("difficultyModal");
        }
    }

    function startSelectedGame() {
        closeModal("tutorialModal");
        updateDifficultyBadges();

        if (selectedGame === "tienlen") {
            showScreen("tienLenScreen");
            animateWallets(0);
            app.Game.start(currentDifficulty);
        } else if (selectedGame === "spider") {
            showScreen("spiderScreen");
            animateWallets(0);
            app.Spider.start(currentDifficulty);
        } else if (selectedGame === "freecell") {
            showScreen("freecellScreen");
            animateWallets(0);
            app.FreeCell.start(currentDifficulty);
        } else if (selectedGame === "friends") {
            showScreen("friendsScreen");
            app.Friends.showSetup();
        }
    }

    function settleResult(won) {
        const rule = ECONOMY[currentDifficulty];
        const requestedDelta = won ? rule.reward : -rule.penalty;
        const previousBalance = balance;
        const nextBalance = Math.max(0, balance + requestedDelta);
        const actualDelta = nextBalance - balance;
        balance = nextBalance;
        saveBalance();
        animateWallets(previousBalance);
        return { delta: actualDelta, balance: balance, won: won };
    }

    function settleRankResult(rank) {
        const rule = ECONOMY[currentDifficulty];
        const requestedDelta = rankDelta(rank, rule);
        const previousBalance = balance;
        const nextBalance = Math.max(0, balance + requestedDelta);
        const actualDelta = nextBalance - balance;
        balance = nextBalance;
        saveBalance();
        animateWallets(previousBalance);
        return {
            delta: actualDelta, balance: balance, rank: rank, won: rank === 1,
            payouts: [1, 2, 3, 4].map(function (position) { return rankDelta(position, rule); })
        };
    }

    function rankDelta(rank, rule) {
        const economy = rule || ECONOMY[currentDifficulty];
        return rank === 1 ? economy.reward : rank === 2 ? Math.round(economy.reward * 0.5) :
            rank === 3 ? -Math.round(economy.penalty * 0.5) : -economy.penalty;
    }

    function finishGeneric(game, won, message) {
        const settlement = settleResult(won);
        lastGenericGame = game;
        document.getElementById("genericResultIcon").textContent = won ? "🏆" : "🎴";
        document.getElementById("genericResultTitle").textContent = won ? "Bạn chiến thắng!" : "Ván chơi kết thúc";
        document.getElementById("genericResultMessage").textContent = message || (won ? "Bạn đã hoàn thành thử thách." : "Không còn nước đi hợp lệ.");

        const tokenBox = document.getElementById("genericTokenResult");
        tokenBox.className = "token-result" + (settlement.delta < 0 ? " loss" : "");
        tokenBox.textContent = (settlement.delta >= 0 ? "+" : "") + format(settlement.delta) +
            " token • Số dư " + format(settlement.balance);
        openModal("genericResultModal");
        animateTokenResult(tokenBox, settlement);
    }

    function replayGeneric() {
        closeModal("genericResultModal");
        if (lastGenericGame === "spider") {
            app.Spider.start(currentDifficulty);
        } else if (lastGenericGame === "freecell") {
            app.FreeCell.start(currentDifficulty);
        }
    }

    document.querySelectorAll("[data-game]").forEach(function (tile) {
        tile.addEventListener("click", function () {
            chooseGame(tile.dataset.game);
        });
    });

    document.querySelectorAll("[data-difficulty]").forEach(function (button) {
        button.addEventListener("click", function () {
            currentDifficulty = button.dataset.difficulty;
            updateDifficultyBadges();
            closeModal("difficultyModal");
            showTutorial(selectedGame);
        });
    });

    document.querySelectorAll("[data-close-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeModal(button.dataset.closeModal);
        });
    });

    document.querySelectorAll(".back-lobby").forEach(function (button) {
        button.addEventListener("click", showLobby);
    });

    document.getElementById("tutorialStart").addEventListener("click", startSelectedGame);
    document.getElementById("genericPlayAgain").addEventListener("click", replayGeneric);

    app.Portal = {
        getDifficulty: function () { return currentDifficulty; },
        getBalance: function () { return balance; },
        settleResult: settleResult,
        settleRankResult: settleRankResult,
        getRankPayouts: function () { return [1, 2, 3, 4].map(function (rank) { return rankDelta(rank); }); },
        finishGeneric: finishGeneric,
        animateTokenResult: animateTokenResult,
        showLobby: showLobby,
        toast: toast,
        format: format
    };

    updateWallets();
    updateDifficultyBadges();
    showLobby();
}());
