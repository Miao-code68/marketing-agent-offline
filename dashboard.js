'use strict';
const D=window.DashboardModel;
workspace.dashboard??={version:1,tasks:[],ideas:[]};
workspace.dashboard.videos??=[];
pages.assistant=['folder','工作台'];
pages.deliverables=['folder','成片库'];
navigationGroups.find(g=>g.id==='content').routes.push('deliverables');
R.taskHomeFilter='pending';
R.ideaHomeTab='methods';
R.homeDraftFilter='all';
R.homeTaskLimit=8;R.homeIdeaLimit=6;R.homeDraftLimit=3;
const homeAction=(action,label,id='',className='')=>`<button class="${className}" data-r-action="${action}" data-id="${E(id)}">${label}</button>`;

function homeProductionFlow(){
  return `<section class="dash-production" aria-label="内容生产流程"><div class="dash-section-head"><div><h2>把灵感，变成可以发布的内容</h2><p>从任意一步开始，接着完成下一步。</p></div><span class="dash-flow-label">灵感 → 素材 → 成片 → 发布</span></div><div class="dash-production-grid">${[
    ['inspiration','spark','找灵感','从选题方法、已有资料中找到方向','选题 · 收藏 · 内容洞察','查看灵感'],
    ['production','pen','生产素材','把选题写成文案、脚本与创作草稿','文案 / 脚本可用 · 图片视频待接入','开始制作'],
    ['deliverables','folder','成片库','集中整理已完成的视频与审核状态','成片链接 · 已锁定文稿','管理成片'],
    ['publishing','bot','托管发布','选定内容，安排渠道、频率与审核人','规则草案可用 · 自动发布待接入','配置发布']
  ].map(([id,glyph,title,desc,note,cta],i)=>`<button class="dash-flow-card flow-${id}" data-r-action="production-step" data-id="${id}"><span class="dash-flow-top"><i>${icon(glyph)}</i><small>0${i+1}</small></span><h3>${title}</h3><p>${desc}</p><small class="dash-flow-note">${note}</small><b>${cta}<span>↗</span></b></button>`).join('')}</div></section>`;
}

function homeStats(){
  const tasks=D.tasks(workspace),drafts=D.drafts(workspace),snapshot=imported?.snapshot;
  const spend=snapshot&&typeof snapshot.spend==='number'&&Number.isFinite(snapshot.spend)?snapshot.spend:null;
  return `<div class="dash-metrics">${[
    ['plan','待处理任务',tasks.filter(t=>!t.done).length,'汇总手动待办与计划任务','focus-tasks'],
    ['pen','待打磨草稿',drafts.filter(d=>!d.locked).length,'继续编辑尚未锁定的内容','focus-drafts'],
    ['spark','已收藏灵感',workspace.dashboard.ideas.length,'留住值得继续写的方向','focus-ideas'],
    ['chart','广告消耗',spend===null?'—':spend.toLocaleString('zh-CN',{maximumFractionDigits:2}),snapshot?`${snapshot.currency||''} · ${snapshot.window.start}—${snapshot.window.end}`:'导入广告数据后查看','open-data']
  ].map(([glyph,title,value,note,action])=>`<button class="dash-metric" data-r-action="${action}"><span class="dash-metric-top">${title}${icon(glyph)}</span><b>${E(value)}</b><small>${E(note)}</small></button>`).join('')}</div>`;
}
function homeManualTasks(){
  const tasks=D.filtered(D.tasks(workspace),R.taskHomeFilter),today=D.localDay();
  return `<section class="dash-card dash-tasks" id="home-tasks"><div class="dash-section-head"><h2>待办清单 <span>${tasks.length}</span></h2>${homeAction('add-home-task','＋ 添加待办','','text-button')}</div><div class="dash-tabs">${[['pending','待处理'],['today','今天 / 已逾期'],['done','已完成']].map(([id,label])=>homeAction('home-task-filter',label,id,R.taskHomeFilter===id?'active':'')).join('')}</div><div class="dash-task-list">${tasks.slice(0,R.homeTaskLimit).map(t=>`<div class="dash-task ${t.done?'is-done':''}"><button class="dash-check" data-r-action="toggle-home-task" data-id="${E(t.key)}" aria-label="${t.done?'恢复任务':'完成任务'}：${E(t.title)}" aria-pressed="${!!t.done}">${t.done?'✓':''}</button><div class="dash-task-copy"><button data-r-action="open-home-task" data-id="${E(t.key)}">${E(t.title)}</button><small>${E(t.origin)}${t.day?' · '+E(t.day):''}</small></div><span class="dash-due ${t.due&&t.due<today&&!t.done?'late':''}">${E(t.due||'未设日期')}</span>${homeAction('open-home-task','↗',t.key,'dash-open')}</div>`).join('')||`<div class="dash-empty">${icon('plan')}<b>${R.taskHomeFilter==='done'?'还没有已完成的任务':R.taskHomeFilter==='today'?'今天没有到期任务':'从一件具体的小事开始'}</b><p>${R.taskHomeFilter==='pending'?'记下要写的内容、要查的数据，或待跟进的问题。':'可以切换筛选，查看其他待办。'}</p>${R.taskHomeFilter==='pending'?homeAction('add-home-task','添加第一条待办','','soft'):''}</div>`}</div>${tasks.length>R.homeTaskLimit?homeAction('more-home-tasks','展开全部待办','','text-button'):''}<div class="dash-card-footer"><span>手动待办与已有计划任务同步显示</span><button data-route="plan">查看计划 →</button></div></section>`;
}
function homeData(){
  const snapshot=imported?.snapshot;
  return `<section class="dash-card dash-data"><div class="dash-section-head"><h2>数据速览</h2><span class="tag">${snapshot?'导入数据':'尚未导入'}</span></div>${snapshot?`<div class="dash-account"><b>${E(snapshot.account.name||snapshot.account.account_id)}</b><p>${E(snapshot.account.platform)} · ${E(snapshot.window.start)}—${E(snapshot.window.end)}</p></div><div class="dash-data-values"><div><b>${snapshot.campaigns.length}</b><small>广告系列</small></div><div><b>${snapshot.creatives.length}</b><small>素材</small></div></div><p class="dash-footnote">来自当前导入文件，仅保留在页面内存中。</p><button class="soft" data-route="data">查看数据明细 →</button>`:`<div class="dash-data-empty">${icon('chart')}<h3>让数据为下一步提供依据</h3><p>导入广告平台的导出文件，查看消耗、广告系列和素材。</p><button class="soft" data-route="data">导入广告数据 →</button></div>`}</section>`;
}
function homeDrafts(){
  const drafts=D.drafts(workspace).filter(d=>R.homeDraftFilter!=='unlocked'||!d.locked);
  return `<section class="dash-card dash-drafts" id="home-drafts"><div class="dash-section-head"><h2>继续创作</h2>${homeAction('quick-write','新建内容 →','','text-button')}</div>${drafts.length?`<div class="dash-draft-list">${drafts.slice(0,R.homeDraftLimit).map(d=>`<button class="dash-draft" data-r-action="open-home-draft" data-id="${E(d.id)}" data-owner="${E(d.projectId)}"><i>${icon('pen')}</i><span><b>${E(d.title)}</b><small>${E(d.channel||'内容草稿')} · ${d.locked?'已锁定':'可继续编辑'}</small></span><span>↗</span></button>`).join('')}</div>`:`<div class="dash-draft-empty"><span>✎</span><p>${R.homeDraftFilter==='unlocked'?'没有待打磨的草稿':'一个想法，就可以开始创作。'}</p><button data-r-action="quick-write">写第一篇内容 →</button></div>`}${drafts.length>R.homeDraftLimit?homeAction('more-home-drafts','展开全部草稿','','text-button'):''}${R.homeDraftFilter==='unlocked'?homeAction('all-home-drafts','查看全部草稿','','text-button'):''}</section>`;
}
function homeIdeas(){
  const ideas=R.ideaHomeTab==='saved'?workspace.dashboard.ideas:R.ideaHomeTab==='sources'?D.sources(workspace):D.methods;
  return `<section class="dash-inspiration" id="home-ideas"><div class="dash-section-head"><div><h2>灵感补给</h2><p>${R.ideaHomeTab==='methods'?'几个可以直接动笔的选题方法，不依赖实时热点。':R.ideaHomeTab==='saved'?'收藏自己的观察，让好想法有处可去。':'从你已经添加的资料中寻找新的内容切口。'}</p></div>${homeAction('add-home-idea','＋ 记下灵感','','soft')}</div><div class="dash-tabs">${[['methods','选题方法'],['saved','我的收藏'],['sources','已有资料']].map(([id,label])=>homeAction('home-idea-tab',label,id,R.ideaHomeTab===id?'active':'')).join('')}</div><div class="dash-idea-grid">${ideas.slice(0,R.homeIdeaLimit).map((idea,index)=>{
    const type=R.ideaHomeTab,accent=idea.accent||['blue','violet','mint'][index%3],isSaved=workspace.dashboard.ideas.some(i=>i.sourceKey===type+':'+(idea.projectId||'')+':'+idea.id);
    return `<article class="dash-idea ${accent}"><div class="dash-idea-cover"><span>${E(idea.mark||String(index+1).padStart(2,'0'))}</span><i>${icon(type==='sources'?'book':'spark')}</i><small>${type==='methods'?'选题方法':type==='sources'?(idea.demo?'合成示例资料':'已添加资料'):'我的灵感'}</small></div><div class="dash-idea-body"><small>${E(idea.tag||idea.kind||'灵感记录')}</small><h3>${E(idea.title)}</h3><p>${E((idea.text||idea.content||'').slice(0,150))}</p><div class="dash-idea-actions"><button data-r-action="write-home-idea" data-id="${E(idea.id)}" data-owner="${E(idea.projectId||'')}">用这个方向创作 →</button>${type==='saved'?`<button data-r-action="edit-home-idea" data-id="${E(idea.id)}">编辑</button>`:`<button data-r-action="save-home-idea" data-id="${E(idea.id)}" data-owner="${E(idea.projectId||'')}" ${isSaved?'disabled':''}>${isSaved?'已收藏':'收藏'}</button>`}</div></div></article>`;
  }).join('')||`<div class="dash-empty dash-empty-wide"><b>${R.ideaHomeTab==='saved'?'还没有收藏的灵感':'还没有添加参考资料'}</b><p>可以先记下自己的观察，或从选题方法开始。</p>${homeAction('add-home-idea','记下第一个想法','','soft')}</div>`}</div>${ideas.length>R.homeIdeaLimit?homeAction('more-home-ideas','展开全部灵感','','soft'):''}</section>`;
}

R.views.assistant=function(){
  const hour=new Date().getHours(),greeting=hour<12?'上午好':hour<18?'下午好':'晚上好';
  const date=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
  $('#view').innerHTML=`<div class="dash-wrap"><div class="dash-heading"><div><div class="eyebrow">YOUR MARKETING DESK <span>· ${E(date)}</span></div><h1>${greeting}，今天从哪里开始？</h1><p>处理待办，看清数据，留住一个值得创作的想法。</p></div><div class="dash-heading-actions"><button data-r-action="ask-home-assistant">${icon('spark')}问问助手</button><button class="solid" data-r-action="quick-write">＋ 开始创作</button></div></div>${homeProductionFlow()}${homeStats()}<div class="dash-content-grid">${homeTasks()}<div class="dash-right-stack">${homeData()}${homeDrafts()}</div></div>${homeIdeas()}<p class="dash-bottom-note">待办、灵感与草稿保存在本地；数据速览来自你导入的文件。</p></div>`;
};

// 首页使用完整画布；业务页继续保留原来的资料面板与上下文。
const dashboardPreviousExport=$('#export-project')?.onclick;
if($('#export-project'))$('#export-project').onclick=()=>{
  if(page==='assistant'){persist();download(JSON.stringify(workspace,null,2),'marketing-workspace.json');}
  else dashboardPreviousExport();
};
const dashboardPreviousRender=render;
render=function(){
  dashboardPreviousRender();
  const home=page==='assistant';
  if($('#export-project'))$('#export-project').innerHTML='<span>▧</span> '+(home?'导出工作资料':'导出项目成果')+' <span>↗</span>';
  $('#app').classList.toggle('dashboard-home',home);
  if(home){$('#header-project').textContent='我的工作空间';$('#header-page').textContent='工作台';}
  const settingsPage=['settings','knowledge','skills','projectcap','agentconfig','admin','usage','journey'].includes(page);
  $('#workspace-settings')?.classList.toggle('settings-active',settingsPage);
  if(settingsPage&&page!=='settings')$('#header-page').textContent='设置中心 / '+pages[page][1];
};

function findHomeTask(key){return D.tasks(workspace).find(t=>t.key===key);}
function activateOwner(id){if(id&&id!==state.id){if(!workspace.projects.some(p=>p.id===id))throw Error('资料所在空间不存在');switchProject(id);}}
function selectedIdea(button){
  const candidates=R.ideaHomeTab==='methods'?D.methods:R.ideaHomeTab==='saved'?workspace.dashboard.ideas:D.sources(workspace);
  return candidates.find(i=>i.id===button.dataset.id&&(!button.dataset.owner||i.projectId===button.dataset.owner));
}
for(const [action,prop] of [['more-home-tasks','homeTaskLimit'],['more-home-ideas','homeIdeaLimit'],['more-home-drafts','homeDraftLimit']])R.invoke(action,()=>{R[prop]=Infinity;render();});
R.invoke('add-home-task',()=>homeTaskForm());
function homeTaskForm(id){
  const task=workspace.dashboard.tasks.find(t=>t.id===id);
  modal(task?'编辑待办':'添加待办','直接记录工作，不需要先创建项目。',[
    {key:'title',label:'要做什么',required:true,value:task?.title},
    {key:'type',label:'工作类型',options:['内容创作','内容洞察','舆情分析','数据查询','营销计划'],value:task?.type},
    {key:'due',label:'截止日期（可选）',value:task?.due}
  ],v=>{if(task)Object.assign(task,v);else workspace.dashboard.tasks.push({...v,id:uid(),done:false,created:Date.now()});});
  $('#modal-fields [name=due]').type='date';
  if(task)$('#modal-fields').insertAdjacentHTML('beforeend',`<button type="button" class="small" data-r-action="execute-home-task" data-id="${E(task.id)}">进入对应功能 →</button>`);
}
R.invoke('execute-home-task',b=>{
  const task=workspace.dashboard.tasks.find(t=>t.id===b.dataset.id);$('#modal').close();
  location.hash={'内容创作':'creation','内容洞察':'insights','舆情分析':'opinion','数据查询':'data','营销计划':'plan'}[task.type]||'creation';
});
R.invoke('open-home-task',b=>{const t=findHomeTask(b.dataset.id);if(!t)return;if(t.kind==='personal')homeTaskForm(t.id);else{activateOwner(t.projectId);location.hash='plan';}});
R.invoke('toggle-home-task',b=>{
  const task=findHomeTask(b.dataset.id);if(!task)return;
  const target=task.kind==='personal'?workspace.dashboard.tasks.find(t=>t.id===task.id):workspace.projects.find(p=>p.id===task.projectId)?.plans.find(p=>p.id===task.planId)?.tasks.find(t=>t.id===task.id);
  if(target){target.done=!target.done;persist();render();}
});
R.invoke('home-task-filter',b=>{R.taskHomeFilter=b.dataset.id;render();});
R.invoke('quick-write',()=>draftForm());
R.invoke('ask-home-assistant',()=>openAssistant());
R.invoke('open-data',()=>location.hash='data');
R.invoke('open-home-draft',b=>{activateOwner(b.dataset.owner);location.hash='creation';});
R.invoke('home-idea-tab',b=>{R.ideaHomeTab=b.dataset.id;render();});
R.invoke('all-home-drafts',()=>{R.homeDraftFilter='all';render();});
for(const [action,id] of [['focus-tasks','home-tasks'],['focus-drafts','home-drafts'],['focus-ideas','home-ideas']])R.invoke(action,()=>{
  if(action==='focus-tasks')R.taskHomeFilter='pending';
  if(action==='focus-ideas')R.ideaHomeTab='saved';
  if(action==='focus-drafts')R.homeDraftFilter='unlocked';
  render();document.getElementById(id).scrollIntoView({behavior:'smooth',block:'start'});
});
R.invoke('add-home-idea',()=>homeIdeaForm());
R.invoke('edit-home-idea',b=>homeIdeaForm(b.dataset.id));
function homeIdeaForm(id){
  const idea=workspace.dashboard.ideas.find(i=>i.id===id);
  modal(idea?'编辑灵感':'记下灵感','保存自己的观察或选题，之后可以继续写成内容。',[
    {key:'title',label:'灵感标题',required:true,value:idea?.title},
    {key:'text',label:'想法与依据',multi:true,required:true,value:idea?.text}
  ],v=>{if(idea)Object.assign(idea,v);else workspace.dashboard.ideas.unshift({...v,id:uid(),created:Date.now()});R.ideaHomeTab='saved';});
}
R.invoke('save-home-idea',b=>{
  const idea=selectedIdea(b);if(!idea)return;
  const sourceKey=R.ideaHomeTab+':'+(idea.projectId||'')+':'+idea.id;
  if(workspace.dashboard.ideas.some(i=>i.sourceKey===sourceKey))return;
  workspace.dashboard.ideas.unshift({id:uid(),title:idea.title,text:idea.text||idea.content,sourceKey,sourceOwner:idea.projectId||null,tag:idea.demo?'来自合成示例':R.ideaHomeTab==='methods'?'收藏的选题方法':'来自已添加资料',created:Date.now()});
  persist();render();toast('已加入我的灵感收藏');
});
R.invoke('write-home-idea',b=>{
  const idea=selectedIdea(b);if(!idea)return;
  activateOwner(idea.projectId||idea.sourceOwner);
  draftForm();$('#modal-title').textContent='从灵感开始创作';
  $('#modal-desc').textContent='选题已带入，请补充可以核对的产品事实，再生成可编辑的模板草稿。';
  $('#modal-fields [name=title]').value=idea.title;
  $('#modal-fields').insertAdjacentHTML('afterbegin',`<div class="dash-idea-reference"><b>选题参考</b><p>${E((idea.text||idea.content||'').slice(0,600))}</p></div>`);
});

R.invoke('production-step',b=>{
  if(b.dataset.id==='inspiration'){R.ideaHomeTab='methods';render();$('#home-ideas').scrollIntoView({behavior:'smooth'});}
  if(b.dataset.id==='production')location.hash='creation';
  if(b.dataset.id==='deliverables')location.hash='deliverables';
  if(b.dataset.id==='publishing')location.hash='autopilot';
});
function finishedURL(value){
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
R.views.deliverables=function(){
  const videos=workspace.dashboard.videos,locked=D.drafts(workspace).filter(d=>d.locked);
  $('#view').innerHTML=head('FINISHED CONTENT','成片库','集中整理完成的视频，确认内容后交给托管发布。')+
    `<div class="toolbar"><button class="solid" data-r-action="register-video">＋ 登记成片链接</button><button data-route="creation">继续生产素材 →</button><button data-route="autopilot">托管发布 →</button></div><div class="notice">成片来自你提供的视频或网盘链接，文件仍保存在原位置。自动剪辑、视频生成与平台发布尚未接入。</div><div class="section-heading"><h2>视频成片 <span class="tag">${videos.length}</span></h2></div>${videos.map(v=>`<article class="card"><div class="card-top"><h3>${E(v.title)}</h3><span class="tag ${v.review==='待审核'?'gold':''}">${E(v.review)}</span></div><p>${E(v.channel)} · ${E(v.notes||'暂无备注')}</p><div class="card-actions">${finishedURL(v.url)?`<a class="soft" href="${E(finishedURL(v.url))}" target="_blank" rel="noopener noreferrer">打开成片 ↗</a>`:'<span>链接不可用，请编辑</span>'}<button data-r-action="edit-video" data-id="${E(v.id)}">编辑与审核</button><button data-r-action="video-to-rule" data-id="${E(v.id)}" ${v.review!=='已人工确认'?'disabled title="请先人工确认内容"':''}>配置发布草案 →</button></div></article>`).join('')||empty('还没有登记成片。完成视频制作后，把成片链接添加到这里。')}<div class="section-heading"><h2>已锁定文稿 <span class="tag">${locked.length}</span></h2></div><p class="dash-footnote">文案与脚本供后续制作使用，单独列出，不计入视频成片。</p>${locked.map(d=>`<article class="card"><div class="card-top"><h3>${E(d.title)}</h3><span class="tag gold">文稿 · 已锁定</span></div><p>${E(d.format)} · ${E(d.channel)}</p><button data-r-action="open-home-draft" data-id="${E(d.id)}" data-owner="${E(d.projectId)}">查看 / 导出文稿 →</button></article>`).join('')||empty('锁定后的文案与脚本会显示在这里。')}`;
};
function finishedForm(id){
  const video=workspace.dashboard.videos.find(v=>v.id===id);
  modal(video?'编辑成片资料':'登记成片链接','保存视频访问地址与审核状态，不上传文件，也不自动发布。',[
    {key:'title',label:'成片名称',required:true,value:video?.title},
    {key:'url',label:'视频 / 网盘链接（HTTPS）',required:true,max:2048,value:video?.url},
    {key:'channel',label:'计划发布渠道',required:true,value:video?.channel||'抖音'},
    {key:'review',label:'内容审核状态',options:['待审核','已人工确认'],value:video?.review},
    {key:'notes',label:'备注（可选）',multi:true,value:video?.notes}
  ],v=>{if(video)Object.assign(video,v);else workspace.dashboard.videos.unshift({...v,id:uid(),projectId:state.id,created:Date.now()});});
  const field=$('#modal-fields [name=url]');field.type='url';
  field.oninput=()=>field.setCustomValidity(finishedURL(field.value)?'':'请输入有效的 HTTPS 链接，不要包含登录账号和密码。');
  if(field.value)field.oninput();
}
R.invoke('register-video',()=>finishedForm());
R.invoke('edit-video',b=>finishedForm(b.dataset.id));
R.invoke('video-to-rule',b=>{
  const video=workspace.dashboard.videos.find(v=>v.id===b.dataset.id);
  if(!video||video.review!=='已人工确认')return toast('请先完成人工内容确认');
  activateOwner(video.projectId);ruleForm();
  $('#modal-fields [name=name]').value='发布：'+video.title;
  $('#modal-fields [name=task]').value='内容发布';
  $('#modal-fields [name=scope]').value=`成片：${video.title}\n渠道：${video.channel}\n链接：${video.url}\n内容已人工确认；发布账号与执行服务待连接。`;
  const originalSave=saveHandler;saveHandler=v=>{originalSave(v);location.hash='autopilot';};
});
const beforeDeliveryCreation=creationView;
creationView=function(){beforeDeliveryCreation();$('#view .toolbar').insertAdjacentHTML('beforeend','<button data-route="deliverables">进入成片库 →</button>');};
const beforeDeliveryAutopilot=autopilotView;
autopilotView=function(){beforeDeliveryAutopilot();$('#view .toolbar').insertAdjacentHTML('beforeend','<button data-route="deliverables">从成片配置发布 →</button>');};

// 设置承担公共能力与可选的项目组织入口，旧链接和数据保留。
const beforeDashboardSettings=R.settingsOverview;
R.settingsOverview=function(){return beforeDashboardSettings()+`<div class="card"><h3>项目与协作（可选）</h3><p>需要区分品牌或活动时，可在这里管理资料范围。日常待办和灵感可直接从首页开始。</p><button data-route="projectcap">管理项目与资料范围</button> <button data-route="journey">查看角色协作流程</button></div>`;};

// A single Agent inbox: automation findings and explicit requests for a decision.
workspace.dashboard.diagnostics??=[];
workspace.dashboard.confirmations??=[];
function seedAgentInboxExamples(){
 const project=workspace.projects[0],stamp=Date.now();if(!project)return;
 const contentSpec={kind:'content',title:'参考视频复刻脚本 V3 确认',summary:'确认第三版复刻脚本的开头钩子、产品露出时长、角色风格和结尾行动引导。',details:'【开头钩子 0–3 秒】\n“通勤前的 30 秒，一杯刚刚好。”\n\n【故事线 4–18 秒】\n女主赶早高峰，只闻其声不出镜；镜头跟随桌面上的产品完成冲泡、入口和状态反转。\n\n【产品露出】\n第 4–18 秒持续自然露出，产品名称出现 2 次。\n\n【结尾行动引导 19–25 秒】\n“收藏这份通勤清单，明早少慌十分钟。”',version:'脚本 V3',sourceChatId:'example-chat-content',sourceChatTitle:'参考视频复刻内容',objectId:'',workflow:{taskName:'参考视频复刻内容',runId:'RUN-20261027-009',currentNodeId:'script-review',nodes:[{id:'brief',label:'解析参考视频和产品信息',parentId:null,status:'completed',detail:'已完成参考视频结构拆解'},{id:'draft',label:'生成三版复刻脚本',parentId:'brief',status:'completed',detail:'已生成 V1–V3'},{id:'script-review',label:'确认脚本结构和任务风格',parentId:'draft',status:'pending',detail:'确认钩子、产品露出、角色风格与行动引导'},{id:'render',label:'生成视频',parentId:'script-review',status:'waiting',detail:'审核通过后开始'}]}};
 let migrated=false;
 for(const [id,sourceChatId,sourceChatTitle] of [['example-confirm-publish','example-chat-publish','星广联投批量搭建讨论'],['example-confirm-content','example-chat-content','参考视频复刻内容']]){
  const item=workspace.dashboard.confirmations.find(c=>c.id===id);
  if(item&&(item.sourceChatId!==sourceChatId||item.sourceChatTitle!==sourceChatTitle)){item.sourceChatId=sourceChatId;item.sourceChatTitle=sourceChatTitle;migrated=true;}
 }
 const contentItem=workspace.dashboard.confirmations.find(c=>c.id==='example-confirm-content'),publishItem=workspace.dashboard.confirmations.find(c=>c.id==='example-confirm-publish');
 if(contentItem){for(const [key,value] of Object.entries(contentSpec)){if(JSON.stringify(contentItem[key])!==JSON.stringify(value)){contentItem[key]=structuredClone(value);migrated=true;}}if(publishItem&&contentItem.observedAt<=publishItem.observedAt){contentItem.observedAt=publishItem.observedAt+1;migrated=true;}}
 if(workspace.dashboard.examplesSeeded){if(migrated)persist();return;}
 if(!workspace.dashboard.diagnostics.some(item=>item.id==='example-diagnosis-spend'))workspace.dashboard.diagnostics.push(
  {id:'example-diagnosis-spend',projectId:project.id,targetType:'automation',targetId:'auto-daily-spend',findingKey:'spend-no-conversion',reportId:'report-20261027-01',targetName:'每日投放消耗与转化巡检',title:'广点通账户消耗上升，但转化连续两天为 0',point:'账户 86037662 · 近 48 小时',evidence:'10 月 26–27 日累计消耗 ¥3,842，较前两日增长 42%；目标转化量为 0，落地页点击 1,126 次。',evidenceDetails:'统计口径：账户时区 Asia/Shanghai；排除当日延迟回传后，仍有 982 次点击未匹配到有效转化。',cause:'转化回传链路可能中断；同时该账户新上线的落地页事件名称与计划优化目标不一致。',suggestion:'先核对回传事件与落地页埋点，再暂停继续放量；修复后以 200 次点击为最小复核样本。',severity:'high',automationName:'每日 09:30 · 投放消耗与转化巡检',automationId:'auto-daily-spend',observedAt:stamp-18*60000,status:'pending',chatId:null,isExample:true},
  {id:'example-diagnosis-fatigue',projectId:project.id,targetType:'plan',targetId:'plan-11858308546',findingKey:'creative-fatigue',reportId:'report-20261027-02',targetName:'星广联投计划 11858308546',title:'主力素材频次升高，点击率连续三天回落',point:'计划层级 · 素材疲劳',evidence:'素材 1986708208919588865 的展示频次从 2.1 升至 4.8，CTR 从 2.7% 降至 1.3%。',evidenceDetails:'同计划其他 3 条素材 CTR 均值为 2.4%；该素材仍承担 61% 的计划消耗。',cause:'预算集中在单一素材，受众重复触达后创意新鲜度下降。',suggestion:'降低该素材预算权重，补入 2–3 条不同开头钩子的素材，并观察下一自然日 CTR 与转化成本。',severity:'medium',automationName:'每 4 小时 · 素材疲劳监控',automationId:'auto-creative-fatigue',observedAt:stamp-47*60000,status:'pending',chatId:null,isExample:true}
 );
 if(!workspace.dashboard.confirmations.some(item=>item.id==='example-confirm-publish'))workspace.dashboard.confirmations.push(
  {id:'example-confirm-publish',projectId:project.id,requestId:'confirm-publish-01',kind:'publish',title:'星广联投批量搭建发布前确认',summary:'确认 2 个投放账户、3 个广告组模板及 18 条计划的素材分配和发布时间。',details:'账户：10110003、18594260004\n模板计划：11858308703\n素材：创建时间为 2026-10-27 的 12 条视频\n分配规则：素材平均分配\n发布时间：确认后立即创建任务',version:'方案 V3',sourceChatId:'example-chat-publish',sourceChatTitle:'星广联投批量搭建讨论',objectId:'',workflow:{taskName:'星广联投批量搭建',runId:'RUN-20261027-017',currentNodeId:'publish-review',nodes:[{id:'parse',label:'解析账户与模板参数',parentId:null,status:'completed',detail:'已解析 2 个账户和 3 个模板'},{id:'material',label:'匹配并平均分配素材',parentId:'parse',status:'completed',detail:'已匹配 12 条素材'},{id:'publish-review',label:'确认发布账户与计划数量',parentId:'material',status:'pending',detail:'请核对账户范围、18 条计划及立即发布时间'}]},observedAt:stamp-9*60000,status:'pending',chatId:null,isExample:true},
  {id:'example-confirm-content',projectId:project.id,requestId:'confirm-content-01',...contentSpec,observedAt:stamp-4*60000,status:'pending',chatId:null,isExample:true}
 );
 workspace.dashboard.examplesSeeded=true;persist();
}
seedAgentInboxExamples();
// Demo behavior: confirmations remain completed while this page is open, then
// return to the pending queue on the next full page load.
function resetAgentConfirmationsForDemo(){
 for(const item of workspace.dashboard.confirmations){item.status='pending';for(const key of ['decisionAt','decisionVersion','decisionNodeId','decisionRunId','agentDecision'])delete item[key];}
 for(const project of workspace.projects)for(const chat of project.chats||[]){if(!chat.confirmationContext)continue;chat.confirmationContext.status='pending';for(const key of ['decisionAt','decisionVersion','decisionNodeId','decisionRunId','agentDecision'])delete chat.confirmationContext[key];}
}
resetAgentConfirmationsForDemo();
R.taskSource='diagnostic';R.diagnosticStatus='open';R.diagnosticType='all';R.confirmationType='all';
function taskSourceTabs(){
 const diagnostics=D.diagnostics(workspace).filter(d=>d.status!=='resolved').length,confirmations=D.confirmations(workspace).filter(c=>['pending','processing'].includes(c.status)).length;
 return `<div class="dt-sources" aria-label="Agent 待办分类">${[['diagnostic','异常提醒',diagnostics],['confirmation','待确认',confirmations]].map(([id,title,count])=>`<button type="button" data-r-action="task-source" data-id="${id}" class="${R.taskSource===id?'active':''}" aria-pressed="${R.taskSource===id}">${title}<em>${count}</em></button>`).join('')}</div>`;
}
function homeTasks(){
 const confirming=R.taskSource==='confirmation';
 const all=confirming?D.confirmations(workspace):D.diagnostics(workspace);
 const rows=all.filter(d=>(R.diagnosticStatus==='open'?(confirming?['pending','processing'].includes(d.status):d.status!=='resolved'):(confirming?['confirmed','changes_requested'].includes(d.status):d.status==='resolved'))&&(confirming?(R.confirmationType==='all'||d.kind===R.confirmationType):(R.diagnosticType==='all'||d.targetType===R.diagnosticType)));
 return `<section class="dash-card dash-tasks dt-diagnostics" id="home-tasks"><div class="dash-section-head"><div><h2>Agent 待办</h2><p>Agent 持续跟进，需要你处理或决策时在这里汇总。</p></div></div>${taskSourceTabs()}<div class="dt-filters"><div class="dash-tabs">${[['open',confirming?'待确认 / 讨论中':'待处理 / 跟进中'],['resolved','已处理']].map(([id,label])=>homeAction('diagnosis-filter',label,id,R.diagnosticStatus===id?'active':'')).join('')}</div>${confirming?`<select aria-label="确认事项类型" data-confirmation-type><option value="all">全部确认事项</option>${Object.entries(confirmationLabels).map(([id,label])=>`<option value="${id}" ${R.confirmationType===id?'selected':''}>${label}</option>`).join('')}</select>`:`<select aria-label="诊断对象类型" data-diagnosis-type><option value="all">全部异常对象</option><option value="automation" ${R.diagnosticType==='automation'?'selected':''}>自动化任务</option><option value="plan" ${R.diagnosticType==='plan'?'selected':''}>异常计划</option></select>`}</div><div class="dt-list">${rows.slice(0,R.homeTaskLimit).map(d=>confirming?confirmationCard(d):diagnosticCard(d)).join('')||`<div class="dash-empty">${icon('bot')}<b>${all.length?'暂无符合筛选的待办':confirming?'暂无需要你确认的事项':'暂无异常提醒'}</b><p>${all.length?'切换状态或类型，查看其他待办。':confirming?'Agent 流程中需要你决策、审核或确认发布的节点，会汇总在这里。':'自动化巡检发现预算、获客质量等异常时，会在这里提醒你。'}</p></div>`}</div>${rows.length>R.homeTaskLimit?homeAction('more-home-tasks','展开全部待办','','text-button'):''}<div class="dash-card-footer"><span>${confirming?'保留原对话与具体版本；确认决定不代表已发布或执行。':'每条异常保留自动化来源与诊断依据，处理后仍需复核。'}</span></div></section>`;
}
function diagnosticCard(d){
 const owner=workspace.projects.find(p=>p.id===d.projectId),status={pending:'待处理',processing:'跟进中',resolved:'已处理 · 待复核'}[d.status]||'待处理';
 return `<article class="dt-card dt-alert ${d.severity}" data-diagnosis="${E(d.id)}"><div class="dt-card-top"><span class="dt-agent-badge">${icon('pulse')}异常提醒</span><span class="dt-severity ${d.severity}">${{high:'高',medium:'中',low:'低'}[d.severity]}优先级</span><span class="dt-state">${status}</span></div><h3>${E(d.title)}</h3><div class="dt-target">${E(owner?.name||'项目已移除')} / ${E(d.targetName)} / ${E(d.point)}</div><div class="dt-fact-block"><b>事实</b><div class="dt-origin">来源任务：${E(d.automationName||'任务名称未提供')}<span>检测于 ${E(new Date(d.observedAt).toLocaleString('zh-CN'))}</span></div><p>${E(d.evidence)}</p>${d.evidenceDetails?`<details class="dt-confirm-details"><summary>查看统计口径与明细</summary><p>${E(d.evidenceDetails)}</p></details>`:''}</div><div class="dt-analysis"><b>分析 <small class="dt-hypothesis">原因待核实</small></b><p>${E(d.cause||'暂未提供原因分析，需结合统计口径、样本量及分组数据进一步核对。')}</p></div><div class="dt-advice"><b>建议</b><p>${E(d.suggestion)}</p></div><footer><small>带入异常背景与整改提示词，由你检查后发送</small><div>${d.status!=='resolved'?`<button data-r-action="diagnosis-resolve" data-id="${E(d.id)}">标记已处理</button>`:''}<button class="solid" data-r-action="diagnosis-chat" data-id="${E(d.id)}">${d.chatId?'继续讨论整改':'与 Agent 讨论整改'} →</button></div></footer></article>`;
}
R.invoke('task-source',b=>{R.taskSource=b.dataset.id==='confirmation'?'confirmation':'diagnostic';R.diagnosticStatus='open';render();});
R.invoke('diagnosis-filter',b=>{R.diagnosticStatus=b.dataset.id;render();});
document.addEventListener('change',e=>{if(e.target.matches('[data-diagnosis-type]')){R.diagnosticType=e.target.value;render();}});
// The real diagnosis service can deliver a report here; dedupe by project + object + finding.
R.receiveDiagnosis=function(input){const diagnostics=D.receiveDiagnosis(workspace,input);localStorage.setItem(workspaceKey,JSON.stringify({...workspace,dashboard:{...workspace.dashboard,diagnostics}}));workspace.dashboard.diagnostics=diagnostics;persist();render();};
function diagnosisFind(id){return workspace.dashboard.diagnostics.find(d=>d.id===id);}
$('#modal').addEventListener('close',()=>$('#modal').classList.remove('dt-example-dialog','dt-confirm-review','dt-script-editor'));
R.invoke('diagnosis-chat',b=>{const d=diagnosisFind(b.dataset.id);if(d)openDiagnosticChat(d);});
function openDiagnosticChat(d){
 const owner=workspace.projects.find(p=>p.id===d.projectId);if(!owner)return toast('原项目已移除，请恢复项目后再处理');
 const existing=(owner.chats||[]).find(c=>c.id===d.chatId);
 if(typeof wbTaskDialog!=='undefined'&&wbTaskDialog.open)wbTaskDialog.close();
 if(existing)R.actions['aw-select-chat']({dataset:{id:existing.id,owner:owner.id}});
 else{awNewChat(owner.id);awChat().title='异常整改 · '+d.targetName;}
 const prompt=D.diagnosticPrompt(d);if(!awChat().draft?.includes(prompt))awChat().draft=(awChat().draft?.trim()?awChat().draft+'\n\n':'')+prompt;
 delete awChat().confirmationContext;awChat().diagnosisContext=structuredClone(d);
 awChat().reference={title:(d.isExample?'交互示例 · ':'Agent 诊断 · ')+d.targetName,text:D.diagnosticPrompt(d)};
 if(!d.isExample){d.chatId=awChat().id;if(d.status!=='resolved')d.status='processing';}
 WB.welcomeVisible=false;workspace.agentWelcome.seen=true;
 persist();location.hash='ad-agent';renderAssistant();$('#prompt').focus();
}
R.invoke('diagnosis-resolve',b=>{const d=diagnosisFind(b.dataset.id);if(!d)return;modal('标记诊断待办已处理','这会记录处理进度；异常是否消除，需要结合后续诊断或数据复核。',[],()=>{d.status='resolved';d.resolvedAt=Date.now();d.resolution='manual';});$('#save').textContent='标记已处理';});
function diagnosticTarget(d){const owner=workspace.projects.find(p=>p.id===d.projectId);if(!owner||d.isExample)return null;const target=d.targetType==='automation'?R.data.tasks.find(t=>t.id===d.targetId&&t.projectId===owner.id):owner.plans.find(t=>t.id===d.targetId);return target?{owner,target}:null;}
R.invoke('diagnosis-edit',()=>{
 const d=awChat().diagnosisContext,found=d&&diagnosticTarget(d);if(!found)return toast('原对象暂不可用，请先核对诊断对象');
 activateOwner(found.owner.id);
 if(d.targetType==='automation')return R.taskForm(found.target.id);
 const plan=found.target;modal('修改诊断关联计划','修改当前项目中的计划内容。',[{key:'title',label:'计划名称',value:plan.title,required:true},{key:'goal',label:'目标',value:plan.goal,multi:true,required:true},{key:'topic',label:'方向',value:plan.topic,required:true}],v=>Object.assign(plan,v));
});
function renderDiagnosisContext(){
 const d=awChat().diagnosisContext;if(!d||assistantTab!=='chat'||AW.folder)return;
 const live=d.isExample?d:diagnosisFind(d.id)||d,target=diagnosticTarget(live);
 const title=live.targetType==='automation'?'修改任务草稿':'修改计划';
 $('#assistant-body .dt-context')?.remove();
 $('#assistant-body .chat-welcome')?.remove();$('#assistant-body .attach-note')?.remove();
 $('#assistant-body').insertAdjacentHTML('afterbegin',`<article class="dt-context"><header><span>${icon('bot')}${live.isExample?'交互示例 · 非真实诊断':'正在处理 Agent 诊断'}</span><button data-r-action="diagnosis-back">返回诊断待办 ↗</button></header><h3>${E(live.title)}</h3><p>${E(live.targetName)} · ${E(live.point)}</p><p>来源自动化：${E(live.automationName||'报告未提供')}<br>可能原因：${E(live.cause||'需继续核对诊断原因')}</p><div class="dt-advice"><b>整改建议</b><p>${E(live.suggestion)}</p></div><footer><small>${live.isExample?'示例仅用于体验讨论流程':target?'讨论后可修改关联配置，保存不会自动执行投放。':'原对象暂不可用，仍可查看和讨论诊断依据。'}</small><div><button data-r-action="diagnosis-prompt">键入整改提示词</button>${target?`<button class="soft" data-r-action="diagnosis-edit">${title} →</button>`:''}</div></footer></article>`);
}
R.invoke('diagnosis-prompt',()=>{const d=awChat().diagnosisContext;if(!d)return;const prompt=D.diagnosticPrompt(diagnosisFind(d.id)||d);if(!awChat().draft?.includes(prompt))awChat().draft=(awChat().draft?.trim()?awChat().draft+'\n\n':'')+prompt;persist();renderAssistant();$('#prompt').focus();});
R.invoke('diagnosis-back',()=>{R.taskSource='diagnostic';location.hash='assistant';if(page==='assistant')render();});


const confirmationLabels={decision:'方案决策',content:'生成内容审核',publish:'投放发布'};
function confirmationFlow(c){
 const flow=D.confirmationWorkflow(c);
 const ordered=[];function walk(parent,depth){for(const node of flow.nodes.filter(n=>(n.parentId||null)===parent)){ordered.push({node,depth});walk(node.id,depth+1);}}walk(null,0);
 return `<div class="dt-flow"><div class="dt-flow-heading">${icon('folder')}<strong>${E(flow.taskName)}</strong></div><div class="dt-flow-run">${flow.runId?'执行 '+E(flow.runId)+' · ':''}${E(c.version)}</div><ol aria-label="确认流程节点">${ordered.map(({node,depth})=>{const current=node.id===flow.currentNodeId,done=current&&c.status==='confirmed';const status=done?'completed':current?'pending':node.status;return `<li class="dt-flow-node ${status} ${current?'current':''}" style="--node-depth:${Math.min(depth,4)}" ${current?'aria-current="step"':''}><span class="dt-flow-mark">${status==='completed'?'✓':status==='running'?'◐':current?'●':'○'}</span><div><b>${E(node.label)}</b><small>${current?(done?'已确认此版本':c.status==='changes_requested'?'已提出修改':c.status==='processing'?'讨论中 · 待确认':'当前待确认'):{completed:'已完成',waiting:'待开始',running:'进行中',pending:'待确认'}[status]}</small>${current?`<p>${E(node.detail||c.summary)}</p>`:''}</div></li>`;}).join('')}</ol></div>`;
}
function confirmationCard(c){
 const status={pending:'等待人工确认',processing:'讨论中',confirmed:'已确认',changes_requested:'已提出修改'}[c.status],done=['confirmed','changes_requested'].includes(c.status);
 const media=c.kind==='content'&&typeof ipGeneratedRows==='function'?ipGeneratedRows().find(x=>x.id===c.objectId):null;
 const flow=D.confirmationWorkflow(c),step=flow.nodes.find(node=>node.id===flow.currentNodeId);
 const sourceTitle=c.isExample&&c.sourceChatTitle?c.sourceChatTitle:workspace.projects.find(p=>p.id===c.projectId)?.chats?.find(x=>x.id===c.sourceChatId)?.title||c.sourceChatTitle||'原对话暂不可用';
 return `<article class="dt-card dt-confirmation" data-confirmation="${E(c.id)}"><div class="dt-card-top"><span class="dt-agent-badge">${icon('chat')}待确认</span><span class="dt-confirm-kind">${confirmationLabels[c.kind]}</span><span class="dt-state">${status}</span></div><h3>${E(c.title)}</h3><div class="dt-confirm-route"><span><b>来自对话</b>${E(sourceTitle)}</span><span><b>需要确认的步骤</b>${E(step?.label||'人工确认')}</span></div>${confirmationFlow(c)}<details class="dt-confirm-details" ${c.kind==='publish'?'open':''}><summary>${c.kind==='publish'?'发布账号、预算与排期':'查看待确认内容'}</summary><p>${E(c.details)}</p></details><footer><small>Agent 可能需要你确认选项，也可能给出方案、脚本或素材供你审核。</small><div>${media?`<button data-r-action="confirmation-preview" data-id="${E(media.id)}">${media.mediaType==='video'?'预览视频':'预览图片'} ${E(c.version)}</button>`:''}<button class="solid" data-r-action="confirmation-chat" data-id="${E(c.id)}">去 Agent 确认 →</button></div></footer></article>`;
}
function confirmationFind(id){return workspace.dashboard.confirmations.find(c=>c.id===id);}
R.receiveConfirmation=function(input){const confirmations=D.receiveConfirmation(workspace,input);localStorage.setItem(workspaceKey,JSON.stringify({...workspace,dashboard:{...workspace.dashboard,confirmations}}));workspace.dashboard.confirmations=confirmations;persist();render();};
document.addEventListener('change',e=>{if(e.target.matches('[data-confirmation-type]')){R.confirmationType=e.target.value;render();}});
function openConfirmationChat(c){
 const owner=workspace.projects.find(p=>p.id===c.projectId);if(!owner)return toast('所属项目已移除，请先恢复项目');
 if(wbTaskDialog.open)wbTaskDialog.close();
 const existing=owner.chats?.find(x=>x.id===(c.chatId||c.sourceChatId));
 if(existing)R.actions['aw-select-chat']({dataset:{id:existing.id,owner:owner.id}});
 else{awNewChat(owner.id);awChat().title=(c.isExample?'示例讨论 · ':'待确认 · ')+c.title;awChat().draft=D.confirmationPrompt(c);}
 delete awChat().diagnosisContext;awChat().confirmationContext=structuredClone(c);
 awChat().reference={title:(c.isExample?'交互示例 · ':'待确认 · ')+c.title,text:D.confirmationPrompt(c)};
 if(!c.isExample){c.chatId=awChat().id;if(c.status==='pending')c.status='processing';}
 WB.welcomeVisible=false;workspace.agentWelcome.seen=true;persist();location.hash='ad-agent';renderAssistant();$('#prompt').focus();
}
R.invoke('confirmation-chat',b=>{const c=confirmationFind(b.dataset.id);if(c)openConfirmationChat(c);});
function reviewConfirmation(c){
 const version=c.version,observedAt=c.observedAt;
 const done=['confirmed','changes_requested'].includes(c.status);
 modal(c.isExample?'待确认 · 交互示例':done?'确认处理记录':'查看并确认',c.kind==='publish'?'请核对具体发布方案。本次只记录确认决定，尚未连接发布服务，不会实际投放。':'核对具体版本与内容后，再确认或提出修改。',[],()=>{
  if(c.isExample||done)return;
  const current=confirmationFind(c.id);
  if(!current||current.version!==version||current.observedAt!==observedAt)throw Error('待确认内容已更新，请关闭后重新核对最新版本');
  const confirmations=workspace.dashboard.confirmations.map(x=>x.id===c.id?{...x,status:'confirmed',decisionAt:Date.now(),decisionVersion:version,decisionNodeId:D.confirmationWorkflow(c).currentNodeId,decisionRunId:D.confirmationWorkflow(c).runId}:x);
  localStorage.setItem(workspaceKey,JSON.stringify({...workspace,dashboard:{...workspace.dashboard,confirmations}}));workspace.dashboard.confirmations=confirmations;persist();
 });
 $('#modal').classList.add('dt-example-dialog','dt-confirm-review');
 const media=!c.isExample&&c.kind==='content'?ipGeneratedRows().find(x=>x.id===c.objectId):null;
 $('#modal-fields').innerHTML=`<div class="dt-review"><span class="tag">${confirmationLabels[c.kind]} · ${E(c.version)}</span><h3>${E(c.title)}</h3>${confirmationFlow(c)}<p>${E(c.summary)}</p><div class="copy">${E(c.details)}</div>${media?`<button type="button" data-r-action="confirmation-preview" data-id="${E(media.id)}">${media.mediaType==='video'?'播放视频':'查看图片'} →</button>`:''}${done?`<p>处理结果：${c.status==='confirmed'?'已确认':'已提出修改'} · ${E(c.version)}<br>${E(new Date(c.decisionAt).toLocaleString('zh-CN'))}</p>`:''}${!c.isExample&&!done?`<button type="button" data-r-action="confirmation-changes" data-id="${E(c.id)}" data-version="${E(version)}" data-stamp="${observedAt}">需要修改，回到 Agent 讨论 →</button>`:''}${c.isExample?'<p class="dt-hypothesis">此为交互示例，不会记录真实确认或执行发布。</p>':''}</div>`;
 $('#save').textContent=c.isExample||done?'关闭':c.kind==='publish'?'确认发布方案（不执行）':'确认当前版本';
}
R.invoke('confirmation-review',b=>{const c=confirmationFind(b.dataset.id);if(c)reviewConfirmation(c);});
R.invoke('confirmation-preview',b=>R.actions['ip-expand'](b));
R.invoke('confirmation-changes',b=>{
 const c=confirmationFind(b.dataset.id);if(!c||c.version!==b.dataset.version||String(c.observedAt)!==b.dataset.stamp)return toast('内容已更新，请重新核对最新版本');
 const updated={...c,status:'changes_requested',decisionAt:Date.now(),decisionVersion:c.version,decisionNodeId:D.confirmationWorkflow(c).currentNodeId,decisionRunId:D.confirmationWorkflow(c).runId};
 const confirmations=workspace.dashboard.confirmations.map(x=>x.id===c.id?updated:x);
 localStorage.setItem(workspaceKey,JSON.stringify({...workspace,dashboard:{...workspace.dashboard,confirmations}}));workspace.dashboard.confirmations=confirmations;persist();$('#modal').close();openConfirmationChat(updated);
});
function renderConfirmationContext(){
 const snapshot=awChat().confirmationContext;if(!snapshot||assistantTab!=='chat'||AW.folder)return;
 const c=snapshot.isExample?snapshot:confirmationFind(snapshot.id)||snapshot;
 $('#assistant-body .dt-context')?.remove();
 $('#assistant-body .chat-welcome')?.remove();$('#assistant-body .attach-note')?.remove();
 const decision=c.agentDecision;
 const questions=c.kind==='publish'?[['发布方式','确认账户范围并创建发布任务','修改账户或计划数量','暂不发布'],['素材分配','按当前平均分配方案','改为算法推荐','按素材 ID 分配'],['执行时间','确认后立即执行','今天 20:00 定时执行','先保存为草稿']]:[['脚本确认','确认并进入下一步','修改故事线或脚本','到此完成'],['角色风格','3D 动画 · 女主只闻其声（推荐）','3D 动画 · 女主出镜','换成真人风格'],['素材授权','清单可用，按此上传','仅使用已授权品牌素材','返回补充素材清单']];
 const body=decision?`<section class="dt-question-complete"><div class="dt-question-title"><span>✓</span><b>向你提问</b><em>完成</em></div>${decision.answers.map((answer,index)=>`<div><small>${E(questions[index][0])}</small><p>✓ ${E(answer)}</p></div>`).join('')}${decision.note?`<div><small>补充说明</small><p>✓ ${E(decision.note)}</p></div>`:''}</section>`:`<form class="dt-question-card" id="confirmation-agent-form"><div class="dt-question-title"><span>?</span><b>向你提问</b><em>◷ 等待确认</em></div><p class="dt-question-lead">${E(c.summary)}，可以按下面的选择继续吗？</p>${questions.map((question,index)=>`<fieldset><legend><span>${index+1}</span>${E(question[0])}</legend>${question.slice(1).map((option,choice)=>`<label><input type="radio" name="decision-${index}" value="${E(option)}" ${choice===0?'checked':''}><span><b>${E(option)}</b><small>${choice===0?'按 Agent 当前建议继续':'选择后会更新本步骤处理方式'}</small></span>${c.kind!=='publish'&&option==='修改故事线或脚本'?`<button type="button" class="dt-edit-script" data-r-action="confirmation-edit-script">修改</button>`:''}</label>`).join('')}</fieldset>`).join('')}<label class="dt-question-note"><span>其他（可自行输入）</span><textarea name="note" placeholder="补充时间、账户、素材或脚本要求"></textarea></label><footer><small>提交后只确认当前步骤与 ${E(c.version)}。</small><button class="solid" type="button" data-r-action="confirmation-agent-submit">确认选择</button></footer></form>`;
 $('#assistant-body').insertAdjacentHTML('afterbegin',`<article class="dt-context dt-agent-confirm"><header><span>${icon('chat')}${c.isExample?'示例对话 · ':''}${confirmationLabels[c.kind]}</span><button data-r-action="confirmation-back">返回 Agent 待办 ↗</button></header><h3>${E(c.title)}</h3><p>来自 ${E(c.sourceChatTitle||'当前对话')} · ${E(c.version)}</p><div class="dt-agent-message"><b>Agent</b><p>我已经完成了本步骤的准备。请确认下面的关键选择，确认后我会更新任务状态并继续后续流程。</p></div>${body}</article>`);
}
R.invoke('confirmation-edit-script',button=>{
 const snapshot=awChat().confirmationContext;if(!snapshot)return;const option=button.closest('label')?.querySelector('input');if(option)option.checked=true;
 modal('修改当前脚本文案','在 Agent 当前脚本基础上直接编辑。保存后，首页待确认摘要与 Agent 内的确认内容会同步更新。',[{key:'script',label:'当前脚本文案',multi:true,required:true,value:snapshot.details}],values=>{const script=values.script.trim();snapshot.details=script;const live=confirmationFind(snapshot.id);if(live)live.details=script;awChat().reference={title:(snapshot.isExample?'交互示例 · ':'待确认 · ')+snapshot.title,text:D.confirmationPrompt(snapshot)};persist();renderAssistant();toast('脚本文案已更新');});
 $('#modal').classList.add('dt-script-editor');$('#save').textContent='保存修改';
});
R.invoke('confirmation-agent-submit',()=>{
 const form=$('#confirmation-agent-form'),snapshot=awChat().confirmationContext;if(!form||!snapshot)return;
 const answers=[...form.querySelectorAll('fieldset')].map(field=>field.querySelector('input:checked')?.value).filter(Boolean),note=form.elements.note.value.trim();
 if(answers.length!==form.querySelectorAll('fieldset').length)return toast('请先完成全部确认项');
 const decision={answers,note,completedAt:Date.now()},live=confirmationFind(snapshot.id);
 Object.assign(snapshot,{status:'confirmed',decisionAt:decision.completedAt,agentDecision:decision});
 if(live)Object.assign(live,{status:'confirmed',decisionAt:decision.completedAt,decisionVersion:live.version,decisionNodeId:D.confirmationWorkflow(live).currentNodeId,decisionRunId:D.confirmationWorkflow(live).runId,agentDecision:decision});
 persist();renderAssistant();toast('已完成 Agent 确认');
});
R.invoke('confirmation-back',()=>{R.taskSource='confirmation';location.hash='assistant';if(page==='assistant')render();});
render();
