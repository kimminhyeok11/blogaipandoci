-- handle_new_user 트리거 수정: 카카오 등 OAuth 유저 대응
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nickname TEXT;
  v_email TEXT;
BEGIN
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  v_nickname := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'nickname', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(v_email, '@', 1), ''),
    'user_' || LEFT(NEW.id::text, 8)
  );
  INSERT INTO public.users (id, email, nickname, created_at, updated_at)
  VALUES (NEW.id, v_email, v_nickname, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 누락된 카카오 유저 public.users에 일괄 삽입
INSERT INTO public.users (id, email, nickname, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, '') as email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'nickname', ''),
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(au.email, ''), '@', 1), ''),
    'user_' || LEFT(au.id::text, 8)
  ) as nickname,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
