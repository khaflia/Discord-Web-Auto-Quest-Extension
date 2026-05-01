(function() {
  'use strict';

  let isPanelExpanded = false;
  let expandButtonReference;
  const questStateCache = new Map();

  const STYLES = {
    button: `
      position: fixed;
      top: 92px;
      left: 20px;
      z-index: 10000;
      background: rgba(255, 255, 255, 0.18);
      color: #f7f9ff;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 16px;
      padding: 10px 16px;
      cursor: pointer;
      box-shadow: 0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35);
      backdrop-filter: blur(18px) saturate(160%);
      -webkit-backdrop-filter: blur(18px) saturate(160%);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      width: 180px;
    `,
    icon: `
      width: 15px;
      height: 15px;
    `,
    text: `
      flex: 1;
      text-align: center;
    `,
    expandButton: `
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.38);
      border-radius: 8px;
      color: #f7f9ff;
      cursor: pointer;
      font-size: 12px;
      padding: 2px 7px;
      margin-left: 4px;
      transition: transform 0.3s ease;
      transform: rotate(0deg);
    `,
    panel: `
      position: fixed;
      bottom: 65px;
      right: 20px;
      z-index: 9999;
      background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08));
      color: #f4f7ff;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 16px;
      padding: 16px;
      width: 280px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.42);
      backdrop-filter: blur(20px) saturate(145%);
      -webkit-backdrop-filter: blur(20px) saturate(145%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `,
    questList: `
      margin-bottom: 5px;
      max-height: 200px;
      overflow-y: auto;
    `,
    questItem: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    `,
    questName: `
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
      color: #f0f5ff;
    `,
    questProgress: `
      font-family: monospace;
      color: #d2dbff;
      font-size: 12px;
    `
  };

  function createQuestButton() {
    if (document.getElementById('DiscordQuestButton')) {return;}

    const button = document.createElement('div');
    button.id = 'DiscordQuestButton';
    button.className = 'questify-extension-button';
    button.style.cssText = STYLES.button;

    const icon = document.createElement('span');
    icon.textContent = '⚡';
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = STYLES.icon + ' display:flex;align-items:center;justify-content:center;font-size:14px;';
    button.appendChild(icon);

    const textLabel = document.createElement('span');
    textLabel.textContent = 'Orb Quests';
    textLabel.style.cssText = STYLES.text;
    button.appendChild(textLabel);

    const expandButton = document.createElement('button');
    const arrowIcon = document.createElement('span');
    arrowIcon.textContent = '▾';
    arrowIcon.style.cssText = 'font-size: 11px; line-height: 1; display: block; pointer-events: none;';
    expandButton.appendChild(arrowIcon);
    expandButton.style.cssText = STYLES.expandButton + ' padding: 4px; display: flex; align-items: center; justify-content: center;';
    expandButton.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    button.appendChild(expandButton);
    expandButtonReference = expandButton;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 18px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)';
    });

    button.addEventListener('click', () => handleButtonClick(button, textLabel, icon, expandButton));

    document.body.appendChild(button);

    if (isPanelExpanded) {
      createExpandedPanel();
    }

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

    textLabel.textContent = message;
    button.style.background = bgColor;
    button.style.color = textColor;
    
    if (invertIcons) {
      icon.style.filter = 'brightness(0) invert(1)';
      expandButton.style.filter = 'brightness(0) invert(1)';
    }

    setTimeout(() => {
      textLabel.textContent = 'Orb Quests';
      button.style.background = 'rgba(255, 255, 255, 0.18)';
      button.style.color = '#f7f9ff';
      icon.style.filter = '';
      expandButton.style.filter = '';
    }, 2000);
  }

  function createExpandedPanel() {
    if (document.getElementById('DiscordQuestPanel')) {return;}

    const panel = document.createElement('div');
    panel.id = 'DiscordQuestPanel';
    panel.className = 'questify-extension-panel';
    panel.style.cssText = STYLES.panel;

    const questListContainer = document.createElement('div');
    questListContainer.id = 'DiscordQuestList';
    questListContainer.style.cssText = STYLES.questList;
    
    if (questStateCache.size > 0) {
      questStateCache.forEach(quest => updateQuestItemUI(questListContainer, quest));
    }
    
    panel.appendChild(questListContainer);

    const title = document.createElement('h3');
    title.textContent = 'Nexo Store | Quest Assistant';
    title.style.cssText = 'margin: 0 0 12px 0; font-size: 16px; font-weight: bold; border-top: 1px solid #333; padding-top: 12px;';
    panel.appendChild(title);

    const credit = document.createElement('p');
    credit.style.cssText = 'margin: 0; font-size: 14px; color: #ccc;';
    credit.innerHTML = 'Made by <strong>@kk5a - nexo store</strong>';
    panel.appendChild(credit);

    document.body.appendChild(panel);
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
    
    const existingPanel = document.getElementById('DiscordQuestPanel');
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
      const panel = document.getElementById('DiscordQuestPanel');
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
