'use strict';
// 原项目模块单独注册，避免替换既有项目数据或营销流程。
window.releaseViews = {};
window.Release = {
  catalog: null, error: '', actions: {}, views: window.releaseViews,
  get data() { return workspace.release; },
  save() { persist(); },
  invoke(name, callback) { this.actions[name] = callback; },
  tabs(items, active, action) {
    return `<div class="setting-tabs">${items.map(([id, label]) => `<button data-r-action="${action}" data-id="${id}" class="${id === active ? 'active' : ''}" aria-pressed="${id === active}">${E(label)}</button>`).join('')}</div>`;
  },
  status(text = '原系统未接入') { return `<span class="tag gold">${text}</span>`; },
  unavailable(title, detail, path) {
    return `<div class="release-empty"><span>${icon('link')}</span><h3>${E(title)}</h3><p>${E(detail)}</p>${this.nativeButton(path)}<button data-r-action="service-settings" class="small">设置服务入口</button></div>`;
  },
  nativeButton(path, text = '在原系统中打开') {
    return `<button class="soft" data-r-action="open-native" data-id="${E(path)}" ${this.data.services.app ? '' : 'disabled'} title="${this.data.services.app ? '由原系统登录并校验权限' : '请先配置原系统地址'}">${E(text)} ↗</button>`;
  },
  validateURL(value) {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw Error('请填写不含账号、密码和查询参数的服务地址。');
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw Error('远程服务请使用 HTTPS；本机服务可使用 HTTP。');
    return url.href.replace(/\/$/, '');
  },
  nativeURL(path) {
    if (!/^\/[a-z0-9/-]*$/i.test(path)) throw Error('不支持的原系统页面');
    return this.validateURL(this.data.services.app) + path;
  },
  async load() {
    try { this.catalog = await api('/api/release/catalog'); this.error = ''; }
    catch (error) { this.error = error.message; }
    if (this.views[page]) render();
  },
  loading() {
    return this.error ? `<div class="notice">源码目录读取失败：${E(this.error)} <button data-r-action="reload-source">重试</button></div>` : '<div class="empty" role="status">正在读取原项目模块…</div>';
  }
};
const R = window.Release;
workspace.release ??= { version: 1, services: { app: '', knowledge: '' }, preferences: { notifications: false, appearance: 'light', primary: 'blue', neutral: 'slate' }, skills: [], tasks: [], agentDraft: null, agentHistory: [] };
Object.assign(pages, {
  settings: ['link', '设置中心'],
  knowledge: ['book', '知识库管理'], skills: ['spark', '技能管理'],
  attribution: ['chart', '内容归因分析'], automation: ['bot', '自动化'],
  usage: ['chart', '用量查看'], admin: ['shield', '管理后台'],
  agentconfig: ['spark', '模型与提示词'], goalworkspace: ['target', '目标工作区']
});

const marketingRender = render;
render = function () {
  marketingRender();
  if (R.renderNavigation) R.renderNavigation();
  if ($('#workspace-settings')) $('#workspace-settings').innerHTML = `${icon('link')} 设置中心 <span>↗</span>`;
  const mini = $('.panel-mini');
  if (mini) mini.insertAdjacentHTML('beforeend', '<a href="#knowledge">知识库管理 →</a><a href="#skills">技能与工具 →</a>');
};
R.invoke('service-settings', () => { R.setting = 'services'; location.hash = 'settings'; render(); });
R.invoke('open-native', b => window.open(R.nativeURL(b.dataset.id), '_blank', 'noopener,noreferrer'));
R.invoke('reload-source', () => R.load());
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-r-action]');
  if (!button || button.disabled) return;
  try { await R.actions[button.dataset.rAction]?.(button); }
  catch (error) { toast(error.message); }
});

// 原项目会话管理：搜索、置顶、重命名和删除仅作用于当前项目。
drawHistory = function (query) {
  const today = new Date().setHours(0, 0, 0, 0);
  const groups = [['置顶', c => c.pinned], ['今天', c => !c.pinned && c.created >= today], ['昨天', c => !c.pinned && c.created < today && c.created >= today - 86400000], ['更早', c => !c.pinned && c.created < today - 86400000]];
  $('#chat-list').innerHTML = groups.map(([title, predicate]) => {
    const rows = state.chats.filter(c => predicate(c) && (c.title + JSON.stringify(c.messages)).toLowerCase().includes(query.toLowerCase()));
    return rows.length ? `<h3 class="setting-heading">${title}</h3>${rows.map(c => `<div class="release-session"><button class="session-item ${c.id === state.chatId ? 'active' : ''}" data-session="${c.id}"><b>${E(c.title)}</b><small>${c.messages.length} 条消息 · ${E(new Date(c.created).toLocaleDateString('zh-CN'))}</small></button><div class="release-session-actions"><button data-r-action="pin-chat" data-id="${c.id}">${c.pinned ? '取消置顶' : '置顶'}</button><button data-r-action="rename-chat" data-id="${c.id}">重命名</button><button data-r-action="delete-chat" data-id="${c.id}">删除</button></div></div>`).join('')}` : '';
  }).join('') || empty('没有匹配的历史对话。');
};
R.invoke('pin-chat', b => {
  const c = state.chats.find(c => c.id === b.dataset.id); c.pinned = !c.pinned;
  persist(); drawHistory($('#chat-search').value);
});
R.invoke('rename-chat', b => {
  const c = state.chats.find(c => c.id === b.dataset.id);
  modal('重命名对话', '对话仍归属于当前项目。', [{ key: 'title', label: '对话名称', value: c.title, required: true, max: 50 }], v => c.title = v.title.trim());
});
R.invoke('delete-chat', b => modal('删除对话', '只删除这段本地对话及其未发送草稿，不影响项目成果。', [], () => {
  state.chats = state.chats.filter(c => c.id !== b.dataset.id);
  state.messages = [];
  ensureProject();
  if (!state.chats.some(c => c.id === state.chatId)) state.chatId = state.chats[0].id;
  state.messages = chat().messages;
}));
R.load();
