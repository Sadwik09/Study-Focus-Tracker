// Enhanced Application State
let studyState = {
    isStudying: false,
    startTime: null,
    totalStudyTime: 0,
    distractionCount: 0,
    sessionCount: 0,
    lastActivity: Date.now(),
    mediaRecorder: null,
    audioChunks: [],
    recordingInterval: null,
    timerInterval: null,
    activityCheckInterval: null,
    currentSession: {
        startTime: null,
        distractions: 0,
        activities: 0
    },
    settings: {
        audioEnabled: true,
        alertSound: true,
        autoRefocus: false,
        sessionGoal: 25 * 60 * 1000 // 25 minutes in milliseconds
    },
    analytics: {
        dailyStudyTime: 0,
        weeklyStudyTime: 0,
        averageFocusScore: 100,
        bestStreak: 0,
        currentStreak: 0
    }
};

// API Configuration
const API_BASE_URL = 'http://localhost:3000';
const USER_ID = 'user_' + Math.random().toString(36).substr(2, 9);

// Chart instances
let focusChart = null;
let progressChart = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
        
        await loadStoredData();
        await setupAudioRecording();
        initializeCharts();
        
        showNotification('Application initialized successfully!', 'success');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error initializing application', 'error');
    }
}

// Enhanced Theme Management
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
        showNotification('Switched to light theme', 'success');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
        showNotification('Switched to dark theme', 'success');
    }
    
    // Update charts with new theme
    updateChartsTheme();
}

// Load stored theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').textContent = '☀️';
}

// Enhanced Study Mode Management
function toggleStudyMode() {
    if (studyState.isStudying) {
        stopStudyMode();
    } else {
        startStudyMode();
    }
}

async function startStudyMode() {
    try {
        studyState.isStudying = true;
        studyState.startTime = Date.now();
        studyState.sessionCount++;
        studyState.currentSession = {
            startTime: Date.now(),
            distractions: 0,
            activities: 0
        };
        
        // Update UI with enhanced animations
        const toggleBtn = document.getElementById('studyToggle');
        const toggleText = document.getElementById('toggleText');
        
        toggleBtn.className = 'study-mode-toggle active';
        toggleText.textContent = 'Stop Study';
        
        updateStatus('focused', 'Studying - Stay focused!');
        
        // Start all tracking systems
        startTimer();
        startActivityTracking();
        if (studyState.settings.audioEnabled) {
            await startAudioRecording();
        }
        
        // Enhanced logging
        logActivity('Study session started', 'start', '🚀');
        updateDashboard();
        updateProgressRing(0);
        
        // Save state
        await saveData();
        
        showNotification('Study session started! Stay focused!', 'success');
        
    } catch (error) {
        console.error('Error starting study mode:', error);
        showNotification('Error starting study session', 'error');
    }
}

async function stopStudyMode() {
    try {
        studyState.isStudying = false;
        
        // Calculate session time and update analytics
        if (studyState.startTime) {
            const sessionTime = Date.now() - studyState.startTime;
            studyState.totalStudyTime += sessionTime;
            studyState.analytics.dailyStudyTime += sessionTime;
            
            // Update streak
            if (studyState.currentSession.distractions === 0) {
                studyState.analytics.currentStreak++;
                if (studyState.analytics.currentStreak > studyState.analytics.bestStreak) {
                    studyState.analytics.bestStreak = studyState.analytics.currentStreak;
                }
            } else {
                studyState.analytics.currentStreak = 0;
            }
        }
        
        // Update UI
        const toggleBtn = document.getElementById('studyToggle');
        const toggleText = document.getElementById('toggleText');
        
        toggleBtn.className = 'study-mode-toggle inactive';
        toggleText.textContent = 'Start Study';
        
        updateStatus('idle', 'Session completed');
        
        // Stop all tracking
        stopTimer();
        stopActivityTracking();
        stopAudioRecording();
        
        // Enhanced logging
        const sessionDuration = studyState.startTime ? 
            formatTime(Date.now() - studyState.startTime) : '00:00:00';
        logActivity(`Study session ended (${sessionDuration})`, 'stop', '⏹️');
        
        updateDashboard();
        updateProgressRing(100);
        updateCharts();
        
        // Save state
        await saveData();
        
        showNotification(`Session completed! Duration: ${sessionDuration}`, 'success');
        
    } catch (error) {
        console.error('Error stopping study mode:', error);
        showNotification('Error stopping study session', 'error');
    }
}

// Enhanced Timer Management
function startTimer() {
    studyState.timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (studyState.timerInterval) {
        clearInterval(studyState.timerInterval);
        studyState.timerInterval = null;
    }
}

function updateTimer() {
    if (!studyState.isStudying || !studyState.startTime) return;
    
    const elapsed = Date.now() - studyState.startTime;
    const display = formatTime(elapsed);
    const timerElement = document.getElementById('timerDisplay');
    
    timerElement.textContent = display;
    timerElement.className = 'timer-display active';
    
    // Update progress ring
    const progress = Math.min((elapsed / studyState.settings.sessionGoal) * 100, 100);
    updateProgressRing(progress);
    
    // Check if session goal is reached
    if (elapsed >= studyState.settings.sessionGoal) {
        showNotification('Session goal reached! Great job!', 'success');
        if (studyState.settings.autoRefocus) {
            // Continue session automatically
        } else {
            // Optionally stop session
        }
    }
}

function updateProgressRing(progress) {
    const circle = document.querySelector('.progress-ring-circle');
    const circumference = 2 * Math.PI * 75; // radius = 75
    const offset = circumference - (progress / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    
    // Change color based on progress
    if (progress < 30) {
        circle.style.stroke = 'var(--danger-color)';
    } else if (progress < 70) {
        circle.style.stroke = 'var(--warning-color)';
    } else {
        circle.style.stroke = 'var(--success-color)';
    }
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Enhanced Activity Tracking
function startActivityTracking() {
    // Add event listeners with throttling
    document.addEventListener('mousemove', throttle(handleActivity, 1000));
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('scroll', throttle(handleActivity, 2000));
    
    // Start activity check interval
    studyState.activityCheckInterval = setInterval(checkActivity, 5000);
}

function stopActivityTracking() {
    // Remove event listeners
    document.removeEventListener('mousemove', handleActivity);
    document.removeEventListener('keydown', handleActivity);
    document.removeEventListener('click', handleActivity);
    document.removeEventListener('scroll', handleActivity);
    
    // Clear activity check interval
    if (studyState.activityCheckInterval) {
        clearInterval(studyState.activityCheckInterval);
        studyState.activityCheckInterval = null;
    }
}

function handleActivity(event) {
    if (!studyState.isStudying) return;
    
    studyState.lastActivity = Date.now();
    studyState.currentSession.activities++;
    
    // Send activity to backend with enhanced data
    sendActivityData({
        type: event.type,
        timestamp: Date.now(),
        userId: USER_ID,
        sessionId: studyState.currentSession.startTime,
        x: event.clientX || 0,
        y: event.clientY || 0,
        key: event.key || null
    });
}

function checkActivity() {
    if (!studyState.isStudying) return;
    
    const timeSinceActivity = Date.now() - studyState.lastActivity;
    const isIdle = timeSinceActivity > 30000; // 30 seconds
    
    if (isIdle) {
        updateStatus('idle', 'No activity detected - Are you still there?');
        logActivity('User appears idle', 'idle', '😴');
    } else {
        updateStatus('focused', 'Active and focused');
    }
}

// Enhanced Audio Recording
async function setupAudioRecording() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Audio recording not supported');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });
        
        studyState.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        studyState.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                studyState.audioChunks.push(event.data);
            }
        };
        
        studyState.mediaRecorder.onstop = () => {
            processAudioChunk();
        };
        
        studyState.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            updateMicStatus('error', 'Recording error');
        };
        
        updateMicStatus('ready', 'Microphone ready');
        
    } catch (error) {
        console.error('Error setting up audio recording:', error);
        updateMicStatus('error', 'Microphone access denied');
        studyState.settings.audioEnabled = false;
    }
}

async function startAudioRecording() {
    if (!studyState.mediaRecorder || !studyState.settings.audioEnabled) return;
    
    try {
        studyState.recordingInterval = setInterval(async () => {
            if (studyState.mediaRecorder.state === 'inactive') {
                studyState.audioChunks = [];
                studyState.mediaRecorder.start();
                updateMicStatus('recording', 'Recording audio...');
                
                setTimeout(() => {
                    if (studyState.mediaRecorder.state === 'recording') {
                        studyState.mediaRecorder.stop();
                        updateMicStatus('ready', 'Processing audio...');
                    }
                }, 12000); // 12 second chunks
            }
        }, 15000); // Every 15 seconds
        
    } catch (error) {
        console.error('Error starting audio recording:', error);
        updateMicStatus('error', 'Recording failed');
    }
}

function stopAudioRecording() {
    if (studyState.recordingInterval) {
        clearInterval(studyState.recordingInterval);
        studyState.recordingInterval = null;
    }
    
    if (studyState.mediaRecorder && studyState.mediaRecorder.state === 'recording') {
        studyState.mediaRecorder.stop();
    }
    
    updateMicStatus('ready', 'Microphone ready');
}

async function processAudioChunk() {
    if (studyState.audioChunks.length === 0) return;
    
    try {
        const audioBlob = new Blob(studyState.audioChunks, { type: 'audio/webm' });
        
        // Convert to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        await sendAudioData(base64Audio);
        studyState.audioChunks = [];
        
    } catch (error) {
        console.error('Error processing audio chunk:', error);
        updateMicStatus('error', 'Audio processing failed');
    }
}

// Enhanced API Communication
async function sendActivityData(data) {
    try {
        const response = await axios.post(`${API_BASE_URL}/activity`, data, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.warn('Activity request timeout');
        } else {
            console.error('Error sending activity data:', error);
        }
    }
}

async function sendAudioData(audioBase64) {
    try {
        const response = await axios.post(`${API_BASE_URL}/predict`, {
            audio: audioBase64,
            userId: USER_ID,
            timestamp: Date.now(),
            sessionId: studyState.currentSession.startTime,
            format: 'webm'
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.distracted) {
            await showDistractionAlert(response.data);
        }
        
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.warn('Audio prediction request timeout');
        } else {
            console.error('Error sending audio data:', error);
        }
        updateMicStatus('error', 'Prediction failed');
    }
}

async function logAlert(alertData = {}) {
    try {
        await axios.post(`${API_BASE_URL}/log`, {
            type: 'distraction_alert',
            userId: USER_ID,
            timestamp: Date.now(),
            sessionId: studyState.currentSession.startTime,
            ...alertData
        }, {
            timeout: 5000
        });
    } catch (error) {
        console.error('Error logging alert:', error);
    }
}

// Enhanced Alert Management
async function showDistractionAlert(predictionData = {}) {
    studyState.distractionCount++;
    studyState.currentSession.distractions++;
    
    updateDashboard();
    
    const overlay = document.getElementById('alertOverlay');
    overlay.classList.add('show');
    
    // Enhanced alert sound
    if (studyState.settings.alertSound) {
        await playAlertSound();
    }
    
    // Log the alert with prediction data
    await logAlert(predictionData);
    logActivity('Distraction detected by AI', 'distraction', '⚠️');
    
    // Update status
    updateStatus('distracted', 'Distraction detected! Please refocus');
    
    // Auto-dismiss after 15 seconds
    setTimeout(() => {
        if (overlay.classList.contains('show')) {
            dismissAlert();
        }
    }, 15000);
}

async function refocusSession() {
    dismissAlert();
    updateStatus('focused', 'Back to studying - Great job!');
    logActivity('Successfully refocused', 'focus', '✨');
    showNotification('Welcome back! You\'re refocused and ready to study!', 'success');
    
    // Reset activity timer
    studyState.lastActivity = Date.now();
}

function dismissAlert() {
    const overlay = document.getElementById('alertOverlay');
    overlay.classList.remove('show');
    logActivity('Alert dismissed', 'focus', '⏭️');
}

async function playAlertSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a more pleasant alert sound
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.frequency.value = 800;
        oscillator2.frequency.value = 1000;
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime + 0.1);
        oscillator1.stop(audioContext.currentTime + 0.4);
        oscillator2.stop(audioContext.currentTime + 0.8);
        
    } catch (error) {
        console.error('Error playing alert sound:', error);
    }
}

// Enhanced UI Updates
function updateStatus(status, message) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    indicator.className = `status-indicator ${status}`;
    text.textContent = message;
}

function updateMicStatus(status, message) {
    const indicator = document.getElementById('micIndicator');
    const text = document.getElementById('micStatus');
    
    indicator.className = `mic-indicator ${status}`;
    text.textContent = message;
}

function updateDashboard() {
    // Update total study time with better formatting
    const totalMinutes = Math.floor(studyState.totalStudyTime / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    let timeDisplay;
    if (totalHours > 0) {
        timeDisplay = `${totalHours}h ${remainingMinutes}m`;
    } else {
        timeDisplay = `${totalMinutes}m`;
    }
    
    document.getElementById('totalStudyTime').textContent = timeDisplay;
    
    // Update distraction count
    document.getElementById('distractionCount').textContent = studyState.distractionCount;
    
    // Calculate enhanced focus score
    const totalSessions = studyState.sessionCount || 1;
    const distractionRate = studyState.distractionCount / totalSessions;
    const focusScore = Math.max(0, Math.round(100 - (distractionRate * 15)));
    document.getElementById('focusScore').textContent = `${focusScore}%`;
    
    // Update session count
    document.getElementById('sessionCount').textContent = studyState.sessionCount;
    
    // Update analytics
    studyState.analytics.averageFocusScore = focusScore;
}

function logActivity(message, type = 'info', icon = '📝') {
    const log = document.getElementById('activityLog');
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    item.innerHTML = `
        <div class="activity-text">
            <div class="activity-icon ${type}">${icon}</div>
            <span>${message}</span>
        </div>
        <span class="activity-time">${timeString}</span>
    `;
    
    log.insertBefore(item, log.firstChild);
    
    // Keep only last 50 items
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
    
    // Smooth scroll to top
    log.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Enhanced Charts
function initializeCharts() {
    const ctx1 = document.getElementById('focusChart');
    const ctx2 = document.getElementById('progressChart');
    
    if (ctx1) {
        focusChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Focus Score',
                    data: [95, 87, 92, 88, 94, 89, 96],
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    if (ctx2) {
        progressChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Focused Time', 'Break Time', 'Distracted Time'],
                datasets: [{
                    data: [75, 20, 5],
                    backgroundColor: [
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function updateCharts() {
    // Update charts with real data
    if (focusChart) {
        // Update focus chart with recent data
        focusChart.update();
    }
    
    if (progressChart) {
        // Update progress chart with session data
        progressChart.update();
    }
}

function updateChartsTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#1f2937';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    
    if (focusChart) {
        focusChart.options.scales.x.ticks.color = textColor;
        focusChart.options.scales.y.ticks.color = textColor;
        focusChart.options.scales.x.grid.color = gridColor;
        focusChart.options.scales.y.grid.color = gridColor;
        focusChart.update();
    }
    
    if (progressChart) {
        progressChart.options.plugins.legend.labels.color = textColor;
        progressChart.update();
    }
}

// Enhanced Notifications
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${getNotificationIcon(type)}</span>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Enhanced Data Persistence
async function saveData() {
    try {
        const data = {
            totalStudyTime: studyState.totalStudyTime,
            distractionCount: studyState.distractionCount,
            sessionCount: studyState.sessionCount,
            analytics: studyState.analytics,
            settings: studyState.settings,
            lastSaved: Date.now()
        };
        
        localStorage.setItem('studyTrackerData', JSON.stringify(data));
        
        // Also save to IndexedDB for better persistence
        if ('indexedDB' in window) {
            await saveToIndexedDB(data);
        }
        
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data', 'error');
    }
}

async function loadStoredData() {
    try {
        // Try IndexedDB first, then localStorage
        let data = await loadFromIndexedDB();
        
        if (!data) {
            const stored = localStorage.getItem('studyTrackerData');
            if (stored) {
                data = JSON.parse(stored);
            }
        }
        
        if (data) {
            studyState.totalStudyTime = data.totalStudyTime || 0;
            studyState.distractionCount = data.distractionCount || 0;
            studyState.sessionCount = data.sessionCount || 0;
            studyState.analytics = { ...studyState.analytics, ...data.analytics };
            studyState.settings = { ...studyState.settings, ...data.settings };
            updateDashboard();
        }
        
    } catch (error) {
        console.error('Error loading stored data:', error);
        showNotification('Error loading saved data', 'warning');
    }
}

// IndexedDB helpers
async function saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('StudyTrackerDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['studyData'], 'readwrite');
            const store = transaction.objectStore('studyData');
            
            store.put({ id: 'main', ...data });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('studyData')) {
                db.createObjectStore('studyData', { keyPath: 'id' });
            }
        };
    });
}

async function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('StudyTrackerDB', 1);
        
        request.onerror = () => resolve(null);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['studyData'], 'readonly');
            const store = transaction.objectStore('studyData');
            const getRequest = store.get('main');
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => resolve(null);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('studyData')) {
                db.createObjectStore('studyData', { keyPath: 'id' });
            }
        };
    });
}

// Utility Functions
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced Keyboard Shortcuts
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key.toLowerCase()) {
            case ' ':
                event.preventDefault();
                toggleStudyMode();
                break;
            case 'd':
                event.preventDefault();
                toggleTheme();
                break;
            case 's':
                event.preventDefault();
                showStatsModal();
                break;
            case 'r':
                event.preventDefault();
                if (studyState.isStudying) {
                    refocusSession();
                }
                break;
        }
    }
    
    // Escape key to dismiss alerts
    if (event.key === 'Escape') {
        dismissAlert();
    }
});

function showStatsModal() {
    const focusScore = studyState.analytics.averageFocusScore;
    const totalHours = Math.floor(studyState.totalStudyTime / 3600000);
    const totalMinutes = Math.floor((studyState.totalStudyTime % 3600000) / 60000);
    
    showNotification(
        `Stats: ${totalHours}h ${totalMinutes}m studied, ${focusScore}% focus score, ${studyState.analytics.currentStreak} day streak`,
        'info',
        6000
    );
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden && studyState.isStudying) {
        logActivity('Tab became inactive - Stay focused!', 'idle', '👀');
        updateStatus('idle', 'Tab inactive - Please return to study');
    } else if (!document.hidden && studyState.isStudying) {
        logActivity('Tab became active - Welcome back!', 'focus', '👋');
        updateStatus('focused', 'Welcome back! Continue studying');
        studyState.lastActivity = Date.now();
    }
});

// Handle online/offline status
window.addEventListener('online', function() {
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', function() {
    showNotification('Connection lost - Data will be saved locally', 'warning');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function(event) {
    if (studyState.isStudying) {
        saveData();
        event.preventDefault();
        event.returnValue = 'You have an active study session. Are you sure you want to leave?';
        return event.returnValue;
    }
});

// Auto-save every 30 seconds
setInterval(async () => {
    if (studyState.isStudying) {
        await saveData();
    }
}, 30000);

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`App loaded in ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
            }
        }, 0);
    });
}

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
