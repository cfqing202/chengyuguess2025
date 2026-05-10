/**
 * API 接口层 - 猴哥成语大冲关
 * 
 * 对齐文档：《猴哥成语大冲关-前端开发文档 v2.0》§6 接口清单
 * 
 * 当前版本：桩函数（Mock），返回符合 types.ts 定义的模拟数据
 * 正式版替换为真实 HTTP 请求（tt.request）
 * 
 * 统一返回格式：ApiResponse<T> = { code, message, data }
 */

// ==================== 配置（对齐文档 apiConfig.ts / adConfig.ts） ====================

const API_BASE_URL = ''; // 正式版替换为后端地址

const adConfig = {
  TIME_DOUBLE_AD_ID: '',   // 时间双倍广告位ID，正式版填入
  REVIVE_AD_ID: '',        // 复活广告位ID，正式版填入
};

// ==================== 运行模式 ====================

/** 是否使用API模式（false=本地Mock，true=后端API） */
let useApiMode = false;

function setApiMode(enabled) {
  useApiMode = enabled;
}

function isApiMode() {
  return useApiMode;
}

// ==================== 统一请求封装（对齐文档 request.ts） ====================

/**
 * 统一请求方法
 * 正式版：加 header / 错误处理 / 登录态凭证（Cookie 或 Header）
 * 当前版本：直接返回模拟数据
 */
function request(method, url, data) {
  if (useApiMode) {
    // 正式版：使用 tt.request
    return new Promise((resolve, reject) => {
      tt.request({
        url: API_BASE_URL + url,
        method,
        data,
        header: {
          'content-type': 'application/json',
        },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error(`API Error: ${res.statusCode}`));
          }
        },
        fail(err) {
          console.error(`[API] 请求失败: ${method} ${url}`, err);
          reject(err);
        },
      });
    });
  }
  // Mock 模式：仅打印日志
  console.log(`[API Mock] ${method} ${url}`, data ? JSON.stringify(data) : '');
  return Promise.resolve({ code: 0, message: 'ok', data: null });
}

// ==================== 用户接口（对齐文档 §6.2） ====================

const userApi = {
  /**
   * POST /api/user/init
   * 初始化用户，返回 UserInfo
   * 根据 userStatus 决定跳转：0→正常, 1→异常(进首页但提示), 2→非法(拒绝登录)
   */
  init() {
    return request('POST', '/api/user/init', {});
  },

  /**
   * GET /api/user/profile
   * 获取用户详细信息
   */
  getProfile() {
    return request('GET', '/api/user/profile', null);
  },

  /**
   * POST /api/user/bindPhone
   * 绑定手机号（对齐文档 §4.4 ProfilePage）
   * 参数：{ encryptedData, iv } 来自 tt.getPhoneNumber
   * 返回：更新后的 UserInfo
   */
  bindPhone(encryptedData, iv) {
    return request('POST', '/api/user/bindPhone', { encryptedData, iv });
  },

  /**
   * POST /api/user/bindLocation
   * 授权定位（对齐文档 §4.4 ProfilePage）
   * 参数：来自 tt.getLocation 的结果
   * 返回：更新后的 UserInfo
   */
  bindLocation(locationData) {
    return request('POST', '/api/user/bindLocation', locationData);
  },
};

// ==================== 游戏接口（对齐文档 §6.2） ====================

const gameApi = {
  /**
   * POST /api/game/session/start
   * 开始新一局，返回 SessionStartResponse
   * {
   *   sessionId: string,
   *   questions: Question[],        // 5道题
   *   initialTimeSeconds: number,   // 本局初始时间（秒）
   *   canUseTimeDouble: boolean,    // 是否可用时间双倍
   *   timeDoubleRemaining: number,  // 今日剩余时间双倍次数
   *   skipCountRemaining: number    // 本局剩余跳过次数
   * }
   */
  sessionStart() {
    return request('POST', '/api/game/session/start', {});
  },

  /**
   * POST /api/game/session/answer
   * 提交答案（4字全部选定后自动提交）
   * 请求：SubmitAnswerRequest { sessionId, questionId, answer: string[] }
   * 返回：SubmitAnswerResponse { isCorrect, pointsEarned }
   */
  submitAnswer(sessionId, questionId, answer) {
    return request('POST', '/api/game/session/answer', {
      sessionId,
      questionId,
      answer,
    });
  },

  /**
   * POST /api/game/session/skip
   * 跳过当前题目
   * 请求：{ sessionId, questionId }
   * 返回：新的 Question 对象（替换当前题）
   */
  skipQuestion(sessionId, questionId) {
    return request('POST', '/api/game/session/skip', {
      sessionId,
      questionId,
    });
  },

  /**
   * POST /api/game/session/end
   * 结束当前局
   * 请求：{ sessionId, isTimeout: boolean }
   * 返回：SessionEndResponse {
   *   isSessionPassed: boolean,
   *   sessionPoints: number,
   *   canRevive: boolean,
   *   reviveRemaining: number,
   *   dailyStatus: DailyStatus
   * }
   */
  sessionEnd(sessionId, isTimeout) {
    return request('POST', '/api/game/session/end', {
      sessionId,
      isTimeout,
    });
  },

  /**
   * POST /api/game/revive/confirm
   * 确认复活（看广告后调用）
   * 请求：{ sessionId }
   * 返回：ReviveConfirmResponse {
   *   success: boolean,
   *   nextSessionStart: SessionStartResponse  // 下一局数据
   * }
   */
  reviveConfirm(sessionId) {
    return request('POST', '/api/game/revive/confirm', {
      sessionId,
    });
  },

  /**
   * POST /api/game/time-double/confirm
   * 确认时间双倍（看广告后调用）
   * 请求：{ sessionId }
   * 返回：更新后的 SessionStartResponse
   */
  timeDoubleConfirm(sessionId) {
    return request('POST', '/api/game/time-double/confirm', {
      sessionId,
    });
  },
};

// ==================== 礼品接口（二期，占位） ====================

const giftApi = {
  /**
   * GET /api/gift/list
   * 获取当月可领取礼品列表（二期）
   */
  getList() {
    return request('GET', '/api/gift/list', null);
  },

  /**
   * POST /api/gift/claim
   * 领取礼品（二期）
   */
  claim(giftId) {
    return request('POST', '/api/gift/claim', { giftId });
  },
};

module.exports = {
  API_BASE_URL,
  adConfig,
  setApiMode,
  isApiMode,
  request,
  userApi,
  gameApi,
  giftApi,
};
