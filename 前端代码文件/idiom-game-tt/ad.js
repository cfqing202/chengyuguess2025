/**
 * 广告 SDK 封装 - 猴哥成语大冲关
 * 
 * 对齐文档：《猴哥成语大冲关-前端开发文档 v2.0》§7 广告SDK交互规则
 * 
 * 核心规则：
 * - 使用 tt.createRewardedVideoAd 创建激励视频实例
 * - 监听 onClose 回调
 * - 若 res.isEnded === true（完整观看），才调对应后端确认接口
 * - 若 res.isEnded === false（未完整观看），仅文字提示，不调后端接口
 * - 广告位ID 统一在 adConfig 中配置
 */

const { adConfig } = require('./api');

// ==================== 广告实例缓存 ====================

const adInstances = {}; // { adUnitId: RewardedVideoAd }

/**
 * 获取或创建激励视频广告实例
 * @param {string} adUnitId - 广告位ID
 * @returns {RewardedVideoAd|null}
 */
function getOrCreateAdInstance(adUnitId) {
  if (!adUnitId) {
    console.warn('[Ad] 广告位ID为空，无法创建广告实例');
    return null;
  }

  if (adInstances[adUnitId]) {
    return adInstances[adUnitId];
  }

  try {
    if (typeof tt.createRewardedVideoAd === 'function') {
      const ad = tt.createRewardedVideoAd({ adUnitId });
      adInstances[adUnitId] = ad;
      console.log('[Ad] 创建广告实例成功:', adUnitId);
      return ad;
    }
  } catch (e) {
    console.error('[Ad] 创建广告实例失败:', e.message);
  }

  return null;
}

// ==================== 展示广告 ====================

/**
 * 展示激励视频广告
 * 对齐文档 §7 回调处理规则：
 * - onClose: res.isEnded === true → 完整观看 → 返回 true
 * - onClose: res.isEnded === false → 未完整观看 → 提示用户 → 返回 false
 * - onError → 返回 false
 * 
 * @param {string} adType - 广告类型：'TIME_DOUBLE' 或 'REVIVE'（对应 AdType 枚举）
 * @returns {Promise<boolean>} 是否完整观看
 */
function showAd(adType) {
  return new Promise((resolve) => {
    // 获取对应广告位ID
    let adUnitId = '';
    if (adType === 'TIME_DOUBLE') {
      adUnitId = adConfig.TIME_DOUBLE_AD_ID;
    } else if (adType === 'REVIVE') {
      adUnitId = adConfig.REVIVE_AD_ID;
    }

    // 如果广告位ID未配置，走模拟模式（开发调试用）
    if (!adUnitId) {
      console.log(`[Ad] 广告位ID未配置(${adType})，模拟观看成功`);
      // 模拟延迟后返回成功
      setTimeout(() => resolve(true), 300);
      return;
    }

    const ad = getOrCreateAdInstance(adUnitId);
    if (!ad) {
      console.warn('[Ad] 无法创建广告实例，模拟观看成功');
      setTimeout(() => resolve(true), 300);
      return;
    }

    // 监听关闭回调（对齐文档：onClose + isEnded 检查）
    const onClose = (res) => {
      ad.offClose(onClose);
      ad.offError(onError);

      if (res && res.isEnded) {
        // 完整观看 → 可以调后端确认接口
        console.log('[Ad] 广告完整观看:', adType);
        resolve(true);
      } else {
        // 未完整观看 → 仅文字提示，不调后端接口
        console.log('[Ad] 广告未完整观看:', adType);
        // 可以在这里弹出提示
        showAdWatchTip();
        resolve(false);
      }
    };

    const onError = (err) => {
      ad.offClose(onClose);
      ad.offError(onError);
      console.error('[Ad] 广告加载失败:', err);
      resolve(false);
    };

    ad.onClose(onClose);
    ad.onError(onError);

    // 展示广告
    ad.show().catch((err) => {
      ad.offClose(onClose);
      ad.offError(onError);
      console.error('[Ad] 广告展示失败:', err);
      // 展示失败时可以尝试重新加载
      ad.load().then(() => {
        ad.onClose(onClose);
        ad.onError(onError);
        ad.show().catch(() => {
          ad.offClose(onClose);
          ad.offError(onError);
          resolve(false);
        });
      }).catch(() => {
        resolve(false);
      });
    });
  });
}

/**
 * 广告未完整观看提示
 * 文档要求："仅用文字提示用户"
 */
function showAdWatchTip() {
  // 在抖音小游戏中可以用 toast 提示
  try {
    if (typeof tt.showToast === 'function') {
      tt.showToast({
        title: '请观看完整视频才能获得奖励',
        icon: 'none',
        duration: 2000,
      });
    }
  } catch (e) {
    console.log('[Ad] 提示：请观看完整视频才能获得奖励');
  }
}

// ==================== 导出 ====================

module.exports = {
  showAd,
  getOrCreateAdInstance,
  showAdWatchTip,
};
