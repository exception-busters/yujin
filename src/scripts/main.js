// main.js - 리팩터링된 메인 진입점
// AppManager가 모든 초기화를 담당합니다.

console.log('📱 main.js 로드됨 - AppManager가 자동으로 환경을 감지하고 초기화합니다.');

// AppManager 임포트 (자동 초기화됨)
import('./AppManager.js').then(() => {
    console.log('✅ AppManager 모듈 로드 완료 - DOMContentLoaded에서 자동 초기화됩니다');
}).catch(error => {
    console.error('❌ AppManager 모듈 로드 실패:', error);
});

// 개발자 도구에서 현재 환경 확인 가능
window.getCurrentEnvironment = () => {
    return window.appManager?.getCurrentEnvironment() || 'unknown';
};

window.getCurrentManager = () => {
    return window.appManager?.getCurrentManager() || null;
};

// 디버깅용 정보 출력
console.log('🔧 개발자 도구에서 사용 가능한 함수들:');
console.log('- getCurrentEnvironment(): 현재 환경 확인');
console.log('- getCurrentManager(): 현재 매니저 확인');
console.log('- window.appManager: 전체 앱 매니저 접근');

// 초기화 완료 후 상태 확인
setTimeout(() => {
    console.log('🔍 AppManager 로드 상태 확인:', !!window.appManager);
    console.log('🌍 현재 환경:', getCurrentEnvironment());
    console.log('📋 현재 매니저:', getCurrentManager()?.constructor?.name || 'None');
}, 1000);