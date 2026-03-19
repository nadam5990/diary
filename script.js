const btnVoice = document.getElementById('btn-voice');
const diaryInput = document.getElementById('diary-input');
const responseBox = document.querySelector('.response-box');

// 1. 페이지 로드 시 히스토리 불러오기
window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

async function loadHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    // 로딩 표시
    historyList.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 2rem;">히스토리를 불러오는 중입니다...</div>';
    
    try {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error('Failed to fetch history');
        
        const historyData = await res.json();
        
        if (historyData.length === 0) {
            historyList.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 2rem;">아직 작성된 일기가 없습니다. 첫 일기를 기록해보세요!</div>';
            return;
        }
        
        historyList.innerHTML = ''; // 리스트 초기화
        
        historyData.forEach(item => {
            const dateObj = new Date(item.created_at);
            const dateString = dateObj.toLocaleString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
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
        console.error('History load error:', error);
        historyList.innerHTML = '<div style="text-align:center; color:#ef4444; padding: 2rem;">히스토리를 불러오는데 실패했습니다. (DB 연결 설정을 확인해주세요)</div>';
    }
}

// 새 일기 쓰기 버튼
const btnNewDiary = document.getElementById('btn-new-diary');
if (btnNewDiary) {
    btnNewDiary.addEventListener('click', () => {
        if (confirm('현재 작성 중인 전체 내용이 지워지며 새 일기를 씁니다. 계속하시겠습니까?')) {
            diaryInput.value = '';
            responseBox.innerHTML = '여기에는 "AI 의 답변이 표시됩니다."라고 쓰여있게 해줘';
        }
    });
}

// 브라우저가 Web Speech API를 지원하는지 확인 (크롬 등은 webkit 접두사 사용)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR'; // 한국어 인식 설정
    recognition.interimResults = false; // 최종 결과만 받음
    recognition.maxAlternatives = 1;

    let isRecognizing = false;
    
    // 원래 버튼 컴포넌트 HTML 저장
    const originalBtnHTML = btnVoice.innerHTML;

    // 인식 중일 때 보여줄 버튼 UI (버튼 텍스트 변경 + 로딩스피너)
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

    // 음성 입력 버튼 클릭 이벤트
    btnVoice.addEventListener('click', () => {
        if (!isRecognizing) {
            recognition.start();
        } else {
            recognition.stop();
        }
    });

    // 음성 인식이 시작되었을 때
    recognition.onstart = () => {
        isRecognizing = true;
        btnVoice.innerHTML = recognizingBtnHTML;
        btnVoice.classList.add('recognizing'); // 버튼 시각적 피드백
    };

    // 음성 인식이 성공하여 결과를 반환했을 때
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const currentText = diaryInput.value;
        
        // 기존 텍스트가 있다면 띄어쓰기 후 추가, 아니면 그냥 추가
        if (currentText.trim() !== '') {
            diaryInput.value = currentText + ' ' + transcript;
        } else {
            diaryInput.value = transcript;
        }
    };

    // 음성 인식 중 오류가 났을 때
    recognition.onerror = (event) => {
        console.error('Speech recognition error detected: ' + event.error);
        if (event.error !== 'no-speech') {
            alert('음성 인식 중 오류가 발생했습니다: ' + event.error);
        }
    };

    // 음성 인식이 (성공하든 실패하든) 종료되었을 때 상태 초기화
    recognition.onend = () => {
        isRecognizing = false;
        btnVoice.innerHTML = originalBtnHTML;
        btnVoice.classList.remove('recognizing');
    };

} else {
    // Web Speech API를 지원하지 않는 브라우저를 위한 폴백
    btnVoice.addEventListener('click', () => {
        alert('현재 브라우저에서는 음성 인식 기능을 지원하지 않습니다. Chrome 브라우저를 이용해주세요.');
    });
}

// "분석 요청하기" 버튼 로직
const btnAnalyze = document.getElementById('btn-analyze');

btnAnalyze.addEventListener('click', async () => {
    const text = diaryInput.value.trim();
    if (!text) {
        alert('일기 내용을 먼저 입력해주세요!');
        return;
    }

    // 로딩 상태 표시
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
    responseBox.innerHTML = 'AI가 감정을 분석하고 따뜻한 위로를 준비하고 있습니다...';

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }

        const data = await response.json();
        
        // AI의 답변 표시 (줄바꿈 처리)
        const formattedResponse = data.result.replace(/\n/g, '<br>');
        responseBox.innerHTML = formattedResponse;
        
        // 저장은 이미 백엔드(api/analyze.js)에서 처리되었으므로 프론트는 히스토리만 새로고침하면 됩니다.
        loadHistory();
        
    } catch (error) {
        console.error('Error analyzing text:', error);
        responseBox.innerHTML = '<span style="color: #ef4444;">분석 중 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요. (서버 콘솔창을 확인해 주세요.)</span>';
    } finally {
        // 버튼 원상 복구
        btnAnalyze.innerHTML = originalAnalyzeBtnHTML;
        btnAnalyze.disabled = false;
    }
});
