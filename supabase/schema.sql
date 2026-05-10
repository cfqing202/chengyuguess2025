-- 猴哥成语大冲关 - Supabase 数据库表结构

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid VARCHAR(255) UNIQUE,
  unionid VARCHAR(255) UNIQUE,
  nickname VARCHAR(100) DEFAULT '玩家',
  avatar_url TEXT DEFAULT '',
  user_status INTEGER DEFAULT 0 CHECK (user_status IN (0, 1, 2)),
  identity_level INTEGER DEFAULT 0 CHECK (identity_level IN (0, 1, 2, 3, 4, 5, 6, 7, 8)),
  total_points INTEGER DEFAULT 0,
  ad_contribution_score INTEGER DEFAULT 0,
  mobile VARCHAR(20),
  region VARCHAR(100),
  has_user_info_auth BOOLEAN DEFAULT false,
  has_location_auth BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 每日挑战记录表
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  consecutive_wins INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  best_score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

-- 3. 游戏历史记录表
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  game_mode VARCHAR(50) NOT NULL,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 积分变动记录表
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 身份晋升记录表
CREATE TABLE IF NOT EXISTS identity_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  promotion_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 礼包兑换记录表
CREATE TABLE IF NOT EXISTS gift_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gift_name VARCHAR(100) NOT NULL,
  gift_level INTEGER NOT NULL,
  points_spent INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 成语题库表
CREATE TABLE IF NOT EXISTS idioms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idiom VARCHAR(20) NOT NULL,
  explanation TEXT,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 用户成语进度表（记录用户答过哪些成语）
CREATE TABLE IF NOT EXISTS user_idiom_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  idiom_id UUID REFERENCES idioms(id) ON DELETE CASCADE,
  is_correct BOOLEAN,
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, idiom_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
CREATE INDEX IF NOT EXISTS idx_users_unionid ON users(unionid);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_idioms_difficulty ON idioms(difficulty);

-- Row Level Security (RLS) 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE idioms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_idiom_progress ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own challenges" ON daily_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON daily_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON daily_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own history" ON game_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON game_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own promotions" ON identity_promotions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own redemptions" ON gift_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON gift_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 成语表允许所有人读取
CREATE POLICY "Anyone can view idioms" ON idioms FOR SELECT USING (true);

-- 用户成语进度策略
CREATE POLICY "Users can view own idiom progress" ON user_idiom_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own idiom progress" ON user_idiom_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own idiom progress" ON user_idiom_progress FOR UPDATE USING (auth.uid() = user_id);
