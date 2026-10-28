'use strict';
R.skillTab = 'source';
R.skillQuery = '';
R.skillSelection = null;
R.skillFile = 'SKILL.md';

R.views.skills = function () {
  const header = head('SKILL LIBRARY', '技能管理', '保留原技能文档与文件结构，按需复制到我的技能中编辑。');
  if (!R.catalog) { $('#view').innerHTML = header + R.loading(); return; }
  const list = R.skillTab === 'mine' ? R.data.skills : R.catalog.skills;
  const rows = list.filter(s => (s.name + (s.description || '') + s.id).toLowerCase().includes(R.skillQuery.toLowerCase()));
  $('#view').innerHTML = header + R.tabs([['source', `源码内置 · ${R.catalog.skills.length}`], ['mine', `我的技能 · ${R.data.skills.length}`], ['shared', '共享技能']], R.skillTab, 'skill-tab') +
    (R.skillTab === 'shared' ? R.unavailable('共享技能服务未接入', '原项目的发布、下架、共享授权、安装和同步检查保留在原系统中，由登录账号与管理员权限控制。', '/skill-management') :
      `<div class="toolbar"><input id="skill-search" aria-label="搜索技能" placeholder="搜索名称、描述或标识" value="${E(R.skillQuery)}"><button class="solid" data-r-action="new-skill">＋ 新建技能</button><button data-r-action="import-skill">导入 ZIP / MD</button><input hidden id="skill-file-input" type="file" accept=".zip,.md"></div><p class="release-footnote">${R.skillTab === 'source' ? '来自 release 源码的真实技能，只读保留。查看或复制技能不会执行脚本、发布广告或调用工具。' : '个人技能保存在当前浏览器；保存不代表已经发布或安装到企业 Agent。'}</p><div class="release-skill-list">${rows.map(s => `<button class="release-skill-item" data-r-action="select-skill" data-id="${E(s.id)}"><i>${icon('spark')}</i><span><b>${E(s.name)}</b><small>${E(s.description || '个人技能草稿')}</small><em>${E(s.category || '我的技能')} · ${E(s.id)}</em></span><span>↗</span></button>`).join('') || empty('没有匹配的技能。')}</div>`);
  const input = $('#skill-search');
  if (input) input.oninput = event => {
    R.skillQuery = event.target.value; const cursor = event.target.selectionStart;
    R.views.skills(); $('#skill-search').focus(); $('#skill-search').setSelectionRange(cursor, cursor);
  };
  if ($('#skill-file-input')) $('#skill-file-input').onchange = R.importSkill;
};

R.skillDialog = function (skill, editable) {
  if (editable) skill = structuredClone(skill);
  R.skillSelection = { skill, editable };
  R.skillFile = 'SKILL.md';
  const files = skill.files;
  modal(editable ? '编辑我的技能' : '查看源码技能', editable ? '修改仅保存在个人草稿中；不会自动执行或发布。' : '保留源码文件内容。需要修改时，先复制到我的技能。', [], () => {
    if (editable) { files[R.skillFile] = $('#skill-content').value; skill.updated = now(); const index = R.data.skills.findIndex(s => s.id === skill.id); if (index >= 0) R.data.skills[index] = skill; }
  });
  $('#modal').classList.add('release-skill-dialog');
  $('#modal-fields').innerHTML = `<div class="release-editor-head"><strong>${E(skill.name || skill.id)}</strong><div>${editable ? '' : '<button type="button" data-r-action="copy-skill">复制到我的技能</button>'}<button type="button" data-r-action="download-skill">导出技能${editable ? '文件' : ' ZIP'}</button></div></div><div class="release-editor"><div id="skill-tree">${Object.keys(files).map(file => `<button type="button" data-r-action="skill-file" data-id="${E(file)}" class="${file === R.skillFile ? 'active' : ''}">${E(file)}</button>`).join('')}</div><label class="release-code-label"><span id="skill-filename">SKILL.md</span><textarea id="skill-content" spellcheck="false" ${editable ? '' : 'readonly'} aria-label="技能文件正文">${E(files[R.skillFile] || '')}</textarea></label></div>${editable ? '<button type="button" class="small" data-r-action="delete-skill">删除这个个人草稿</button>' : ''}`;
  $('#save').textContent = editable ? '保存个人草稿' : '关闭';
};
$('#modal').addEventListener('close', () => { $('#modal').classList.remove('release-skill-dialog'); $('#save').textContent = '保存'; });

R.invoke('skill-tab', b => { R.skillTab = b.dataset.id; R.skillQuery = ''; R.views.skills(); });
R.invoke('select-skill', async b => {
  if (R.skillTab === 'mine') return R.skillDialog(R.data.skills.find(s => s.id === b.dataset.id), true);
  const original = await api('/api/release/skill?id=' + encodeURIComponent(b.dataset.id));
  Object.assign(original, R.catalog.skills.find(s => s.id === b.dataset.id));
  R.skillDialog(original, false);
});
R.invoke('skill-file', b => {
  const { skill, editable } = R.skillSelection;
  if (editable) skill.files[R.skillFile] = $('#skill-content').value;
  R.skillFile = b.dataset.id;
  $('#skill-content').value = skill.files[R.skillFile]; $('#skill-filename').textContent = R.skillFile;
  document.querySelectorAll('#skill-tree button').forEach(x => x.classList.toggle('active', x.dataset.id === R.skillFile));
});
R.invoke('copy-skill', () => {
  const copy = structuredClone(R.skillSelection.skill);
  copy.sourceId = copy.id; copy.id = uid(); copy.name += ' · 我的副本';
  R.data.skills.push(copy); persist(); $('#modal').close(); R.skillTab = 'mine'; R.skillQuery = ''; R.views.skills(); toast('已复制完整文本文件，可继续编辑');
});
R.invoke('download-skill', () => {
  const { skill, editable } = R.skillSelection;
  if (!editable) {
    const a = document.createElement('a'); a.href = '/api/release/skill.zip?id=' + encodeURIComponent(skill.id); a.download = skill.id + '.zip'; a.click();
  } else download($('#skill-content').value, R.skillFile.split('/').pop(), 'text/plain');
});
R.invoke('new-skill', () => modal('新建个人技能', '填写用途后创建可编辑的 SKILL.md。', [
  { key: 'name', label: '技能名称', required: true }, { key: 'description', label: '技能用途', multi: true, required: true }
], v => {
  const id = uid();
  R.data.skills.push({ ...v, id, files: { 'SKILL.md': `---\nname: ${JSON.stringify(v.name)}\ndescription: ${JSON.stringify(v.description)}\n---\n\n# ${v.name}\n\n${v.description}\n\n## 工作步骤\n\n请补充技能的输入、步骤和输出。\n` } }); R.skillTab = 'mine'; R.skillQuery = '';
}));
R.invoke('delete-skill', () => {
  const selected = R.skillSelection.skill;
  $('#modal').close();
  modal('删除个人技能草稿', `只删除「${selected.name}」的个人副本，源码内置技能不受影响。`, [], () => { R.data.skills = R.data.skills.filter(s => s.id !== selected.id); });
});
R.invoke('import-skill', () => $('#skill-file-input').click());
R.importSkill = async function () {
  const file = $('#skill-file-input').files[0]; if (!file) return;
  try {
    if (file.size > 4 * 1024 * 1024) throw Error('文件最大 4 MB');
    let imported;
    if (/\.md$/i.test(file.name)) {
      if (file.size > 200000) throw Error('Markdown 文本请控制在 200 KB 以内');
      imported = { name: file.name.replace(/\.md$/i, ''), files: { 'SKILL.md': await file.text() } };
    } else if (/\.zip$/i.test(file.name)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
      imported = await api('/api/release/import-skill', { content: btoa(binary) });
    } else throw Error('请选择 ZIP 或 Markdown 文件');
    R.data.skills.push({ ...imported, id: uid(), description: '从本地文件导入 · 未发布' });
    persist(); R.skillTab = 'mine'; R.skillQuery = ''; R.views.skills(); toast('已导入个人技能；文件未执行');
  } catch (error) { toast(error.message); }
};
