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
        '🎮', '🎯', '🎨', '🎭', '🎪', '🎰', '🎲', '🎸',
        '🦋', '🌸', '🌺', '🌙', '⭐', '🌈', '🔥', '💎',
        '🚀', '⚡', '💫', '🎵', '🎼', '🎹', '🎺', '🎻',
        '🦄', '🐉', '🌟', '💜', '🎁', '🎈', '🎀', '💝'
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
            name: '初次胜利',
            description: '完成第一次游戏',
            icon: '🎉'
        },
        {
            id: 'speed_demon',
            name: '速度之王',
            description: '在60秒内完成简单难度',
            icon: '⚡'
        },
        {
            id: 'perfect_score',
            name: '完美表现',
            description: '连续配对5次不失误',
            icon: '🏆'
        },
        {
            id: 'master_player',
            name: '游戏大师',
            description: '完成困难难度',
            icon: '👑'
        },
        {
            id: 'combo_king',
            name: '连击之王',
            description: '达成3连击',
            icon: '🔥'
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
            console.warn('Web Audio API 不支持，音效功能将被禁用');
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
            name: name || '匿名玩家',
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
        elements.playAgainBtn.addEventListener('click', () => {
            elements.victoryModal.classList.remove('show');
            this.startNewGame();
        });
        elements.closeLeaderboard.addEventListener('click', () => this.hideLeaderboard());
        elements.clearLeaderboard.addEventListener('click', () => this.handleClearLeaderboard());
        
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
            const name = elements.nicknameInput.value.trim() || '匿名玩家';
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
        
        // 显示匹配特效
        this.showMatchEffect();
        
        // 延迟标记为匹配，让用户看到翻转后的图案
        setTimeout(() => {
            // 添加 matched 类，保持 flipped 类
            card1.classList.add('matched');
            card2.classList.add('matched');
            
            gameState.matchedPairs++;
            gameState.flippedCards = [];
            gameState.isLocked = false;
            
            this.updateScore();
            this.updatePairs();
            
            this.checkAchievements();
            
            this.checkGameEnd();
        }, 600);
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
        
        if (!gameState.playerName || gameState.playerName === '匿名玩家') {
            elements.nicknameModal.classList.add('show');
        } else {
            this.saveScoreAndShowVictory();
        }
    },
    
    saveScoreAndShowVictory() {
        Utils.saveLeaderboard(
            gameState.difficulty,
            gameState.score,
            gameState.time,
            gameState.playerName
        );
        
        const isNewRecord = Utils.saveBestRecord(gameState.difficulty, gameState.time);
        
        elements.finalScore.textContent = gameState.score;
        elements.finalTime.textContent = Utils.formatTime(gameState.time);
        
        const bestTime = Utils.getBestRecord(gameState.difficulty);
        if (bestTime) {
            elements.bestRecord.textContent = `最佳记录: ${Utils.formatTime(bestTime)}`;
        } else {
            elements.bestRecord.textContent = '最佳记录: 无';
        }
        
        if (isNewRecord) {
            elements.bestRecord.textContent += ' 🎉 新记录！';
        }
        
        elements.victoryModal.classList.add('show');
    },
    
    checkAchievements() {
        if (gameState.combo >= 3) {
            this.unlockAchievementWithNotification('combo_king');
        }
        
        if (gameState.combo >= 5) {
            this.unlockAchievementWithNotification('perfect_score');
        }
    },
    
    checkVictoryAchievements() {
        this.unlockAchievementWithNotification('first_win');
        
        if (gameState.difficulty === 'hard' || gameState.difficulty === 'extreme') {
            this.unlockAchievementWithNotification('master_player');
        }
        
        if (gameState.time <= 60 && gameState.difficulty === 'easy') {
            this.unlockAchievementWithNotification('speed_demon');
        }
    },
    
    unlockAchievementWithNotification(achievementId) {
        if (Utils.unlockAchievement(achievementId)) {
            const achievement = CONFIG.achievements.find(a => a.id === achievementId);
            if (achievement) {
                elements.achievementName.textContent = `${achievement.icon} ${achievement.name}`;
                elements.achievementNotification.classList.add('show');
                
                SoundManager.play('achievement');
                
                setTimeout(() => {
                    elements.achievementNotification.classList.remove('show');
                }, 3000);
            }
        }
    },
    
    showAchievements() {
        const unlockedAchievements = Utils.getAchievements();
        
        elements.achievementList.innerHTML = CONFIG.achievements.map(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            return `
                <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                    </div>
                    <div class="achievement-status">
                        ${isUnlocked ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-lock"></i>'}
                    </div>
                </div>
            `;
        }).join('');
        
        elements.achievementModal.classList.add('show');
    },
    
    hideAchievements() {
        elements.achievementModal.classList.remove('show');
    },
    
    showLeaderboard() {
        this.renderLeaderboard(gameState.difficulty);
        elements.leaderboardModal.classList.add('show');
    },
    
    hideLeaderboard() {
        elements.leaderboardModal.classList.remove('show');
    },
    
    switchLeaderboardTab(difficulty) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === difficulty);
        });
        this.renderLeaderboard(difficulty);
    },
    
    renderLeaderboard(difficulty) {
        const records = Utils.getLeaderboard(difficulty);
        const difficultyNames = {
            easy: '简单',
            hard: '困难',
            extreme: '极限'
        };
        
        if (records.length === 0) {
            elements.leaderboardList.innerHTML = `
                <div class="empty-leaderboard">
                    <i class="fas fa-inbox"></i>
                    <p>暂无${difficultyNames[difficulty]}难度的记录</p>
                    <p>快来完成一局游戏吧！</p>
                </div>
            `;
            return;
        }
        
        elements.leaderboardList.innerHTML = records.map((record, index) => `
            <div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                <div class="rank">${index + 1}</div>
                <div class="player-info">
                    <div class="player-name">${record.name}</div>
                    <div class="player-date">${record.date}</div>
                </div>
                <div class="player-score">${record.score}分</div>
                <div class="player-time">${Utils.formatTime(record.time)}</div>
            </div>
        `).join('');
    },
    
    handleClearLeaderboard() {
        if (confirm('确定要清空所有排行榜记录吗？此操作不可恢复。')) {
            Utils.clearLeaderboard();
            this.renderLeaderboard(gameState.difficulty);
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
    
    toggleSound() {
        gameState.isSoundEnabled = !gameState.isSoundEnabled;
        elements.soundBtn.classList.toggle('muted', !gameState.isSoundEnabled);
        elements.soundBtn.innerHTML = gameState.isSoundEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
    },
    
    shareScore() {
        const shareText = `我在记忆翻牌游戏中获得了 ${gameState.score} 分！\n` +
            `难度: ${gameState.difficulty === 'easy' ? '简单' : gameState.difficulty === 'hard' ? '困难' : '极限'}\n` +
            `用时: ${Utils.formatTime(gameState.time)}\n` +
            `快来挑战我吧！`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('成绩已复制到剪贴板！');
            }).catch(() => {
                alert(shareText);
            });
        } else {
            alert(shareText);
        }
    }
};

// --------------------------
// 页面加载完成后初始化游戏
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('startScreen');
    const container = document.querySelector('.container');
    const cyberStartBtn = document.getElementById('cyberStartBtn');
    const startDifficulty = document.getElementById('startDifficulty');
    const openLeaderboard = document.getElementById('openLeaderboard');
    const openTutorial = document.getElementById('openTutorial');
    
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