// AudioManager.js
export default class AudioManager {
    constructor(uiHandler) {
        this.uiHandler = uiHandler;
        this.audioContext = null;
        this.microphoneStream = null;
        this.analyserNode = null;
        this.isTesting = false;
        this.sensitivity = 1.0;
        this.lobbyBgm = document.getElementById('lobby-bgm');
        this.volumeSettings = {
            lobbyBgm: parseFloat(localStorage.getItem('lobbyBgmVolume')) || 0.5
        };

        // 노이즈 게이팅 임계값 (dB) - 이 값보다 작은 소리는 무시
        this.noiseGateThresholdDb = -45; // -45dB로 설정, 필요에 따라 조정 가능

        // 스무딩을 위한 EMA 계수
        this.smoothingFactor = 0.2; // 0.0 (최대 스무딩) ~ 1.0 (스무딩 없음)
        this.smoothedTotalRms = 0;
        this.smoothedLowRms = 0;
        this.smoothedHighRms = 0;
        this.initializeAudio();
    }

    initializeAudio() {
        this.lobbyBgm.volume = this.volumeSettings.lobbyBgm;
        this.uiHandler.lobbyBgmVolumeSlider.value = this.volumeSettings.lobbyBgm;
        this.uiHandler.lobbyBgmVolumeValue.textContent = this.volumeSettings.lobbyBgm.toFixed(2);

        this.lobbyBgm.play().catch(err => {
            console.error('로비 BGM 재생 오류:', err);
            document.addEventListener('click', () => {
                this.lobbyBgm.play().catch(err => console.error('로비 BGM 재생 실패:', err));
            }, { once: true });
        });
        console.log('로비 BGM 초기화 완료, 볼륨:', this.volumeSettings.lobbyBgm);
    }

    setupEventListeners() {
        this.uiHandler.micSelect.addEventListener('change', this.handleMicSelectChange.bind(this));
        this.uiHandler.micSensitivitySlider.addEventListener('input', this.handleMicSensitivityChange.bind(this));
        this.uiHandler.micTestButton.addEventListener('click', this.handleMicTestButtonClick.bind(this));
        this.uiHandler.closeMicTestWindowButton.addEventListener('click', this.handleCloseMicTestWindow.bind(this));
        this.uiHandler.lobbyBgmVolumeSlider.addEventListener('input', this.handleLobbyBgmVolumeChange.bind(this));
    }

    saveVolumeSettings() {
        localStorage.setItem('lobbyBgmVolume', this.volumeSettings.lobbyBgm);
        console.log('로비 BGM 볼륨 저장:', this.volumeSettings.lobbyBgm);
    }

    handleLobbyBgmVolumeChange() {
        this.volumeSettings.lobbyBgm = parseFloat(this.uiHandler.lobbyBgmVolumeSlider.value);
        this.lobbyBgm.volume = this.volumeSettings.lobbyBgm;
        this.uiHandler.lobbyBgmVolumeValue.textContent = this.volumeSettings.lobbyBgm.toFixed(2);
        this.saveVolumeSettings();
        console.log('로비 BGM 볼륨 변경:', this.volumeSettings.lobbyBgm);
    }

    async populateMicDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            this.uiHandler.micSelect.innerHTML = '<option value="">마이크 선택</option>';
            audioInputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `마이크 ${this.uiHandler.micSelect.options.length + 1}`;
                this.uiHandler.micSelect.appendChild(option);
            });
        } catch (err) {
            console.error('마이크 장치 목록 가져오기 오류:', err);
            alert('마이크 장치에 접근할 수 없습니다. 권한을 확인해주세요.');
        }
    }

    async startMicTest() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // constraints 객체를 getUserMedia 호출 바깥에서 선언
            const constraints = {
                audio: true // 특정 deviceId 대신 기본 마이크를 요청
            };
            console.log('getUserMedia constraints:', constraints);

            const stream = await navigator.mediaDevices.getUserMedia(constraints); // 선언된 constraints 객체를 인자로 전달
            this.microphoneStream = stream;
            this.isTesting = true;

            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 2048;

            const lowFilter = this.audioContext.createBiquadFilter();
            lowFilter.type = 'bandpass';
            lowFilter.frequency.setValueAtTime(100, this.audioContext.currentTime);
            lowFilter.Q.setValueAtTime(3, this.audioContext.currentTime);

            const highFilter = this.audioContext.createBiquadFilter();
            highFilter.type = 'bandpass';
            highFilter.frequency.setValueAtTime(475, this.audioContext.currentTime);
            highFilter.Q.setValueAtTime(5, this.audioContext.currentTime);

            const lowAnalyser = this.audioContext.createAnalyser();
            lowAnalyser.fftSize = 2048;
            const highAnalyser = this.audioContext.createAnalyser();
            highAnalyser.fftSize = 2048;

            source.connect(this.analyserNode);
            source.connect(lowFilter);
            lowFilter.connect(lowAnalyser);
            source.connect(highFilter);
            highFilter.connect(highAnalyser);

            const bufferLength = this.analyserNode.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            const lowDataArray = new Float32Array(lowAnalyser.frequencyBinCount);
            const highDataArray = new Float32Array(highAnalyser.frequencyBinCount);

            const updatePowerBars = () => {
                if (!this.isTesting) return;

                this.analyserNode.getFloatTimeDomainData(dataArray);
                let sumTotalRms = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sumTotalRms += dataArray[i] * dataArray[i];
                }
                const currentTotalRms = Math.sqrt(sumTotalRms / bufferLength) * this.sensitivity * 5;

                // EMA 스무딩 적용
                this.smoothedTotalRms = this.smoothedTotalRms * (1 - this.smoothingFactor) + currentTotalRms * this.smoothingFactor;
                const totalDb = 20 * Math.log10(this.smoothedTotalRms + 1e-10);
                this.updatePowerBar(this.uiHandler.totalPowerBar, totalDb);

                lowAnalyser.getFloatTimeDomainData(lowDataArray);
                let sumLowRms = 0;
                for (let i = 0; i < lowAnalyser.frequencyBinCount; i++) {
                    sumLowRms += lowDataArray[i] * lowDataArray[i];
                }
                const currentLowRms = Math.sqrt(sumLowRms / lowAnalyser.frequencyBinCount) * this.sensitivity * 5;

                // EMA 스무딩 적용
                this.smoothedLowRms = this.smoothedLowRms * (1 - this.smoothingFactor) + currentLowRms * this.smoothingFactor;
                const lowDb = 20 * Math.log10(this.smoothedLowRms + 1e-10);
                this.updatePowerBar(this.uiHandler.lowPowerBar, lowDb);

                highAnalyser.getFloatTimeDomainData(highDataArray);
                let sumHighRms = 0;
                for (let i = 0; i < highAnalyser.frequencyBinCount; i++) {
                    sumHighRms += highDataArray[i] * highDataArray[i];
                }
                const currentHighRms = Math.sqrt(sumHighRms / highAnalyser.frequencyBinCount) * this.sensitivity * 5;

                // EMA 스무딩 적용
                this.smoothedHighRms = this.smoothedHighRms * (1 - this.smoothingFactor) + currentHighRms * this.smoothingFactor;
                const highDb = 20 * Math.log10(this.smoothedHighRms + 1e-10);
                this.updatePowerBar(this.uiHandler.highPowerBar, highDb);

                requestAnimationFrame(updatePowerBars);
            };

            updatePowerBars();
        } catch (err) {
            console.error('마이크 테스트 시작 오류:', err);
            alert('마이크 테스트를 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
            this.stopMicTest();
        }
    }

    updatePowerBar(bar, db) {
        const maxDb = 0;
        const minDb = -60; // 파워 바의 시각적 최소값

        // 노이즈 게이팅 적용
        let displayDb = db;
        if (db < this.noiseGateThresholdDb) {
            displayDb = minDb; // 임계값 이하이면 최소값으로 설정하여 바가 사라지게 함
        }

        const normalizedDb = Math.min(Math.max(displayDb, minDb), maxDb);
        const percentage = ((normalizedDb - minDb) / (maxDb - minDb)) * 100;
        bar.style.width = `${percentage}%`;
        if (db > -10) { // 피크 감지는 실제 dB 값 사용
            bar.classList.add('peak');
            setTimeout(() => bar.classList.remove('peak'), 200);
        }
    }

    stopMicTest() {
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isTesting = false;
        this.uiHandler.totalPowerBar.style.width = '0%';
        this.uiHandler.lowPowerBar.style.width = '0%';
        this.uiHandler.highPowerBar.style.width = '0%';
        this.uiHandler.micTestButton.textContent = '마이크 테스트';
        this.uiHandler.micTestWindow.classList.add('hidden');
    }

    handleMicSelectChange() {
        if (this.isTesting) {
            this.stopMicTest();
            this.startMicTest();
        }
    }

    handleMicSensitivityChange() {
        this.sensitivity = parseFloat(this.uiHandler.micSensitivitySlider.value);
        this.uiHandler.micSensitivityValue.textContent = this.sensitivity.toFixed(2);
        console.log('Mic sensitivity changed:', this.sensitivity);
    }

    handleMicTestButtonClick(event) {
        event.stopPropagation();
        if (this.isTesting) {
            this.stopMicTest();
            this.uiHandler.micTestButton.textContent = '마이크 테스트';
            this.uiHandler.micTestWindow.classList.add('hidden');
            this.uiHandler.audioSettingsModal.classList.remove('hidden');
            this.uiHandler.audioSettingsModal.style.pointerEvents = 'auto';
            this.uiHandler.audioSettingsModal.style.opacity = '1';
            console.log('Mic test stopped, audio-settings-modal reactivated');
        } else {
            this.startMicTest();
            this.uiHandler.micTestButton.textContent = '테스트 중지';
            this.uiHandler.micTestWindow.classList.remove('hidden');
            this.uiHandler.audioSettingsModal.classList.remove('hidden');
            this.uiHandler.audioSettingsModal.style.pointerEvents = 'auto';
            this.uiHandler.audioSettingsModal.style.opacity = '1';
            this.uiHandler.audioSettingsModal.style.zIndex = '1000';
            this.uiHandler.micTestWindow.style.zIndex = '1001';
            console.log('Mic test started, audio-settings-modal kept active');
        }
    }

    handleCloseMicTestWindow(event) {
        event.stopPropagation();
        this.stopMicTest();
        this.uiHandler.micTestButton.textContent = '마이크 테스트';
        this.uiHandler.micTestWindow.classList.add('hidden');
        this.uiHandler.audioSettingsModal.classList.remove('hidden');
        this.uiHandler.audioSettingsModal.style.pointerEvents = 'auto';
        this.uiHandler.audioSettingsModal.style.opacity = '1';
        this.uiHandler.audioSettingsModal.style.zIndex = '1000';
        console.log('Mic test window closed, audio-settings-modal reactivated');
    }
}