'use strict';
R.agentTab = 'edit';
const promptFields = [['answer_role','回答角色'],['retrieval_strategy','检索策略'],['fact_boundary','事实边界'],['citation_rules','引用规则'],['extra_rules','补充规则']];
R.agentWorking = null;

R.views.agentconfig = function () {
  const header = head('AGENT CONFIGURATION', '模型与提示词', '沿用原项目的配置结构，管理模型、全局提示词和回答模板。');
  if (!R.catalog) { $('#view').innerHTML = header + R.loading(); return; }
  R.agentWorking ??= structuredClone(R.data.agentDraft || R.catalog.agentDefaults);
  const config = R.agentWorking;
  $('#view').innerHTML = header + `<div class="release-summary"><span>公关与知识库资源助手 · 源码默认角色</span>${R.status('本地草稿 · 未发布')}</div>` +
    R.tabs([['edit', '编辑配置'], ['history', '历史版本']], R.agentTab, 'agent-tab') +
    (R.agentTab === 'history' ? `<div class="notice">这里保存本地草稿快照；原系统的发布版本、测试记录和权限在原系统中管理。</div>${R.data.agentHistory.map((revision, i) => `<div class="card"><div class="card-top"><h3>本地草稿版本 ${R.data.agentHistory.length - i}</h3><span class="tag">${E(revision.time)}</span></div><button data-r-action="restore-agent" data-id="${i}">恢复为草稿</button></div>`).join('') || empty('还没有保存的草稿版本。')}` :
      `<form id="agent-config-form" class="release-form"><div class="card"><h3>模型配置</h3><div class="release-form-grid"><label>模型标识<input name="model_key" required value="${E(config.model.model_key)}"></label><label>Temperature<input name="temperature" type="number" min="0" max="2" step="0.1" required value="${E(config.model.parameters?.temperature ?? 0.3)}"></label></div><p>模型标识来自源码配置，不代表当前模型已接通。认证信息由服务端管理。</p></div><div class="card"><h3>全局提示词</h3>${promptFields.map(([key,label]) => `<details ${key === 'answer_role' ? 'open' : ''}><summary>${label}</summary><label><span class="sr-only">${label}</span><textarea name="${key}" rows="7">${E(config.global_prompt[key] || '')}</textarea></label></details>`).join('')}</div><div class="card"><div class="release-section-title"><h3>回答模板 · ${config.templates.length}</h3><button type="button" data-r-action="add-agent-template">＋ 新模板</button></div>${config.templates.map((template,i) => `<details><summary>${E(template.name)}</summary><label>模板名称<input name="template-name-${i}" value="${E(template.name)}" required></label><label>语气<input name="template-tone-${i}" value="${E(template.tone)}"></label><label>模板正文<textarea name="template-body-${i}" rows="5">${E(template.body)}</textarea></label><label>补充指令<textarea name="template-instructions-${i}" rows="2">${E(template.instructions)}</textarea></label><label class="config-choice"><input type="checkbox" name="template-enabled-${i}" ${template.enabled ? 'checked' : ''}>启用此模板（草稿）</label></details>`).join('')}</div><div class="release-actions release-sticky-actions"><button class="solid" type="submit">保存本地草稿</button><button type="button" data-r-action="preview-agent">预览提示词</button><button type="button" data-r-action="export-agent">导出配置</button></div></form>`)
    + `<div class="card"><h3>测试与发布</h3><p>保存本地草稿不会改变助手行为。原项目的测试会话、发布与版本恢复需要登录原系统，并通过对应角色权限校验。</p>${R.nativeButton('/admin/agent-config', '进入原系统测试与发布')}</div>`;
  if ($('#agent-config-form')) {
    $('#agent-config-form').oninput = R.captureAgent;
    $('#agent-config-form').onchange = R.captureAgent;
    $('#agent-config-form').onsubmit = e => {
      e.preventDefault(); R.captureAgent();
      R.data.agentDraft = structuredClone(R.agentWorking);
      R.data.agentHistory.unshift({ time: now(), config: structuredClone(R.agentWorking) });
      R.data.agentHistory = R.data.agentHistory.slice(0, 20); persist(); toast('本地草稿已保存，尚未测试或发布');
    };
  }
};
R.captureAgent = function () {
  const form = $('#agent-config-form'); if (!form) return;
  const data = new FormData(form), config = R.agentWorking;
  config.model.model_key = data.get('model_key');
  config.model.parameters ??= {}; config.model.parameters.temperature = Number(data.get('temperature'));
  for (const [key] of promptFields) config.global_prompt[key] = data.get(key);
  config.templates.forEach((template,i) => {
    for (const field of ['name','tone','body','instructions']) template[field] = data.get(`template-${field}-${i}`);
    template.enabled = data.has(`template-enabled-${i}`);
  });
};
R.invoke('agent-tab', b => { R.captureAgent(); R.agentTab = b.dataset.id; R.views.agentconfig(); });
R.invoke('add-agent-template', () => { R.captureAgent(); R.agentWorking.templates.push({id:uid(), name:'新模板', tone:'', body:'', instructions:'', enabled:false}); R.views.agentconfig(); });
R.invoke('export-agent', () => { R.captureAgent(); download(JSON.stringify(R.agentWorking,null,2),'agent-config-draft.json'); });
R.invoke('preview-agent', () => {
  R.captureAgent(); modal('提示词预览', '仅拼接当前草稿文本，不调用模型。', [{key:'preview',label:'全局提示词',multi:true,max:100000,value:promptFields.map(([key,label])=>`【${label}】\n${R.agentWorking.global_prompt[key]}`).join('\n\n')}],()=>{});
  $('#modal-fields textarea').readOnly = true; $('#save').textContent = '关闭';
});
R.invoke('restore-agent', b => { R.agentWorking = structuredClone(R.data.agentHistory[Number(b.dataset.id)].config); R.agentTab='edit'; R.views.agentconfig(); toast('已恢复到编辑区，保存后写入本地草稿'); });
