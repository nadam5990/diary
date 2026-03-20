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
const btnGoogleLogin = document.getElementById('btn-google-login');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const btnVoice = document.getElementById('btn-voice');
const diaryInput = document.getElementById('diary-input');
const responseBox = document.getElementById('response-box');
const btnAnalyze = document.getElementById('btn-analyze');
const btnNewDiary = document.getElementById('btn-new-diary');
const historyList = document.getElementById('history-list');

const defaultResponseText = '여기에 AI의 공감 답변이 표시됩니다.';
const state = {
    authMode: 'login',
    user: null,
    browserSupabase: null,
};

function setAuthMode(mode) {
    state.authMode = mode;
    const isRegister = mode === 'register';

    authNameField.classList.toggle('hidden', !isRegister);
    tabLogin.classList.toggle('active', mode === 'login');
    tabRegister.classList.toggle('active', isRegister);
    authTitle.textContent = isRegister ? '회원가입하고 나만의 감정 기록을 시작하세요' : '로그인하고 기록을 이어가세요';
    authDescription.textContent = isRegister
        ? '이메일 인증을 마치면 내 감정 분석 기록과 AI 응답을 안전하게 이어서 볼 수 있어요.'
        : '같은 계정으로 로그인하면 내 일기와 AI 답변 히스토리를 계속 볼 수 있어요.';
    authSubmitButton.textContent = isRegister ? '회원가입' : '로그인';
    authPasswordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
    btnGoogleLogin.textContent = isRegister ? '구글 이메일로 회원가입하기' : '구글 이메일로 로그인하기';
    btnGoogleLogin.prepend(createGoogleIcon());
    authFeedback.textContent = '';
    authFeedback.classList.remove('success');
}

function createGoogleIcon() {
    const wrapper = document.createElement('span');
    wrapper.className = 'oauth-icon';
    wrapper.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3l3 2.3c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.5-.2-2.2H12z"></path>
            <path fill="#34A853" d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2l-3.1 2.4C5 18.7 8.2 21 12 21z"></path>
            <path fill="#4A90E2" d="M6.3 13.1c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.2 6.7C2.4 8.2 2 9.6 2 11.1s.4 2.9 1.2 4.4l3.1-2.4z"></path>
            <path fill="#FBBC05" d="M12 4.9c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.8 2.1 14.6 1.2 12 1.2 8.2 1.2 5 3.5 3.2 6.7l3.1 2.4C7.1 6.7 9.4 4.9 12 4.9z"></path>
        </svg>
    `;
    return wrapper;
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

async function initBrowserSupabase() {
    if (!window.supabase?.createClient) {
        console.warn('Supabase browser client is unavailable.');
        return;
    }

    try {
        const config = await apiRequest('/api/auth/config', { method: 'GET', headers: {} });
        state.browserSupabase = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    } catch (error) {
        console.error('Failed to initialize Supabase browser client:', error);
    }
}

async function restoreSession() {
    try {
        const { user } = await apiRequest('/api/auth/me', { method: 'GET', headers: {} });
        setAuthenticatedUI(user);
        await loadHistory();
        return true;
    } catch {
        setAuthenticatedUI(null);
        return false;
    }
}

async function syncOAuthSession() {
    if (!state.browserSupabase) {
        return false;
    }

    const { data, error } = await state.browserSupabase.auth.getSession();
    if (error || !data?.session) {
        return false;
    }

    try {
        const payload = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        };

        const result = await apiRequest('/api/auth/session', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        setAuthenticatedUI(result.user);
        await loadHistory();
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    } catch (sessionError) {
        console.error('Failed to sync OAuth session:', sessionError);
        showAuthFeedback('구글 로그인 세션을 확인하지 못했어요. 다시 시도해 주세요.');
        return false;
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
        historyList.innerHTML = '<div style="text-align:center; color:#ef4444; padding: 2rem;">기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
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
            showAuthFeedback(data.message || '이메일 인증을 완료한 뒤 로그인해 주세요.', 'success');
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

async function handleGoogleLogin() {
    showAuthFeedback('');

    if (!state.browserSupabase) {
        showAuthFeedback('구글 로그인을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
    }

    btnGoogleLogin.disabled = true;

    try {
        const redirectTo = `${window.location.origin}/`;
        const { error } = await state.browserSupabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            throw error;
        }
    } catch (error) {
        btnGoogleLogin.disabled = false;
        showAuthFeedback(error.message || '구글 로그인에 실패했습니다.');
    }
}

async function handleLogout() {
    try {
        if (state.browserSupabase) {
            await state.browserSupabase.auth.signOut();
        }

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
            alert('현재 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해 주세요.');
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
        alert('일기 내용을 먼저 입력해 주세요.');
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
    responseBox.innerHTML = 'AI가 감정을 분석하고 답변을 준비하고 있습니다...';

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
            showAuthFeedback('세션이 만료되었습니다. 다시 로그인해 주세요.');
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
    await initBrowserSupabase();

    const restored = await restoreSession();
    if (!restored) {
        await syncOAuthSession();
    }
});

tabLogin.addEventListener('click', () => setAuthMode('login'));
tabRegister.addEventListener('click', () => setAuthMode('register'));
authForm.addEventListener('submit', handleAuthSubmit);
btnGoogleLogin.addEventListener('click', handleGoogleLogin);
btnLogout.addEventListener('click', handleLogout);
btnAnalyze.addEventListener('click', analyzeDiary);

btnNewDiary.addEventListener('click', () => {
    if (confirm('현재 작성 중인 내용을 지우고 새 일기를 시작할까요?')) {
        diaryInput.value = '';
        responseBox.innerHTML = defaultResponseText;
    }
});
