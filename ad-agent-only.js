'use strict';

(() => {
  const targetHash = '#ad-agent';

  function treeState() {
    workspace.adAgentTree ??= { experts: {}, projects: {} };
    workspace.adAgentTree.experts ??= {};
    workspace.adAgentTree.projects ??= {};
    return workspace.adAgentTree;
  }

  function treeOpen(level, id, fallback = false) {
    const value = treeState()[level]?.[id];
    return typeof value === 'boolean' ? value : fallback;
  }

  function treeChevron(open) {
    return `<svg class="ad-agent-tree-chevron ${open ? 'open' : ''}" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>`;
  }

  function renderStandaloneSidebar() {
    const brand = document.querySelector('.aw-brandbar');
    const sidebarTop = document.querySelector('#aw-sidebar-top');
    const projects = document.querySelector('#aw-projects');
    if (!brand || !sidebarTop || !projects) return;

    const brandIcon = brand.querySelector('.aw-brand-icon');
    const brandName = brand.querySelector('b');
    if (brandIcon) brandIcon.textContent = '➤';
    if (brandName) brandName.textContent = 'Wefly';
    if (!brand.querySelector('.ad-agent-version')) {
      brandName?.insertAdjacentHTML('afterend', '<span class="ad-agent-version">v1...</span>');
    }

    if (brandName && !brandName.dataset.brandLocked) {
      brandName.dataset.brandLocked = 'true';
      new MutationObserver(() => {
        if (brandName.textContent !== 'Wefly') brandName.textContent = 'Wefly';
      }).observe(brandName, { childList: true, characterData: true, subtree: true });
    }

    const agentPage = document.querySelector('#wb-agent-page');
    const agentMain = document.querySelector('#assistant-drawer .aw-main');
    if (agentPage && agentMain && agentPage.parentElement !== agentMain) agentMain.append(agentPage);
    const newChat = document.querySelector('#assistant-new');
    if (newChat && !sidebarTop.querySelector('.ad-agent-menu-item')) {
      newChat.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>新建对话</span>';
      sidebarTop.replaceChildren(newChat);
      sidebarTop.insertAdjacentHTML('beforeend', `
        <button type="button" class="ad-agent-menu-item" data-r-action="wb-automation">${icon('lightning')}<span>自动化</span></button>
        <button type="button" class="ad-agent-menu-item" data-r-action="af-config">${icon('book')}<span>知识库管理</span></button>
        <button type="button" class="ad-agent-menu-item" data-r-action="af-skills">${icon('wrench')}<span>技能管理</span></button>
        <button type="button" class="ad-agent-menu-item" data-r-action="wb-experts">${icon('users')}<span>专家市场</span></button>
        <button type="button" class="ad-agent-menu-item" data-r-action="wb-assets">${icon('folder')}<span>资产库</span></button>
        <button type="button" class="ad-agent-menu-item" data-r-action="wb-apps"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="2.25"/><circle cx="16" cy="8" r="2.25"/><circle cx="8" cy="16" r="2.25"/><rect x="13.75" y="13.75" width="4.5" height="4.5" rx="1"/></svg><span>应用</span></button>
      `);
    }
    const selectedSection = typeof WB !== 'undefined' ? WB.agentSection : 'chat';
    const sectionByAction = {
      'wb-automation': 'automation',
      'af-config': 'knowledge',
      'af-skills': 'skills',
      'wb-experts': 'experts',
      'wb-assets': 'assets',
      'wb-apps': 'apps'
    };
    if (newChat) newChat.classList.toggle('active', selectedSection === 'chat');
    sidebarTop.querySelectorAll('.ad-agent-menu-item').forEach(button => {
      const target = sectionByAction[button.dataset.rAction];
      button.classList.toggle('active', target === selectedSection || (target === 'apps' && selectedSection === 'inspiration'));
    });

    const tasks = (R.data.tasks || []).filter(task => task.projectId === state.id);
    const taskRows = tasks.length
      ? tasks.slice(0, 5).map(task => `<button type="button" class="ad-agent-task-row" data-r-action="wb-automation" title="${E(task.title)}">${E(task.title)}</button>`).join('')
      : '<p class="ad-agent-empty-task">暂无自动化任务</p>';
    const activeExpertId = WB.sidebarExpertId || (typeof awChat === 'function' ? awChat()?.expert?.id : null) || workspace.lastSelectedExpertId;
    const experts = typeof wbSidebarExperts === 'function' ? wbSidebarExperts() : [];
    const pinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 5 3 3v2H6v-2l3-3-1-5Z M12 13v8"/></svg>';
    const expertRow = expert => {
      const conversations = workspace.projects.flatMap(owner => (owner.chats || []).filter(chat => !chat.archived && (chat.expert?.id || owner.expertId) === expert.id).map(chat => ({owner, chat}))).sort((a,b)=>Number(b.chat.expertPinned)-Number(a.chat.expertPinned)||(b.chat.updated||b.chat.created||0)-(a.chat.updated||a.chat.created||0));
      const expertOpen = treeOpen('experts', expert.id, activeExpertId === expert.id || /default/i.test(expert.name));
      const chatRows = conversations.map(({owner,chat}) => `<div class="ad-agent-expert-chat-row ${owner.id===state.id&&chat.id===state.chatId?'active':''}"><button type="button" class="ad-agent-expert-chat-main" data-r-action="aw-select-chat" data-id="${E(chat.id)}" data-owner="${E(owner.id)}" title="${E(chat.title)}"><span>${E(chat.title)}</span></button><button type="button" class="ad-agent-node-pin ${chat.expertPinned?'active':''}" data-r-action="wb-pin-expert-chat" data-id="${E(chat.id)}" data-owner="${E(owner.id)}" aria-label="${chat.expertPinned?'取消置顶':'置顶'}对话${E(chat.title)}" title="${chat.expertPinned?'取消置顶':'置顶'}">${pinIcon}</button><details class="ad-agent-node-menu"><summary aria-label="${E(chat.title)}更多操作">•••</summary><div><button type="button" data-r-action="wb-rename-expert-chat" data-id="${E(chat.id)}" data-owner="${E(owner.id)}">重命名</button><button type="button" data-r-action="wb-delete-expert-chat" data-id="${E(chat.id)}" data-owner="${E(owner.id)}">删除</button></div></details></div>`).join('');
      const expertAction = conversations.length ? 'wb-toggle-expert-tree' : 'wb-sidebar-expert';
      return `<div class="ad-agent-expert-unit"><div class="ad-agent-expert-wrap ${activeExpertId === expert.id ? 'active' : ''}"><button type="button" class="ad-agent-expert-row" data-r-action="${expertAction}" data-id="${E(expert.id)}" aria-expanded="${conversations.length ? String(expertOpen) : 'false'}" title="${conversations.length ? (expertOpen ? '收起' : '展开') : '开始对话：'}${E(expert.name)}"><span>${typeof wbExpertAvatarMarkup==='function'?wbExpertAvatarMarkup(expert.avatar,expert.name.slice(0,1)):E(expert.avatar||expert.name.slice(0,1))}</span><b>${E(expert.name)}</b>${conversations.length ? treeChevron(expertOpen) : '<span class="ad-agent-tree-spacer"></span>'}</button><button type="button" class="ad-agent-expert-pin ${expert.pinned?'active':''}" data-r-action="wb-pin-expert" data-id="${E(expert.id)}" aria-label="${expert.pinned?'取消置顶':'置顶'}${E(expert.name)}" title="${expert.pinned?'取消置顶':'置顶'}">${pinIcon}</button><details class="ad-agent-expert-menu"><summary aria-label="${E(expert.name)}更多操作">•••</summary><div><button type="button" data-r-action="wb-rename-expert" data-id="${E(expert.id)}">重命名</button>${!expert.system?`<button type="button" class="danger-text" data-r-action="wb-delete-expert" data-id="${E(expert.id)}">删除</button>`:''}<button type="button" data-r-action="wb-expert-new-chat" data-id="${E(expert.id)}">新建对话</button></div></details></div>${chatRows && expertOpen?`<div class="ad-agent-flat-conversations">${chatRows}</div>`:''}</div>`;
    };
    const expertRows = experts.map(expertRow).join('') || '<p class="ad-agent-empty-task">还没有专家</p>';
    projects.innerHTML = `
      <section class="ad-agent-side-section">
        <div class="ad-agent-side-label">自动化任务</div>
        ${taskRows}
      </section>
      <section class="ad-agent-side-section ad-agent-expert-section">
        <div class="ad-agent-side-label"><span>专家</span></div>
        ${expertRows}
      </section>
    `;
  }

  R.invoke('wb-toggle-expert-tree', button => {
    const id = button.dataset.id;
    WB.sidebarExpertId = id;
    treeState().experts[id] = button.getAttribute('aria-expanded') !== 'true';
    persist();
    renderStandaloneSidebar();
  });

  R.invoke('wb-toggle-expert-project', button => {
    const id = button.dataset.id;
    const project = workspace.projects.find(item => item.id === id);
    if(project?.expertId) WB.sidebarExpertId = project.expertId;
    treeState().projects[id] = button.getAttribute('aria-expanded') !== 'true';
    persist();
    renderStandaloneSidebar();
  });

  function showAdAgentOnly() {
    if (new URLSearchParams(location.search).get('section') === 'inspiration') WB.agentSection = 'inspiration';
    if (location.hash !== targetHash) {
      history.replaceState(null, '', `${location.pathname}${location.search}${targetHash}`);
    }
    if (typeof render === 'function') render();
    renderStandaloneSidebar();
  }

  window.addEventListener('hashchange', () => {
    if (location.hash !== targetHash) showAdAgentOnly();
  });

  const originalRenderProjects = typeof awRenderProjects === 'function' ? awRenderProjects : null;
  if (originalRenderProjects) {
    awRenderProjects = function () {
      originalRenderProjects();
      renderStandaloneSidebar();
    };
  }

  showAdAgentOnly();
})();
