/**
 * Canvas 2D 渲染器 - 猴哥成语大冲关 抖音小游戏版
 * 
 * 对齐文档：
 * - 《猴哥成语大冲关-功能文档 v1.0》
 * - 《猴哥成语大冲关-前端开发文档 v2.0》§4 页面功能说明
 * 
 * 页面（对齐文档路由）：
 * - 启动页 (LaunchPage) → 文档 §4.1
 * - 首页 (HomePage) → 文档 §4.2
 * - 答题页 (GamePage) → 文档 §4.3
 * - 身份晋升页 → 文档 §3
 * - 个人中心 (ProfilePage) → 文档 §4.4
 * - 礼品页 (GiftPage) → 文档 §4.5（二期占位）
 * 
 * 弹窗：时间双倍增益、单局通过、单局失败、每日冲关成功
 */

const { 
  state, setState,
  UserStatus, IdentityLevel, IDENTITY_NAMES, IDENTITY_ICONS, IDENTITY_THRESHOLDS,
  GameStatus, SessionResultFlag, getEffectiveConsecutiveA,
} = require('./game-state');

// ==================== 全局变量 ====================

let canvas = null;
let ctx = null;
let dpr = 1;
let screenW = 375;
let screenH = 812;
let safeTop = 20; // 安全区域高度

// 触摸区域注册表
const touchRegions = [];

function clearTouchRegions() {
  touchRegions.length = 0;
}

function addTouchRegion(x, y, w, h, callback) {
  touchRegions.push({ x, y, w, h, callback });
}

function hitTest(touchX, touchY) {
  for (let i = touchRegions.length - 1; i >= 0; i--) {
    const r = touchRegions[i];
    if (touchX >= r.x && touchX <= r.x + r.w && touchY >= r.y && touchY <= r.y + r.h) {
      r.callback();
      return true;
    }
  }
  return false;
}

// ==================== 颜色常量 ====================

const COLORS = {
  gold: '#D4A017',
  goldDark: '#B8860B',
  red: '#E84118',
  redDark: '#C23616',
  brown: '#5C3D1A',
  brownLight: '#9B7D4E',
  bgTop: '#FFF8E7',
  bgMid: '#FFE8C2',
  bgBot: '#FFD89B',
  white: '#FFFFFF',
  green: '#22C55E',
  greenDark: '#16A34A',
  errorRed: '#EF4444',
  purple: '#7C3AED',
  yellow400: '#FFD700',
  darkBg1: '#1a0a00',
  darkBg2: '#2C1810',
  darkBg3: '#3d1f10',
};

// ==================== 绘图工具函数 ====================

function drawRoundRect(x, y, w, h, r, fill, stroke, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
}

function drawGradientRect(x, y, w, h, r, colorStops, direction) {
  let grad;
  if (direction === 'horizontal') {
    grad = ctx.createLinearGradient(x, y, x + w, y);
  } else {
    grad = ctx.createLinearGradient(x, y, x, y + h + (direction === 'diagonal' ? w : 0));
  }
  colorStops.forEach(([offset, color]) => grad.addColorStop(offset, color));
  drawRoundRect(x, y, w, h, r, grad);
}

function drawText(text, x, y, options = {}) {
  const {
    fontSize = 14,
    color = COLORS.brown,
    fontWeight = 'normal',
    textAlign = 'left',
    baseline = 'top',
    maxWidth = null,
  } = options;
  // 免费商用字体回退链：思源黑体(Noto Sans SC) > 文泉驿微米黑 > 系统默认
  ctx.font = `${fontWeight} ${fontSize}px "Noto Sans SC", "WenQuanYi Micro Hei", "PingFang SC", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = textAlign;
  ctx.textBaseline = baseline;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

function drawCircle(cx, cy, r, fill, stroke, lineWidth) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
}

function drawButton(x, y, w, h, text, options = {}) {
  const {
    bgColor = COLORS.red,
    textColor = COLORS.white,
    fontSize = 16,
    fontWeight = 'bold',
    radius = 12,
    disabled = false,
  } = options;

  if (disabled) {
    drawRoundRect(x, y, w, h, radius, 'rgba(0,0,0,0.06)');
    drawText(text, x + w / 2, y + h / 2, { fontSize, color: COLORS.brownLight, fontWeight, textAlign: 'center', baseline: 'middle' });
    return;
  }

  // 纯色打底 + 渐变叠加（真机兼容）
  if (bgColor === COLORS.red) {
    drawRoundRect(x, y, w, h, radius, '#E84118');
    drawGradientRect(x, y, w, h, radius, [
      [0, '#FF6B35'], [0.5, '#E84118'], [1, '#C23616'],
    ], 'vertical');
  } else if (bgColor === COLORS.gold) {
    drawRoundRect(x, y, w, h, radius, '#C49512');
    drawGradientRect(x, y, w, h, radius, [
      [0, '#D4A017'], [1, '#B8860B'],
    ], 'vertical');
  } else {
    drawRoundRect(x, y, w, h, radius, bgColor);
  }

  // 光泽效果
  ctx.save();
  ctx.globalAlpha = 0.15;
  drawGradientRect(x, y, w, h / 2, radius, [
    [0, 'rgba(255,255,255,0.6)'], [1, 'transparent'],
  ], 'vertical');
  ctx.restore();

  drawText(text, x + w / 2, y + h / 2, { fontSize, color: textColor, fontWeight, textAlign: 'center', baseline: 'middle' });
}

// ==================== 背景绘制 ====================

function drawWarmBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, screenH);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(0.5, COLORS.bgMid);
  grad.addColorStop(1, COLORS.bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, screenW, screenH);

  ctx.save();
  ctx.globalAlpha = 0.12;
  const g1 = ctx.createRadialGradient(screenW * 0.85, 0, 0, screenW * 0.85, 0, 160);
  g1.addColorStop(0, '#FFD700');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, screenW, 300);
  ctx.restore();
}

function drawDarkBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, screenH);
  grad.addColorStop(0, COLORS.darkBg1);
  grad.addColorStop(0.3, COLORS.darkBg2);
  grad.addColorStop(1, COLORS.darkBg3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, screenW, screenH);
}

// ==================== 启动页（对齐文档 §4.1 LaunchPage） ====================

function drawLaunchScreen() {
  drawWarmBackground();
  clearTouchRegions();

  const top = safeTop;

  // 游戏标题
  drawText('猴哥成语大冲关', screenW / 2, top + 120, {
    fontSize: 28, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center',
  });
  drawText('成语答题 + 每日冲关 + 身份晋升 + 月度礼品', screenW / 2, top + 165, {
    fontSize: 12, color: COLORS.brownLight, textAlign: 'center',
  });

  // 猴子图标
  drawCircle(screenW / 2, top + 260, 50, 'rgba(212,160,23,0.15)');
  drawText('🐵', screenW / 2, top + 260, { fontSize: 40, textAlign: 'center', baseline: 'middle' });

  // 健康游戏忠告（文档 §4.1 要求）
  drawRoundRect(30, screenH - 200, screenW - 60, 80, 10, 'rgba(255,255,255,0.6)', 'rgba(212,160,23,0.2)', 1);
  drawText('健康游戏忠告', screenW / 2, screenH - 190, {
    fontSize: 11, fontWeight: '600', color: COLORS.brown, textAlign: 'center',
  });
  drawText('抵制不良游戏，拒绝盗版游戏。', screenW / 2, screenH - 170, {
    fontSize: 10, color: COLORS.brownLight, textAlign: 'center',
  });
  drawText('注意自我保护，谨防受骗上当。', screenW / 2, screenH - 153, {
    fontSize: 10, color: COLORS.brownLight, textAlign: 'center',
  });

  // 非法用户提示（文档 §4.1：userStatus=2，全屏显示"非法用户，拒绝登录！"）
  if (state.userInfo.userStatus === UserStatus.ILLEGAL) {
    drawOverlay();
    drawRoundRect(30, screenH / 2 - 60, screenW - 60, 120, 16, '#FFF8E1', COLORS.errorRed, 2);
    drawText('非法用户，拒绝登录！', screenW / 2, screenH / 2 - 10, {
      fontSize: 18, fontWeight: 'bold', color: COLORS.errorRed, textAlign: 'center', baseline: 'middle',
    });
    return; // 非法用户无任何可点击区域
  }

  // 加载状态
  if (state.isLoading) {
    const btnY = top + 370;
    drawRoundRect(40, btnY, screenW - 80, 56, 16, 'rgba(255,255,255,0.6)');
    drawText(state.loadingText || '正在加载...', screenW / 2, btnY + 28, {
      fontSize: 16, color: COLORS.brown, textAlign: 'center', baseline: 'middle',
    });
    return;
  }

  // 进入游戏按钮
  const btnY = top + 370;
  drawButton(40, btnY, screenW - 80, 56, '进入游戏', {
    bgColor: COLORS.red, fontSize: 20, fontWeight: 'bold', radius: 16,
  });
  addTouchRegion(40, btnY, screenW - 80, 56, () => {
    const { initUser } = require('./game-state');
    initUser();
  });
}

// ==================== 首页（对齐文档 §4.2 HomePage） ====================

function drawHomeScreen() {
  drawWarmBackground();
  clearTouchRegions();

  const pad = 20;
  const contentW = screenW - pad * 2;
  const top = safeTop;
  const ui = state.userInfo;

  // 异常用户提示（文档 §8：醒目文字提示）
  if (ui.userStatus === UserStatus.ABNORMAL) {
    drawRoundRect(pad, top + 10, contentW, 36, 8, 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.3)', 1);
    drawText('你有异常行为，暂定增益功能和积分奖励！', screenW / 2, top + 28, {
      fontSize: 11, color: COLORS.errorRed, textAlign: 'center', baseline: 'middle',
    });
  }

  // ---- 顶部栏：身份 + 昵称 ----
  const headerY = ui.userStatus === UserStatus.ABNORMAL ? top + 56 : top + 20;
  drawCircle(pad + 20, headerY + 20, 20, 'rgba(212,160,23,0.15)');
  drawText(IDENTITY_ICONS[ui.identityLevel] || '📖', pad + 20, headerY + 20, {
    fontSize: 16, textAlign: 'center', baseline: 'middle',
  });
  drawText(ui.nickname, pad + 48, headerY + 10, { fontSize: 14, color: COLORS.brown, fontWeight: '600' });
  drawText(IDENTITY_NAMES[ui.identityLevel] || '书生', pad + 48, headerY + 30, {
    fontSize: 11, color: COLORS.gold,
  });

  // ---- 总积分卡片 ----
  const cardY = headerY + 56;
  const cardH = 100;
  drawRoundRect(pad, cardY, contentW, cardH, 16, '#B8860B');
  drawGradientRect(pad, cardY, contentW, cardH, 16, [
    [0, '#D4A017'], [0.5, '#B8860B'], [1, '#996515'],
  ], 'diagonal');

  drawText('总积分', pad + 20, cardY + 18, { fontSize: 13, color: 'rgba(255,255,255,0.8)' });
  drawText(String(ui.totalPoints), pad + 20, cardY + 50, { fontSize: 30, color: COLORS.white, fontWeight: 'bold' });

  // ---- 当日冲关进度（使用修复后的连续A计算） ----
  const consecutiveA = getEffectiveConsecutiveA(state.dailyStatus.sessionResults);
  drawCircle(pad + contentW - 40, cardY + 50, 24, 'rgba(255,255,255,0.2)');
  drawText('🔥', pad + contentW - 40, cardY + 42, { fontSize: 20, textAlign: 'center', baseline: 'middle' });
  drawText(`连续${consecutiveA}局`, pad + contentW - 40, cardY + 72, {
    fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
  });

  // ---- 每日冲关进度 ----
  const taskY = cardY + 116;
  const taskH = 90;
  drawRoundRect(pad, taskY, contentW, taskH, 16, 'rgba(255,255,255,0.8)', 'rgba(212,160,23,0.2)', 1);
  drawText('⭐ 每日冲关', pad + 16, taskY + 16, { fontSize: 13, fontWeight: '600', color: COLORS.brown });
  drawText(`${consecutiveA}/5局`, pad + contentW - 16, taskY + 16, {
    fontSize: 13, fontWeight: 'bold', color: COLORS.gold, textAlign: 'right',
  });

  // 进度条
  const barY = taskY + 42;
  drawRoundRect(pad + 16, barY, contentW - 32, 12, 6, 'rgba(212,160,23,0.15)');
  const fillW = (contentW - 32) * (consecutiveA / 5);
  if (fillW > 0) {
    drawGradientRect(pad + 16, barY, fillW, 12, 6, [[0, '#FFD700'], [1, '#FFA500']], 'horizontal');
  }
  drawText(state.dailyStatus.dailyPassed ? '今日冲关成功！' : `再连赢${Math.max(0, 5 - consecutiveA)}局即可冲关成功`, pad + 16, barY + 18, {
    fontSize: 11, color: COLORS.brownLight,
  });

  // ---- 开始游戏按钮（文档文案："开始游戏"） ----
  const btnY = taskY + 120;
  const btnH = 56;
  const canPlay = ui.userStatus !== UserStatus.ILLEGAL;
  drawButton(pad, btnY, contentW, btnH, '开始游戏  →', {
    bgColor: COLORS.red, fontSize: 20, fontWeight: 'bold', radius: 16, disabled: !canPlay,
  });
  if (canPlay) {
    addTouchRegion(pad, btnY, contentW, btnH, () => {
      const { startChallenge } = require('./game-state');
      startChallenge();
    });
  }

  // ---- 身份晋升入口 ----
  const identityY = btnY + 76;
  const identityH = 76;
  drawRoundRect(pad, identityY, contentW, identityH, 16, '#3A2010');
  drawGradientRect(pad, identityY, contentW, identityH, 16, [
    [0, '#2C1810'], [1, '#4A2512'],
  ], 'diagonal');
  ctx.strokeStyle = 'rgba(212,160,23,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawCircle(pad + 36, identityY + 38, 20, 'rgba(212,160,23,0.3)');
  drawText(IDENTITY_ICONS[ui.identityLevel] || '📖', pad + 36, identityY + 38, {
    fontSize: 18, textAlign: 'center', baseline: 'middle',
  });
  drawText('身份晋升 · 月度礼品', pad + 68, identityY + 20, { fontSize: 14, fontWeight: '600', color: COLORS.yellow400 });
  drawText(`本月${state.monthlyPassedDays}天 · ${IDENTITY_NAMES[ui.identityLevel]}`, pad + 68, identityY + 42, {
    fontSize: 11, color: '#CA8A04',
  });
  drawText('→', screenW - pad - 20, identityY + 38, { fontSize: 16, color: '#CA8A04', textAlign: 'center', baseline: 'middle' });

  addTouchRegion(pad, identityY, contentW, identityH, () => {
    const { navigateToIdentity } = require('./game-state');
    navigateToIdentity();
  });

  // ---- 底部操作栏 ----
  const bottomY = screenH - 90;

  // 个人中心按钮（文档 §4.4 ProfilePage）
  const profileBtnW = (contentW - 10) / 2;
  drawRoundRect(pad, bottomY, profileBtnW, 44, 10, 'rgba(255,255,255,0.6)', 'rgba(212,160,23,0.2)', 1);
  drawText('👤 个人中心', pad + profileBtnW / 2, bottomY + 22, {
    fontSize: 13, fontWeight: '600', color: COLORS.brown, textAlign: 'center', baseline: 'middle',
  });
  addTouchRegion(pad, bottomY, profileBtnW, 44, () => {
    const { navigateToProfile } = require('./game-state');
    navigateToProfile();
  });

  // 礼品页按钮（文档 §4.5 GiftPage 二期占位）
  const giftBtnX = pad + profileBtnW + 10;
  drawRoundRect(giftBtnX, bottomY, profileBtnW, 44, 10, 'rgba(255,255,255,0.6)', 'rgba(212,160,23,0.2)', 1);
  drawText('🎁 礼品中心', giftBtnX + profileBtnW / 2, bottomY + 22, {
    fontSize: 13, fontWeight: '600', color: COLORS.brown, textAlign: 'center', baseline: 'middle',
  });
  addTouchRegion(giftBtnX, bottomY, profileBtnW, 44, () => {
    const { navigateToGift } = require('./game-state');
    navigateToGift();
  });

  // ---- 底部信息 ----
  const maxReached = state.dailyStatus.maxSessionsReached;
  drawText(
    maxReached ? '今日已达30局上限，继续玩不获积分' : `今日已玩${state.dailyStatus.totalSessions}/30局`,
    screenW / 2, screenH - 36, { fontSize: 11, color: COLORS.brownLight, textAlign: 'center' }
  );
}

// ==================== 答题页（对齐文档 §4.3 GamePage） ====================

function drawGameScreen() {
  drawWarmBackground();
  clearTouchRegions();

  const pad = 16;
  const contentW = screenW - pad * 2;
  const top = safeTop;
  const currentQ = state.questions[state.currentQuestionIndex];
  if (!currentQ) return;

  // ---- 顶部状态栏 ----
  // 返回按钮
  drawRoundRect(pad, top + 16, 36, 36, 18, 'rgba(255,255,255,0.5)');
  drawText('←', pad + 18, top + 34, { fontSize: 16, color: COLORS.brown, textAlign: 'center', baseline: 'middle' });
  addTouchRegion(pad, top + 16, 36, 36, () => {
    const { returnHome } = require('./game-state');
    returnHome();
  });

  // 得分
  drawRoundRect(screenW - pad - 120, top + 16, 56, 44, 10, 'rgba(255,255,255,0.5)');
  drawText('得分', screenW - pad - 92, top + 24, { fontSize: 10, color: COLORS.brownLight, textAlign: 'center' });
  drawText(String(state.currentScore), screenW - pad - 92, top + 40, { fontSize: 18, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' });

  // 跳过次数
  drawRoundRect(screenW - pad - 56, top + 16, 48, 44, 10, 'rgba(255,255,255,0.5)');
  drawText('跳过', screenW - pad - 32, top + 24, { fontSize: 10, color: COLORS.brownLight, textAlign: 'center' });
  drawText(String(state.skipCount), screenW - pad - 32, top + 40, { fontSize: 18, fontWeight: 'bold', color: state.skipCount > 0 ? COLORS.brown : '#CCC', textAlign: 'center' });

  // ---- 答对进度 ----
  const progressY = top + 68;
  drawText(`第${state.currentQuestionIndex + 1}/5题`, screenW / 2, progressY, { fontSize: 12, color: COLORS.brownLight, textAlign: 'center' });
  const dotStartX = screenW / 2 - 80;
  for (let i = 0; i < 5; i++) {
    const dotX = dotStartX + i * 36;
    if (i < state.correctCount) {
      drawGradientRect(dotX, progressY + 18, 28, 8, 4, [[0, '#FFD700'], [1, '#FFA500']], 'horizontal');
    } else {
      drawRoundRect(dotX, progressY + 18, 28, 8, 4, 'rgba(0,0,0,0.08)');
    }
  }

  // ---- 倒计时 ----
  const timerCX = screenW / 2;
  const timerCY = top + 170;
  const timerR = 52;
  const isWarning = state.timer <= 3 && state.timer > 0;
  const timerColor = isWarning ? COLORS.errorRed : COLORS.gold;
  const timerPct = state.timer / state.maxTime;

  ctx.beginPath();
  ctx.arc(timerCX, timerCY, timerR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(timerCX, timerCY, timerR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPct);
  ctx.strokeStyle = timerColor;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  drawText(String(state.timer), timerCX, timerCY - 8, {
    fontSize: 42, fontWeight: 'bold', color: isWarning ? COLORS.errorRed : COLORS.brown, textAlign: 'center', baseline: 'middle',
  });
  drawText('秒', timerCX, timerCY + 22, { fontSize: 11, color: isWarning ? COLORS.errorRed : COLORS.brownLight, textAlign: 'center' });

  if (isWarning) {
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(state.animTime * 4);
    ctx.beginPath();
    ctx.arc(timerCX, timerCY, timerR + 8, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.errorRed;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // ---- 提示区 ----
  const hintY = top + 240;
  drawRoundRect(pad, hintY, contentW, 56, 10, 'rgba(212,160,23,0.08)', 'rgba(212,160,23,0.15)', 1);
  drawText('💡', pad + 16, hintY + 16, { fontSize: 16 });
  drawText('提示', pad + 40, hintY + 10, { fontSize: 11, fontWeight: '600', color: COLORS.brownLight });
  const meaning = currentQ.meaning || '';
  drawText(meaning, pad + 40, hintY + 28, { fontSize: 13, color: COLORS.brown, maxWidth: contentW - 60 });

  // ---- 成语填空区 ----
  const slotsY = top + 340;
  const slotSize = 64;
  const slotGap = 12;
  const slotsW = slotSize * 4 + slotGap * 3;
  const slotsX = (screenW - slotsW) / 2;
  const shakeX = state.isShaking ? Math.sin(state.animTime * 40) * 6 : 0;

  for (let i = 0; i < 4; i++) {
    const sx = slotsX + i * (slotSize + slotGap) + shakeX;
    const char = state.selectedChars[i];
    const borderColor = state.isAnswerCorrect === true ? COLORS.green :
                        state.isAnswerCorrect === false ? COLORS.errorRed :
                        char ? COLORS.gold : 'rgba(212,160,23,0.4)';

    drawRoundRect(sx, slotsY, slotSize, slotSize, 14,
      char ? COLORS.white : 'rgba(255,255,255,0.6)',
      borderColor, 2
    );

    if (char) {
      drawText(char, sx + slotSize / 2, slotsY + slotSize / 2, {
        fontSize: 24, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center', baseline: 'middle',
      });
      addTouchRegion(sx, slotsY, slotSize, slotSize, () => {
        const { removeChar } = require('./game-state');
        removeChar(i);
      });
    }
  }

  // 积分浮动动画
  if (state.scorePopup) {
    ctx.save();
    ctx.globalAlpha = state.scorePopup.opacity;
    drawText(state.scorePopup.text, screenW / 2, slotsY - 20 - (1 - state.scorePopup.opacity) * 30, {
      fontSize: 16, fontWeight: 'bold', color: COLORS.green, textAlign: 'center',
    });
    ctx.restore();
  }

  // ---- 候选字区域 ----
  const optsY = top + 440;
  const optSize = 64;
  const optGap = 12;
  const cols = Math.min(state.shuffledOptions.length, 4);
  const optsW = optSize * cols + optGap * (cols - 1);
  const optsStartX = (screenW - optsW) / 2;

  for (let i = 0; i < state.shuffledOptions.length; i++) {
    const char = state.shuffledOptions[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const ox = optsStartX + col * (optSize + optGap);
    const oy = optsY + row * (optSize + optGap);

    if (!char) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      drawRoundRect(ox, oy, optSize, optSize, 14, 'rgba(0,0,0,0.06)');
      ctx.restore();
    } else {
      drawRoundRect(ox, oy, optSize, optSize, 14, '#C49512');
      drawGradientRect(ox, oy, optSize, optSize, 14, [
        [0, '#D4A017'], [1, '#B8860B'],
      ], 'vertical');
      drawText(char, ox + optSize / 2, oy + optSize / 2, {
        fontSize: 24, fontWeight: 'bold', color: COLORS.white, textAlign: 'center', baseline: 'middle',
      });
      addTouchRegion(ox, oy, optSize, optSize, () => {
        const { selectChar } = require('./game-state');
        selectChar(char, i);
      });
    }
  }

  // ---- 跳过按钮 ----
  const skipY = screenH - 100;
  drawRoundRect(pad, skipY, contentW, 48, 12,
    state.skipCount > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.04)',
    state.skipCount > 0 ? 'rgba(212,160,23,0.2)' : 'rgba(0,0,0,0.06)', 1
  );
  drawText(`⏭ 跳过本题（剩余${state.skipCount}次）`, screenW / 2, skipY + 24, {
    fontSize: 14, fontWeight: '600', color: state.skipCount > 0 ? COLORS.brown : '#CCC', textAlign: 'center', baseline: 'middle',
  });
  if (state.skipCount > 0) {
    addTouchRegion(pad, skipY, contentW, 48, () => {
      const { skipQuestion } = require('./game-state');
      skipQuestion();
    });
  }
}

// ==================== 弹窗绘制 ====================

function drawOverlay() {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, screenW, screenH);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** 时间双倍增益弹窗（对齐文档 §4.1 时间双倍卡） */
function drawBoostDialog() {
  if (!state.showBoostDialog) return;
  drawOverlay();
  clearTouchRegions();

  ctx.save();
  ctx.globalAlpha = 1;

  const pad = 20;
  const dialogW = screenW - pad * 2;
  const dialogH = 380;
  const dialogX = pad;
  const dialogY = (screenH - dialogH) / 2;

  // 异常用户提示（文档 §8：异常用户点击增益功能时弹出提示）
  if (state.userInfo.userStatus === UserStatus.ABNORMAL) {
    drawRoundRect(dialogX, dialogY, dialogW, 120, 20, '#FFF8E1', COLORS.errorRed, 2);
    drawText('你有异常行为', dialogX + dialogW / 2, dialogY + 30, { fontSize: 18, fontWeight: 'bold', color: COLORS.errorRed, textAlign: 'center' });
    drawText('暂定增益功能和积分奖励！', dialogX + dialogW / 2, dialogY + 55, { fontSize: 14, color: COLORS.brown, textAlign: 'center' });
    drawButton(dialogX + 16, dialogY + 80, dialogW - 32, 28, '知道了', { fontSize: 13, bgColor: '#999' });
    addTouchRegion(dialogX + 16, dialogY + 80, dialogW - 32, 28, () => {
      const { skipBoost } = require('./game-state');
      skipBoost();
    });
    ctx.restore();
    return;
  }

  drawRoundRect(dialogX, dialogY, dialogW, dialogH, 20, '#FFF8E1');
  drawGradientRect(dialogX, dialogY, dialogW, dialogH, 20, [
    [0, '#FFFDF5'], [1, '#FFF3D6'],
  ], 'vertical');

  // 顶部装饰条
  drawGradientRect(dialogX, dialogY, dialogW, 6, 0, [
    [0, '#FFD700'], [0.5, '#FFA500'], [1, '#FFD700'],
  ], 'horizontal');

  // 关闭按钮
  drawRoundRect(dialogX + dialogW - 40, dialogY + 12, 32, 32, 16, 'rgba(0,0,0,0.08)');
  drawText('✕', dialogX + dialogW - 24, dialogY + 28, { fontSize: 14, color: '#666', textAlign: 'center', baseline: 'middle' });
  addTouchRegion(dialogX + dialogW - 40, dialogY + 12, 32, 32, () => {
    const { skipBoost } = require('./game-state');
    skipBoost();
  });

  // 标题
  drawText('⚡', dialogX + dialogW / 2, dialogY + 50, { fontSize: 32, textAlign: 'center', baseline: 'middle' });
  drawText('时间双倍', dialogX + dialogW / 2, dialogY + 85, { fontSize: 20, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center' });
  drawText('观看视频，本局倒计时翻倍', dialogX + dialogW / 2, dialogY + 112, { fontSize: 13, color: COLORS.brownLight, textAlign: 'center' });

  // 增益效果卡片
  const cardY = dialogY + 136;
  drawRoundRect(dialogX + 16, cardY, dialogW - 32, 90, 14, 'rgba(212,160,23,0.08)', 'rgba(212,160,23,0.2)', 1);
  const baseTime = Math.max(6, 10 - state.sessionIndex);
  drawText('⏱ 时间翻倍', dialogX + 36, cardY + 16, { fontSize: 14, fontWeight: '600', color: COLORS.brown });
  drawText(`${baseTime}s → ${baseTime * 2}s`, dialogX + 36, cardY + 40, { fontSize: 22, fontWeight: 'bold', color: COLORS.gold });
  drawText(`本局倒计时翻倍至${baseTime * 2}秒`, dialogX + 36, cardY + 68, { fontSize: 11, color: COLORS.brownLight });
  drawRoundRect(dialogX + dialogW - 80, cardY + 20, 48, 48, 10, '#C49512');
  drawGradientRect(dialogX + dialogW - 80, cardY + 20, 48, 48, 10, [[0, '#FFD700'], [1, '#FFA500']], 'diagonal');
  drawText('2x', dialogX + dialogW - 56, cardY + 44, { fontSize: 18, fontWeight: 'bold', color: COLORS.white, textAlign: 'center', baseline: 'middle' });

  // 看视频获取按钮（对齐文档 §7：广告完整观看后才确认）
  const btnY = cardY + 106;
  const adsRemaining = state.timeDoubleRemaining;
  const canWatchAd = adsRemaining > 0;
  if (canWatchAd) {
    drawButton(dialogX + 16, btnY, dialogW - 32, 48, `▶ 看视频获取（今日剩余${adsRemaining}次）`, {
      bgColor: COLORS.gold, fontSize: 15, fontWeight: 'bold',
    });
    addTouchRegion(dialogX + 16, btnY, dialogW - 32, 48, () => {
      const { useBoost } = require('./game-state');
      useBoost();
    });
  } else {
    drawRoundRect(dialogX + 16, btnY, dialogW - 32, 48, 12, 'rgba(0,0,0,0.06)');
    drawText('今日视频次数已用完', dialogX + dialogW / 2, btnY + 24, { fontSize: 15, fontWeight: 'bold', color: COLORS.brownLight, textAlign: 'center', baseline: 'middle' });
  }

  // 跳过按钮
  drawText('跳过，直接开始', dialogX + dialogW / 2, btnY + 68, { fontSize: 13, fontWeight: '600', color: COLORS.brownLight, textAlign: 'center' });
  addTouchRegion(dialogX + dialogW / 2 - 60, btnY + 54, 120, 28, () => {
    const { skipBoost } = require('./game-state');
    skipBoost();
  });

  ctx.restore();
}

/** 单局通过弹窗 */
function drawVictoryDialog() {
  if (!state.showVictoryDialog) return;
  drawOverlay();
  clearTouchRegions();

  ctx.save();
  ctx.globalAlpha = 1;

  const pad = 20;
  const dialogW = screenW - pad * 2;
  const dialogH = 420;
  const dialogX = pad;
  const dialogY = (screenH - dialogH) / 2;

  drawRoundRect(dialogX, dialogY, dialogW, dialogH, 20, '#FFF8E1');
  drawGradientRect(dialogX, dialogY, dialogW, dialogH, 20, [
    [0, '#FFFDF5'], [1, '#FFF3D6'],
  ], 'vertical');

  drawGradientRect(dialogX, dialogY, dialogW, 6, 0, [
    [0, '#22C55E'], [0.5, '#4ADE80'], [1, '#22C55E'],
  ], 'horizontal');

  drawCircle(dialogX + dialogW / 2, dialogY + 60, 36, '#22C55E');
  drawText('🎉', dialogX + dialogW / 2, dialogY + 60, { fontSize: 30, textAlign: 'center', baseline: 'middle' });

  drawText('本局通过！', dialogX + dialogW / 2, dialogY + 115, { fontSize: 22, fontWeight: 'bold', color: COLORS.greenDark, textAlign: 'center' });
  drawText(`连续答对5题，获得${state.currentScore}积分`, dialogX + dialogW / 2, dialogY + 142, { fontSize: 13, color: COLORS.brownLight, textAlign: 'center' });

  // 积分
  drawRoundRect(dialogX + 16, dialogY + 165, dialogW - 32, 56, 12, 'rgba(34,197,94,0.08)', 'rgba(34,197,94,0.15)', 1);
  drawText('本局获得积分', dialogX + 36, dialogY + 180, { fontSize: 13, color: COLORS.brownLight });
  drawText(`+${state.currentScore}`, dialogX + dialogW - 36, dialogY + 193, { fontSize: 22, fontWeight: 'bold', color: COLORS.gold, textAlign: 'right' });

  // 冲关进度（使用修复后的连续A计算）
  const consecutiveA = getEffectiveConsecutiveA(state.dailyStatus.sessionResults);
  drawRoundRect(dialogX + 16, dialogY + 233, dialogW - 32, 60, 12, 'rgba(255,255,255,0.6)', 'rgba(212,160,23,0.1)', 1);
  drawText('🏆 每日冲关进度', dialogX + 36, dialogY + 248, { fontSize: 12, fontWeight: '500', color: COLORS.brown });
  const barX = dialogX + 36;
  const barW = dialogW - 120;
  drawRoundRect(barX, dialogY + 268, barW, 10, 5, 'rgba(212,160,23,0.12)');
  const fillW = barW * (consecutiveA / 5);
  if (fillW > 0) drawGradientRect(barX, dialogY + 268, fillW, 10, 5, [[0, '#FFD700'], [1, '#FFA500']], 'horizontal');
  drawText(`${consecutiveA}/5`, dialogX + dialogW - 36, dialogY + 273, { fontSize: 12, fontWeight: 'bold', color: COLORS.gold, textAlign: 'right' });

  // 继续挑战按钮
  const btn1Y = dialogY + 310;
  drawButton(dialogX + 16, btn1Y, dialogW - 32, 48, '🔄 继续挑战', {
    bgColor: COLORS.red, fontSize: 15, fontWeight: 'bold',
  });
  addTouchRegion(dialogX + 16, btn1Y, dialogW - 32, 48, () => {
    const { playAgain } = require('./game-state');
    playAgain();
  });

  const btn2Y = btn1Y + 58;
  drawText('🏠 返回首页', dialogX + dialogW / 2, btn2Y + 14, { fontSize: 13, fontWeight: '600', color: COLORS.brownLight, textAlign: 'center' });
  addTouchRegion(dialogX + dialogW / 2 - 60, btn2Y, 120, 28, () => {
    const { returnHome } = require('./game-state');
    returnHome();
  });

  ctx.restore();
}

/** 单局失败弹窗（对齐文档：复活机会每日2次，canRevive由后端返回） */
function drawFailureDialog() {
  if (!state.showFailureDialog) return;
  drawOverlay();
  clearTouchRegions();

  ctx.save();
  ctx.globalAlpha = 1;

  const pad = 20;
  const dialogW = screenW - pad * 2;
  const dialogH = 440;
  const dialogX = pad;
  const dialogY = (screenH - dialogH) / 2;

  drawRoundRect(dialogX, dialogY, dialogW, dialogH, 20, '#FFF8E1');
  drawGradientRect(dialogX, dialogY, dialogW, dialogH, 20, [
    [0, '#FFFDF5'], [1, '#FFF3D6'],
  ], 'vertical');

  drawGradientRect(dialogX, dialogY, dialogW, 6, 0, [
    [0, '#EF4444'], [0.5, '#F87171'], [1, '#EF4444'],
  ], 'horizontal');

  drawCircle(dialogX + dialogW / 2, dialogY + 60, 36, '#EF4444');
  drawText('😞', dialogX + dialogW / 2, dialogY + 60, { fontSize: 30, textAlign: 'center', baseline: 'middle' });

  drawText('时间到！', dialogX + dialogW / 2, dialogY + 115, { fontSize: 22, fontWeight: 'bold', color: '#DC2626', textAlign: 'center' });
  drawText('很遗憾，未能连续答对5题', dialogX + dialogW / 2, dialogY + 142, { fontSize: 13, color: COLORS.brownLight, textAlign: 'center' });

  // 积分保留
  drawRoundRect(dialogX + 16, dialogY + 165, dialogW - 32, 56, 12, 'rgba(255,255,255,0.6)', 'rgba(212,160,23,0.1)', 1);
  drawText('本局积分已保留', dialogX + 36, dialogY + 178, { fontSize: 13, color: COLORS.brownLight });
  drawText('积分不会扣除，继续加油！', dialogX + 36, dialogY + 196, { fontSize: 10, color: '#B8926E' });
  drawText(`+${state.currentScore}`, dialogX + dialogW - 36, dialogY + 193, { fontSize: 20, fontWeight: 'bold', color: COLORS.gold, textAlign: 'right' });

  // 复活选项（对齐文档：canRevive 由后端 SessionEndResponse 返回，异常用户禁止）
  const canRevive = state.canRevive && state.userInfo.userStatus !== UserStatus.ABNORMAL;
  const reviveY = dialogY + 236;

  if (canRevive) {
    drawRoundRect(dialogX + 16, reviveY, dialogW - 32, 90, 12, 'rgba(212,160,23,0.08)', 'rgba(212,160,23,0.15)', 1);
    drawText('⏱ 看视频复活', dialogX + 36, reviveY + 16, { fontSize: 13, fontWeight: '500', color: COLORS.brown });
    drawText('观看视频广告后，跳过本局开始下一局', dialogX + 36, reviveY + 36, { fontSize: 10, color: COLORS.brownLight });
    drawButton(dialogX + 28, reviveY + 52, dialogW - 56, 32, `▶ 看视频复活（今日剩余${state.reviveRemaining}次）`, {
      bgColor: COLORS.gold, fontSize: 12, fontWeight: 'bold',
    });
    addTouchRegion(dialogX + 28, reviveY + 52, dialogW - 56, 32, () => {
      const { revive } = require('./game-state');
      revive();
    });
  } else if (state.userInfo.userStatus === UserStatus.ABNORMAL) {
    // 异常用户提示
    drawRoundRect(dialogX + 16, reviveY, dialogW - 32, 40, 12, 'rgba(239,68,68,0.08)');
    drawText('异常用户暂无法使用复活功能', dialogX + dialogW / 2, reviveY + 20, { fontSize: 13, color: COLORS.brownLight, textAlign: 'center', baseline: 'middle' });
  } else {
    drawRoundRect(dialogX + 16, reviveY, dialogW - 32, 40, 12, 'rgba(0,0,0,0.04)');
    drawText('今日复活次数已用完', dialogX + dialogW / 2, reviveY + 20, { fontSize: 13, color: COLORS.brownLight, textAlign: 'center', baseline: 'middle' });
  }

  // 再来一局
  const btn1Y = reviveY + 100;
  drawButton(dialogX + 16, btn1Y, dialogW - 32, 48, '🔄 再来一局', {
    bgColor: COLORS.red, fontSize: 15, fontWeight: 'bold',
  });
  addTouchRegion(dialogX + 16, btn1Y, dialogW - 32, 48, () => {
    const { playAgain } = require('./game-state');
    playAgain();
  });

  const btn2Y = btn1Y + 58;
  drawText('🏠 返回首页', dialogX + dialogW / 2, btn2Y + 14, { fontSize: 13, fontWeight: '600', color: COLORS.brownLight, textAlign: 'center' });
  addTouchRegion(dialogX + dialogW / 2 - 60, btn2Y, 120, 28, () => {
    const { returnHome } = require('./game-state');
    returnHome();
  });

  ctx.restore();
}

/** 每日冲关成功弹窗 */
function drawDailySuccessDialog() {
  if (!state.showDailySuccessDialog) return;
  drawOverlay();
  clearTouchRegions();

  ctx.save();
  ctx.globalAlpha = 1;

  const pad = 20;
  const dialogW = screenW - pad * 2;
  const dialogH = 360;
  const dialogX = pad;
  const dialogY = (screenH - dialogH) / 2;

  drawRoundRect(dialogX, dialogY, dialogW, dialogH, 20, '#FFF8E1');
  drawGradientRect(dialogX, dialogY, dialogW, dialogH, 20, [
    [0, '#FFFDF5'], [1, '#FFF3D6'],
  ], 'vertical');

  drawGradientRect(dialogX, dialogY, dialogW, 6, 0, [
    [0, '#FFD700'], [0.5, '#FFA500'], [1, '#FFD700'],
  ], 'horizontal');

  drawCircle(dialogX + dialogW / 2, dialogY + 55, 36, COLORS.gold);
  drawText('🏆', dialogX + dialogW / 2, dialogY + 55, { fontSize: 30, textAlign: 'center', baseline: 'middle' });

  drawText('今日冲关成功！', dialogX + dialogW / 2, dialogY + 110, { fontSize: 22, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center' });
  drawText('连续通过5局，太厉害了！', dialogX + dialogW / 2, dialogY + 138, { fontSize: 13, color: COLORS.brownLight, textAlign: 'center' });

  // 身份晋升 + 礼品信息（对齐文档 §3 + §5：每月可领取对应礼品）
  const currentLevelName = IDENTITY_NAMES[state.userInfo.identityLevel];
  drawRoundRect(dialogX + 16, dialogY + 165, dialogW - 32, 100, 12, 'rgba(212,160,23,0.08)', 'rgba(212,160,23,0.2)', 1);
  drawText('当前身份', dialogX + 36, dialogY + 180, { fontSize: 13, color: COLORS.brownLight });
  drawText(`${IDENTITY_ICONS[state.userInfo.identityLevel]} ${currentLevelName}`, dialogX + 36, dialogY + 205, { fontSize: 18, fontWeight: 'bold', color: COLORS.gold });
  drawText(`本月${state.monthlyPassedDays}天`, dialogX + dialogW - 36, dialogY + 200, { fontSize: 12, color: COLORS.brownLight, textAlign: 'right' });
  drawText('🎁 可领取月度礼品（抖音小店优惠券）', dialogX + 36, dialogY + 238, { fontSize: 11, color: COLORS.gold });

  // 返回首页按钮
  const btnY = dialogY + 290;
  drawButton(dialogX + 16, btnY, dialogW - 32, 48, '🏠 返回首页', {
    bgColor: COLORS.red, fontSize: 15, fontWeight: 'bold',
  });
  addTouchRegion(dialogX + 16, btnY, dialogW - 32, 48, () => {
    const { returnHome } = require('./game-state');
    returnHome();
  });

  const btn2Y = btnY + 58;
  drawText('🔄 继续挑战', dialogX + dialogW / 2, btn2Y + 14, { fontSize: 13, fontWeight: '600', color: COLORS.brownLight, textAlign: 'center' });
  addTouchRegion(dialogX + dialogW / 2 - 60, btn2Y, 120, 28, () => {
    const { playAgain } = require('./game-state');
    setState({ showDailySuccessDialog: false });
    playAgain();
  });

  ctx.restore();
}

// ==================== 身份晋升页（对齐文档 §3） ====================

function drawIdentityScreen() {
  drawDarkBackground();
  clearTouchRegions();

  const pad = 16;
  const contentW = screenW - pad * 2;
  const top = safeTop;
  const ui = state.userInfo;

  // ---- 顶部导航 ----
  drawRoundRect(pad, top + 16, 36, 36, 18, 'rgba(255,255,255,0.1)');
  drawText('←', pad + 18, top + 34, { fontSize: 16, color: COLORS.yellow400, textAlign: 'center', baseline: 'middle' });
  addTouchRegion(pad, top + 16, 36, 36, () => {
    const { navigateToHome } = require('./game-state');
    navigateToHome();
  });
  drawText('🏆 身份晋升', screenW / 2, top + 34, { fontSize: 18, fontWeight: 'bold', color: COLORS.yellow400, textAlign: 'center', baseline: 'middle' });

  // ---- 月度进度 ----
  const progressY = top + 68;
  drawRoundRect(pad, progressY, contentW, 80, 14, 'rgba(212,160,23,0.08)', 'rgba(212,160,23,0.2)', 1);
  drawText('✨ 本月冲关天数', pad + 16, progressY + 16, { fontSize: 13, fontWeight: '600', color: '#FDE68A' });
  drawText(`${state.monthlyPassedDays}/30天`, pad + contentW - 16, progressY + 16, { fontSize: 13, fontWeight: 'bold', color: COLORS.yellow400, textAlign: 'right' });

  // 进度条
  const barY = progressY + 42;
  drawRoundRect(pad + 16, barY, contentW - 32, 10, 5, 'rgba(255,255,255,0.08)');
  const fillW = (contentW - 32) * (state.monthlyPassedDays / 30);
  if (fillW > 0) {
    drawGradientRect(pad + 16, barY, fillW, 10, 5, [[0, '#FFD700'], [1, '#FFA500']], 'horizontal');
  }
  drawText(`当前身份：${IDENTITY_NAMES[ui.identityLevel]}`, pad + 16, barY + 16, { fontSize: 10, color: '#CA8A04' });

  // ---- 身份等级列表 ----
  const listY = progressY + 100;
  drawRoundRect(pad, listY, contentW, IDENTITY_NAMES.length * 58 + 44, 14, 'rgba(255,255,255,0.05)', 'rgba(212,160,23,0.15)', 1);
  drawText('身份等级 · 月度礼品', pad + 16, listY + 16, { fontSize: 13, fontWeight: '600', color: '#FDE68A' });

  // 礼品配置（对齐文档 §5：根据身份等级，每月可领取对应礼品）
  const giftMap = ['5元优惠券', '10元优惠券', '15元优惠券', '20元优惠券', '30元优惠券', '50元优惠券', '80元优惠券', '100元优惠券'];

  for (let i = 0; i < IDENTITY_NAMES.length; i++) {
    const py = listY + 38 + i * 58;
    const isCurrent = i === ui.identityLevel;
    const isUnlocked = state.monthlyPassedDays >= IDENTITY_THRESHOLDS[i];
    
    // 背景高亮当前等级
    if (isCurrent) {
      drawRoundRect(pad + 8, py - 4, contentW - 16, 54, 8, 'rgba(212,160,23,0.12)');
    }

    // 图标
    drawCircle(pad + 28, py + 18, 14, isUnlocked ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)');
    drawText(IDENTITY_ICONS[i], pad + 28, py + 18, { fontSize: 14, textAlign: 'center', baseline: 'middle' });

    // 名称
    const nameColor = isCurrent ? '#FFD700' : isUnlocked ? '#FDE68A' : 'rgba(255,255,255,0.3)';
    drawText(IDENTITY_NAMES[i], pad + 52, py + 8, { fontSize: 14, fontWeight: isCurrent ? 'bold' : '500', color: nameColor });

    // 条件 + 礼品（对齐文档 §3 + §5）
    drawText(`需${IDENTITY_THRESHOLDS[i]}天 · 抖音小店${giftMap[i]}`, pad + 52, py + 28, { fontSize: 10, color: 'rgba(255,255,255,0.4)' });

    // 状态标识
    if (isCurrent) {
      drawText('当前', pad + contentW - 16, py + 18, { fontSize: 11, fontWeight: 'bold', color: '#FFD700', textAlign: 'right', baseline: 'middle' });
    } else if (isUnlocked) {
      drawText('已达成', pad + contentW - 16, py + 18, { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right', baseline: 'middle' });
    } else {
      drawText(`差${IDENTITY_THRESHOLDS[i] - state.monthlyPassedDays}天`, pad + contentW - 16, py + 18, { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'right', baseline: 'middle' });
    }
  }
}

// ==================== 个人中心页（对齐文档 §4.4 ProfilePage） ====================

function drawProfileScreen() {
  drawWarmBackground();
  clearTouchRegions();

  const pad = 16;
  const contentW = screenW - pad * 2;
  const top = safeTop;
  const ui = state.userInfo;

  // 返回按钮
  drawRoundRect(pad, top + 16, 36, 36, 18, 'rgba(255,255,255,0.5)');
  drawText('←', pad + 18, top + 34, { fontSize: 16, color: COLORS.brown, textAlign: 'center', baseline: 'middle' });
  addTouchRegion(pad, top + 16, 36, 36, () => {
    const { navigateToHome } = require('./game-state');
    navigateToHome();
  });
  drawText('个人中心', screenW / 2, top + 34, { fontSize: 18, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center', baseline: 'middle' });

  // 头像 + 昵称
  const profileY = top + 70;
  drawCircle(screenW / 2, profileY + 36, 36, 'rgba(212,160,23,0.15)');
  drawText(IDENTITY_ICONS[ui.identityLevel] || '📖', screenW / 2, profileY + 36, { fontSize: 28, textAlign: 'center', baseline: 'middle' });
  drawText(ui.nickname, screenW / 2, profileY + 82, { fontSize: 16, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center' });
  drawText(IDENTITY_NAMES[ui.identityLevel] + ' · 积分' + ui.totalPoints, screenW / 2, profileY + 104, { fontSize: 12, color: COLORS.brownLight, textAlign: 'center' });

  // 信息列表（对齐文档 §4.4 需展示的数据）
  const infoY = profileY + 130;
  const infoItems = [
    { label: '手机号', value: ui.mobile || '未绑定', action: 'bindPhone' },
    { label: '地区', value: ui.region || '未授权', action: 'bindLocation' },
    { label: '贡献值评级', value: ui.adContributionScore + '/10', action: null },
    { label: '身份等级', value: IDENTITY_NAMES[ui.identityLevel], action: null },
    { label: '总积分', value: String(ui.totalPoints), action: null },
  ];

  for (let i = 0; i < infoItems.length; i++) {
    const iy = infoY + i * 48;
    drawRoundRect(pad, iy, contentW, 44, 10, 'rgba(255,255,255,0.7)', 'rgba(212,160,23,0.1)', 1);
    drawText(infoItems[i].label, pad + 16, iy + 14, { fontSize: 13, color: COLORS.brown });
    drawText(infoItems[i].value, pad + contentW - 16, iy + 14, {
      fontSize: 13, color: infoItems[i].action ? COLORS.gold : COLORS.brown, textAlign: 'right',
    });
    if (infoItems[i].action) {
      drawText('>', pad + contentW - 30, iy + 14, { fontSize: 12, color: COLORS.brownLight, textAlign: 'right' });
      // 绑定操作（对齐文档 §4.4）
      addTouchRegion(pad, iy, contentW, 44, () => {
        const { bindPhone, bindLocation } = require('./game-state');
        if (infoItems[i].action === 'bindPhone') {
          bindPhone();
        } else if (infoItems[i].action === 'bindLocation') {
          bindLocation();
        }
      });
    }
  }

  // ---- 礼品领取历史记录（对齐文档 §4.4 + §5） ----
  const giftHistoryY = infoY + infoItems.length * 48 + 16;
  drawText('🎁 礼品领取记录', pad + 16, giftHistoryY, { fontSize: 14, fontWeight: '600', color: COLORS.brown });

  const giftHistory = state.giftClaimHistory || [];
  if (giftHistory.length === 0) {
    drawRoundRect(pad, giftHistoryY + 22, contentW, 48, 10, 'rgba(255,255,255,0.5)', 'rgba(212,160,23,0.1)', 1);
    drawText('暂无领取记录', screenW / 2, giftHistoryY + 46, { fontSize: 12, color: COLORS.brownLight, textAlign: 'center', baseline: 'middle' });
  } else {
    const gHistH = Math.min(giftHistory.length, 3) * 36 + 12;
    drawRoundRect(pad, giftHistoryY + 22, contentW, gHistH, 10, 'rgba(255,255,255,0.7)', 'rgba(212,160,23,0.1)', 1);
    for (let i = 0; i < Math.min(giftHistory.length, 3); i++) {
      const gItem = giftHistory[i];
      const gy = giftHistoryY + 28 + i * 36;
      drawText(gItem.name || '', pad + 16, gy + 10, { fontSize: 11, color: COLORS.brown });
      drawText(gItem.date || '', pad + contentW - 60, gy + 10, { fontSize: 10, color: COLORS.brownLight, textAlign: 'right' });
      drawText(gItem.status || '已领取', pad + contentW - 16, gy + 10, { fontSize: 10, color: COLORS.green, textAlign: 'right' });
    }
  }
}

// ==================== 礼品页（对齐文档 §4.5 GiftPage 二期占位） ====================

function drawGiftScreen() {
  drawWarmBackground();
  clearTouchRegions();

  const pad = 16;
  const contentW = screenW - pad * 2;
  const top = safeTop;

  // 返回按钮
  drawRoundRect(pad, top + 16, 36, 36, 18, 'rgba(255,255,255,0.5)');
  drawText('←', pad + 18, top + 34, { fontSize: 16, color: COLORS.brown, textAlign: 'center', baseline: 'middle' });
  addTouchRegion(pad, top + 16, 36, 36, () => {
    const { navigateToHome } = require('./game-state');
    navigateToHome();
  });
  drawText('🎁 礼品中心', screenW / 2, top + 34, { fontSize: 18, fontWeight: 'bold', color: COLORS.brown, textAlign: 'center', baseline: 'middle' });

  // ---- 当前身份信息 ----
  const infoY = top + 70;
  drawRoundRect(pad, infoY, contentW, 70, 12, 'rgba(212,160,23,0.08)', 'rgba(212,160,23,0.15)', 1);
  drawText('当前身份', pad + 16, infoY + 14, { fontSize: 12, color: COLORS.brownLight });
  drawText(`${IDENTITY_ICONS[state.userInfo.identityLevel]} ${IDENTITY_NAMES[state.userInfo.identityLevel]}`, pad + 16, infoY + 38, { fontSize: 16, fontWeight: 'bold', color: COLORS.gold });
  drawText(`本月${state.monthlyPassedDays}天冲关`, pad + contentW - 16, infoY + 40, { fontSize: 12, color: COLORS.brownLight, textAlign: 'right' });

  // ---- 当月可领取礼品列表（对齐文档 §4.5 + §5） ----
  const giftListY = infoY + 86;
  drawText('🎁 当月礼品', pad + 16, giftListY, { fontSize: 14, fontWeight: '600', color: COLORS.brown });
  drawText('每月可领取对应礼品', pad + contentW - 16, giftListY, { fontSize: 11, color: COLORS.brownLight, textAlign: 'right' });

  // 礼品列表：每个身份等级对应一个礼品（目前为抖音小店优惠券）
  const giftItems = [
    { level: '书生', icon: '📖', coupon: '5元优惠券', required: 0, desc: '需0天冲关' },
    { level: '童生', icon: '📝', coupon: '10元优惠券', required: 3, desc: '需3天冲关' },
    { level: '秀才', icon: '🎓', coupon: '15元优惠券', required: 7, desc: '需7天冲关' },
    { level: '举人', icon: '📜', coupon: '20元优惠券', required: 12, desc: '需12天冲关' },
    { level: '进士', icon: '🏮', coupon: '30元优惠券', required: 18, desc: '需18天冲关' },
    { level: '状元', icon: '👑', coupon: '50元优惠券', required: 25, desc: '需25天冲关' },
    { level: '太傅', icon: '🎭', coupon: '80元优惠券', required: 28, desc: '需28天冲关' },
    { level: '皇帝', icon: '🏆', coupon: '100元优惠券', required: 30, desc: '需30天冲关' },
  ];

  const itemH = 52;
  const listContentH = giftItems.length * itemH + 16;
  drawRoundRect(pad, giftListY + 22, contentW, listContentH, 14, 'rgba(255,255,255,0.7)', 'rgba(212,160,23,0.15)', 1);

  for (let i = 0; i < giftItems.length; i++) {
    const item = giftItems[i];
    const iy = giftListY + 30 + i * itemH;
    const isUnlocked = state.monthlyPassedDays >= item.required;
    const isCurrentLevel = IDENTITY_NAMES[state.userInfo.identityLevel] === item.level;

    // 当前等级高亮
    if (isCurrentLevel) {
      drawRoundRect(pad + 4, iy - 2, contentW - 8, itemH - 4, 8, 'rgba(212,160,23,0.1)');
    }

    // 图标
    drawCircle(pad + 24, iy + 18, 12, isUnlocked ? 'rgba(212,160,23,0.15)' : 'rgba(0,0,0,0.04)');
    drawText(item.icon, pad + 24, iy + 18, { fontSize: 12, textAlign: 'center', baseline: 'middle' });

    // 礼品名
    const nameColor = isUnlocked ? COLORS.brown : COLORS.brownLight;
    drawText(`${item.level} · 抖音小店${item.coupon}`, pad + 44, iy + 10, { fontSize: 12, fontWeight: isCurrentLevel ? '600' : 'normal', color: nameColor });
    drawText(item.desc, pad + 44, iy + 28, { fontSize: 10, color: COLORS.brownLight });

    // 状态/领取按钮
    if (isCurrentLevel && isUnlocked) {
      // 当前等级可领取
      drawButton(pad + contentW - 80, iy + 8, 64, 28, '领取', {
        bgColor: COLORS.red, fontSize: 12, fontWeight: 'bold', radius: 8,
      });
      addTouchRegion(pad + contentW - 80, iy + 8, 64, 28, () => {
        const { claimGift } = require('./game-state');
        claimGift(item.level);
      });
    } else if (isUnlocked) {
      drawText('已达成', pad + contentW - 16, iy + 18, { fontSize: 11, color: 'rgba(34,197,94,0.8)', textAlign: 'right', baseline: 'middle' });
    } else {
      drawText('未达成', pad + contentW - 16, iy + 18, { fontSize: 11, color: 'rgba(0,0,0,0.2)', textAlign: 'right', baseline: 'middle' });
    }
  }

  // ---- 领取记录（对齐文档 §4.5 历史领取记录） ----
  const historyY = giftListY + 22 + listContentH + 16;
  drawText('📋 领取记录', pad + 16, historyY, { fontSize: 14, fontWeight: '600', color: COLORS.brown });

  const historyItems = state.giftClaimHistory || [];
  if (historyItems.length === 0) {
    drawRoundRect(pad, historyY + 22, contentW, 48, 10, 'rgba(255,255,255,0.5)', 'rgba(212,160,23,0.1)', 1);
    drawText('暂无领取记录', screenW / 2, historyY + 46, { fontSize: 12, color: COLORS.brownLight, textAlign: 'center', baseline: 'middle' });
  } else {
    const historyH = Math.min(historyItems.length, 5) * 40 + 12;
    drawRoundRect(pad, historyY + 22, contentW, historyH, 10, 'rgba(255,255,255,0.7)', 'rgba(212,160,23,0.1)', 1);
    for (let i = 0; i < Math.min(historyItems.length, 5); i++) {
      const hItem = historyItems[i];
      const hy = historyY + 28 + i * 40;
      drawText(hItem.name || '', pad + 16, hy + 8, { fontSize: 11, color: COLORS.brown });
      drawText(hItem.date || '', pad + contentW - 16, hy + 8, { fontSize: 10, color: COLORS.brownLight, textAlign: 'right' });
      drawText(hItem.status || '已领取', pad + contentW - 16, hy + 24, { fontSize: 10, color: COLORS.green, textAlign: 'right' });
    }
  }
}

// ==================== 主渲染函数 ====================

function render() {
  if (!ctx) return;

  state.animTime += 0.016;

  if (state.scorePopup) {
    state.scorePopup.opacity -= 0.02;
    if (state.scorePopup.opacity <= 0) state.scorePopup = null;
  }

  ctx.clearRect(0, 0, screenW, screenH);

  switch (state.screen) {
    case 'launch':
      drawLaunchScreen();
      break;
    case 'home':
      drawHomeScreen();
      drawBoostDialog();
      break;
    case 'game':
      drawGameScreen();
      drawBoostDialog();
      drawVictoryDialog();
      drawFailureDialog();
      drawDailySuccessDialog();
      break;
    case 'identity':
      drawIdentityScreen();
      break;
    case 'profile':
      drawProfileScreen();
      break;
    case 'gift':
      drawGiftScreen();
      break;
  }

  requestAnimationFrame(render);
}

// ==================== 初始化 ====================

function init(canvasInstance) {
  canvas = canvasInstance;
  ctx = canvas.getContext('2d');

  try {
    const sysInfo = tt.getSystemInfoSync();
    dpr = sysInfo.pixelRatio || 1;
    screenW = sysInfo.windowWidth || sysInfo.screenWidth || 375;
    screenH = sysInfo.windowHeight || sysInfo.screenHeight || 812;
    if (sysInfo.safeArea && sysInfo.safeArea.top > 0) {
      safeTop = sysInfo.safeArea.top;
    } else if (sysInfo.statusBarHeight && sysInfo.statusBarHeight > 0) {
      safeTop = sysInfo.statusBarHeight + 44;
    } else {
      safeTop = 0;
    }
    if (safeTop < 20) safeTop = 20;
    console.log('[init] 设备信息:', JSON.stringify({ screenW, screenH, dpr, safeTop, model: sysInfo.model }));
  } catch (e) {
    dpr = 2;
    screenW = 375;
    screenH = 812;
    safeTop = 20;
  }

  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;
  ctx.scale(dpr, dpr);

  tt.onTouchStart(function (res) {
    if (res.touches.length > 0) {
      const t = res.touches[0];
      hitTest(t.clientX, t.clientY);
    }
  });

  render();
}

module.exports = { init, render, hitTest };
