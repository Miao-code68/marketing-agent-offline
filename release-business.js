'use strict';
R.attributionTab = 'overview';
R.metricSearch = '';
R.metricSelection = ['materialName','materialId','adPlatformName','cost','click','showNum'];

R.views.attribution = function () {
  const header = head('CONTENT ATTRIBUTION', '内容归因分析', '沿用原项目的内容分类、素材维度和指标口径。');
  if (!R.catalog) { $('#view').innerHTML = header + R.loading(); return; }
  $('#view').innerHTML = header + `<div class="setting-tabs">${R.catalog.categories.map(c=>`<button ${c.enabled?'class="active"':'disabled title="原项目中暂未开放"'}>${c.name}</button>`).join('')}</div>` +
    R.tabs([['overview','素材总览'],['reports','归因管理'],['metrics','指标字典']], R.attributionTab, 'attribution-tab') +
    (R.attributionTab === 'metrics' ? `<div class="toolbar"><input id="metric-search" aria-label="搜索指标" placeholder="搜索指标名称、字段或解释" value="${E(R.metricSearch)}"><button data-r-action="export-metrics">导出指标字典</button></div><div id="metric-list"></div>` : R.attributionTab === 'reports' ?
      R.unavailable('归因报告服务尚未接入','原项目的素材上传、归因任务、报告详情与导出依赖业务数据服务。当前没有可展示的真实归因记录。','/content-attribution') :
      `<div class="card"><h3>素材筛选</h3><form id="attribution-filter" class="release-form-grid"><label>开始日期<input name="start" type="date" value="${E(R.data.attributionFilters?.start || '')}"></label><label>结束日期<input name="end" type="date" value="${E(R.data.attributionFilters?.end || '')}"></label>${R.catalog.dimensions.slice(0,4).map(d=>`<label>${E(d.label)}<select disabled><option>待数据服务提供选项</option></select></label>`).join('')}<button class="small">保存筛选条件</button></form></div><div class="card"><div class="release-section-title"><h3>素材数据</h3><button class="small" data-r-action="choose-metrics">选择指标</button></div><div class="release-table-wrap"><table><thead><tr>${R.metricSelection.map(prop=>`<th>${E(R.catalog.columns.find(c=>c.prop===prop)?.label||prop)}</th>`).join('')}</tr></thead><tbody><tr><td colspan="${R.metricSelection.length}"><div class="empty">暂无已接入的素材数据</div></td></tr></tbody></table></div>${R.nativeButton('/content-attribution','进入原系统素材总览')}</div>`);
  if ($('#metric-search')) { R.drawMetrics(); $('#metric-search').oninput=e=>{R.metricSearch=e.target.value;R.drawMetrics();}; }
  if ($('#attribution-filter')) $('#attribution-filter').onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(v.start&&v.end&&v.start>v.end)return toast('结束日期不能早于开始日期');R.data.attributionFilters=v;persist();toast('筛选条件已保存，尚未查询业务数据');};
};
R.drawMetrics = () => {
  const rows=R.catalog.columns.filter(c=>(c.label+c.prop+(c.tip||'')).toLowerCase().includes(R.metricSearch.toLowerCase()));
  $('#metric-list').innerHTML=`<p class="release-footnote">${rows.length} 个源码指标。解释直接取自原配置，未根据演示数据计算。</p>`+rows.map(c=>`<div class="release-dictionary-row"><div><b>${E(c.label)}</b><code>${E(c.prop)}</code><small>${E(c.classifyName||'')}</small></div><p>${E(c.tip||'源码未单独定义计算说明。')}</p></div>`).join('');
};
R.invoke('attribution-tab',b=>{R.attributionTab=b.dataset.id;R.views.attribution();});
R.invoke('export-metrics',()=>download(JSON.stringify({columns:R.catalog.columns,dimensions:R.catalog.dimensions},null,2),'attribution-metrics.json'));
R.invoke('choose-metrics',()=>{
  modal('选择素材指标','指标名称与说明来自源码。选择只改变本地表头。',[],()=>{R.metricSelection=[...document.querySelectorAll('[data-metric-choice]:checked')].map(x=>x.value);if(!R.metricSelection.length)R.metricSelection=['materialName'];});
  $('#modal-fields').innerHTML=`<div class="release-metric-choices">${R.catalog.columns.map(c=>`<label><input type="checkbox" data-metric-choice value="${E(c.prop)}" ${R.metricSelection.includes(c.prop)?'checked':''}>${E(c.label)}</label>`).join('')}</div>`;
});

R.taskFilter='all';
R.views.automation = function () {
  const tasks=R.data.tasks.filter(t=>t.projectId===state.id&&(R.taskFilter==='all'||t.status===R.taskFilter));
  $('#view').innerHTML=head('AUTOMATION', '自动化', '保留原项目的执行指令、Agent 角色、周期任务和一次性任务配置。')+
    `<div class="release-stats">${['运行中','已暂停','今日执行','凭证过期'].map(title=>`<div><small>${title}</small><b>—</b><span>调度服务未接入</span></div>`).join('')}</div><div class="toolbar"><select id="task-filter" aria-label="任务筛选"><option value="all">全部本地草稿</option value="draft" ${R.taskFilter==='draft'?'selected':''}>待启用</option><option value="paused" ${R.taskFilter==='paused'?'selected':''}>已暂停的草稿</option></select><button class="solid" data-r-action="new-task">＋ 创建任务草稿</button>${R.nativeButton('/automationtask','原系统任务管理')}</div><div class="notice">本地只保存任务配置，不会后台执行。原系统提供启停、立即执行、执行历史和通知；接入后须在原系统启用。</div><div class="release-table-wrap"><table><thead><tr><th>任务</th><th>状态</th><th>调度</th><th>上次执行</th><th>操作</th></tr></thead><tbody>${tasks.map(t=>`<tr><td><b>${E(t.title)}</b><small>${E(t.role)}</small></td><td>${t.status==='paused'?'草稿已暂停':'草稿待启用'}</td><td>${E(t.schedule)}</td><td>未执行</td><td><button data-r-action="edit-task" data-id="${t.id}">编辑</button><button data-r-action="pause-task" data-id="${t.id}">${t.status==='paused'?'恢复草稿':'暂停草稿'}</button><button data-r-action="task-history" data-id="${t.id}">记录</button><button data-r-action="export-task" data-id="${t.id}">导出</button><button data-r-action="delete-task" data-id="${t.id}">删除</button></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">当前项目还没有任务草稿。</div></td></tr>'}</tbody></table></div><div class="release-actions"><button data-route="autopilot">查看智能托管规则 →</button><button data-route="goalworkspace">原项目目标工作区 →</button></div>`;
  $('#task-filter').onchange=e=>{R.taskFilter=e.target.value;R.views.automation();};
};
R.taskForm = function (id) {
  const task=R.data.tasks.find(t=>t.id===id)||{};
  modal(id?'编辑任务草稿':'创建任务草稿','配置属于当前项目。保存不会启用调度或发送通知。',[
    {key:'title',label:'任务标题',required:true,value:task.title},
    {key:'prompt',label:'执行指令',multi:true,required:true,value:task.prompt},
    {key:'role',label:'Agent 角色',options:['默认营销 Agent','公关与知识库资源助手','设计 Agent'],value:task.role},
    {key:'trigger',label:'任务类型',options:['周期任务','一次性'],value:task.trigger},
    {key:'schedule',label:'执行安排（含时区）',value:task.schedule||'每周一 09:00 · Asia/Shanghai',required:true},
    {key:'notification',label:'通知要求',value:task.notification||'未绑定 IM，仅保存执行结果'}
  ],v=>{if(id)Object.assign(task,v);else R.data.tasks.push({...v,id:uid(),projectId:state.id,status:'draft',created:now()});});
};
R.invoke('new-task',()=>R.taskForm());
R.invoke('edit-task',b=>R.taskForm(b.dataset.id));
R.invoke('pause-task',b=>{const t=R.data.tasks.find(t=>t.id===b.dataset.id);t.status=t.status==='paused'?'draft':'paused';persist();render();});
R.invoke('task-history',b=>{const t=R.data.tasks.find(t=>t.id===b.dataset.id);modal('任务记录','本地草稿创建于 '+t.created+'。调度服务未接入，无真实执行记录。',[],()=>{});});
R.invoke('export-task',b=>download(JSON.stringify(R.data.tasks.find(t=>t.id===b.dataset.id),null,2),'scheduled-task-draft.json'));
R.invoke('delete-task',b=>modal('删除任务草稿','仅删除当前本地草稿，不影响原系统任务。',[],()=>{R.data.tasks=R.data.tasks.filter(t=>t.id!==b.dataset.id);}));

R.adminId='/admin/users';
const adminDetails={
  '/admin/users':['用户列表、状态、角色、说明、资源授权与历史','用户、角色、状态、操作'],
  '/admin/roles':['角色成员、菜单权限、工具、技能与知识资源授权','角色、成员、资源权限'],
  '/admin/skills':['共享技能、授权与管理员推送','技能、发布者、授权范围、更新时间'],
  '/admin/tools':['基础、技能、知识库、记忆、子代理和 MCP 工具；敏感度与同步','工具名称、类型、敏感度、MCP 服务器'],
  '/admin/knowledge':['企业知识库的资源、分类与访问管理','由独立知识应用提供'],
  '/admin/datasources':['数据表注册、敏感等级、行级规则与用户权限','表名、敏感等级、行权限、授权用户'],
  '/admin/scheduled-tasks':['跨用户任务管理及运行记录','任务、用户、状态、调度、最近执行'],
  '/admin/im-bindings':['只读查看 IM 身份与登录绑定状态','用户、IM 身份、绑定状态'],
  '/admin/role-bindings':['只读查看用户角色绑定','用户、Agent 角色、绑定来源'],
  '/admin/release-versions':['维护与查看产品版本说明','版本号、说明、发布时间'],
  '/admin/audit-logs':['查询后台操作的审计记录','操作者、动作、对象、时间']
};
R.views.admin=function(){
  const header=head('ADMINISTRATION','管理后台','保留原项目完整的管理模块，实际权限由原系统校验。');
  if(!R.catalog){$('#view').innerHTML=header+R.loading();return;}
  const item=R.catalog.admin.find(x=>x.to===R.adminId)||R.catalog.admin[0],details=adminDetails[item.to];
  $('#view').innerHTML=header+`<div class="release-settings release-admin"><nav aria-label="管理模块">${R.catalog.admin.map(x=>`<button data-r-action="admin-tab" data-id="${x.to}" class="${x.to===item.to?'active':''}">${E(x.label)}</button>`).join('')}</nav><section><div class="release-section-title"><h2>${E(item.label)}</h2>${R.status('需原系统授权')}</div><p>${E(details?.[0]||'保留原项目管理功能。')}</p><div class="card"><h3>访问范围</h3><p>${item.superAdminOnly?'仅超级管理员可用。':'需要管理员身份与对应菜单权限。'}当前本地空间没有经过验证的企业权限。</p></div><div class="card"><h3>原有管理内容</h3><p>${E(details?.[1]||'')}</p>${R.nativeButton(item.to,'打开'+item.label)}</div><p class="release-footnote">本页只展示保留的模块结构，不会读取企业用户、授予角色或修改后台数据。</p></section></div>`;
};
R.invoke('admin-tab',b=>{R.adminId=b.dataset.id;R.views.admin();});
R.views.usage=function(){
  $('#view').innerHTML=head('USAGE','用量查看','保留按会话、模型与时间范围查看输入、输出、缓存和费用的入口。')+`<div class="toolbar"><select aria-label="用量时间范围"><option>最近 7 天</option><option>最近 30 天</option><option>自定义日期</option></select><input aria-label="用量开始日期" type="date"><input aria-label="用量结束日期" type="date">${R.nativeButton('/usage','查询原系统用量')}</div><div class="release-stats">${['输入 Tokens','输出 Tokens','缓存 Tokens','总费用'].map(label=>`<div><small>${label}</small><b>—</b><span>尚无服务数据</span></div>`).join('')}</div><div class="release-table-wrap"><table><thead><tr>${['时间','会话','模型 / 子 Agent','总 Tokens','费用'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody><tr><td colspan="5"><div class="empty">原系统用量服务尚未接入。缺失数据不等于零消耗。</div></td></tr></tbody></table></div>`;
};
R.views.goalworkspace=function(){
  $('#view').innerHTML=head('GOAL WORKSPACE','目标工作区','保留原项目的目标会话、阶段进度、计划和产物入口。')+`<div class="card"><h3>目标 → 阶段 → 产物</h3><p>原项目由 Agent 服务与实时消息驱动目标推进，阶段产物关联至对应目标。当前营销项目计划与成果仍在本地工作流中保留。</p>${R.nativeButton('/chat','打开原系统目标工作区')}<button data-route="plan">本地营销计划 →</button></div>`;
};
// 自动化与智能托管相互可达，保留两者原有职责。
const originalAutopilot=autopilotView;
autopilotView=function(){originalAutopilot();$('#view').insertAdjacentHTML('afterbegin','<div class="release-summary"><span>规则与任务相互配合</span><a href="#automation">自动化任务管理 →</a></div>');};
render();
