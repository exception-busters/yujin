// AudioManager.js
export default class AudioManager {
    constructor(uiHandler) {
        this.uiHandler = uiHandler;
        this.audioContext = null;
        this.microphoneStream = null;
        this.controlAnalyserNode = null; // For noise gate logic (raw signal)
        this.displayAnalyserNode = null; // For power bar display (gated signal)
        this.isTesting = false;
        this.sensitivity = 1.0;
        this.lobbyBgm = document.getElementById('lobby-bgm');
        this.volumeSettings = {
            lobbyBgm: parseFloat(localStorage.getItem('lobbyBgmVolume')) || 0.5
        };

        // 노이즈 게이팅 임계값 (dB) - 이 값보다 작은 소리는 무시
        this.noiseGateThresholdDb = parseFloat(localStorage.getItem('noiseGateIntensity')) || -45; // -45dB로 설정, 필요에 따라 조정 가능
        this.isNoiseGateEnabled = localStorage.getItem('noiseGateEnabled') === 'true';

        // 스무딩을 위한 EMA 계수
        this.smoothingFactor = 0.2; // 0.0 (최대 스무딩) ~ 1.0 (스무딩 없음)
        this.smoothedTotalRms = 0;
        this.smoothedLowRms = 0;
        this.smoothedHighRms = 0;
        this.gainNode = null; // Add gainNode property
        this.micInputGain = 5.0; // Initial gain for microphone input
        this.lastLogTime = 0; // For throttling console logs in updatePowerBars
        this.logInterval = 3000; // Log every 3 seconds for updatePowerBars
        this.lastPowerBarLogTime = 0; // For throttling console logs in updatePowerBar
        this.powerBarLogInterval = 3000; // Log every 3 seconds for updatePowerBar
        this.hoverSound = document.getElementById('hover-sound'); // Add hover sound element
        this.clickSound = document.getElementById('click-sound'); // Add click sound element
        this.initializeAudio();
        this.setupEventListeners();
    }

    initializeAudio() {
        if (this.lobbyBgm) {
            this.lobbyBgm.volume = this.volumeSettings.lobbyBgm;

            // UI 요소가 존재하는지 확인 후 설정
            if (this.uiHandler && this.uiHandler.lobbyBgmVolumeSlider) {
                this.uiHandler.lobbyBgmVolumeSlider.value = this.volumeSettings.lobbyBgm;
            }
            if (this.uiHandler && this.uiHandler.lobbyBgmVolumeValue) {
                this.uiHandler.lobbyBgmVolumeValue.textContent = this.volumeSettings.lobbyBgm.toFixed(2);
            }

            // 로비 UI가 있는 경우에만 BGM 자동재생 시도 (게임 화면에서는 스킵)
            if (this.uiHandler && this.uiHandler.lobbyBgmVolumeSlider) {
                this.lobbyBgm.play().catch(err => {
                    console.log('로비 BGM 자동재생 대기 중 (사용자 상호작용 필요)');
                    document.addEventListener('click', () => {
                        this.lobbyBgm.play().catch(err => console.error('로비 BGM 재생 실패:', err));
                    }, { once: true });
                });
            }
            console.log('로비 BGM 초기화 완료, 볼륨:', this.volumeSettings.lobbyBgm);
        } else {
            console.warn('Lobby BGM element not found.');
        }
    }

    setupEventListeners() {
        // UI 요소가 존재하는 경우에만 이벤트 리스너 추가 (로비에서만)
        if (this.uiHandler && this.uiHandler.micSelect) {
            this.uiHandler.micSelect.addEventListener('change', this.handleMicSelectChange.bind(this));
        }
        if (this.uiHandler && this.uiHandler.micSensitivitySlider) {
            this.uiHandler.micSensitivitySlider.addEventListener('input', this.handleMicSensitivityChange.bind(this));
        }
        if (this.uiHandler && this.uiHandler.micTestButton) {
            this.uiHandler.micTestButton.addEventListener('click', this.handleMicTestButtonClick.bind(this));
        }
        if (this.uiHandler && this.uiHandler.closeMicTestWindowButton) {
            this.uiHandler.closeMicTestWindowButton.addEventListener('click', this.handleCloseMicTestWindow.bind(this));
        }
        if (this.uiHandler && this.uiHandler.lobbyBgmVolumeSlider) {
            this.uiHandler.lobbyBgmVolumeSlider.addEventListener('input', this.handleLobbyBgmVolumeChange.bind(this));
        }
        if (this.uiHandler && this.uiHandler.noiseGateToggle) {
            this.uiHandler.noiseGateToggle.addEventListener('change', (e) => this.handleNoiseGateToggleChange(e.target.checked));
        }
        if (this.uiHandler && this.uiHandler.noiseGateIntensitySlider) {
            this.uiHandler.noiseGateIntensitySlider.addEventListener('input', (e) => this.handleNoiseGateIntensityChange(parseFloat(e.target.value)));
        }
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
            // UI 요소가 존재하는 경우에만 마이크 장치 목록 설정 (로비에서만)
            if (!this.uiHandler || !this.uiHandler.micSelect) {
                console.log('마이크 선택 UI가 없습니다. 게임 화면에서는 마이크 설정을 건너뜁니다.');
                return;
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');

            // 다시 한 번 UI 요소 존재 확인 (비동기 작업 후 상태 변경 가능성)
            if (!this.uiHandler.micSelect) {
                console.log('마이크 선택 UI가 제거되었습니다.');
                return;
            }

            this.uiHandler.micSelect.innerHTML = '<option value="">마이크 선택</option>';
            audioInputs.forEach(device => {
                if (this.uiHandler.micSelect) { // 각 반복에서도 안전 확인
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `마이크 ${this.uiHandler.micSelect.options.length + 1}`;
                    this.uiHandler.micSelect.appendChild(option);
                }
            });
        } catch (err) {
            console.error('마이크 장치 목록 가져오기 오류:', err);
            // 게임 화면에서는 alert 표시하지 않음
            if (this.uiHandler && this.uiHandler.micSelect) {
                alert('마이크 장치에 접근할 수 없습니다. 권한을 확인해주세요.');
            }
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
            this.gainNode = this.audioContext.createGain(); // Create gain node for noise gate
            this.controlAnalyserNode = this.audioContext.createAnalyser(); // For noise gate logic
            this.controlAnalyserNode.fftSize = 2048;

            this.displayAnalyserNode = this.audioContext.createAnalyser(); // For power bar display
            this.displayAnalyserNode.fftSize = 2048;

            // Control path filters and analysers (for noise gate decision)
            const controlLowFilter = this.audioContext.createBiquadFilter();
            controlLowFilter.type = 'bandpass';
            controlLowFilter.frequency.setValueAtTime(100, this.audioContext.currentTime);
            controlLowFilter.Q.setValueAtTime(3, this.audioContext.currentTime);

            const controlHighFilter = this.audioContext.createBiquadFilter();
            controlHighFilter.type = 'bandpass';
            controlHighFilter.frequency.setValueAtTime(475, this.audioContext.currentTime);
            controlHighFilter.Q.setValueAtTime(5, this.audioContext.currentTime);

            this.controlLowAnalyser = this.audioContext.createAnalyser();
            this.controlLowAnalyser.fftSize = 2048;
            this.controlHighAnalyser = this.audioContext.createAnalyser();
            this.controlHighAnalyser.fftSize = 2048;

            // Display path filters and analysers (for power bar display)
            const displayLowFilter = this.audioContext.createBiquadFilter();
            displayLowFilter.type = 'bandpass';
            displayLowFilter.frequency.setValueAtTime(100, this.audioContext.currentTime);
            displayLowFilter.Q.setValueAtTime(3, this.audioContext.currentTime);

            const displayHighFilter = this.audioContext.createBiquadFilter();
            displayHighFilter.type = 'bandpass';
            displayHighFilter.frequency.setValueAtTime(475, this.audioContext.currentTime);
            displayHighFilter.Q.setValueAtTime(5, this.audioContext.currentTime);

            this.displayLowAnalyser = this.audioContext.createAnalyser();
            this.displayLowAnalyser.fftSize = 2048;
            this.displayHighAnalyser = this.audioContext.createAnalyser();
            this.displayHighAnalyser.fftSize = 2048;

            // Connect source to control path (for noise gate decision)
            source.connect(this.controlAnalyserNode);
            source.connect(controlLowFilter);
            controlLowFilter.connect(this.controlLowAnalyser);
            source.connect(controlHighFilter);
            controlHighFilter.connect(this.controlHighAnalyser);

            // Connect source to gainNode (noise gate)
            source.connect(this.gainNode);

            // Connect gainNode output to display path (for power bar display)
            this.gainNode.connect(this.displayAnalyserNode);
            this.gainNode.connect(displayLowFilter);
            displayLowFilter.connect(this.displayLowAnalyser);
            this.gainNode.connect(displayHighFilter);
            displayHighFilter.connect(this.displayHighAnalyser);

            // Uncomment the line below if you want to hear your own voice during the test
            // this.gainNode.connect(this.audioContext.destination);

            // Data arrays for control path
            const controlBufferLength = this.controlAnalyserNode.frequencyBinCount;
            const controlDataArray = new Float32Array(controlBufferLength);
            const controlLowDataArray = new Float32Array(this.controlLowAnalyser.frequencyBinCount);
            const controlHighDataArray = new Float32Array(this.controlHighAnalyser.frequencyBinCount);

            // Data arrays for display path
            const displayBufferLength = this.displayAnalyserNode.frequencyBinCount;
            const displayDataArray = new Float32Array(displayBufferLength);
            const displayLowDataArray = new Float32Array(this.displayLowAnalyser.frequencyBinCount);
            const displayHighDataArray = new Float32Array(this.displayHighAnalyser.frequencyBinCount);

            const updatePowerBars = () => {
                if (!this.isTesting) return;

                // --- Control Path: Get RMS from raw signal for noise gate decision ---
                this.controlAnalyserNode.getFloatTimeDomainData(controlDataArray);
                let sumControlTotalRms = 0;
                for (let i = 0; i < controlBufferLength; i++) {
                    sumControlTotalRms += controlDataArray[i] * controlDataArray[i];
                }
                let currentControlTotalRms = Math.sqrt(sumControlTotalRms / controlBufferLength) * this.sensitivity * 1;

                // --- Noise Gate Logic ---
                const thresholdRms = Math.pow(10, this.noiseGateThresholdDb / 20);
                if (this.isNoiseGateEnabled && currentControlTotalRms < thresholdRms) {
                    this.gainNode.gain.value = 0; // Mute audio
                } else {
                    this.gainNode.gain.value = this.micInputGain; // Pass audio
                }

                // --- Display Path: Get RMS from gated signal for power bar display ---
                this.displayAnalyserNode.getFloatTimeDomainData(displayDataArray);
                let sumDisplayTotalRms = 0;
                for (let i = 0; i < displayBufferLength; i++) {
                    sumDisplayTotalRms += displayDataArray[i] * displayDataArray[i];
                }
                let currentDisplayTotalRms = Math.sqrt(sumDisplayTotalRms / displayBufferLength) * this.sensitivity * 1;

                // EMA smoothing for display path
                this.smoothedTotalRms = this.smoothedTotalRms * (1 - this.smoothingFactor) + currentDisplayTotalRms * this.smoothingFactor;
                const totalDb = 20 * Math.log10(this.smoothedTotalRms + 1e-10);
                this.updatePowerBar(this.uiHandler.totalPowerBar, totalDb);

                this.displayLowAnalyser.getFloatTimeDomainData(displayLowDataArray);
                let sumDisplayLowRms = 0;
                for (let i = 0; i < this.displayLowAnalyser.frequencyBinCount; i++) {
                    sumDisplayLowRms += displayLowDataArray[i] * displayLowDataArray[i];
                }
                let currentDisplayLowRms = Math.sqrt(sumDisplayLowRms / this.displayLowAnalyser.frequencyBinCount) * this.sensitivity * 1;

                this.smoothedLowRms = this.smoothedLowRms * (1 - this.smoothingFactor) + currentDisplayLowRms * this.smoothingFactor;
                const lowDb = 20 * Math.log10(this.smoothedLowRms + 1e-10);
                this.updatePowerBar(this.uiHandler.lowPowerBar, lowDb);

                this.displayHighAnalyser.getFloatTimeDomainData(displayHighDataArray);
                let sumDisplayHighRms = 0;
                for (let i = 0; i < this.displayHighAnalyser.frequencyBinCount; i++) {
                    sumDisplayHighRms += displayHighDataArray[i] * displayHighDataArray[i];
                }
                let currentDisplayHighRms = Math.sqrt(sumDisplayHighRms / this.displayHighAnalyser.frequencyBinCount) * this.sensitivity * 1;

                this.smoothedHighRms = this.smoothedHighRms * (1 - this.smoothingFactor) + currentDisplayHighRms * this.smoothingFactor;
                const highDb = 20 * Math.log10(this.smoothedHighRms + 1e-10);
                this.updatePowerBar(this.uiHandler.highPowerBar, highDb);

                // Log throttling
                if (Date.now() - this.lastLogTime > this.logInterval) {
                    console.log('--- Audio Debug Log ---');
                    console.log('Control Path - dataArray max:', Math.max(...controlDataArray));
                    console.log('Control Path - currentControlTotalRms:', currentControlTotalRms);
                    console.log('Display Path - dataArray max:', Math.max(...displayDataArray));
                    console.log('Display Path - currentDisplayTotalRms:', currentDisplayTotalRms);
                    console.log('Display Path - smoothedTotalRms:', this.smoothedTotalRms);
                    console.log('Display Path - totalDb (sent to power bar):', totalDb);
                    this.lastLogTime = Date.now();
                }

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
        if (Date.now() - this.lastPowerBarLogTime > this.powerBarLogInterval) {
            console.log("Calculated dB (updatePowerBar):", db);
            this.lastPowerBarLogTime = Date.now();
        }
        const maxDb = 0;
        const minDb = -60; // 파워 바의 시각적 최소값

        const normalizedDb = Math.min(Math.max(db, minDb), maxDb);
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

    handleNoiseGateToggleChange(isEnabled) {
        this.isNoiseGateEnabled = isEnabled;
        console.log('Noise gate enabled:', this.isNoiseGateEnabled);
    }

    handleNoiseGateIntensityChange(intensity) {
        this.noiseGateThresholdDb = intensity;
        console.log('Noise gate intensity changed:', this.noiseGateThresholdDb);
    }

    playHoverSound() {
        if (this.hoverSound) {
            this.hoverSound.currentTime = 0; // Rewind to start
            this.hoverSound.play().catch(err => console.warn('Hover sound play failed:', err));
        }
    }

    playClickSound() {
        if (this.clickSound) {
            this.clickSound.currentTime = 0; // Rewind to start
            this.clickSound.play().catch(err => console.warn('Click sound play failed:', err));
        }
    }
}