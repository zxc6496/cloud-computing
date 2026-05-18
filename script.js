// ==============================================
// 记忆翻牌游戏 - JavaScript 文件
// 作者：Memory Card Game
// 版本：1.0
// ==============================================

// --------------------------
// 游戏配置常量
// --------------------------
const CONFIG = {
    // 卡牌图案（使用 emoji）
    cardPatterns: [
        '🎮', '🎯', '🎨', '🎭', '🎪', '🎰', '🎲', '🎸',
        '🦋', '🌸', '🌺', '🌙', '⭐', '🌈', '🔥', '💎',
        '🚀', '⚡', '🎯', '🎪', '🎨', '🎮', '⭐', '🔥'
    ],
    
    // 难度配置
    difficulties: {
        easy: { rows: 4, cols: 4, pairs: 8 },
        hard: { rows: 6, cols: 6, pairs: 18 }
    },
    
    // 分数配置
    score: {
        match: 100,           // 配对成功得分
        timeBonus: 10,        // 时间奖励系数
        comboBonus: 50        // 连击奖励
    },
    
    // 动画时间（毫秒）
    animation: {
        flipDelay: 1000,      // 翻回时间
        cardSize: 80          // 卡牌基础大小（像素）
    }
};

// --------------------------
// 游戏状态管理
// --------------------------
const gameState = {
    score: 0,                  // 当前分数
    time: 0,                   // 当前时间（秒）
    timerInterval: null,       // 计时器间隔
    flippedCards: [],          // 当前翻开的卡牌
    matchedPairs: 0,           // 已配对数量
    totalPairs: 8,             // 总配对数
    difficulty: 'easy',        // 当前难度
    isLocked: false,           // 游戏是否锁定（防止重复点击）
    isSoundEnabled: true,      // 是否开启音效
    combo: 0,                  // 连击数
    cardSize: 80               // 当前卡牌大小
};

// --------------------------
// DOM 元素引用
// --------------------------
const elements = {
    gameBoard: document.getElementById('gameBoard'),
    scoreDisplay: document.getElementById('score'),
    timerDisplay: document.getElementById('timer'),
    pairsDisplay: document.getElementById('pairs'),
    difficultySelect: document.getElementById('difficulty'),
    soundBtn: document.getElementById('soundBtn'),
    leaderboardBtn: document.getElementById('leaderboardBtn'),
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
    clearLeaderboard: document.getElementById('clearLeaderboard')
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
            flip: 523.25,    // C5
            match: 659.25,   // E5
            mismatch: 261.63, // C4
            victory: [523.25, 659.25, 783.99] // C5-E5-G5
        };
        
        const duration = {
            flip: 0.1,
            match: 0.3,
            mismatch: 0.2,
            victory: 0.4
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
    // 格式化时间显示
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Fisher-Yates 洗牌算法
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    // 获取 localStorage 最佳记录
    getBestRecord(difficulty) {
        const records = localStorage.getItem('memoryGameRecords');
        if (!records) return null;
        const parsed = JSON.parse(records);
        return parsed[difficulty] || null;
    },
    
    // 保存最佳记录
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
    
    // 获取排行榜数据
    getLeaderboard(difficulty) {
        const data = localStorage.getItem('memoryGameLeaderboard');
        if (!data) return [];
        const parsed = JSON.parse(data);
        return parsed[difficulty] || [];
    },
    
    // 保存排行榜记录
    saveLeaderboard(difficulty, score, time) {
        const data = localStorage.getItem('memoryGameLeaderboard');
        const parsed = data ? JSON.parse(data) : { easy: [], hard: [] };
        
        const record = {
            score,
            time,
            date: new Date().toISOString().split('T')[0]
        };
        
        parsed[difficulty].push(record);
        parsed[difficulty].sort((a, b) => b.score - a.score);
        parsed[difficulty] = parsed[difficulty].slice(0, 10);
        
        localStorage.setItem('memoryGameLeaderboard', JSON.stringify(parsed));
    },
    
    // 清空排行榜
    clearLeaderboard() {
        localStorage.removeItem('memoryGameLeaderboard');
        localStorage.removeItem('memoryGameRecords');
    }
};

// --------------------------
// 游戏核心逻辑
// --------------------------
const Game = {
    // 初始化游戏
    init() {
        this.setupEventListeners();
        SoundManager.init();
        this.startNewGame();
        this.loadBestRecord();
    },
    
    // 设置事件监听器
    setupEventListeners() {
        elements.restartBtn.addEventListener('click', () => this.startNewGame());
        elements.soundBtn.addEventListener('click', () => this.toggleSound());
        elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        elements.difficultySelect.addEventListener('change', (e) => {
            gameState.difficulty = e.target.value;
            this.startNewGame();
        });
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
    },
    
    // 开始新游戏
    startNewGame() {
        // 重置游戏状态
        gameState.score = 0;
        gameState.time = 0;
        gameState.matchedPairs = 0;
        gameState.flippedCards = [];
        gameState.isLocked = false;
        gameState.combo = 0;
        
        // 获取难度配置
        const diffConfig = CONFIG.difficulties[gameState.difficulty];
        gameState.totalPairs = diffConfig.pairs;
        
        // 更新卡牌大小（根据难度和屏幕尺寸）
        this.updateCardSize();
        
        // 停止之前的计时器
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        
        // 生成卡牌
        this.generateCards();
        
        // 更新 UI
        this.updateScore();
        this.updateTimer();
        this.updatePairs();
        
        // 启动计时器
        gameState.timerInterval = setInterval(() => {
            gameState.time++;
            this.updateTimer();
        }, 1000);
    },
    
    // 更新卡牌大小
    updateCardSize() {
        const maxWidth = Math.min(window.innerWidth - 40, 900);
        const cols = CONFIG.difficulties[gameState.difficulty].cols;
        const gap = 12;
        
        gameState.cardSize = Math.floor((maxWidth - (cols - 1) * gap) / cols);
        gameState.cardSize = Math.min(gameState.cardSize, 100);
        gameState.cardSize = Math.max(gameState.cardSize, 50);
        
        // 设置游戏面板样式
        elements.gameBoard.style.width = `${gameState.cardSize * cols + gap * (cols - 1)}px`;
    },
    
    // 生成卡牌
    generateCards() {
        // 保存特效元素
        const matchEffect = elements.matchEffect;
        
        // 清空游戏面板（只保留特效元素）
        elements.gameBoard.innerHTML = '';
        
        // 重新添加特效元素
        elements.gameBoard.appendChild(matchEffect);
        
        // 获取难度对应的图案数量
        const diffConfig = CONFIG.difficulties[gameState.difficulty];
        const pairsNeeded = diffConfig.pairs;
        
        // 选择需要的图案并创建配对
        const selectedPatterns = CONFIG.cardPatterns.slice(0, pairsNeeded);
        const cardData = [...selectedPatterns, ...selectedPatterns];
        
        // 洗牌
        const shuffledCards = Utils.shuffle(cardData);
        
        // 创建卡牌元素
        shuffledCards.forEach((pattern, index) => {
            const card = this.createCard(pattern, index);
            elements.gameBoard.appendChild(card);
        });
        
        // 设置游戏面板难度类
        elements.gameBoard.className = `game-board ${gameState.difficulty}`;
    },
    
    // 创建单个卡牌元素
    createCard(pattern, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.pattern = pattern;
        
        // 根据屏幕宽度调整卡牌大小
        card.style.width = `${gameState.cardSize}px`;
        card.style.height = `${gameState.cardSize}px`;
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">${pattern}</div>
                <div class="card-back"><i class="fas fa-question"></i></div>
            </div>
        `;
        
        // 添加点击事件
        card.addEventListener('click', () => this.flipCard(card));
        
        return card;
    },
    
    // 翻转卡牌
    flipCard(card) {
        // 防止重复点击
        if (gameState.isLocked) return;
        if (card.classList.contains('flipped')) return;
        if (card.classList.contains('matched')) return;
        if (gameState.flippedCards.length >= 2) return;
        
        // 播放翻牌音效
        SoundManager.play('flip');
        
        // 翻开卡牌
        card.classList.add('flipped');
        gameState.flippedCards.push(card);
        
        // 检查是否翻开了两张
        if (gameState.flippedCards.length === 2) {
            this.checkMatch();
        }
    },
    
    // 检查配对
    checkMatch() {
        const [card1, card2] = gameState.flippedCards;
        const pattern1 = card1.dataset.pattern;
        const pattern2 = card2.dataset.pattern;
        
        gameState.isLocked = true;
        
        if (pattern1 === pattern2) {
            // 配对成功
            this.handleMatch(card1, card2);
        } else {
            // 配对失败
            this.handleMismatch(card1, card2);
        }
    },
    
    // 处理配对成功
    handleMatch(card1, card2) {
        // 播放匹配音效
        SoundManager.play('match');
        
        // 增加连击
        gameState.combo++;
        
        // 计算分数（基础分 + 连击奖励）
        const baseScore = CONFIG.score.match;
        const comboBonus = (gameState.combo - 1) * CONFIG.score.comboBonus;
        gameState.score += baseScore + comboBonus;
        
        // 显示配对成功特效
        this.showMatchEffect();
        
        // 更新配对状态
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            gameState.matchedPairs++;
            gameState.flippedCards = [];
            gameState.isLocked = false;
            
            // 更新 UI
            this.updateScore();
            this.updatePairs();
            
            // 检查游戏是否结束
            this.checkGameEnd();
        }, 300);
    },
    
    // 显示配对成功特效
    showMatchEffect() {
        const effect = elements.matchEffect;
        
        // 移除之前的动画类
        effect.classList.remove('show', 'hide');
        
        // 触发重新渲染
        void effect.offsetWidth;
        
        // 添加显示动画
        effect.classList.add('show');
        
        // 设置延迟后隐藏
        setTimeout(() => {
            effect.classList.remove('show');
            effect.classList.add('hide');
            
            // 动画结束后移除隐藏类
            setTimeout(() => {
                effect.classList.remove('hide');
            }, 300);
        }, 800);
    },
    
    // 处理配对失败
    handleMismatch(card1, card2) {
        // 播放不匹配音效
        SoundManager.play('mismatch');
        
        // 重置连击
        gameState.combo = 0;
        
        // 延迟后翻回卡牌
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            gameState.flippedCards = [];
            gameState.isLocked = false;
        }, CONFIG.animation.flipDelay);
    },
    
    // 检查游戏是否结束
    checkGameEnd() {
        if (gameState.matchedPairs === gameState.totalPairs) {
            // 游戏胜利
            this.endGame();
        }
    },
    
    // 游戏结束处理
    endGame() {
        // 停止计时器
        clearInterval(gameState.timerInterval);
        
        // 计算时间奖励
        const timeBonus = Math.max(0, (300 - gameState.time) * CONFIG.score.timeBonus);
        gameState.score += timeBonus;
        
        // 播放胜利音效
        SoundManager.play('victory');
        
        // 保存最佳记录和排行榜记录
        Utils.saveBestRecord(gameState.difficulty, gameState.time);
        Utils.saveLeaderboard(gameState.difficulty, gameState.score, gameState.time);
        
        // 更新胜利弹窗内容
        elements.finalScore.textContent = gameState.score;
        elements.finalTime.textContent = Utils.formatTime(gameState.time);
        
        // 更新最佳记录显示
        this.loadBestRecord();
        
        // 显示胜利弹窗
        setTimeout(() => {
            elements.victoryModal.classList.add('show');
        }, 500);
    },
    
    // 加载最佳记录
    loadBestRecord() {
        const record = Utils.getBestRecord(gameState.difficulty);
        if (record) {
            elements.bestRecord.querySelector('.stat-value').textContent = Utils.formatTime(record);
        } else {
            elements.bestRecord.querySelector('.stat-value').textContent = '--:--';
        }
    },
    
    // 切换音效
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
    
    // 更新分数显示
    updateScore() {
        elements.scoreDisplay.textContent = gameState.score;
    },
    
    // 更新时间显示
    updateTimer() {
        elements.timerDisplay.textContent = Utils.formatTime(gameState.time);
    },
    
    // 更新剩余配对显示
    updatePairs() {
        const remaining = gameState.totalPairs - gameState.matchedPairs;
        elements.pairsDisplay.textContent = remaining;
    },
    
    // 显示排行榜
    showLeaderboard() {
        elements.leaderboardModal.classList.add('show');
        this.renderLeaderboard(gameState.difficulty);
    },
    
    // 隐藏排行榜
    hideLeaderboard() {
        elements.leaderboardModal.classList.remove('show');
    },
    
    // 切换排行榜标签
    switchLeaderboardTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        this.renderLeaderboard(tab);
    },
    
    // 渲染排行榜
    renderLeaderboard(difficulty) {
        const records = Utils.getLeaderboard(difficulty);
        
        if (records.length === 0) {
            elements.leaderboardList.innerHTML = '<div class="no-records">暂无记录</div>';
            return;
        }
        
        elements.leaderboardList.innerHTML = records.map((record, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">${index + 1}</div>
                    <div class="score-info">
                        <span class="score-text">${record.score} 分</span>
                        <span class="time-text">${Utils.formatTime(record.time)}</span>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // 处理清空排行榜
    handleClearLeaderboard() {
        if (confirm('确定要清空所有记录吗？')) {
            Utils.clearLeaderboard();
            this.renderLeaderboard(gameState.difficulty);
            this.loadBestRecord();
        }
    }
};

// --------------------------
// 页面加载完成后初始化游戏
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
        if (!elements.victoryModal.classList.contains('show')) {
            Game.updateCardSize();
            // 重新生成卡牌以适应新尺寸
            const currentCards = elements.gameBoard.querySelectorAll('.card');
            currentCards.forEach(card => {
                card.style.width = `${gameState.cardSize}px`;
                card.style.height = `${gameState.cardSize}px`;
            });
            elements.gameBoard.style.width = `${gameState.cardSize * CONFIG.difficulties[gameState.difficulty].cols + 12 * (CONFIG.difficulties[gameState.difficulty].cols - 1)}px`;
        }
    });
});
