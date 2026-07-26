import { createClient } from '@supabase/supabase-js';

// ** 경고 **: 이 클라이언트는 서비스 역할 키를 사용하여 모든 보안 규칙을 우회합니다.
// 절대 클라이언트 컴포넌트나 공개 API 라우트에서 사용하지 마세요.
// 서버 환경(예: 관리자 전용 API 라우트, 서버 액션)에서만 사용해야 합니다.

export const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Key is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};
