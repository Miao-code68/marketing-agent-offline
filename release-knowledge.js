'use strict';
R.knowledgeTab = 'local';
R.knowledgeSearch = '';

R.localKnowledge = function () {
  const rows = workspace.knowledge.filter(k => (k.name + k.content).toLowerCase().includes(R.knowledgeSearch.toLowerCase()));
  return `<div class="toolbar"><input id="knowledge-search" aria-label="搜索知识" placeholder="搜索名称与正文" value="${E(R.knowledgeSearch)}"><button class="solid" data-new-knowledge>＋ 新建知识库</button><button data-r-action="import-knowledge">导入文档</button><input hidden id="knowledge-file" type="file" accept=".txt,.md,.csv"></div>
    <div class="release-summary"><span>${workspace.knowledge.length} 个本地知识库</span><a href="#projectcap">分配给项目 →</a></div>
    ${rows.map(k => `<article class="card knowledge-card"><div class="card-top"><h3>${icon('book')}${E(k.name)}</h3><span class="tag">本地文本</span></div><p>${E(k.content.slice(0, 180))}${k.content.length > 180 ? '…' : ''}</p><div class="release-meta">${k.content.length.toLocaleString()} 字 · ${workspace.projects.filter(p => p.bindings?.knowledge?.includes(k.id)).length} 个项目已绑定${k.filename ? ' · ' + E(k.filename) : ''}</div><div class="release-actions"><button class="small" data-edit-knowledge="${k.id}">编辑知识库</button><button class="small" data-r-action="export-knowledge" data-id="${k.id}">导出</button><button class="small" data-r-action="delete-knowledge" data-id="${k.id}">删除</button></div></article>`).join('') || empty('尚无匹配的本地知识。可以导入品牌规范、产品说明或内容方法。')}
    <p class="release-footnote">本地文本可供项目和对话引用，支持文字搜索。原系统的文件解析、分类权限、向量检索和引用溯源由独立知识服务提供。</p>`;
};

R.bindKnowledge = function () {
  const search = $('#knowledge-search');
  if (search) search.oninput = event => {
    R.knowledgeSearch = event.target.value;
    const start = event.target.selectionStart;
    R.views[page]();
    $('#knowledge-search').focus(); $('#knowledge-search').setSelectionRange(start, start);
  };
  const file = $('#knowledge-file');
  if (file) file.onchange = async () => {
    try {
      const item = file.files[0]; if (!item) return;
      if (!/\.(txt|md|csv)$/i.test(item.name) || item.size > 120000) throw Error('请导入 120 KB 以内的 TXT、Markdown 或 CSV 文本。');
      const content = await item.text();
      if (!content.trim() || content.includes('\u0000')) throw Error('文档为空或不是有效文本。');
      workspace.knowledge.push({ id: uid(), name: item.name.replace(/\.[^.]+$/, ''), content, filename: item.name });
      persist(); render(); toast('文档已导入本地知识库');
    } catch (error) { toast(error.message); }
  };
};

R.enterpriseKnowledge = function () {
  const address = R.data.services.knowledge;
  return `<div class="card"><div class="card-top"><h3>企业知识空间</h3>${R.status(address ? '已登记入口 · 登录状态未验证' : '待接入独立知识服务')}</div><p>管理原项目知识分类、文档及附件，沿用原系统的访问权限和检索引用。</p><div class="release-feature-grid">${[['分类与资源','知识分类、文件与附件管理'],['检索与引用','知识检索、片段引用和来源定位'],['预览与下载','文档预览和授权下载入口'],['访问控制','沿用原系统账号与资源权限']].map(([name, desc]) => `<div><b>${name}</b><small>${desc}</small></div>`).join('')}</div>${address ? `<p class="release-url">${E(address)}</p><button class="solid" data-r-action="open-knowledge">打开企业知识空间 ↗</button>` : R.unavailable('知识服务尚未接入', '原项目将知识库作为独立应用嵌入。当前提供的源码不包含该子应用，需要配置已有知识服务入口。', '/knowledge')}</div>`;
};

R.views.knowledge = function () {
  $('#view').innerHTML = head('KNOWLEDGE WORKSPACE', '知识库管理', '统一管理长期知识，再按项目和对话选择使用范围。') +
    R.tabs([['local', '本地知识'], ['enterprise', '企业知识空间']], R.knowledgeTab, 'knowledge-tab') +
    (R.knowledgeTab === 'local' ? R.localKnowledge() : R.enterpriseKnowledge());
  R.bindKnowledge();
};
R.invoke('knowledge-tab', b => { R.knowledgeTab = b.dataset.id; R.views.knowledge(); });
R.invoke('import-knowledge', () => $('#knowledge-file').click());
R.invoke('open-knowledge', () => window.open(R.validateURL(R.data.services.knowledge), '_blank', 'noopener,noreferrer'));
R.invoke('export-knowledge', b => { const k = workspace.knowledge.find(k => k.id === b.dataset.id); download(k.content, k.name.replace(/[\\/]/g, '-') + '.md', 'text/markdown'); });
R.invoke('delete-knowledge', b => {
  const k = workspace.knowledge.find(k => k.id === b.dataset.id);
  modal('删除本地知识库', `将删除「${k.name}」，并解除所有项目和对话中的绑定。已保存的消息摘录不变。`, [], () => {
    workspace.knowledge = workspace.knowledge.filter(k => k.id !== b.dataset.id);
    for (const project of workspace.projects) {
      if (project.bindings?.knowledge) project.bindings.knowledge = project.bindings.knowledge.filter(id => id !== b.dataset.id);
      for (const c of project.chats || []) if (c.knowledge) c.knowledge = c.knowledge.filter(id => id !== b.dataset.id);
    }
  });
});
