// AppManager.js - 애플리케이션 전체 관리
import LobbyManager from './LobbyManager.js';
import GameManager from './GameManager.js';

export default class AppManager {
    constructor() {
        this.currentManager = null;
        this.environment = null;
    }

    async initialize() {
        try {
            // 환경 감지
            this.environment = this.detectEnvironment();
            console.log(`🔍 감지된 환경: ${this.environment}`);

            // 환경에 따른 매니저 선택 및 초기화
            switch (this.environment) {
                case 'lobby':
                    this.currentManager = new LobbyManager();
                    await this.currentManager.initialize();
                    break;

                case 'game':
                    this.currentManager = new GameManager();
                    await this.currentManager.initialize();
                    break;

                default:
                    throw new Error(`알 수 없는 환경: ${this.environment}`);
            }

            console.log('✅ 애플리케이션 초기화 완료');

        } catch (error) {
            console.error('❌ 애플리케이션 초기화 실패:', error);
            this.handleInitializationError(error);
        }
    }

    detectEnvironment() {
        const gameCanvas = document.querySelector('canvas.webgl');
        const lobbyCanvas = document.querySelector('#bg');
        const startGameBtn = document.getElementById('start-game');

        // 게임 환경 감지
        if (gameCanvas && !lobbyCanvas) {
            return 'game';
        }

        // 로비 환경 감지
        if (lobbyCanvas || startGameBtn) {
            return 'lobby';
        }

        // 알 수 없는 환경
        return 'unknown';
    }

    handleInitializationError(error) {
        // 사용자 친화적인 에러 처리
        const errorMessage = this.getErrorMessage(error);

        console.error('초기화 에러 상세:', error);

        // 개발 환경에서는 상세 에러 표시
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            alert(`개발 에러: ${error.message}`);
        } else {
            // 프로덕션에서는 간단한 메시지
            alert(errorMessage);
        }
    }

    getErrorMessage(error) {
        if (error.message.includes('환경이 아닙니다')) {
            return '페이지 로딩 중 문제가 발생했습니다. 새로고침해 주세요.';
        }

        if (error.message.includes('필수 UI 요소')) {
            return '페이지가 완전히 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.';
        }

        return '초기화 중 문제가 발생했습니다. 새로고침해 주세요.';
    }

    getCurrentEnvironment() {
        return this.environment;
    }

    getCurrentManager() {
        return this.currentManager;
    }

    destroy() {
        if (this.currentManager) {
            this.currentManager.destroy();
            this.currentManager = null;
        }

        this.environment = null;
        console.log('🧹 애플리케이션 매니저 정리 완료');
    }
}

// 전역 앱 매니저 인스턴스
window.appManager = null;

// 자동 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 DOMContentLoaded 이벤트 발생 - AppManager 초기화 시작');
    try {
        window.appManager = new AppManager();
        console.log('🎯 AppManager 인스턴스 생성 완료');
        await window.appManager.initialize();
        console.log('✅ AppManager 초기화 완료');
    } catch (error) {
        console.error('❌ 앱 매니저 자동 초기화 실패:', error);
    }
});

// 만약 DOMContentLoaded가 이미 발생했다면 즉시 실행
if (document.readyState === 'loading') {
    console.log('📄 문서 로딩 중 - DOMContentLoaded 대기');
} else {
    console.log('📄 문서 로딩 완료 - 즉시 AppManager 초기화');
    setTimeout(async () => {
        if (!window.appManager) {
            console.log('🔄 즉시 AppManager 초기화 시작');
            try {
                window.appManager = new AppManager();
                console.log('🎯 AppManager 인스턴스 생성 완료');
                await window.appManager.initialize();
                console.log('✅ AppManager 초기화 완료');
            } catch (error) {
                console.error('❌ 즉시 AppManager 초기화 실패:', error);
            }
        }
    }, 100);
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.appManager) {
        window.appManager.destroy();
    }
});