'use strict';

(() => {
  const targetHash = '#ad-agent';

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
        <button type="button" class="ad-agent-menu-item" data-r-action="wb-apps"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="2.25"/><circle cx="16" cy="8" r="2.25"/><circle cx="8" cy="16" r="2.25"/><rect x="13.75" y="13.75" width="4.5" height="4.5" rx="1"/></svg><span>应用</span></button>
      `);
    }

    const selectedSection = typeof WB !== 'undefined' ? WB.agentSection : 'chat';
    const sectionByAction = {
      'wb-automation': 'automation',
      'af-config': 'knowledge',
      'af-skills': 'skills',
      'wb-experts': 'experts',
      'wb-apps': 'apps'
    };
    if (newChat) newChat.classList.toggle('active', selectedSection === 'chat');
    sidebarTop.querySelectorAll('.ad-agent-menu-item').forEach(button => {
      button.classList.toggle('active', sectionByAction[button.dataset.rAction] === selectedSection);
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = 86400000;
    const history = workspace.projects
      .flatMap(project => (project.chats || []).map(chat => ({
        project,
        chat,
        at: chat.updated || chat.created || 0
      })))
      .sort((a, b) => b.at - a.at);
    const groups = [
      ['今天', row => row.at >= today],
      ['昨天', row => row.at >= today - day && row.at < today],
      ['7天内', row => row.at >= today - 7 * day && row.at < today - day],
      ['30天内', row => row.at >= today - 30 * day && row.at < today - 7 * day],
      ['更早', row => row.at < today - 30 * day]
    ];
    const tasks = (R.data.tasks || []).filter(task => task.projectId === state.id);
    const taskRows = tasks.length
      ? tasks.slice(0, 5).map(task => `<button type="button" class="ad-agent-task-row" data-r-action="wb-automation" title="${E(task.title)}">${E(task.title)}</button>`).join('')
      : '<p class="ad-agent-empty-task">暂无自动化任务</p>';
    const activeExpertId = typeof awChat === 'function' ? awChat()?.expert?.id : null;
    const experts = typeof wbSidebarExperts === 'function' ? wbSidebarExperts() : [];
    const expertRow = expert => {
      const projectsForExpert = workspace.projects.filter(project => project.expertId === expert.id);
      return `<div class="ad-agent-expert-unit"><div class="ad-agent-expert-wrap ${activeExpertId === expert.id ? 'active' : ''}"><button type="button" class="ad-agent-expert-row" data-r-action="wb-sidebar-expert" data-id="${E(expert.id)}" title="${E(expert.description || expert.name)}"><span>${typeof wbExpertAvatarMarkup==='function'?wbExpertAvatarMarkup(expert.avatar,expert.name.slice(0,1)):E(expert.avatar||expert.name.slice(0,1))}</span><b>${E(expert.name)}</b></button><button type="button" class="ad-agent-expert-pin ${expert.pinned?'active':''}" data-r-action="wb-pin-expert" data-id="${E(expert.id)}" aria-label="${expert.pinned?'取消置顶':'置顶'}${E(expert.name)}" title="${expert.pinned?'取消置顶':'置顶'}">⌖</button><details class="ad-agent-expert-menu"><summary aria-label="${E(expert.name)}更多操作">•••</summary><div><button type="button" data-r-action="wb-rename-expert" data-id="${E(expert.id)}">重命名</button><button type="button" data-r-action="wb-delete-expert" data-id="${E(expert.id)}">删除</button><button type="button" data-r-action="wb-expert-new-project" data-id="${E(expert.id)}">新建项目</button><button type="button" data-r-action="wb-expert-new-chat" data-id="${E(expert.id)}">新建对话</button></div></details></div>${projectsForExpert.length?`<div class="ad-agent-expert-projects">${projectsForExpert.map(project=>`<div><button type="button" data-r-action="aw-folder" data-id="${E(project.id)}" title="${E(project.name)}">${icon('folder')}<span>${E(project.name)}</span></button><button type="button" data-r-action="wb-expert-project-chat" data-id="${E(expert.id)}" data-owner="${E(project.id)}" aria-label="在${E(project.name)}中新建对话">＋</button></div>`).join('')}</div>`:''}</div>`;
    };
    const expertRows = experts.map(expertRow).join('') || '<p class="ad-agent-empty-task">还没有专家</p>';
    const historyRows = groups.map(([label, matches]) => {
      const rows = history.filter(matches);
      if (!rows.length) return '';
      return `<section class="ad-agent-history-group"><h3>${label}</h3>${rows.map(({ project, chat }) => `<button type="button" class="ad-agent-history-row ${project.id === state.id && chat.id === state.chatId && !AW.folder ? 'active' : ''}" data-r-action="aw-select-chat" data-id="${E(chat.id)}" data-owner="${E(project.id)}" title="${E(chat.title)}">${E(chat.title)}</button>`).join('')}</section>`;
    }).join('') || '<p class="ad-agent-empty-task">还没有历史对话</p>';

    projects.innerHTML = `
      <section class="ad-agent-side-section">
        <div class="ad-agent-side-label">自动化任务</div>
        ${taskRows}
      </section>
      <section class="ad-agent-side-section ad-agent-expert-section">
        <div class="ad-agent-side-label"><span>专家</span><button type="button" data-r-action="wb-new-expert" aria-label="新建专家">＋</button></div>
        ${expertRows}
      </section>
      <section class="ad-agent-side-section">
        <div class="ad-agent-side-label">历史对话</div>
        ${historyRows}
      </section>
    `;
  }

  function showAdAgentOnly() {
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
