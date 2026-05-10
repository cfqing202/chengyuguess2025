/**
 * 游戏状态管理 - 猴哥成语大冲关 抖音小游戏版
 * 
 * 对齐文档：
 * - 《猴哥成语大冲关-功能文档 v1.0》
 * - 《猴哥成语大冲关-前端开发文档 v2.0》§9 types.ts
 * 
 * 核心对齐点：
 * - 所有枚举严格对齐 types.ts（UserStatus/IdentityLevel/GameStatus/AdType/SessionResultFlag/PointsSource）
 * - 游戏流程API驱动：session/start → answer → skip → session/end → revive/confirm → time-double/confirm
 * - 业务判定由后端返回（isCorrect/isSessionPassed/canRevive/canUseTimeDouble），前端不做本地逻辑判断
 * - R(复活)可延续连续性：checkDailySuccess中R/R->A不中断连续A计数
 * - 积分规则：每答对1题+1分，无论通关与否均保留
 * - 跳过次数：每局3次
 * - 复活次数：每日2次
 * - 时间机制：递减（10→9→8→7→6秒）
 * - 身份晋升：8级体系（书生→皇帝），月度通关天数决定
 * - 用户风控：UserStatus(NORMAL/ABNORMAL/ILLEGAL)
 */

const { setApiMode, isApiMode, userApi, gameApi } = require('./api');
const { showAd } = require('./ad');

// ==================== 枚举定义（严格对齐 types.ts V3.0） ====================

const UserStatus = {
  NORMAL: 0,    // 正常
  ABNORMAL: 1,  // 异常
  ILLEGAL: 2,   // 非法
};

const IdentityLevel = {
  SCHOLAR: 0,    // 书生
  TONGSHENG: 1,  // 童生
  XIUCAI: 2,     // 秀才
  JUREN: 3,      // 举人
  JINSHI: 4,     // 进士
  ZHUANGYUAN: 5, // 状元
  TAIFU: 6,      // 太傅
  EMPEROR: 7,    // 皇帝
};

// 身份等级名称映射
const IDENTITY_NAMES = ['书生', '童生', '秀才', '举人', '进士', '状元', '太傅', '皇帝'];

// 身份等级对应图标
const IDENTITY_ICONS = ['📖', '📝', '🎓', '📜', '🏮', '👑', '🎭', '🏆'];

// 身份晋升所需月度通关天数
const IDENTITY_THRESHOLDS = [0, 3, 7, 12, 18, 25, 28, 30];

const GameStatus = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  TIME_UP: 'TIME_UP',
  ANSWER_CORRECT: 'ANSWER_CORRECT',
  ANSWER_WRONG: 'ANSWER_WRONG',
  SESSION_OVER: 'SESSION_OVER',
  AD_PLAYING: 'AD_PLAYING',
  DAILY_OVER: 'DAILY_OVER',
};

const AdType = {
  TIME_DOUBLE: 'time_double',
  REVIVE: 'revive',
};

const SessionResultFlag = {
  PASS: 'A',          // 直接通过
  FAIL: 'F',          // 失败且未复活
  REVIVE: 'R',        // 失败但选择复活（可延续连续性）
  REVIVE_PASS: 'R->A', // 复活后下一局通过
  REVIVE_FAIL: 'R->F', // 复活后下一局失败
};

/** 积分来源枚举（对齐 types.ts PointsSource） */
const PointsSource = {
  ANSWER_REWARD: 'answer_reward',   // 答题奖励
  GIFT_EXCHANGE: 'gift_exchange',   // 礼品兑换
  SIGN_IN: 'sign_in',               // 签到
};

// ==================== 题库数据（本地备用，正式版由后端提供） ====================

const idiomDatabase = [
  { idiom: "画龙点睛", meaning: "比喻在关键处加上精辟的话，使内容更加生动" },
  { idiom: "守株待兔", meaning: "比喻不主动努力，而存在侥幸心理" },
  { idiom: "对牛弹琴", meaning: "比喻对不讲道理的人讲道理" },
  { idiom: "杯弓蛇影", meaning: "比喻因疑神疑鬼而引起恐惧" },
  { idiom: "一鸣惊人", meaning: "比喻平时没有表现，突然做出惊人的成绩" },
  { idiom: "叶公好龙", meaning: "比喻表面爱好而实际上并不真正爱好" },
  { idiom: "狐假虎威", meaning: "比喻借别人的势力来欺压人" },
  { idiom: "井底之蛙", meaning: "比喻见识短浅的人" },
  { idiom: "亡羊补牢", meaning: "比喻出了问题以后想办法补救" },
  { idiom: "掩耳盗铃", meaning: "比喻自己欺骗自己" },
  { idiom: "刻舟求剑", meaning: "比喻拘泥成例，不知道跟着情势的变化而改变看法" },
  { idiom: "自相矛盾", meaning: "比喻自己的言行前后抵触" },
  { idiom: "望梅止渴", meaning: "比喻用空想安慰自己" },
  { idiom: "三顾茅庐", meaning: "比喻真心诚意，一再邀请" },
  { idiom: "四面楚歌", meaning: "比喻陷入四面受敌、孤立无援的境地" },
  { idiom: "入木三分", meaning: "形容书法笔力刚劲有力，也比喻对文章或事物见解深刻" },
  { idiom: "卧薪尝胆", meaning: "形容人刻苦自励，发愤图强" },
  { idiom: "破釜沉舟", meaning: "比喻下决心不顾一切地干到底" },
  { idiom: "胸有成竹", meaning: "比喻做事之前已经有了主意" },
  { idiom: "指鹿为马", meaning: "比喻故意颠倒黑白，混淆是非" },
  { idiom: "纸上谈兵", meaning: "比喻空谈理论，不能解决实际问题" },
  { idiom: "完璧归赵", meaning: "比喻把原物完好地归还本人" },
  { idiom: "负荆请罪", meaning: "表示向人认错赔罪" },
  { idiom: "鹏程万里", meaning: "比喻前程远大" },
  { idiom: "风声鹤唳", meaning: "形容惊慌失措或自相惊扰" },
  { idiom: "一诺千金", meaning: "形容说话算数，说了就不改变" },
  { idiom: "拔苗助长", meaning: "比喻违反事物的发展规律，急于求成" },
  { idiom: "打草惊蛇", meaning: "比喻做事不密，使对方有所察觉和防备" },
  { idiom: "鹤立鸡群", meaning: "比喻一个人的才能或仪表出众" },
  { idiom: "班门弄斧", meaning: "比喻在行家面前卖弄本领，不自量力" },
];

// ==================== 工具函数 ====================

/**
 * 生成本地题目（离线/调试用，正式版由后端 /api/game/session/start 返回）
 * 返回格式对齐文档 Question 接口：{ questionId, idioms: string[] }
 */
function getRandomQuestions(count) {
  const shuffled = [...idiomDatabase].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((item, idx) => ({
    questionId: 'local_' + Date.now() + '_' + idx,
    idioms: item.idiom.split(''), // 4个字
    meaning: item.meaning,        // 前端展示用，后端不一定返回
  }));
}

function shuffleChars(chars) {
  const arr = [...chars];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 计算当前局初始时间（秒）
 * 规则：第1局10秒，之后每局递减1秒，最低6秒
 */
function getSessionTime(sessionIndex) {
  return Math.max(6, 10 - sessionIndex);
}

/**
 * 生成本地 SessionStartResponse 模拟数据（对齐 types.ts）
 */
function generateLocalSessionStartResponse(sessionIndex, withBoost) {
  const questions = getRandomQuestions(5);
  const baseTime = getSessionTime(sessionIndex);
  const actualTime = withBoost ? baseTime * 2 : baseTime;
  return {
    sessionId: 'local_' + Date.now(),
    questions,
    initialTimeSeconds: actualTime,
    canUseTimeDouble: state.timeDoubleRemaining > 0 && state.dailyStatus.totalSessions < 5,
    timeDoubleRemaining: state.timeDoubleRemaining,
    skipCountRemaining: 3,
  };
}

// ==================== 游戏状态 ====================

const state = {
  // 页面导航（对齐文档路由：launch → home → game / profile / gift / identity）
  screen: 'launch', // 'launch' | 'home' | 'game' | 'profile' | 'gift' | 'identity'

  // 游戏状态枚举（对齐文档 GameStatus）
  gameStatus: GameStatus.IDLE,

  // 弹窗控制
  showBoostDialog: false,     // 时间双倍增益弹窗
  showVictoryDialog: false,   // 单局通过弹窗
  showFailureDialog: false,   // 单局失败弹窗
  showDailySuccessDialog: false, // 每日冲关成功弹窗

  // ========== 用户信息（对齐文档 UserInfo） ==========
  userInfo: {
    id: 0,
    openid: '',
    unionid: '',
    nickname: '玩家',
    avatarUrl: '',
    userStatus: UserStatus.NORMAL,
    identityLevel: IdentityLevel.SCHOLAR,
    totalPoints: 1280,
    adContributionScore: 5,   // 1-10
    mobile: '',
    region: '',
    hasUserInfoAuth: false,
    hasLocationAuth: false,
  },

  // ========== 每日冲关状态（对齐文档 DailyStatus） ==========
  dailyStatus: {
    challengeDate: new Date().toISOString().split('T')[0],
    sessionResults: [],       // SessionResultFlag[] 当日每局结果
    dailyPassed: false,       // 是否冲关成功
    dailyPoints: 0,           // 当日获得积分
    totalSessions: 0,         // 当日总局数
    maxSessionsReached: false, // 是否达到30局上限
  },

  // ========== 当前局状态（对齐文档 SessionStartResponse） ==========
  sessionId: '',
  sessionIndex: 0,            // 当前第几局（0-based）
  currentScore: 0,            // 本局积分
  correctCount: 0,            // 本局答对题数
  timer: 10,
  maxTime: 10,
  skipCount: 3,               // 本局剩余跳过次数（文档：每局3次）
  hasBoost: false,            // 是否使用了时间双倍
  canUseTimeDouble: true,     // 后端返回：是否可用时间双倍
  timeDoubleRemaining: 3,     // 今日剩余时间双倍次数（文档：每日3次）
  reviveRemaining: 2,         // 今日剩余复活次数（文档：每日2次）
  canRevive: false,           // 后端返回：是否可复活（对齐 SessionEndResponse.canRevive）

  // ========== 题目状态（对齐文档 Question） ==========
  questions: [],              // Question[] 当前局的5道题
  currentQuestionIndex: 0,
  selectedChars: [null, null, null, null], // 玩家已选的4个字
  shuffledOptions: [],        // 打乱后的候选字
  isAnswerCorrect: null,
  isShaking: false,

  // ========== 月度身份晋升状态 ==========
  monthlyPassedDays: 3,      // 当月已冲关成功天数
  currentIdentity: IdentityLevel.SCHOLAR, // 当前身份等级

  // ========== 动画状态 ==========
  animTime: 0,
  shakeOffset: 0,
  timerWarning: false,
  scorePopup: null, // { text, x, y, opacity }

  // ========== 加载状态 ==========
  isLoading: false,           // 是否正在请求API
  loadingText: '',            // 加载提示文字

  // ========== 礼品领取状态（对齐文档 §4.5 + §5） ==========
  giftClaimHistory: [],       // 礼品领取历史记录
  giftClaimedThisMonth: false, // 当月是否已领取当前等级礼品

  // ========== 礼品列表配置（对齐文档 §5：根据身份等级，每月可领取对应礼品） ==========
  giftList: [
    { level: 0, name: '书生礼品', coupon: '5元优惠券', required: 0 },
    { level: 1, name: '童生礼品', coupon: '10元优惠券', required: 3 },
    { level: 2, name: '秀才礼品', coupon: '15元优惠券', required: 7 },
    { level: 3, name: '举人礼品', coupon: '20元优惠券', required: 12 },
    { level: 4, name: '进士礼品', coupon: '30元优惠券', required: 18 },
    { level: 5, name: '状元礼品', coupon: '50元优惠券', required: 25 },
    { level: 6, name: '太傅礼品', coupon: '80元优惠券', required: 28 },
    { level: 7, name: '皇帝礼品', coupon: '100元优惠券', required: 30 },
  ],
};

// ==================== 状态更新 ====================

function setState(updates) {
  Object.assign(state, updates);
}

// ==================== 启动流程（对齐文档 §4.1 LaunchPage） ====================

/**
 * 用户初始化
 * 对齐文档：调 POST /api/user/init，根据 userStatus 决定跳转
 * - NORMAL(0) → 首页
 * - ABNORMAL(1) → 首页（显示异常提示）
 * - ILLEGAL(2) → 停留在启动页，显示"非法用户，拒绝登录！"
 */
async function initUser() {
  if (isApiMode()) {
    try {
      setState({ isLoading: true, loadingText: '正在初始化...' });
      const res = await userApi.init();
      if (res.code === 0 && res.data) {
        setState({
          userInfo: { ...state.userInfo, ...res.data },
          isLoading: false,
          loadingText: '',
        });
      }
    } catch (e) {
      console.error('[initUser] API失败，使用本地数据', e);
      setState({ isLoading: false, loadingText: '' });
    }
  }

  // 根据 userStatus 决定跳转
  if (state.userInfo.userStatus === UserStatus.ILLEGAL) {
    // 非法用户，留在启动页显示拒绝
    return;
  }
  // 正常/异常用户跳转首页
  setState({ screen: 'home' });
}

// ==================== 首页操作 ====================

/**
 * 开始游戏（对齐文档：点击"开始游戏"跳转 /game）
 * 文档流程：调 POST /api/game/session/start 获取局数据
 * 时间双倍弹窗条件：canUseTimeDouble=true 且 timeDoubleRemaining>0 且 前5局
 */
function startChallenge() {
  // 检查是否超过30局（文档：超过30局仍可玩，但无积分无增益）
  if (state.dailyStatus.totalSessions >= 30) {
    startSession(false);
    return;
  }
  
  // 前5局才弹出时间双倍询问（文档 §4.1 时间双倍卡规则）
  if (state.canUseTimeDouble && state.timeDoubleRemaining > 0 && state.dailyStatus.totalSessions < 5) {
    setState({ showBoostDialog: true });
  } else {
    startSession(false);
  }
}

/**
 * 使用时间双倍（对齐文档 §4.1 时间双倍卡）
 * 流程：看广告 → 广告完成后调 POST /api/game/time-double/confirm → 开始局
 */
async function useBoost() {
  if (state.timeDoubleRemaining <= 0) return;
  if (state.userInfo.userStatus === UserStatus.ABNORMAL) {
    // 异常用户禁止增益
    return;
  }

  // 先看广告
  const adWatched = await showAd('TIME_DOUBLE');
  if (!adWatched) {
    console.log('[useBoost] 广告未完整观看，不调后端确认');
    return;
  }

  if (isApiMode() && state.sessionId) {
    try {
      const res = await gameApi.timeDoubleConfirm(state.sessionId);
      if (res.code === 0 && res.data) {
        // 使用后端返回的局数据开始
        applySessionStartResponse(res.data, true);
        return;
      }
    } catch (e) {
      console.error('[useBoost] API失败，使用本地逻辑', e);
    }
  }

  // 本地模式：直接双倍
  startSession(true);
  setState({ timeDoubleRemaining: state.timeDoubleRemaining - 1 });
}

/**
 * 跳过时间双倍，直接开始
 */
function skipBoost() {
  startSession(false);
}

/**
 * 启动一局
 * 对齐文档：调 POST /api/game/session/start 获取 SessionStartResponse
 * @param {boolean} withBoost - 是否使用时间双倍
 */
async function startSession(withBoost) {
  if (isApiMode()) {
    try {
      setState({ isLoading: true, loadingText: '正在加载题目...' });
      const res = await gameApi.sessionStart();
      if (res.code === 0 && res.data) {
        applySessionStartResponse(res.data, withBoost);
        setState({ isLoading: false, loadingText: '' });
        return;
      }
    } catch (e) {
      console.error('[startSession] API失败，使用本地数据', e);
      setState({ isLoading: false, loadingText: '' });
    }
  }

  // 本地模式：生成模拟数据
  const mockResponse = generateLocalSessionStartResponse(state.sessionIndex, withBoost);
  applySessionStartResponse(mockResponse, withBoost);
}

/**
 * 应用 SessionStartResponse 到状态（对齐 types.ts）
 * API模式和本地模式共用
 */
function applySessionStartResponse(response, withBoost) {
  const firstQ = response.questions[0];
  const actualTime = withBoost ? response.initialTimeSeconds * 2 : response.initialTimeSeconds;

  setState({
    showBoostDialog: false,
    screen: 'game',
    gameStatus: GameStatus.PLAYING,
    sessionId: response.sessionId,
    currentScore: 0,
    correctCount: 0,
    timer: actualTime,
    maxTime: actualTime,
    skipCount: response.skipCountRemaining,
    hasBoost: withBoost,
    canUseTimeDouble: response.canUseTimeDouble,
    timeDoubleRemaining: response.timeDoubleRemaining,
    questions: response.questions,
    currentQuestionIndex: 0,
    selectedChars: [null, null, null, null],
    shuffledOptions: shuffleChars(firstQ.idioms),
    isAnswerCorrect: null,
    isShaking: false,
  });
  startTimer();
}

// ==================== 答题操作 ====================

/**
 * 选择一个字（对齐文档：玩家点选成语，界面实时更新已选顺序）
 * 4字全选后自动提交：调 POST /api/game/session/answer
 */
function selectChar(char, optionIndex) {
  if (state.isAnswerCorrect !== null) return;
  const emptySlot = state.selectedChars.indexOf(null);
  if (emptySlot === -1) return;

  const newSelected = [...state.selectedChars];
  newSelected[emptySlot] = char;
  const newOptions = [...state.shuffledOptions];
  newOptions[optionIndex] = '';

  setState({ selectedChars: newSelected, shuffledOptions: newOptions });

  // 4个字全部选定后自动提交
  if (newSelected.every((s) => s !== null)) {
    submitAnswer(newSelected);
  }
}

/**
 * 提交答案（对齐文档：调 POST /api/game/session/answer）
 * 后端返回 { isCorrect, pointsEarned }，前端据此播放动效
 */
async function submitAnswer(answer) {
  const currentQ = state.questions[state.currentQuestionIndex];

  if (isApiMode()) {
    try {
      const res = await gameApi.submitAnswer(
        state.sessionId,
        currentQ.questionId,
        answer
      );
      if (res.code === 0 && res.data) {
        // 后端判定结果
        if (res.data.isCorrect) {
          onAnswerCorrect(res.data.pointsEarned || 1);
        } else {
          onAnswerWrong();
        }
        return;
      }
    } catch (e) {
      console.error('[submitAnswer] API失败，使用本地判定', e);
    }
  }

  // 本地判定（正式版由后端 isCorrect 决定）
  const answerStr = answer.join('');
  if (answerStr === currentQ.idioms.join('')) {
    onAnswerCorrect(1); // 文档：每答对1题+1分
  } else {
    onAnswerWrong();
  }
}

/** 答对处理（积分+N，文档规则） */
function onAnswerCorrect(pointsEarned) {
  const newCorrectCount = state.correctCount + 1;
  const newCurrentScore = state.currentScore + pointsEarned;
  setState({
    gameStatus: GameStatus.ANSWER_CORRECT,
    isAnswerCorrect: true,
    correctCount: newCorrectCount,
    currentScore: newCurrentScore,
    scorePopup: { text: '+' + pointsEarned, opacity: 1 },
  });
  setTimeout(() => setState({ scorePopup: null }), 1000);

  if (newCorrectCount >= 5) {
    // 单局通过 → 调 session/end
    setTimeout(() => onSessionEnd(false), 800); // isTimeout=false
  } else {
    setTimeout(() => nextQuestion(), 800);
  }
}

/** 答错处理 */
function onAnswerWrong() {
  setState({
    gameStatus: GameStatus.ANSWER_WRONG,
    isAnswerCorrect: false,
    isShaking: true,
  });
  setTimeout(() => {
    setState({
      isShaking: false,
      isAnswerCorrect: null,
      gameStatus: GameStatus.PLAYING,
      selectedChars: [null, null, null, null],
      shuffledOptions: shuffleChars(state.questions[state.currentQuestionIndex].idioms),
    });
  }, 600);
}

function removeChar(slotIndex) {
  if (state.isAnswerCorrect !== null) return;
  const char = state.selectedChars[slotIndex];
  if (char === null) return;
  const newSelected = [...state.selectedChars];
  newSelected[slotIndex] = null;
  const newOptions = [...state.shuffledOptions];
  const emptyIdx = newOptions.indexOf('');
  if (emptyIdx !== -1) newOptions[emptyIdx] = char;
  setState({ selectedChars: newSelected, shuffledOptions: newOptions });
}

/**
 * 跳过当前题目（对齐文档：调 POST /api/game/session/skip）
 * 跳过后更换新题，倒计时继续
 */
async function skipQuestion() {
  if (state.skipCount <= 0) return;

  const currentQ = state.questions[state.currentQuestionIndex];

  if (isApiMode()) {
    try {
      const res = await gameApi.skipQuestion(state.sessionId, currentQ.questionId);
      if (res.code === 0 && res.data) {
        // 后端返回新题目
        const newQuestions = [...state.questions];
        newQuestions[state.currentQuestionIndex] = res.data;
        setState({
          skipCount: state.skipCount - 1,
          questions: newQuestions,
          selectedChars: [null, null, null, null],
          shuffledOptions: shuffleChars(res.data.idioms),
          isAnswerCorrect: null,
          isShaking: false,
        });
        return;
      }
    } catch (e) {
      console.error('[skipQuestion] API失败，使用本地替换', e);
    }
  }

  // 本地模式：随机替换一道新题
  const newQuestions = [...state.questions];
  const newQ = getRandomQuestions(1)[0];
  newQuestions[state.currentQuestionIndex] = newQ;
  setState({
    skipCount: state.skipCount - 1,
    questions: newQuestions,
    selectedChars: [null, null, null, null],
    shuffledOptions: shuffleChars(newQ.idioms),
    isAnswerCorrect: null,
    isShaking: false,
  });
}

function nextQuestion() {
  const nextIdx = state.currentQuestionIndex + 1;
  if (nextIdx >= state.questions.length) return;
  const nextQ = state.questions[nextIdx];
  setState({
    currentQuestionIndex: nextIdx,
    selectedChars: [null, null, null, null],
    shuffledOptions: shuffleChars(nextQ.idioms),
    isAnswerCorrect: null,
    isShaking: false,
    gameStatus: GameStatus.PLAYING,
  });
}

// ==================== 单局结束（对齐文档 SessionEndResponse） ====================

/**
 * 单局结束处理
 * 对齐文档：调 POST /api/game/session/end
 * @param {boolean} isTimeout - 是否因为时间到而结束
 */
async function onSessionEnd(isTimeout) {
  stopTimer();

  if (isApiMode()) {
    try {
      const res = await gameApi.sessionEnd(state.sessionId, isTimeout);
      if (res.code === 0 && res.data) {
        applySessionEndResponse(res.data);
        return;
      }
    } catch (e) {
      console.error('[onSessionEnd] API失败，使用本地逻辑', e);
    }
  }

  // 本地逻辑
  const isPassed = !isTimeout && state.correctCount >= 5;
  applyLocalSessionEnd(isPassed, isTimeout);
}

/**
 * 应用后端 SessionEndResponse（对齐 types.ts）
 */
function applySessionEndResponse(response) {
  const newTotalPoints = state.userInfo.totalPoints + response.sessionPoints;
  
  // 更新 dailyStatus（来自后端）
  const newDailyStatus = response.dailyStatus || state.dailyStatus;

  setState({
    canRevive: response.canRevive,
    reviveRemaining: response.reviveRemaining,
    dailyStatus: newDailyStatus,
    userInfo: { ...state.userInfo, totalPoints: newTotalPoints },
  });

  if (response.isSessionPassed) {
    // 单局通过
    setState({
      gameStatus: GameStatus.SESSION_OVER,
      showVictoryDialog: true,
    });
    // 检查是否当日冲关成功
    checkDailySuccess(newDailyStatus.sessionResults);
  } else {
    // 单局失败
    setState({
      gameStatus: GameStatus.TIME_UP,
      showFailureDialog: true,
    });
  }
}

/**
 * 本地单局结束处理（离线模式）
 */
function applyLocalSessionEnd(isPassed, isTimeout) {
  const newDailyResults = [...state.dailyStatus.sessionResults];
  const newTotalSessions = state.dailyStatus.totalSessions + 1;

  // 积分保留（文档规则：无论通关与否，已获积分均累加到总账户）
  const newTotalPoints = state.userInfo.totalPoints + state.currentScore;
  const newDailyPoints = state.dailyStatus.dailyPoints + state.currentScore;

  // 本地判断是否可复活：时间到且有剩余复活次数
  const localCanRevive = isTimeout && state.reviveRemaining > 0;

  if (isPassed) {
    newDailyResults.push(SessionResultFlag.PASS);
    setState({
      gameStatus: GameStatus.SESSION_OVER,
      showVictoryDialog: true,
      canRevive: false,
      userInfo: { ...state.userInfo, totalPoints: newTotalPoints },
      dailyStatus: {
        ...state.dailyStatus,
        sessionResults: newDailyResults,
        dailyPoints: newDailyPoints,
        totalSessions: newTotalSessions,
        maxSessionsReached: newTotalSessions >= 30,
      },
    });
    checkDailySuccess(newDailyResults);
  } else {
    setState({
      gameStatus: GameStatus.TIME_UP,
      showFailureDialog: true,
      canRevive: localCanRevive,
      userInfo: { ...state.userInfo, totalPoints: newTotalPoints },
      dailyStatus: {
        ...state.dailyStatus,
        dailyPoints: newDailyPoints,
        totalSessions: newTotalSessions,
        maxSessionsReached: newTotalSessions >= 30,
      },
    });
  }
}

/**
 * 检查每日冲关是否成功
 * 文档规则："连续通过5局（即数组中出现连续5个'A'）"
 * 关键：R(复活)"可延续连续性"，因此 R 和 R->A 不中断连续A计数
 */
function checkDailySuccess(results) {
  if (state.dailyStatus.dailyPassed) return;
  
  // 查找是否有连续5个A（R和R->A不中断连续性，F和R->F中断）
  let consecutiveA = 0;
  for (let i = 0; i < results.length; i++) {
    const flag = results[i];
    if (flag === SessionResultFlag.PASS) {
      consecutiveA++;
      if (consecutiveA >= 5) {
        setState({
          dailyStatus: { ...state.dailyStatus, dailyPassed: true },
          showDailySuccessDialog: true,
        });
        // 冲关成功，更新月度通关天数
        const newMonthlyDays = state.monthlyPassedDays + 1;
        setState({ monthlyPassedDays: newMonthlyDays });
        // 检查身份晋升
        checkIdentityPromotion(newMonthlyDays);
        return;
      }
    } else if (flag === SessionResultFlag.REVIVE || flag === SessionResultFlag.REVIVE_PASS) {
      // R(复活)和R->A(复活后通过)可延续连续性，不中断连续A计数
      // 注意：R->A 本身不增加 consecutiveA，只是不中断
      continue;
    } else {
      // F 和 R->F 中断连续性
      consecutiveA = 0;
    }
  }
}

/**
 * 计算当前有效连续A数（用于首页进度显示）
 * R和R->A不中断连续性
 */
function getEffectiveConsecutiveA(results) {
  let count = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    const flag = results[i];
    if (flag === SessionResultFlag.PASS) {
      count++;
    } else if (flag === SessionResultFlag.REVIVE || flag === SessionResultFlag.REVIVE_PASS) {
      // R和R->A不中断，继续往前数
      continue;
    } else {
      // F和R->F中断
      break;
    }
  }
  return count;
}

/** 检查身份晋升 */
function checkIdentityPromotion(monthlyDays) {
  let newLevel = state.currentIdentity;
  for (let i = IDENTITY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (monthlyDays >= IDENTITY_THRESHOLDS[i]) {
      newLevel = i;
      break;
    }
  }
  if (newLevel !== state.currentIdentity) {
    setState({
      currentIdentity: newLevel,
      userInfo: { ...state.userInfo, identityLevel: newLevel },
    });
  }
}

// ==================== 倒计时 ====================

function tick() {
  if (state.showFailureDialog || state.showVictoryDialog) return;
  if (state.timer <= 1) {
    // 时间到 → 单局失败（调 session/end with isTimeout=true）
    onSessionEnd(true);
    return;
  }
  setState({ timer: state.timer - 1, timerWarning: state.timer <= 4 });
}

// ==================== 复活（对齐文档 §4.2 复活机会） ====================

/**
 * 复活（对齐文档：观看视频后，跳过当前失败局，直接开始下一局）
 * 流程：看广告 → 调 POST /api/game/revive/confirm → 获取下一局数据
 * 文档：每日2次复活机会
 */
async function revive() {
  if (state.reviveRemaining <= 0) return;
  if (state.userInfo.userStatus === UserStatus.ABNORMAL) {
    // 异常用户禁止增益
    return;
  }

  // 先看广告
  const adWatched = await showAd('REVIVE');
  if (!adWatched) {
    console.log('[revive] 广告未完整观看，不调后端确认');
    return;
  }

  if (isApiMode()) {
    try {
      const res = await gameApi.reviveConfirm(state.sessionId);
      if (res.code === 0 && res.data && res.data.success) {
        setState({
          showFailureDialog: false,
          reviveRemaining: res.data.nextSessionStart.timeDoubleRemaining !== undefined 
            ? state.reviveRemaining - 1 
            : state.reviveRemaining - 1,
          dailyStatus: {
            ...state.dailyStatus,
            sessionResults: [...state.dailyStatus.sessionResults, SessionResultFlag.REVIVE],
          },
        });
        // 使用后端返回的下一局数据
        applySessionStartResponse(res.data.nextSessionStart, false);
        return;
      }
    } catch (e) {
      console.error('[revive] API失败，使用本地逻辑', e);
    }
  }

  // 本地模式
  setState({
    showFailureDialog: false,
    reviveRemaining: state.reviveRemaining - 1,
    dailyStatus: {
      ...state.dailyStatus,
      sessionResults: [...state.dailyStatus.sessionResults, SessionResultFlag.REVIVE],
    },
  });
  // 复活后开始下一局
  state.sessionIndex += 1;
  startSession(false);
}

// ==================== 页面导航 ====================

function returnHome() {
  setState({
    screen: 'home',
    gameStatus: GameStatus.IDLE,
    showBoostDialog: false,
    showVictoryDialog: false,
    showFailureDialog: false,
    showDailySuccessDialog: false,
  });
  stopTimer();
}

function playAgain() {
  // 上一局通过后，开下一局
  state.sessionIndex += 1;
  
  // 前5局才弹时间双倍（文档 §4.1）
  if (state.canUseTimeDouble && state.timeDoubleRemaining > 0 && state.dailyStatus.totalSessions < 5) {
    setState({
      showBoostDialog: true,
      showVictoryDialog: false,
      showFailureDialog: false,
      showDailySuccessDialog: false,
      gameStatus: GameStatus.IDLE,
    });
  } else {
    startSession(false);
    setState({
      showVictoryDialog: false,
      showFailureDialog: false,
      showDailySuccessDialog: false,
    });
  }
  stopTimer();
}

function navigateToIdentity() {
  setState({ screen: 'identity' });
}

function navigateToProfile() {
  setState({ screen: 'profile' });
}

function navigateToGift() {
  setState({ screen: 'gift' });
}

function navigateToHome() {
  setState({ screen: 'home', gameStatus: GameStatus.IDLE });
  stopTimer();
}

/**
 * 领取礼品（对齐文档 §4.5 + §5：调 POST /api/gift/claim）
 * 根据身份等级，每月可领取对应礼品（目前为抖音小店优惠券）
 */
async function claimGift(levelName) {
  if (isApiMode()) {
    try {
      setState({ isLoading: true, loadingText: '正在领取...' });
      // 文档接口：POST /api/gift/claim
      const res = await require('./api').giftApi.claim(levelName);
      if (res.code === 0 && res.data) {
        setState({
          isLoading: false,
          loadingText: '',
          giftClaimedThisMonth: true,
          giftClaimHistory: [...(state.giftClaimHistory || []), {
            name: levelName + '礼品',
            date: new Date().toLocaleDateString('zh-CN'),
            status: '已领取',
          }],
        });
        return;
      }
    } catch (e) {
      console.error('[claimGift] API失败，使用本地逻辑', e);
      setState({ isLoading: false, loadingText: '' });
    }
  }

  // 本地模式：直接标记为已领取
  setState({
    giftClaimedThisMonth: true,
    giftClaimHistory: [...(state.giftClaimHistory || []), {
      name: levelName + '礼品（抖音小店优惠券）',
      date: new Date().toLocaleDateString('zh-CN'),
      status: '已领取',
    }],
  });
}

// ==================== 个人中心操作（对齐文档 §4.4） ====================

/**
 * 绑定手机号（对齐文档：调 tt.getPhoneNumber，将加密数据传给后端）
 */
async function bindPhone() {
  try {
    // tt.getPhoneNumber 需要在按钮回调中触发
    if (typeof tt.getPhoneNumber === 'function') {
      tt.getPhoneNumber({
        success(res) {
          const { encryptedData, iv } = res;
          if (isApiMode()) {
            userApi.bindPhone(encryptedData, iv).then(apiRes => {
              if (apiRes.code === 0 && apiRes.data) {
                setState({ userInfo: { ...state.userInfo, ...apiRes.data } });
              }
            });
          }
          // 本地模式模拟绑定成功
          setState({ userInfo: { ...state.userInfo, mobile: '138****8888', hasUserInfoAuth: true } });
        },
        fail(err) {
          console.error('[bindPhone] 获取手机号失败', err);
        },
      });
    }
  } catch (e) {
    console.error('[bindPhone] 异常', e);
  }
}

/**
 * 授权定位（对齐文档：调 tt.getLocation，将结果传给后端）
 */
async function bindLocation() {
  try {
    if (typeof tt.getLocation === 'function') {
      tt.getLocation({
        type: 'gcj02',
        success(res) {
          const locationData = {
            latitude: res.latitude,
            longitude: res.longitude,
            speed: res.speed,
            accuracy: res.accuracy,
          };
          if (isApiMode()) {
            userApi.bindLocation(locationData).then(apiRes => {
              if (apiRes.code === 0 && apiRes.data) {
                setState({ userInfo: { ...state.userInfo, ...apiRes.data } });
              }
            });
          }
          // 本地模式模拟授权成功
          setState({ userInfo: { ...state.userInfo, region: '广东省深圳市', hasLocationAuth: true } });
        },
        fail(err) {
          console.error('[bindLocation] 获取定位失败', err);
        },
      });
    }
  } catch (e) {
    console.error('[bindLocation] 异常', e);
  }
}

// ==================== 计时器 ====================

let timerInterval = null;

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => tick(), 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ==================== 导出 ====================

module.exports = {
  // 枚举（对齐 types.ts）
  UserStatus,
  IdentityLevel,
  IDENTITY_NAMES,
  IDENTITY_ICONS,
  IDENTITY_THRESHOLDS,
  GameStatus,
  AdType,
  SessionResultFlag,
  PointsSource,
  
  // 状态
  state,
  
  // 核心函数
  setState,
  initUser,
  startChallenge,
  useBoost,
  skipBoost,
  selectChar,
  removeChar,
  skipQuestion,
  revive,
  returnHome,
  playAgain,
  navigateToIdentity,
  navigateToProfile,
  navigateToGift,
  navigateToHome,
  startTimer,
  stopTimer,
  getRandomQuestions,
  getSessionTime,
  getEffectiveConsecutiveA,
  
  // 个人中心操作
  bindPhone,
  bindLocation,

  // 礼品操作
  claimGift,
  
  // API模式控制
  setApiMode,
  isApiMode,
  
  // 内部函数（测试用）
  onSessionEnd,
  checkDailySuccess,
  checkIdentityPromotion,
  applySessionStartResponse,
  applySessionEndResponse,
  applyLocalSessionEnd,
};
