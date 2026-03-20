# DAY5

OpenAI 기반 감정 일기 앱입니다.
로그인은 Supabase Auth를 사용하고, 히스토리는 Supabase 테이블에 저장합니다.

## 실행 방법

1. `D:\Antigravity\DAY5\.env` 파일에 환경 변수를 채웁니다.
2. Supabase SQL Editor에서 [`D:\Antigravity\DAY5\supabase\schema.sql`](/D:/Antigravity/DAY5/supabase/schema.sql) 내용을 실행합니다.
3. 프로젝트 폴더에서 `npm run dev`를 실행합니다.
4. 브라우저에서 `http://localhost:3000`을 엽니다.

## 필수 환경 변수

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. 프런트 코드에 직접 노출하면 안 됩니다.

## 현재 구조

- `index.html`: 로그인/회원가입과 일기 UI
- `script.js`: 인증, 세션 복구, 분석 요청, 히스토리 로딩
- `server.js`: 로컬 Node 서버
- `api/auth-*.js`: Supabase Auth 기반 로그인 API
- `api/analyze.js`: OpenAI 감정 분석 + Supabase 저장
- `api/history.js`: 로그인한 사용자의 히스토리 조회
- `supabase/schema.sql`: 필요한 테이블과 정책 생성 SQL

## 참고

- 현재 서버는 회원가입 시 Supabase 사용자 계정을 만들고 바로 로그인 세션까지 생성합니다.
- 로그인과 히스토리 저장을 위해 `SUPABASE_SERVICE_ROLE_KEY`가 반드시 필요합니다.
