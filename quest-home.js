(function() {
  'use strict';

  let isPanelExpanded = false;
  let expandButtonReference;
  const questStateCache = new Map();

  const STYLES = {
    button: `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.8;
      transition: opacity 150ms;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.22);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `,
    icon: `width: 20px; height: 20px; pointer-events: none; border-radius: 50%;`,
    modalOverlay: `
      position: fixed; inset: 0; background: rgba(0,0,0,0.35);
      z-index: 10001; display: flex; align-items: center; justify-content: center;
    `,
    panel: `
      width: 360px; max-height: 70vh; overflow: auto;
      background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08));
      color: #f4f7ff; border: 1px solid rgba(255,255,255,0.25); border-radius: 16px;
      padding: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.42);
      backdrop-filter: blur(20px) saturate(145%); -webkit-backdrop-filter: blur(20px) saturate(145%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `,
    questList: `margin-bottom: 8px; max-height: 260px; overflow-y: auto;`,
    questItem: `display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;`,
    questName: `flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:8px;color:#f0f5ff;`,
    questProgress: `font-family:monospace;color:#d2dbff;font-size:12px;`
  };

  function attachButtonToTopBar(button) {
    const selectors = [
      '[class*="toolbar"]',
      '[aria-label="Help"]',
      '[data-list-id="chat-input"]'
    ];
    for (const s of selectors) {
      const host = document.querySelector(s);
      if (!host) continue;
      if (s === '[aria-label="Help"]' && host.parentElement) {
        host.parentElement.insertBefore(button, host);
      } else {
        host.appendChild(button);
      }
      return true;
    }
    return false;
  }

  function createQuestButton() {
    if (!window.location.pathname.includes('/quest-home')) {
      removeElements();
      return;
    }
    if (document.getElementById('DiscordQuestButton')) return;
    const button = document.createElement('div');
    button.id = 'DiscordQuestButton';
    button.title = 'Open Nexo Quest Assistant';
    button.style.cssText = STYLES.button;

    const icon = document.createElement('img');
    icon.src = 'https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg';
    icon.alt = 'Quest';
    icon.style.cssText = STYLES.icon;
    button.appendChild(icon);

    button.addEventListener('mouseenter', () => { button.style.opacity = '1'; });
    button.addEventListener('mouseleave', () => { button.style.opacity = '0.8'; });
    button.addEventListener('click', () => handleButtonClick(button, null, icon, null));
    button.addEventListener('contextmenu', (e) => { e.preventDefault(); togglePanel(); });

    if (!attachButtonToTopBar(button)) document.body.appendChild(button);
  }

  function handleButtonClick(button, textLabel, icon, expandButton) {
    const elements = { button, textLabel, icon, expandButton };

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      updateButtonState(elements, { message: 'Extension Error', bgColor: '#ff4444', textColor: 'white', invertIcons: true });
      return;
    }

    chrome.runtime.sendMessage({ action: 'executeQuestCode' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Discord Auto Quest Error:', chrome.runtime.lastError);
        updateButtonState(elements, { message: 'Error', bgColor: 'rgba(255,74,74,0.45)', textColor: '#fff', invertIcons: false });
      } else if (response && response.success) {
        updateButtonState(elements, { message: 'Activated', bgColor: 'rgba(74,222,128,0.32)', textColor: '#fff', invertIcons: false });
      } else {
        updateButtonState(elements, { message: 'Error', bgColor: 'rgba(255,74,74,0.45)', textColor: '#fff', invertIcons: false });
      }
    });
  }

  function updateButtonState(elements, state) {
    const { button, textLabel, icon, expandButton } = elements;
    const { message, bgColor, textColor, invertIcons } = state;

    if (textLabel) textLabel.textContent = message;
    button.style.background = bgColor;
    button.style.color = textColor;
    
    if (invertIcons) {
      icon.style.filter = 'brightness(0) invert(1)';
      if (expandButton) expandButton.style.filter = 'brightness(0) invert(1)';
    }

    setTimeout(() => {
      if (textLabel) textLabel.textContent = 'Running Quests';
      button.style.background = 'rgba(255, 255, 255, 0.18)';
      button.style.color = '#f7f9ff';
      icon.style.filter = '';
      if (expandButton) expandButton.style.filter = '';
    }, 2000);
  }

  function createExpandedPanel() {
    if (document.getElementById('DiscordQuestModal')) {return;}
    const overlay = document.createElement('div');
    overlay.id = 'DiscordQuestModal';
    overlay.style.cssText = STYLES.modalOverlay;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) togglePanel(); });

    const panel = document.createElement('div');
    panel.id = 'DiscordQuestPanel';
    panel.style.cssText = STYLES.panel;

    const questListContainer = document.createElement('div');
    questListContainer.id = 'DiscordQuestList';
    questListContainer.style.cssText = STYLES.questList;
    if (questStateCache.size > 0) questStateCache.forEach(quest => updateQuestItemUI(questListContainer, quest));
    panel.appendChild(questListContainer);

    const title = document.createElement('h3');
    title.textContent = 'Nexo Store | Quest Assistant';
    title.style.cssText = 'margin:0 0 12px 0;font-size:16px;font-weight:700;';
    panel.appendChild(title);

    const runBtn = document.createElement('button');
    runBtn.textContent = 'Activate Quests';
    runBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(74,222,128,.28);color:#fff;cursor:pointer;margin-bottom:10px;';
    runBtn.onclick = () => {
      const b = document.getElementById('DiscordQuestButton');
      handleButtonClick(b, null, b?.querySelector('img'), null);
    };
    panel.appendChild(runBtn);

    const credit = document.createElement('p');
    credit.style.cssText = 'margin:0;font-size:13px;color:#d8deff;';
    credit.innerHTML = 'Made by <strong>@kk5a - nexo store</strong>';
    panel.appendChild(credit);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  window.addEventListener('message', ({ source, data }) => {
    if (source !== window || !data || data.prefix !== 'DISCORD_QUEST_COMPLETER') { return; }

    const listContainer = document.getElementById('DiscordQuestList');

    if (data.type === 'QUEST_LIST') {
      questStateCache.clear();
      data.data.forEach(q => questStateCache.set(q.id, q));
      if (listContainer) {
        listContainer.innerHTML = ''; 
        data.data.forEach(q => updateQuestItemUI(listContainer, q));
      }
    } else if (data.type === 'QUEST_UPDATE') {
      questStateCache.set(data.data.id, data.data);
      if (listContainer) { updateQuestItemUI(listContainer, data.data); }
    }
  });

  function updateQuestItemUI(container, quest) {
    let item = document.getElementById(`quest-item-${quest.id}`);
    
    if (!item) {
      item = document.createElement('div');
      item.id = `quest-item-${quest.id}`;
      item.style.cssText = STYLES.questItem;
      item.innerHTML = `
        <span style="${STYLES.questName}" title="${quest.name}">${quest.name}</span>
        <span id="quest-progress-${quest.id}" style="${STYLES.questProgress}"></span>
      `;
      container.appendChild(item);
    }

    const progressSpan = item.querySelector(`#quest-progress-${quest.id}`);
    if (progressSpan) {
      progressSpan.textContent = quest.completed ? 'DONE' : `${quest.progress}/${quest.target}`;
      progressSpan.style.color = quest.completed ? '#43b581' : '#aaa';
      item.style.opacity = quest.completed ? '0.5' : '1';
    }
  }

  function removeElements() {
    const existingButton = document.getElementById('DiscordQuestButton');
    if (existingButton) {existingButton.remove();}
    
    const existingPanel = document.getElementById('DiscordQuestModal');
    if (existingPanel) {existingPanel.remove();}
  }

  function togglePanel() {
    isPanelExpanded = !isPanelExpanded;
    if (expandButtonReference) {
      expandButtonReference.style.transform = isPanelExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    if (isPanelExpanded) {
      createExpandedPanel();
    } else {
      const panel = document.getElementById('DiscordQuestModal');
      if (panel) {panel.remove();}
    }
  }

  function init() {
    createQuestButton();

    let lastUrl = window.location.href;
    new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        createQuestButton();
      }
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
