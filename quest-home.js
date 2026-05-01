(function() {
  'use strict';

  let isPanelExpanded = false;
  const questStateCache = new Map();

  const STYLES = {
    wrapper: 'position:fixed;right:24px;bottom:24px;z-index:10000;display:flex;flex-direction:column;align-items:flex-end;gap:10px;',
    button: 'height:42px;min-width:42px;padding:0 14px;border-radius:999px;cursor:pointer;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg, rgba(255,255,255,.24), rgba(255,255,255,.1));border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);box-shadow:0 10px 24px rgba(0,0,0,.35);color:#f7f9ff;font:600 13px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;transition:all .2s ease;',
    panel: 'width:340px;max-height:62vh;overflow:auto;background:linear-gradient(145deg, rgba(36,40,58,.72), rgba(26,29,43,.56));border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:14px;color:#f4f7ff;box-shadow:0 16px 48px rgba(0,0,0,.42);backdrop-filter:blur(20px) saturate(145%);-webkit-backdrop-filter:blur(20px) saturate(145%);',
    questList: 'margin-bottom:10px;max-height:260px;overflow-y:auto;',
    questItem: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;',
    questName: 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:8px;color:#f0f5ff;',
    questProgress: 'font-family:monospace;color:#d2dbff;font-size:12px;'
  };

  function createQuestButton() {
    if (document.getElementById('DiscordQuestDock')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'DiscordQuestDock';
    wrapper.style.cssText = STYLES.wrapper;

    const button = document.createElement('div');
    button.id = 'DiscordQuestButton';
    button.className = 'circleIconButton__5bc7e questify-quest-button-button';
    button.setAttribute('aria-label', 'Quests');
    button.title = 'Nexo Store Quest Assistant';
    button.style.cssText = STYLES.button;
    button.innerHTML = `<div class="questify-quest-button-icon-container"><svg viewBox="0 0 24 24" height="22" width="22" fill="none"><path fill="currentColor" d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z"></path></svg></div><span id="DiscordQuestLabel">Running Quests</span>`;

    button.addEventListener('mouseenter', () => { button.style.transform = 'translateY(-1px)'; });
    button.addEventListener('mouseleave', () => { button.style.transform = 'translateY(0)'; });
    button.addEventListener('click', () => handleButtonClick(button));
    button.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePanel(); });

    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
  }

  function handleButtonClick(button) {
    const label = button.querySelector('#DiscordQuestLabel');
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    chrome.runtime.sendMessage({ action: 'executeQuestCode' }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        label.textContent = 'Error';
      } else {
        label.textContent = 'Activated';
      }
      setTimeout(() => { label.textContent = 'Running Quests'; }, 1800);
    });
  }

  function createExpandedPanel() {
    if (document.getElementById('DiscordQuestPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'DiscordQuestPanel';
    panel.style.cssText = STYLES.panel;

    panel.innerHTML = '<h3 style="margin:0 0 10px 0;font-size:16px;">Nexo Store Quest Assistant</h3>';
    const questListContainer = document.createElement('div');
    questListContainer.id = 'DiscordQuestList';
    questListContainer.style.cssText = STYLES.questList;
    questStateCache.forEach(q => updateQuestItemUI(questListContainer, q));
    panel.appendChild(questListContainer);

    const runBtn = document.createElement('button');
    runBtn.textContent = 'Activate Quests';
    runBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(74,222,128,.28);color:#fff;cursor:pointer;margin-bottom:8px;';
    runBtn.onclick = () => handleButtonClick(document.getElementById('DiscordQuestButton'));
    panel.appendChild(runBtn);

    const credit = document.createElement('p');
    credit.style.cssText = 'margin:0;font-size:12px;color:#d8deff;';
    credit.textContent = 'Made by @kk5a - nexo store';
    panel.appendChild(credit);

    document.getElementById('DiscordQuestDock')?.appendChild(panel);
  }

  window.addEventListener('message', ({ source, data }) => {
    if (source !== window || !data || data.prefix !== 'DISCORD_QUEST_COMPLETER') return;
    const listContainer = document.getElementById('DiscordQuestList');
    if (data.type === 'QUEST_LIST') {
      questStateCache.clear();
      data.data.forEach(q => questStateCache.set(q.id, q));
      if (listContainer) { listContainer.innerHTML = ''; data.data.forEach(q => updateQuestItemUI(listContainer, q)); }
    } else if (data.type === 'QUEST_UPDATE') {
      questStateCache.set(data.data.id, data.data);
      if (listContainer) updateQuestItemUI(listContainer, data.data);
    }
  });

  function updateQuestItemUI(container, quest) {
    let item = document.getElementById(`quest-item-${quest.id}`);
    if (!item) {
      item = document.createElement('div');
      item.id = `quest-item-${quest.id}`;
      item.style.cssText = STYLES.questItem;
      item.innerHTML = `<span style="${STYLES.questName}" title="${quest.name}">${quest.name}</span><span id="quest-progress-${quest.id}" style="${STYLES.questProgress}"></span>`;
      container.appendChild(item);
    }
    const progressSpan = item.querySelector(`#quest-progress-${quest.id}`);
    if (progressSpan) {
      progressSpan.textContent = quest.completed ? 'DONE' : `${quest.progress}/${quest.target}`;
      progressSpan.style.color = quest.completed ? '#43b581' : '#aaa';
      item.style.opacity = quest.completed ? '0.5' : '1';
    }
  }

  function togglePanel() {
    isPanelExpanded = !isPanelExpanded;
    if (isPanelExpanded) createExpandedPanel();
    else document.getElementById('DiscordQuestPanel')?.remove();
  }

  function init() {
    createQuestButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
