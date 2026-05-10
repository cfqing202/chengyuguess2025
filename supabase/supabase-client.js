// Supabase 配置
// 请在 Supabase 控制台创建项目后，将对应的 URL 和 ANON KEY 填入下方

const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // 例如: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // 例如: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Supabase 客户端类
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      ...options.headers
    };

    try {
      const response = await fetch(`${this.url}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase request error:', error);
      throw error;
    }
  }

  // 用户相关操作
  async getUser(openid) {
    return this.request(`/rest/v1/users?openid=eq.${encodeURIComponent(openid)}&select=*`, {
      method: 'GET'
    });
  }

  async createUser(userData) {
    return this.request('/rest/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id, userData) {
    return this.request(`/rest/v1/users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...userData, updated_at: new Date().toISOString() })
    });
  }

  // 每日挑战相关操作
  async getDailyChallenge(userId, date) {
    return this.request(`/rest/v1/daily_challenges?user_id=eq.${userId}&challenge_date=eq.${date}&select=*`, {
      method: 'GET'
    });
  }

  async createDailyChallenge(data) {
    return this.request('/rest/v1/daily_challenges', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateDailyChallenge(id, data) {
    return this.request(`/rest/v1/daily_challenges?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
  }

  // 游戏历史记录
  async saveGameHistory(data) {
    return this.request('/rest/v1/game_history', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getGameHistory(userId, limit = 20) {
    return this.request(`/rest/v1/game_history?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`, {
      method: 'GET'
    });
  }

  // 积分变动记录
  async savePointTransaction(data) {
    return this.request('/rest/v1/point_transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 身份晋升记录
  async saveIdentityPromotion(data) {
    return this.request('/rest/v1/identity_promotions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 礼包兑换记录
  async saveGiftRedemption(data) {
    return this.request('/rest/v1/gift_redemptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getGiftRedemptions(userId) {
    return this.request(`/rest/v1/gift_redemptions?user_id=eq.${userId}&order=created_at.desc`, {
      method: 'GET'
    });
  }

  // 成语相关操作
  async getIdioms(difficulty = null, limit = 50) {
    let url = `/rest/v1/idioms?select=*&limit=${limit}`;
    if (difficulty) {
      url += `&difficulty=eq.${difficulty}`;
    }
    return this.request(url, { method: 'GET' });
  }

  async getRandomIdioms(difficulty, count = 10) {
    return this.request(`/rest/v1/idioms?difficulty=eq.${difficulty}&order=random()&limit=${count}`, {
      method: 'GET'
    });
  }

  // 用户成语进度
  async getUserIdiomProgress(userId) {
    return this.request(`/rest/v1/user_idiom_progress?user_id=eq.${userId}&select=*`, {
      method: 'GET'
    });
  }

  async updateIdiomProgress(userId, idiomId, isCorrect) {
    const existing = await this.request(`/rest/v1/user_idiom_progress?user_id=eq.${userId}&idiom_id=eq.${idiomId}&select=*`, {
      method: 'GET'
    });

    if (existing && existing.length > 0) {
      return this.request(`/rest/v1/user_idiom_progress?user_id=eq.${userId}&idiom_id=eq.${idiomId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_correct: isCorrect,
          attempt_count: existing[0].attempt_count + 1,
          last_attempt_at: new Date().toISOString()
        })
      });
    } else {
      return this.request('/rest/v1/user_idiom_progress', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          idiom_id: idiomId,
          is_correct: isCorrect,
          attempt_count: 1,
          last_attempt_at: new Date().toISOString()
        })
      });
    }
  }
}

// 创建全局 Supabase 客户端实例
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 游戏 API 服务类
class GameAPI {
  constructor() {
    this.supabase = supabase;
  }

  // 初始化或获取用户
  async initUser(userInfo) {
    try {
      let users = await this.supabase.getUser(userInfo.openid);
      
      if (users && users.length > 0) {
        return users[0];
      } else {
        const newUser = await this.supabase.createUser({
          openid: userInfo.openid,
          unionid: userInfo.unionid || '',
          nickname: userInfo.nickname || '玩家',
          avatar_url: userInfo.avatarUrl || '',
          user_status: 0,
          identity_level: 0,
          total_points: 0,
          ad_contribution_score: 0,
          has_user_info_auth: userInfo.hasUserInfoAuth || false,
          has_location_auth: userInfo.hasLocationAuth || false
        });
        return newUser[0];
      }
    } catch (error) {
      console.error('Init user error:', error);
      throw error;
    }
  }

  // 更新用户信息
  async updateUserInfo(userId, updates) {
    try {
      return await this.supabase.updateUser(userId, updates);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // 获取今日挑战
  async getTodayChallenge(userId) {
    const today = new Date().toISOString().split('T')[0];
    try {
      const challenges = await this.supabase.getDailyChallenge(userId, today);
      if (challenges && challenges.length > 0) {
        return challenges[0];
      }
      return null;
    } catch (error) {
      console.error('Get today challenge error:', error);
      return null;
    }
  }

  // 开始每日挑战
  async startDailyChallenge(userId) {
    const today = new Date().toISOString().split('T')[0];
    try {
      const existing = await this.getTodayChallenge(userId);
      if (existing) {
        return existing;
      }
      const newChallenge = await this.supabase.createDailyChallenge({
        user_id: userId,
        challenge_date: today,
        consecutive_wins: 0,
        is_completed: false,
        best_score: 0,
        attempts: 0
      });
      return newChallenge[0];
    } catch (error) {
      console.error('Start daily challenge error:', error);
      throw error;
    }
  }

  // 完成每日挑战
  async completeDailyChallenge(userId, score, isVictory) {
    const today = new Date().toISOString().split('T')[0];
    try {
      const challenges = await this.supabase.getDailyChallenge(userId, today);
      if (challenges && challenges.length > 0) {
        const challenge = challenges[0];
        const newConsecutiveWins = isVictory ? challenge.consecutive_wins + 1 : 0;
        const newBestScore = Math.max(challenge.best_score, score);
        
        return await this.supabase.updateDailyChallenge(challenge.id, {
          consecutive_wins: newConsecutiveWins,
          is_completed: true,
          best_score: newBestScore,
          attempts: challenge.attempts + 1
        });
      }
    } catch (error) {
      console.error('Complete daily challenge error:', error);
      throw error;
    }
  }

  // 保存游戏结果
  async saveGameResult(userId, gameData) {
    try {
      await this.supabase.saveGameHistory({
        user_id: userId,
        score: gameData.score,
        game_mode: gameData.gameMode || 'normal',
        correct_answers: gameData.correctAnswers || 0,
        wrong_answers: gameData.wrongAnswers || 0,
        time_spent: gameData.timeSpent || 0
      });

      // 更新用户积分
      const users = await this.supabase.getUserById(userId);
      if (users && users.length > 0) {
        const currentPoints = users[0].total_points || 0;
        await this.supabase.updateUser(userId, {
          total_points: currentPoints + gameData.score
        });

        // 记录积分变动
        await this.supabase.savePointTransaction({
          user_id: userId,
          points: gameData.score,
          transaction_type: 'game_reward',
          description: `游戏得分 +${gameData.score}`
        });
      }
    } catch (error) {
      console.error('Save game result error:', error);
      throw error;
    }
  }

  // 兑换礼包
  async redeemGift(userId, giftName, giftLevel, pointsRequired) {
    try {
      const users = await this.supabase.getUserById(userId);
      if (users && users.length > 0) {
        const currentPoints = users[0].total_points || 0;
        if (currentPoints < pointsRequired) {
          throw new Error('积分不足');
        }

        // 扣除积分
        await this.supabase.updateUser(userId, {
          total_points: currentPoints - pointsRequired
        });

        // 记录积分变动
        await this.supabase.savePointTransaction({
          user_id: userId,
          points: -pointsRequired,
          transaction_type: 'gift_redemption',
          description: `兑换礼包: ${giftName}`
        });

        // 记录兑换
        await this.supabase.saveGiftRedemption({
          user_id: userId,
          gift_name: giftName,
          gift_level: giftLevel,
          points_spent: pointsRequired,
          status: 'completed'
        });

        return true;
      }
      throw new Error('用户不存在');
    } catch (error) {
      console.error('Redeem gift error:', error);
      throw error;
    }
  }

  // 获取成语题库
  async getIdioms(difficulty = null) {
    try {
      return await this.supabase.getIdioms(difficulty, 100);
    } catch (error) {
      console.error('Get idioms error:', error);
      return [];
    }
  }

  // 检查并晋升身份
  async checkIdentityPromotion(userId, monthlyWins) {
    const promotionRules = [
      { wins: 10, level: 1, name: '童生' },
      { wins: 20, level: 2, name: '秀才' },
      { wins: 30, level: 3, name: '举人' },
      { wins: 40, level: 4, name: '进士' },
      { wins: 50, level: 5, name: '探花' },
      { wins: 60, level: 6, name: '榜眼' },
      { wins: 70, level: 7, name: '状元' },
      { wins: 80, level: 8, name: '大宗师' }
    ];

    try {
      const users = await this.supabase.getUserById(userId);
      if (!users || users.length === 0) return null;

      const currentUser = users[0];
      const currentLevel = currentUser.identity_level || 0;

      for (const rule of promotionRules) {
        if (monthlyWins >= rule.wins && currentLevel < rule.level) {
          await this.supabase.updateUser(userId, {
            identity_level: rule.level
          });

          await this.supabase.saveIdentityPromotion({
            user_id: userId,
            from_level: currentLevel,
            to_level: rule.level,
            promotion_type: 'monthly_challenge'
          });

          return { oldLevel: currentLevel, newLevel: rule.level, name: rule.name };
        }
      }

      return null;
    } catch (error) {
      console.error('Check identity promotion error:', error);
      return null;
    }
  }

  // 辅助方法：根据 ID 获取用户
  async getUserById(userId) {
    return this.request(`/rest/v1/users?id=eq.${userId}&select=*`, {
      method: 'GET'
    });
  }

  async request(endpoint, options = {}) {
    return this.supabase.request(endpoint, options);
  }
}

// 创建全局 API 实例
const gameAPI = new GameAPI();
