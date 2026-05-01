/*
 * Derived utility set inspired by Questify helper patterns.
 * Maintainer adaptation for browser-extension runtime.
 */
(function() {
  'use strict';

  const QUEST_PATH = '/quest-home';
  const VIDEO_QUEST_LEEWAY = 24;

  const QUEST_TASK_TYPES = [
    'PLAY_ON_DESKTOP',
    'PLAY_ON_XBOX',
    'PLAY_ON_PLAYSTATION',
    'PLAY_ACTIVITY',
    'WATCH_VIDEO',
    'WATCH_VIDEO_ON_MOBILE',
    'ACHIEVEMENT_IN_ACTIVITY'
  ];

  function getQuestTask(quest) {
    const tasks = quest?.config?.taskConfigV2?.tasks || quest?.config?.taskConfig?.tasks || {};
    return QUEST_TASK_TYPES.map(type => tasks[type]).find(Boolean) || null;
  }

  function getQuestProgress(quest, task) {
    const progressMap = quest?.userStatus?.progress;
    if (!progressMap || !task?.type) return null;

    if (task.type === 'WATCH_VIDEO' || task.type === 'WATCH_VIDEO_ON_MOBILE') {
      const watchProgress = progressMap.WATCH_VIDEO?.value;
      const mobileProgress = progressMap.WATCH_VIDEO_ON_MOBILE?.value;
      if (watchProgress !== undefined || mobileProgress !== undefined) {
        return Math.max(watchProgress ?? 0, mobileProgress ?? 0);
      }
      return null;
    }

    return progressMap[task.type]?.value ?? null;
  }

  function getQuestTarget(task, completeVideoQuestsQuicker = false) {
    const isWatch = task?.type === 'WATCH_VIDEO' || task?.type === 'WATCH_VIDEO_ON_MOBILE';
    const raw = task?.target ?? 0;
    const adjusted = Math.max(0, raw - (isWatch && completeVideoQuestsQuicker ? VIDEO_QUEST_LEEWAY : 0));
    return { raw, adjusted };
  }

  function normalizeQuestName(name = '') {
    const normalized = String(name).trim().toUpperCase();
    return normalized.endsWith('QUEST') ? normalized.slice(0, -5).trim() : normalized;
  }

  function snakeToCamel(obj) {
    if (Array.isArray(obj)) return obj.map(snakeToCamel);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
          snakeToCamel(value)
        ])
      );
    }
    return obj;
  }

  function getFormattedNow() {
    return new Date().toLocaleString(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).replace(',', '');
  }

  window.QuestifyUtils = {
    QUEST_PATH,
    VIDEO_QUEST_LEEWAY,
    getQuestTask,
    getQuestProgress,
    getQuestTarget,
    normalizeQuestName,
    snakeToCamel,
    getFormattedNow
  };
})();
