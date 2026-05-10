/**
 * 抖音小游戏入口文件 - 猴哥成语大冲关
 * 
 * 标准小游戏结构：
 * 1. 创建 Canvas
 * 2. 初始化渲染器
 * 3. 启动游戏循环
 */

// ========== 1. 创建主 Canvas ==========
const canvas = tt.createCanvas();

// 设置帧率
try {
  tt.setPreferredFramesPerSecond(60);
} catch (e) {}

// ========== 2. 加载游戏模块 ==========
const renderer = require('./renderer.js');

// ========== 3. 初始化渲染器 ==========
renderer.init(canvas);

console.log('[game.js] 猴哥成语大冲关小游戏启动完成 ✅');
