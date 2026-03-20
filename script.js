const authSection = document.getElementById('auth-section');
const appShell = document.getElementById('app-shell');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authDescription = document.getElementById('auth-description');
const authNameField = document.getElementById('field-name');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitButton = document.getElementById('auth-submit');
const authFeedback = document.getElementById('auth-feedback');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const btnVoice = document.getElementById('btn-voice');
const diaryInput = document.getElementById('diary-input');
const responseBox = document.getElementById('response-box');
const btnAnalyze = document.getElementById('btn-analyze');
const btnNewDiary = document.getElementById('btn-new-diary');
const historyList = document.getElementById('history-list');

const defaultResponseText = '여기에 AI의 따뜻한 응답이 표시됩니다.';
const state = {
    authMode: 'login',
    user: null,
};

function setAuthMode(mode) {
    state.authMode = mode;
    const isRegister = mode === 'register';

    authNameField.classList.toggle('hidden', !isRegister);
    tabLogin.classList.toggle('active', mode === 'login');
    tabRegister.classList.toggle('active', isRegister);
    authTitle.textContent = isRegister ? '회원가입하고 나만의 감정 기록을 시작하세요' : '로그인하고 내 기록을 이어보세요';
    authDescription.textContent = isRegister
        ? '간단한 계정을 만들면 내 감정 분석 기록과 AI 응답이 안전하게 보관됩니다.'
        : '같은 계정으로 접속하면 내 일기와 AI 답변 히스토리를 계속 볼 수 있습니다.';
    authSubmitButton.textContent = isRegister ? '회원가입' : '로그인';
    authPasswordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
    authFeedback.textContent = '';
    authFeedback.classList.remove('success');
}

function setAuthenticatedUI(user) {
    state.user = user;
    const isLoggedIn = Boolean(user);

    authSection.classList.toggle('hidden', isLoggedIn);
    appShell.classList.toggle('hidden', !isLoggedIn);

    if (isLoggedIn) {
        userName.textContent = user.name;
        userEmail.textContent = user.email;
        authFeedback.textContent = '';
        responseBox.innerHTML = defaultResponseText;
    } else {
        diaryInput.value = '';
        responseBox.innerHTML = defaultResponseText;
        historyList.innerHTML = '';
    }
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || '요청 처리 중 오류가 발생했습니다.');
    }

    return data;
}

function showAuthFeedback(message, type = 'error') {
    authFeedback.textContent = message;
    authFeedback.classList.toggle('success', type === 'success');
}

async function restoreSession() {
    try {
        const { user } = await apiRequest('/api/auth/me', { method: 'GET', headers: {} });
        setAuthenticatedUI(user);
        await loadHistory();
    } catch {
        setAuthenticatedUI(null);
    }
}

async function loadHistory() {
    if (!state.user) {
        historyList.innerHTML = '';
        return;
    }

    historyList.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 2rem;">기록을 불러오는 중입니다...</div>';

    try {
        const historyData = await apiRequest('/api/history', { method: 'GET', headers: {} });

        if (historyData.length === 0) {
            historyList.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 2rem;">아직 저장된 기록이 없습니다. 첫 일기를 남겨보세요.</div>';
            return;
        }

        historyList.innerHTML = '';
        historyData.forEach((item) => {
            const dateObj = new Date(item.created_at);
            const dateString = dateObj.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-date">${dateString}</div>
                <div class="history-text">${item.original_text.replace(/\n/g, '<br>')}</div>
                <div class="history-response">${item.ai_response.replace(/\n/g, '<br>')}</div>
            `;

            historyList.appendChild(card);
        });
    } catch (error) {
        if (error.message === '로그인이 필요합니다.') {
            setAuthenticatedUI(null);
            return;
        }

        console.error('History load error:', error);
        historyList.innerHTML = '<div style="text-align:center; color:#ef4444; padding: 2rem;">기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    showAuthFeedback('');

    const payload = {
        email: authEmailInput.value.trim(),
        password: authPasswordInput.value,
        name: authNameInput.value.trim(),
    };

    const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
        authSubmitButton.disabled = true;
        authSubmitButton.textContent = state.authMode === 'register' ? '가입 중...' : '로그인 중...';

        const data = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        authForm.reset();

        if (data.pendingConfirmation) {
            setAuthenticatedUI(null);
            setAuthMode('login');
            showAuthFeedback(data.message || '이메일 인증 후 로그인해주세요.', 'success');
            return;
        }

        setAuthenticatedUI(data.user);
        setAuthMode('login');
        await loadHistory();
    } catch (error) {
        showAuthFeedback(error.message);
    } finally {
        authSubmitButton.disabled = false;
        authSubmitButton.textContent = state.authMode === 'register' ? '회원가입' : '로그인';
    }
}

async function handleLogout() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        setAuthenticatedUI(null);
        setAuthMode('login');
    }
}

function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!btnVoice) {
        return;
    }

    if (!SpeechRecognition) {
        btnVoice.addEventListener('click', () => {
            alert('현재 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
        });
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isRecognizing = false;
    const originalBtnHTML = btnVoice.innerHTML;
    const recognizingBtnHTML = `
        <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        음성 인식 중...
    `;

    btnVoice.addEventListener('click', () => {
        if (isRecognizing) {
            recognition.stop();
            return;
        }

        recognition.start();
    });

    recognition.onstart = () => {
        isRecognizing = true;
        btnVoice.innerHTML = recognizingBtnHTML;
        btnVoice.classList.add('recognizing');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const currentText = diaryInput.value.trim();
        diaryInput.value = currentText ? `${currentText} ${transcript}` : transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error detected:', event.error);
        if (event.error !== 'no-speech') {
            alert(`음성 인식 중 오류가 발생했습니다: ${event.error}`);
        }
    };

    recognition.onend = () => {
        isRecognizing = false;
        btnVoice.innerHTML = originalBtnHTML;
        btnVoice.classList.remove('recognizing');
    };
}

async function analyzeDiary() {
    if (!state.user) {
        setAuthenticatedUI(null);
        return;
    }

    const text = diaryInput.value.trim();
    if (!text) {
        alert('일기 내용을 먼저 입력해주세요.');
        return;
    }

    const originalAnalyzeBtnHTML = btnAnalyze.innerHTML;
    btnAnalyze.innerHTML = `
        <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        분석 중...
    `;
    btnAnalyze.disabled = true;
    responseBox.innerHTML = 'AI가 감정을 분석하고 따뜻한 응답을 준비하고 있습니다...';

    try {
        const data = await apiRequest('/api/analyze', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });

        responseBox.innerHTML = data.result.replace(/\n/g, '<br>');
        await loadHistory();
    } catch (error) {
        console.error('Error analyzing text:', error);

        if (error.message === '로그인이 필요합니다.') {
            setAuthenticatedUI(null);
            showAuthFeedback('세션이 만료되었습니다. 다시 로그인해주세요.');
            return;
        }

        responseBox.innerHTML = `<span style="color: #ef4444;">${error.message}</span>`;
    } finally {
        btnAnalyze.innerHTML = originalAnalyzeBtnHTML;
        btnAnalyze.disabled = false;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    setAuthMode('login');
    setupVoiceRecognition();
    await restoreSession();
});

tabLogin.addEventListener('click', () => setAuthMode('login'));
tabRegister.addEventListener('click', () => setAuthMode('register'));
authForm.addEventListener('submit', handleAuthSubmit);
btnLogout.addEventListener('click', handleLogout);
btnAnalyze.addEventListener('click', analyzeDiary);

btnNewDiary.addEventListener('click', () => {
    if (confirm('현재 작성 중인 내용을 지우고 새 일기를 시작할까요?')) {
        diaryInput.value = '';
        responseBox.innerHTML = defaultResponseText;
    }
});
