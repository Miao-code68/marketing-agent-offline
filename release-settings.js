'use strict';
R.setting = 'overview';
const settingsSections = [['overview', '设置总览'], ['knowledge', '知识库'], ['connectors', '连接器与工具'], ['models', '模型与提示词'], ['preferences', '通知与外观'], ['services', '原系统服务'], ['account', '账号与权限']];

R.settingsOverview = () => `<div class="release-section-title"><h2>工作空间设置</h2><span class="tag">当前为本地空间</span></div><p>在这里管理公共能力；各项目独立选择知识、连接器和对话上下文。</p><div class="release-settings-grid">${[
  ['knowledge', 'book', '知识库', `${workspace.knowledge.length} 个本地知识库 · 企业知识入口`],
  ['connectors', 'link', '连接器与工具', '广告解析、MCP 与数据源'],
  ['models', 'spark', '模型与提示词', '模型选择、全局提示词、回答模板'],
  ['preferences', 'pen', '通知与外观', '任务通知、主题色与明暗模式'],
  ['services', 'folder', '原系统服务', '营销 Agent 与知识子应用入口'],
  ['account', 'shield', '账号与权限', '用量、管理后台和账号状态']
].map(([id, glyph, title, detail]) => `<button data-r-action="settings-tab" data-id="${id}">${icon(glyph)}<b>${title}</b><small>${detail}</small><span>↗</span></button>`).join('')}</div><div class="release-settings-links"><a href="#skills">技能管理 →</a><a href="#automation">自动化任务 →</a><a href="#usage">用量查看 →</a><a href="#admin">管理后台 →</a></div><div class="release-actions"><button data-new-knowledge class="soft">＋ 新建知识库</button><button data-route="projectcap" class="small">项目能力配置 →</button></div>`;

R.connectorSettings = () => `<h2>连接器与工具</h2><div class="card"><div class="card-top"><h3>广告导出文件解析器</h3><span class="tag">本地可用</span></div><p>沿用 Claude Ads 的 CSV / JSON 解析与结构校验，读取你选择的文件。</p><button class="soft" data-route="data">导入数据 →</button></div><div class="card"><div class="card-top"><h3>原项目工具管理</h3>${R.status()}</div><p>包含基础工具、技能工具、知识库、记忆、子代理，以及 MCP 服务器与工具目录。工具敏感度与授权沿用原管理后台。</p>${R.nativeButton('/admin/tools', '打开工具与 MCP 管理')}</div><div class="card"><h3>数据源管理</h3><p>注册数据表、敏感等级、行级权限和用户授权。</p>${R.nativeButton('/admin/datasources')}</div><div class="release-section-title"><h3>项目连接需求</h3><button class="small" id="add-connector">＋ 登记连接器需求</button></div>${workspace.connectors.map(c => `<div class="card"><div class="card-top"><h3>${E(c.name)}</h3>${R.status('未授权连接')}</div><p>${E(c.type)} · ${E(c.purpose)}</p></div>`).join('') || '<p>还没有连接需求。登记只保存用途，接入与授权需由对应服务完成。</p>'}`;

R.serviceSettings = () => `<h2>原系统服务</h2><p>填写已有服务的网页入口后，可以从工作台进入原有完整模块。登录和权限校验仍由原系统负责。</p><form id="service-form" class="release-form"><label>营销 Agent 应用地址<input name="app" placeholder="https://你的原系统域名" value="${E(R.data.services.app)}" type="url"></label><label>企业知识空间完整地址<input name="knowledge" placeholder="https://你的域名/mkt-knowledge-biz/knowledge" value="${E(R.data.services.knowledge)}" type="url"></label><p class="release-footnote">地址登记不会建立 API 连接，也不会复制登录凭证。本地服务可使用 HTTP，远程服务使用 HTTPS。</p><button class="solid">保存服务入口</button></form><div class="notice">${R.data.services.app ? '已登记原系统入口；尚未验证登录及服务状态。' : '当前未配置原系统。实时 AI、企业数据、任务调度和管理员操作尚不可用。'}</div>`;

const primaryColors = { red:'#ef4444', orange:'#f97316', amber:'#d89b17', yellow:'#b99812', lime:'#729b25', green:'#24955b', emerald:'#059669', teal:'#0d9488', cyan:'#0891b2', sky:'#0284c7', blue:'#2f6ef2', indigo:'#6366f1', violet:'#8b5cf6', purple:'#a855f7', fuchsia:'#c946cc', pink:'#db4d8e', rose:'#e64e74' };
R.applyPreferences = () => {
  const p = R.data.preferences;
  document.documentElement.dataset.appearance = p.appearance;
  document.documentElement.dataset.neutral = p.neutral;
  document.documentElement.style.setProperty('--release-accent', primaryColors[p.primary] || primaryColors.blue);
};
R.preferenceSettings = () => {
  const p = R.data.preferences;
  return `<h2>通知与外观</h2><div class="card"><label class="config-choice"><input id="notification-pref" type="checkbox" ${p.notifications ? 'checked' : ''}><span>接收任务通知<small>本地偏好。原系统通知仍需登录后设置并完成 IM 绑定。</small></span></label>${R.nativeButton('/chat', '前往原系统设置通知')}</div><div class="card"><h3>外观</h3><div class="setting-tabs"><button data-r-action="appearance" data-id="light" class="${p.appearance === 'light' ? 'active' : ''}">浅色</button><button data-r-action="appearance" data-id="dark" class="${p.appearance === 'dark' ? 'active' : ''}">深色</button></div><h3>主题色</h3><div class="release-colors">${Object.entries(primaryColors).map(([id,color]) => `<button style="--swatch:${color}" data-r-action="primary-color" data-id="${id}" aria-label="主题色 ${id}" aria-pressed="${p.primary === id}" title="${id}">${p.primary === id ? '✓' : ''}</button>`).join('')}</div><label class="release-label">中性色<select id="neutral-pref">${['slate','gray','zinc','neutral','stone'].map(value => `<option ${p.neutral === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><p>默认沿用蓝色磨砂样式；外观偏好会保存在此浏览器。</p></div>`;
};
R.accountSettings = () => `<h2>账号与权限</h2><div class="card"><h3>本地工作空间</h3><p>尚未登录原系统。当前项目和对话保存在此浏览器，没有已验证的企业角色或管理权限。</p>${R.nativeButton('/chat', '进入原系统登录')}</div><div class="release-settings-links"><a href="#usage">用量查看 →</a><a href="#admin">管理后台 →</a><a href="#agentconfig">Agent 模型/提示词 →</a></div><div class="card"><h3>更多原有入口</h3><p>评测 Agent 依赖独立评测应用；安装营销 Agent SKILL 入口需在原系统中使用。此处不代执行安装命令。</p>${R.nativeButton('/mkt-eval-agent/list', '评测 Agent')} ${R.nativeButton('/chat', '安装营销 Agent SKILL')}</div>`;

R.views.settings = function () {
  const content = {
    overview: R.settingsOverview, knowledge: () => `<h2>知识库</h2><div class="release-actions"><button data-route="knowledge" class="soft">打开知识库管理 →</button><button data-r-action="enterprise-settings" class="small">企业知识空间</button></div>${R.localKnowledge()}`,
    connectors: R.connectorSettings, models: () => `<h2>模型与提示词</h2><p>原项目的模型配置、五类全局提示词、回答模板与历史版本独立保留。</p><div class="card"><h3>Agent 配置草稿</h3><p>可读取源码默认配置、编辑并导出本地草稿。模型测试与发布需要原系统服务及对应权限。</p><button class="solid" data-route="agentconfig">管理模型与提示词 →</button></div>`,
    preferences: R.preferenceSettings, services: R.serviceSettings, account: R.accountSettings
  }[R.setting] || R.settingsOverview;
  $('#view').innerHTML = head('WORKSPACE SETTINGS', '设置中心', '知识、工具、模型与权限，都有各自清晰的位置。') +
    `<div class="release-settings"><nav aria-label="设置分类">${settingsSections.map(([id, title]) => `<button data-r-action="settings-tab" data-id="${id}" class="${R.setting === id ? 'active' : ''}">${title}</button>`).join('')}</nav><section id="settings-content">${content()}</section></div>`;
  R.bindKnowledge();
  if ($('#service-form')) $('#service-form').onsubmit = e => {
    e.preventDefault();
    try {
      const form = Object.fromEntries(new FormData(e.target));
      const values = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, v.trim() ? R.validateURL(v.trim()) : '']));
      R.data.services = values; persist(); R.views.settings(); toast('入口已保存，服务状态未验证');
    } catch (error) { toast(error.message); }
  };
  if ($('#notification-pref')) $('#notification-pref').onchange = e => { R.data.preferences.notifications = e.target.checked; persist(); toast('已保存本地通知偏好，未修改原系统通知'); };
  if ($('#neutral-pref')) $('#neutral-pref').onchange = e => { R.data.preferences.neutral = e.target.value; persist(); R.applyPreferences(); };
};
settingsView = R.views.settings;
R.invoke('settings-tab', b => { R.setting = b.dataset.id; R.views.settings(); });
R.invoke('enterprise-settings', () => { R.knowledgeTab = 'enterprise'; location.hash = 'knowledge'; });
R.invoke('appearance', b => { R.data.preferences.appearance = b.dataset.id; persist(); R.applyPreferences(); R.views.settings(); });
R.invoke('primary-color', b => { R.data.preferences.primary = b.dataset.id; persist(); R.applyPreferences(); R.views.settings(); });
R.applyPreferences();
