// GameManager.js - 게임 전용 기능 관리
import UIHandler from './UIHandler.js';

export default class GameManager {
    constructor() {
        this.isInitialized = false;
        this.isGameRunning = false;
        this.uiHandler = null;
    }

    async initialize() {
        try {
            // 게임 환경 검증
            if (!this.validateGameEnvironment()) {
                throw new Error('게임 환경이 아닙니다.');
            }

            console.log('✅ 게임 매니저가 게임 환경을 감지했습니다.');
            
            // UIHandler 초기화 (게임 UI 스케일링을 위해)
            this.uiHandler = new UIHandler(null, null);
            this.uiHandler.initializeUI();
            console.log('🎮 게임 UI 핸들러 초기화 완료');
            
            console.log('🎮 ingame.js에서 게임 초기화를 담당합니다.');
            
            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('❌ 게임 매니저 초기화 실패:', error);
            throw error;
        }
    }

    validateGameEnvironment() {
        // 게임 환경 확인 (게임 캔버스가 있어야 함)
        const gameCanvas = document.querySelector('canvas.webgl');
        const lobbyCanvas = document.querySelector('#bg');
        
        return gameCanvas && !lobbyCanvas;
    }

    startGame() {
        if (!this.isInitialized) {
            throw new Error('게임 매니저가 초기화되지 않았습니다.');
        }

        this.isGameRunning = true;
        console.log('🚗 게임 시작!');
    }

    pauseGame() {
        this.isGameRunning = false;
        console.log('⏸️ 게임 일시정지');
    }

    resumeGame() {
        this.isGameRunning = true;
        console.log('▶️ 게임 재개');
    }

    endGame() {
        this.isGameRunning = false;
        console.log('🏁 게임 종료');
    }

    destroy() {
        this.isGameRunning = false;
        this.isInitialized = false;
        console.log('🧹 게임 매니저 정리 완료');
    }
}