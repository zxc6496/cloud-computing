// ==============================================
// 记忆翻牌游戏 - JavaScript 文件
// 作者：Memory Card Game
// 版本：2.0
// ==============================================

// --------------------------
// 游戏配置常量
// --------------------------
const CONFIG = {
    cardPatterns: [
        '\u{1F3AE}', '\u{1F3AF}', '\u{1F3A8}', '\u{1F3AD}', '\u{1F3AA}', '\u{1F3B0}', '\u{1F3B2}', '\u{1F3B8}',
        '\u{1F98B}', '\u{1F338}', '\u{1F33A}', '\u{1F319}', '\u{2B50}', '\u{1F308}', '\u{1F525}', '\u{1F48E}',
        '\u{1F680}', '\u{26A1}', '\u{1F4AB}', '\u{1F3B5}', '\u{1F3BC}', '\u{1F3B9}', '\u{1F3BA}', '\u{1F3BB}',
        '\u{1F984}', '\u{1F409}', '\u{1F31F}', '\u{1F49C}', '\u{1F381}', '\u{1F388}', '\u{1F380}', '\u{1F49D}'
    ],
    
    difficulties: {
        easy: { rows: 4, cols: 4, pairs: 8 },
        hard: { rows: 6, cols: 6, pairs: 18 },
        extreme: { rows: 8, cols: 8, pairs: 32 }
    },
    
    score: {
        match: 100,
        timeBonus: 10,
        comboBonus: 50
    },
    
    animation: {
        flipDelay: 1000,
        cardSize: 80
    },
    
    achievements: [
        {
            id: 'first_win',
            name: '\u521D\u6B21\u80DC\u5229',
            description: '\u5B8C\u6210\u7B2C\u4E00\u6B21\u6E38\u620F',
            icon: '\u{1F389}'
        },
        {
            id: 'speed_demon',
            name: '\u901F\u5EA6\u4E4B\u738B',
            description: '\u572860\u79D2\u5185\u5B8C\u6210\u7B80\u5355\u96BE\u5EA6',
            icon: '\u{26A1}'
        },
        {
            id: 'perfect_score',
            name: '\u5B8C\u7F8E\u8868\u73B0',
            description: '\u8FDE\u7EED\u914D\u5BF95\u6B21\u4E0D\u5931\u8BEF',
            icon: '\u{1F3C6}'
        },
        {
            id: 'master_player',
            name: '\u6E38\u620F\u5927\u5E08',
            description: '\u5B8C\u6210\u56F0\u96BE\u96BE\u5EA6',
            icon: '\u{1F451}'
        },
        {
            id: 'combo_king',
            name: '\u8FDE\u51FB\u4E4B\u738B',
            description: '\u8FBE\u62103\u8FDE\u51FB',
            icon: '\u{1F525}'
        }
    ]
};

// --------------------------
// 游戏状态管理
// --------------------------
const gameState = {
    score: 0,
    time: 0,
    timerInterval: null,
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 8,
    difficulty: 'easy',
    isLocked: false,
    isSoundEnabled: true,
    combo: 0,
    maxCombo: 0,
    cardSize: 80,
    isPlaying: false,
    playerName: localStorage.getItem('memoryGamePlayerName') || ''
};

// --------------------------
// DOM 元素引用
// --------------------------
const elements = {
    gameBoard: document.getElementById('gameBoard'),
    scoreDisplay: document.getElementById('score'),
    timerDisplay: document.getElementById('timer'),
    pairsDisplay: document.getElementById('pairs'),
    soundBtn: document.getElementById('soundBtn'),
    leaderboardBtn: document.getElementById('leaderboardBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    homeBtn: document.getElementById('homeBtn'),
    restartBtn: document.getElementById('restartBtn'),
    victoryModal: document.getElementById('victoryModal'),
    finalScore: document.getElementById('finalScore'),
    finalTime: document.getElementById('finalTime'),
    bestRecord: document.getElementById('bestRecord'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    matchEffect: document.getElementById('matchEffect'),
    leaderboardModal: document.getElementById('leaderboardModal'),
    leaderboardList: document.getElementById('leaderboardList'),
    closeLeaderboard: document.getElementById('closeLeaderboard'),
    clearLeaderboard: document.getElementById('clearLeaderboard'),
    loadingScreen: document.getElementById('loadingScreen'),
    tutorialModal: document.getElementById('tutorialModal'),
    closeTutorial: document.getElementById('closeTutorial'),
    dontShowTutorial: document.getElementById('dontShowTutorial'),
    achievementModal: document.getElementById('achievementModal'),
    achievementBtn: document.getElementById('achievementBtn'),
    achievementList: document.getElementById('achievementList'),
    closeAchievement: document.getElementById('closeAchievement'),
    achievementNotification: document.getElementById('achievementNotification'),
    achievementName: document.getElementById('achievementName'),
    nicknameModal: document.getElementById('nicknameModal'),
    nicknameInput: document.getElementById('nicknameInput'),
    saveNickname: document.getElementById('saveNickname'),
    skipNickname: document.getElementById('skipNickname'),
    shareBtn: document.getElementById('shareBtn')
};

// --------------------------
// 音效管理（使用 Web Audio API）
// --------------------------
const SoundManager = {
    audioContext: null,
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API \u4E0D\u652F\u6301\uFF0C\u97F3\u6548\u529F\u80FD\u5C06\u88AB\u7981\u7528');
        }
    },
    
    play(soundType) {
        if (!gameState.isSoundEnabled || !this.audioContext) return;
        
        const frequencies = {
            flip: 523.25,
            match: 659.25,
            mismatch: 261.63,
            victory: [523.25, 659.25, 783.99],
            achievement: [783.99, 987.77, 1174.66]
        };
        
        const duration = {
            flip: 0.1,
            match: 0.3,
            mismatch: 0.2,
            victory: 0.4,
            achievement: 0.3
        };
        
        const playTone = (freq, dur) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + dur);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + dur);
        };
        
        if (Array.isArray(frequencies[soundType])) {
            frequencies[soundType].forEach((freq, index) => {
                setTimeout(() => playTone(freq, duration[soundType]), index * 150);
            });
        } else {
            playTone(frequencies[soundType], duration[soundType]);
        }
    }
};

// --------------------------
// 工具函数
// --------------------------
const Utils = {
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    getBestRecord(difficulty) {
        const records = localStorage.getItem('memoryGameRecords');
        if (!records) return null;
        const parsed = JSON.parse(records);
        return parsed[difficulty] || null;
    },
    
    saveBestRecord(difficulty, time) {
        const records = localStorage.getItem('memoryGameRecords');
        const parsed = records ? JSON.parse(records) : {};
        
        if (!parsed[difficulty] || time < parsed[difficulty]) {
            parsed[difficulty] = time;
            localStorage.setItem('memoryGameRecords', JSON.stringify(parsed));
            return true;
        }
        return false;
    },
    
    getLeaderboard(difficulty) {
        const data = localStorage.getItem('memoryGameLeaderboard');
        if (!data) return [];
        const parsed = JSON.parse(data);
        return parsed[difficulty] || [];
    },
    
    saveLeaderboard(difficulty, score, time, name = '') {
        const data = localStorage.getItem('memoryGameLeaderboard');
        const parsed = data ? JSON.parse(data) : { easy: [], hard: [] };
        
        const record = {
            score,
            time,
            name: name || '\u533F\u540D\u73A9\u5BB6',
            date: new Date().toISOString().split('T')[0]
        };
        
        parsed[difficulty].push(record);
        parsed[difficulty].sort((a, b) => b.score - a.score);
        parsed[difficulty] = parsed[difficulty].slice(0, 10);
        
        localStorage.setItem('memoryGameLeaderboard', JSON.stringify(parsed));
    },
    
    clearLeaderboard() {
        localStorage.removeItem('memoryGameLeaderboard');
        localStorage.removeItem('memoryGameRecords');
    },
    
    getAchievements() {
        const data = localStorage.getItem('memoryGameAchievements');
        return data ? JSON.parse(data) : [];
    },
    
    unlockAchievement(achievementId) {
        const achievements = this.getAchievements();
        if (!achievements.includes(achievementId)) {
            achievements.push(achievementId);
            localStorage.setItem('memoryGameAchievements', JSON.stringify(achievements));
            return true;
        }
        return false;
    },
    
    isAchievementUnlocked(achievementId) {
        return this.getAchievements().includes(achievementId);
    },
    
    getGameStats() {
        const data = localStorage.getItem('memoryGameStats');
        return data ? JSON.parse(data) : { gamesPlayed: 0, totalWins: 0 };
    },
    
    updateGameStats(won = false) {
        const stats = this.getGameStats();
        stats.gamesPlayed++;
        if (won) stats.totalWins++;
        localStorage.setItem('memoryGameStats', JSON.stringify(stats));
    },
    
    shouldShowTutorial() {
        return !localStorage.getItem('memoryGameTutorialDismissed');
    },
    
    dismissTutorial() {
        localStorage.setItem('memoryGameTutorialDismissed', 'true');
    }
};

// --------------------------
// 游戏核心逻辑
// --------------------------
const Game = {
    init() {
        this.setupEventListeners();
        SoundManager.init();
        
        setTimeout(() => {
            elements.loadingScreen.classList.add('hidden');
        }, 2500);
    },
    
    setupEventListeners() {
        elements.restartBtn.addEventListener('click', () => this.startNewGame());
        elements.homeBtn.addEventListener('click', () => this.goHome());
        elements.soundBtn.addEventListener('click', () => this.toggleSound());
        elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        elements.resumeBtn.addEventListener('click', () => this.showResume());
        elements.playAgainBtn.addEventListener('click', () => {
            elements.victoryModal.classList.remove('show');
            this.startNewGame();
        });
        elements.closeLeaderboard.addEventListener('click', () => this.hideLeaderboard());
        elements.clearLeaderboard.addEventListener('click', () => this.handleClearLeaderboard());
        elements.resumeBtn.addEventListener('click', () => this.showResume());
        const closeResume = document.getElementById('closeResume');
        if (closeResume) {
            closeResume.addEventListener('click', () => this.hideResume());
        }
        const resumeModal = document.getElementById('resumeModal');
        if (resumeModal) {
            resumeModal.addEventListener('click', (e) => {
                if (e.target === resumeModal) {
                    this.hideResume();
                }
            });
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchLeaderboardTab(e.target.dataset.tab);
            });
        });
        
        elements.closeTutorial.addEventListener('click', () => {
            if (elements.dontShowTutorial.checked) {
                Utils.dismissTutorial();
            }
            elements.tutorialModal.classList.remove('show');
            this.startNewGame();
        });
        
        elements.achievementBtn.addEventListener('click', () => this.showAchievements());
        elements.closeAchievement.addEventListener('click', () => this.hideAchievements());
        
        elements.saveNickname.addEventListener('click', () => {
            const name = elements.nicknameInput.value.trim() || '\u533F\u540D\u73A9\u5BB6';
            gameState.playerName = name;
            localStorage.setItem('memoryGamePlayerName', name);
            elements.nicknameModal.classList.remove('show');
            this.saveScoreAndShowVictory();
        });
        
        elements.skipNickname.addEventListener('click', () => {
            elements.nicknameModal.classList.remove('show');
            this.saveScoreAndShowVictory();
        });
        
        elements.shareBtn.addEventListener('click', () => this.shareScore());
    },
    
    startGameFlow() {
        elements.loadingScreen.classList.add('hidden');
        
        if (Utils.shouldShowTutorial()) {
            elements.tutorialModal.classList.add('show');
        } else {
            this.startNewGame();
        }
    },
    
    startNewGame() {
        gameState.score = 0;
        gameState.time = 0;
        gameState.matchedPairs = 0;
        gameState.flippedCards = [];
        gameState.isLocked = false;
        gameState.combo = 0;
        gameState.maxCombo = 0;
        gameState.isPlaying = true;
        
        const diffConfig = CONFIG.difficulties[gameState.difficulty];
        gameState.totalPairs = diffConfig.pairs;
        
        this.updateCardSize();
        
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        
        this.generateCards();
        this.updateScore();
        this.updateTimer();
        this.updatePairs();
        
        gameState.timerInterval = setInterval(() => {
            gameState.time++;
            this.updateTimer();
        }, 1000);
    },
    
    goHome() {
        const container = document.querySelector('.container');
        const startScreen = document.getElementById('startScreen');
        
        container.classList.remove('game-ready');
        
        startScreen.classList.remove('hidden');
        startScreen.style.opacity = '1';
        
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        
        gameState.isPlaying = false;
        elements.gameBoard.innerHTML = '';
        gameState.difficulty = 'easy';
    },
    updateCardSize() {
        const maxWidth = Math.min(window.innerWidth - 40, 900);
        const cols = CONFIG.difficulties[gameState.difficulty].cols;
        const gap = 12;
        
        gameState.cardSize = Math.floor((maxWidth - (cols - 1) * gap) / cols);
        gameState.cardSize = Math.min(gameState.cardSize, 100);
        gameState.cardSize = Math.max(gameState.cardSize, 50);
        
        elements.gameBoard.style.width = `${gameState.cardSize * cols + gap * (cols - 1)}px`;
    },
    
    generateCards() {
        const matchEffect = elements.matchEffect;
        elements.gameBoard.innerHTML = '';
        elements.gameBoard.appendChild(matchEffect);
        
        const diffConfig = CONFIG.difficulties[gameState.difficulty];
        const pairsNeeded = diffConfig.pairs;
        
        const selectedPatterns = CONFIG.cardPatterns.slice(0, pairsNeeded);
        const cardData = [...selectedPatterns, ...selectedPatterns];
        
        const shuffledCards = Utils.shuffle(cardData);
        
        shuffledCards.forEach((pattern, index) => {
            const card = this.createCard(pattern, index);
            elements.gameBoard.appendChild(card);
        });
        
        elements.gameBoard.className = `game-board ${gameState.difficulty}`;
    },
    
    createCard(pattern, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.pattern = pattern;
        
        card.style.width = `${gameState.cardSize}px`;
        card.style.height = `${gameState.cardSize}px`;
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <span class="card-emoji">${pattern}</span>
                </div>
                <div class="card-back">
                    <span class="card-back-icon">?</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => this.flipCard(card));
        
        return card;
    },
    
    flipCard(card) {
        if (gameState.isLocked) return;
        if (card.classList.contains('flipped')) return;
        if (card.classList.contains('matched')) return;
        if (gameState.flippedCards.length >= 2) return;
        
        SoundManager.play('flip');
        
        card.classList.add('flipped');
        gameState.flippedCards.push(card);
        
        if (gameState.flippedCards.length === 2) {
            this.checkMatch();
        }
    },
    
    checkMatch() {
        const [card1, card2] = gameState.flippedCards;
        const pattern1 = card1.dataset.pattern;
        const pattern2 = card2.dataset.pattern;
        
        gameState.isLocked = true;
        
        if (pattern1 === pattern2) {
            this.handleMatch(card1, card2);
        } else {
            this.handleMismatch(card1, card2);
        }
    },
    
    handleMatch(card1, card2) {
        SoundManager.play('match');
        
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) {
            gameState.maxCombo = gameState.combo;
        }
        
        const baseScore = CONFIG.score.match;
        const comboBonus = (gameState.combo - 1) * CONFIG.score.comboBonus;
        gameState.score += baseScore + comboBonus;
        
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        this.showMatchEffect();
        
        setTimeout(() => {
            gameState.matchedPairs++;
            gameState.flippedCards = [];
            gameState.isLocked = false;
            
            this.updateScore();
            this.updatePairs();
            
            this.checkAchievements();
            
            this.checkGameEnd();
        }, 500);
    },
    
    showMatchEffect() {
        const effect = elements.matchEffect;
        
        effect.classList.remove('show', 'hide');
        void effect.offsetWidth;
        effect.classList.add('show');
        
        setTimeout(() => {
            effect.classList.remove('show');
            effect.classList.add('hide');
            
            setTimeout(() => {
                effect.classList.remove('hide');
            }, 300);
        }, 800);
    },
    
    handleMismatch(card1, card2) {
        SoundManager.play('mismatch');
        gameState.combo = 0;
        
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            gameState.flippedCards = [];
            gameState.isLocked = false;
        }, CONFIG.animation.flipDelay);
    },
    
    checkGameEnd() {
        if (gameState.matchedPairs === gameState.totalPairs) {
            this.endGame();
        }
    },
    
    endGame() {
        clearInterval(gameState.timerInterval);
        gameState.isPlaying = false;
        
        const timeBonus = Math.max(0, (300 - gameState.time) * CONFIG.score.timeBonus);
        gameState.score += timeBonus;
        
        SoundManager.play('victory');
        
        Utils.updateGameStats(true);
        
        this.checkVictoryAchievements();
        
        if (!gameState.playerName || gameState.playerName === '\u533F\u540D\u73A9\u5BB6') {
            elements.nicknameModal.classList.add('show');
        } else {
            this.saveScoreAndShowVictory();
        }
    },
    
    saveScoreAndShowVictory() {
        Utils.saveBestRecord(gameState.difficulty, gameState.time);
        Utils.saveLeaderboard(gameState.difficulty, gameState.score, gameState.time, gameState.playerName);
        
        elements.finalScore.textContent = gameState.score;
        elements.finalTime.textContent = Utils.formatTime(gameState.time);
        
        this.loadBestRecord();
        
        setTimeout(() => {
            elements.victoryModal.classList.add('show');
        }, 300);
    },
    
    checkAchievements() {
        if (gameState.combo >= 3 && !Utils.isAchievementUnlocked('combo_king')) {
            this.unlockAchievement('combo_king');
        }
        
        if (gameState.combo >= 5 && !Utils.isAchievementUnlocked('perfect_score')) {
            this.unlockAchievement('perfect_score');
        }
    },
    
    checkVictoryAchievements() {
        if (!Utils.isAchievementUnlocked('first_win')) {
            this.unlockAchievement('first_win');
        }
        
        if (gameState.difficulty === 'easy' && gameState.time <= 60 && !Utils.isAchievementUnlocked('speed_demon')) {
            this.unlockAchievement('speed_demon');
        }
        
        if (gameState.difficulty === 'hard' && !Utils.isAchievementUnlocked('master_player')) {
            this.unlockAchievement('master_player');
        }
    },
    
    unlockAchievement(achievementId) {
        if (Utils.unlockAchievement(achievementId)) {
            const achievement = CONFIG.achievements.find(a => a.id === achievementId);
            if (achievement) {
                SoundManager.play('achievement');
                this.showAchievementNotification(achievement);
            }
        }
    },
    
    showAchievementNotification(achievement) {
        elements.achievementName.textContent = achievement.name;
        elements.achievementNotification.classList.add('show');
        
        setTimeout(() => {
            elements.achievementNotification.classList.remove('show');
        }, 3000);
    },
    
    loadBestRecord() {
        const record = Utils.getBestRecord(gameState.difficulty);
        if (record) {
            elements.bestRecord.querySelector('.stat-value').textContent = Utils.formatTime(record);
        } else {
            elements.bestRecord.querySelector('.stat-value').textContent = '--:--';
        }
    },
    
    toggleSound() {
        gameState.isSoundEnabled = !gameState.isSoundEnabled;
        
        if (gameState.isSoundEnabled) {
            elements.soundBtn.classList.remove('muted');
            elements.soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            elements.soundBtn.classList.add('muted');
            elements.soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    },
    
    updateScore() {
        elements.scoreDisplay.textContent = gameState.score;
    },
    
    updateTimer() {
        elements.timerDisplay.textContent = Utils.formatTime(gameState.time);
    },
    
    updatePairs() {
        const remaining = gameState.totalPairs - gameState.matchedPairs;
        elements.pairsDisplay.textContent = remaining;
    },
    
    showLeaderboard() {
        elements.leaderboardModal.classList.add('show');
        this.renderLeaderboard(gameState.difficulty);
    },
    
    hideLeaderboard() {
        elements.leaderboardModal.classList.remove('show');
    },
    
    showResume() {
        const resumeModal = document.getElementById('resumeModal');
        resumeModal.classList.add('show');
    },
    
    hideResume() {
        const resumeModal = document.getElementById('resumeModal');
        resumeModal.classList.remove('show');
    },
    
    switchLeaderboardTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        this.renderLeaderboard(tab);
    },
    
    renderLeaderboard(difficulty) {
        const records = Utils.getLeaderboard(difficulty);
        
        if (records.length === 0) {
            elements.leaderboardList.innerHTML = '<div class="no-records">\u6682\u65E0\u8BB0\u5F55</div>';
            return;
        }
        
        elements.leaderboardList.innerHTML = records.map((record, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">${index + 1}</div>
                    <div class="score-info">
                        <span class="player-name">${record.name}</span>
                        <span class="score-text">${record.score} \u5206</span>
                        <span class="time-text">${Utils.formatTime(record.time)}</span>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    handleClearLeaderboard() {
        if (confirm('\u786E\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u8BB0\u5F55\u5417\uFF1F')) {
            Utils.clearLeaderboard();
            this.renderLeaderboard(gameState.difficulty);
            this.loadBestRecord();
        }
    },
    
    showAchievements() {
        elements.achievementModal.classList.add('show');
        this.renderAchievements();
    },
    
    hideAchievements() {
        elements.achievementModal.classList.remove('show');
    },
    
    renderAchievements() {
        const unlockedAchievements = Utils.getAchievements();
        
        elements.achievementList.innerHTML = CONFIG.achievements.map(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            return `
                <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h4>${achievement.name}</h4>
                        <p>${achievement.description}</p>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    shareScore() {
        const shareText = `\u{1F3AE} \u6211\u5728\u8D5B\u535A\u670B\u514B\u8BB0\u5FC6\u7FFB\u724C\u6E38\u620F\u4E2D\u83B7\u5F97\u4E86 ${gameState.score} \u5206\uFF01\u7528\u65F6 ${Utils.formatTime(gameState.time)}\uFF0C\u6700\u9AD8\u8FDE\u51FB ${gameState.maxCombo} \u6B21\uFF01\u6765\u6311\u6218\u6211\u5427\uFF01`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('\u6210\u7EE9\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF01');
            }).catch(() => {
                alert(shareText);
            });
        } else {
            alert(shareText);
        }
    }
};

// --------------------------
// \u9875\u9762\u52A0\u8F7D\u5B8C\u6210\u540E\u521D\u59CB\u5316\u6E38\u620F
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('startScreen');
    const container = document.querySelector('.container');
    const cyberStartBtn = document.getElementById('cyberStartBtn');
    const startDifficulty = document.getElementById('startDifficulty');
    const openLeaderboard = document.getElementById('openLeaderboard');
    const openTutorial = document.getElementById('openTutorial');
    const openResume = document.getElementById('openResume');
    
    cyberStartBtn.addEventListener('click', () => {
        const selectedDifficulty = startDifficulty.value;
        gameState.difficulty = selectedDifficulty;
        
        startScreen.style.opacity = '0';
        startScreen.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            startScreen.classList.add('hidden');
            container.classList.add('game-ready');
            Game.startNewGame();
        }, 500);
    });
    
    openLeaderboard.addEventListener('click', () => {
        elements.leaderboardModal.classList.add('show');
    });
    
    openTutorial.addEventListener('click', () => {
        const tutorialModal = document.getElementById('tutorialModal');
        tutorialModal.classList.add('show');
    });
    
    openResume.addEventListener('click', () => {
        const resumeModal = document.getElementById('resumeModal');
        resumeModal.classList.add('show');
    });
    
    const closeResume = document.getElementById('closeResume');
    if (closeResume) {
        closeResume.addEventListener('click', () => {
            const resumeModal = document.getElementById('resumeModal');
            resumeModal.classList.remove('show');
        });
    }
    
    Game.init();
    
    window.addEventListener('resize', () => {
        if (gameState.isPlaying && !elements.victoryModal.classList.contains('show')) {
            Game.updateCardSize();
            const currentCards = elements.gameBoard.querySelectorAll('.card');
            currentCards.forEach(card => {
                card.style.width = `${gameState.cardSize}px`;
                card.style.height = `${gameState.cardSize}px`;
            });
            elements.gameBoard.style.width = `${gameState.cardSize * CONFIG.difficulties[gameState.difficulty].cols + 12 * (CONFIG.difficulties[gameState.difficulty].cols - 1)}px`;
        }
    });
});
