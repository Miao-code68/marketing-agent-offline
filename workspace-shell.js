'use strict';
// Navigation is reorganized without migrating projects, tasks, media or conversations.
workspace.shellPreferences??={collapsed:true};
workspace.agentWelcome??={seen:false};
const WB={welcomeVisible:false,agentReturnHash:'#assistant'};
const wbPrimary=[['assistant','首页','home'],['ad-agent','Ad agent','bot'],['assets','资产','book'],['insights','内容洞察','eye']];
const wbTools=[['creation','内容创作','pen','从需求到文案、脚本和创作草稿'],['plan','营销计划','plan','安排计划与项目任务'],['autopilot','托管发布','bot','配置发布规则与审核流程'],['automation','自动化','pulse','管理周期任务与执行安排'],['data','数据查询','chart','导入数据，查看投放表现'],['attribution','内容归因分析','eye','分析素材与内容的效果'],['audit','广告审计','shield','核对广告问题与改进方向'],['journey','协作流程','target','查看项目进展与协作角色']];
const wbIsTool=()=>wbTools.some(([id])=>id===page);
pages['idea-notes']=['spark','灵感笔记'];
R.views['idea-notes']=function(){$('#view').innerHTML=head('IDEA NOTES','灵感笔记','保留自己的观察、收藏与选题方向。')+homeIdeas();};
pages.assistant=['home','首页'];pages.assets=['book','资产'];pages.insights=['eye','内容洞察'];
paths.collapse='M3 4h18v16H3z M8 4v16 M14 9l-3 3 3 3';
R.renderNavigation=function(){
 const selected=['asset-favorites','content-assets','content-asset-detail'].includes(page)?'assets':wbIsTool()?'ad-agent':page;
 $('#navigation').innerHTML='<div class="journey-home-link wb-primary">'+wbPrimary.map(([id,label,glyph])=>`<a ${id==='ad-agent'?'id="ad-agent-open"':''} href="#${id}" class="${selected===id?'active':''}" ${selected===id?'aria-current="page"':''} title="${label}" aria-label="${label}">${icon(glyph)}<span>${label}</span></a>`).join('')+'</div>';
 if(['assets','asset-favorites','content-assets','content-asset-detail'].includes(page))$('#navigation a[href="#assets"]').insertAdjacentHTML('afterend',`<div class="wb-asset-subnav" aria-label="资产子菜单"><a href="#assets" class="${page==='assets'?'active':''}">AI 成片库</a><a href="#content-assets" class="${['content-assets','content-asset-detail'].includes(page)?'active':''}">内容资产</a></div>`);
 $('#navigation').onclick=e=>{if(innerWidth<=600&&e.target.closest('a')){workspace.shellPreferences.collapsed=true;persist();R.renderNavigation();}};
 $('#app').classList.toggle('wb-collapsed',workspace.shellPreferences.collapsed!==false);
 const toggle=$('#wb-nav-toggle');if(toggle){const collapsed=workspace.shellPreferences.collapsed!==false;toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'展开左侧菜单':'收起左侧菜单');toggle.title=toggle.getAttribute('aria-label');}
};
$('#app').classList.add('wb-shell');
const wbToggle=document.createElement('button');wbToggle.id='wb-nav-toggle';wbToggle.className='icon-btn';wbToggle.innerHTML=icon('collapse');wbToggle.onclick=()=>{workspace.shellPreferences.collapsed=workspace.shellPreferences.collapsed===false;persist();R.renderNavigation();};
$('#app>.sidebar>.brand').append(wbToggle);
if($('#export-project')){$('#export-project').title='导出工作资料';$('#export-project').setAttribute('aria-label','导出工作资料');}if($('#workspace-settings')){$('#workspace-settings').title='设置中心';$('#workspace-settings').setAttribute('aria-label','设置中心');}
R.views.assistant=function(){
 const hour=new Date().getHours(),greeting=hour<12?'上午好':hour<18?'下午好':'晚上好';
 const date=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
 const entries=[
  ['insights','spark','灵感洞察','发现值得借鉴的内容，为创作找到新方向。','浏览灵感库','inspiration'],
  ['content','pen','内容生成','和 Agent 一起，把想法变成文案、图片与视频方案。','开始创作','production'],
  ['assets','folder','资产库','管理 AI 生成内容与收藏的创意素材。','查看资产','deliverables'],
  ['smart-publish','bot','批量基建','通过自然语言批量复制普通、达人或星广计划，发送前可以继续修改。','开始基建','publishing'],
  ['intelligent-publish','spark','智能投放','选择账户、广告组与计划，确认素材后生成结构化发布计划。','开始投放','production']
 ];
 $('#view').innerHTML=`<div class="dash-wrap wb-flow-home"><div class="dash-heading"><div><div class="eyebrow">YOUR MARKETING DESK <span>· ${E(date)}</span></div><h1>${greeting}，今天从哪里开始？</h1><p>从灵感到投放，推进工作，也照顾好每一项待办。</p></div><a class="solid wb-home-agent" href="#ad-agent">${icon('chat')}进入 Ad agent</a></div><section class="dash-production" aria-label="营销工作入口"><div class="dash-production-grid">${entries.map(([id,glyph,title,desc,cta,color],i)=>`<button class="dash-flow-card flow-${color}" ${id==='content'?'data-r-action="wb-write"':id==='smart-publish'?'data-r-action="wb-smart-publish"':id==='intelligent-publish'?'data-r-action="wb-intelligent-publish"':`data-route="${id}"`}><span class="dash-flow-top"><i>${icon(glyph)}</i><small>0${i+1}</small></span><h3>${title}</h3><p>${desc}</p><b>${cta}<span>↗</span></b></button>`).join('')}</div></section>${homeTasks()}</div>`;
};
R.invoke('wb-generate',()=>wbPrepare('我想用 AI 生成图片或视频，请先帮我梳理素材需求与创作方案。'));
R.invoke('wb-open-chat',b=>{R.actions['aw-select-chat'](b);location.hash='ad-agent';});
function wbPrepare(text,owner){awNewChat(owner||state.id);awChat().draft=text;persist();location.hash='ad-agent';renderAssistant();$('#prompt').focus();}
R.invoke('wb-write',()=>wbPrepare('我想创作一份新内容，请先帮我梳理需求。'));
const wbTaskDialog=document.createElement('dialog');wbTaskDialog.id='wb-task-dialog';wbTaskDialog.setAttribute('aria-label','Agent 待办');wbTaskDialog.innerHTML='<div class="wb-dialog-head"><div><small>AD AGENT</small><h2>Agent 待办</h2></div><button class="icon-btn" data-r-action="wb-close-tasks" aria-label="关闭待办">×</button></div><div id="wb-task-content"></div>';document.body.append(wbTaskDialog);
function wbDrawTasks(){
 $('#wb-task-content').innerHTML=homeTasks().replace('id="home-tasks"','id="wb-agent-tasks"');
}
R.invoke('wb-close-tasks',()=>wbTaskDialog.close());
R.invoke('wb-tasks',()=>{wbDrawTasks();if(!wbTaskDialog.open)wbTaskDialog.showModal();});
R.invoke('wb-tasks-entry',()=>{location.hash='ad-agent';R.actions['wb-tasks']();});
R.invoke('focus-tasks',()=>R.actions['wb-tasks-entry']());
R.invoke('wb-continue-task',b=>{const task=findHomeTask(b.dataset.id);if(!task)return;wbTaskDialog.close();WB.welcomeVisible=false;wbPrepare(`请帮我处理待办：${task.title}${task.due?'\n截止日期：'+task.due:''}`,task.projectId);});
R.invoke('write-home-idea',b=>{const idea=selectedIdea(b);if(!idea)return;wbPrepare('请基于这份灵感帮我梳理创作需求。',idea.projectId||idea.sourceOwner);chat().reference={title:idea.title,text:idea.text||idea.content||''};persist();renderAssistant();});
const wbOpenTask=R.actions['open-home-task'];R.invoke('open-home-task',b=>{const task=findHomeTask(b.dataset.id);if(task?.kind==='plan')wbTaskDialog.close();wbOpenTask(b);});
const wbExecuteTask=R.actions['execute-home-task'];R.invoke('execute-home-task',b=>{wbTaskDialog.close();wbExecuteTask(b);});
R.invoke('wb-dismiss-welcome',()=>{WB.welcomeVisible=false;renderAssistant();});
function wbWelcomeCard(){
 const diagnoses=D.diagnostics(workspace).filter(d=>d.status!=='resolved'),confirmations=D.confirmations(workspace).filter(c=>['pending','processing'].includes(c.status));
 const count=diagnoses.length+confirmations.length;
 return `<article id="wb-welcome" class="wb-welcome"><div class="wb-welcome-head"><span>${icon('bot')}Agent 正在为你跟进</span><button data-r-action="wb-dismiss-welcome" aria-label="收起首次待办提醒">×</button></div><p>${count?`${diagnoses.length} 条异常提醒、${confirmations.length} 项待确认，等待你继续处理。`:'暂无待处理事项。通过对话设置自动化任务，或讨论需要确认的方案。'}</p><footer><button data-r-action="wb-tasks">查看 Agent 待办</button></footer></article>`;
}
const wbRenderAssistant=renderAssistant;renderAssistant=function(){
 wbRenderAssistant();
 wbSyncAgentMenu();
 if(location.hash==='#ad-agent'&&assistantShell.open&&!workspace.agentWelcome.seen){WB.welcomeVisible=true;workspace.agentWelcome.seen=true;workspace.agentWelcome.seenAt=Date.now();persist();}
 if(WB.welcomeVisible&&assistantTab==='chat'&&!AW.folder)$('#assistant-body').insertAdjacentHTML('beforeend',wbWelcomeCard());
 renderDiagnosisContext();
 renderConfirmationContext();
};
// The workspace navigation remains visible. Only Agent's own project/history pane collapses.
workspace.shellPreferences.agentSidebarCollapsed??=workspace.shellPreferences.agentRailHidden??(innerWidth<800);
afRail.insertAdjacentHTML('afterbegin',afRailButton('wb-toggle-agent-rail','显示项目与历史记录','collapse'));
afRail.querySelector('[data-r-action="af-workflows"]').insertAdjacentHTML('beforebegin',afRailButton('wb-tasks','待办','plan'));
afRail.querySelector('[data-r-action=af-workflows]').innerHTML=icon('pulse');
afRail.querySelector('.af-rail-bottom').insertAdjacentHTML('beforebegin','<div class="wb-agent-resources"><a href="#assets" title="资产" aria-label="资产">'+icon('folder')+'</a><a href="#insights" title="内容洞察" aria-label="内容洞察">'+icon('eye')+'</a></div>');
const wbAgentCollapse=document.createElement('button');wbAgentCollapse.id='wb-agent-collapse';wbAgentCollapse.type='button';wbAgentCollapse.dataset.rAction='wb-toggle-agent-rail';wbAgentCollapse.title='收起 Agent 菜单';wbAgentCollapse.setAttribute('aria-label','收起 Agent 菜单');wbAgentCollapse.innerHTML=icon('collapse');awBrand.append(wbAgentCollapse);
const wbAgentActions=document.createElement('div');wbAgentActions.className='wb-agent-actions';wbAgentActions.innerHTML=[['wb-tasks','待办','plan'],['af-workflows','工作流','pulse'],['af-skills','技能','spark'],['af-config','知识与连接器','book']].map(([action,label,glyph])=>`<button type="button" data-r-action="${action}">${icon(glyph)}<span>${label}</span></button>`).join('');$('#aw-sidebar-top').after(wbAgentActions);
function wbSyncAgentMenu(){
 const expanded=!workspace.shellPreferences.agentSidebarCollapsed;
 assistantShell.classList.remove('wb-rail-hidden');
 assistantShell.classList.toggle('wb-agent-menu-open',expanded);
 awBrand.querySelector('b').textContent=assistantShell.dataset.presentation==='page'?'Ad agent':'对话助手';
 for(const button of assistantShell.querySelectorAll('[data-r-action="wb-toggle-agent-rail"],[data-r-action="af-projects"]')){button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-controls','aw-projects');}
}
R.invoke('wb-toggle-agent-rail',()=>{workspace.shellPreferences.agentSidebarCollapsed=!workspace.shellPreferences.agentSidebarCollapsed;persist();wbSyncAgentMenu();});
R.invoke('af-projects',()=>{workspace.shellPreferences.agentSidebarCollapsed=false;persist();wbSyncAgentMenu();});
R.invoke('af-workflows',()=>{modal('Agent 工作流','选择工具继续工作，当前项目的资料与对话保持共享。',[],()=>{});$('#modal-fields').innerHTML=`<div class="wb-tool-grid">${wbTools.map(([id,title,glyph,desc])=>`<a href="#${id}" data-af-workflow>${icon(glyph)}<span><b>${title}</b><small>${desc}</small></span><span>↗</span></a>`).join('')}</div><div class="wb-legacy-resources"><a href="#brand-assets" data-af-workflow>品牌与资料</a><a href="#deliverables" data-af-workflow>成片与文稿</a><a href="#idea-notes" data-af-workflow>灵感笔记</a></div>`;$('#modal-fields').querySelectorAll('[data-af-workflow]').forEach(a=>a.onclick=()=>$('#modal').close());$('#save').textContent='关闭';});
const wbRender=render;render=function(){
 if(location.hash!=='#ad-agent')WB.welcomeVisible=false;
 wbRender();
 $('#app').classList.toggle('wb-agent-tool',wbIsTool());
 $('#view').classList.remove('wb-role-home');
 if(page==='assistant')$('#header-page').textContent='首页';
 if(['assets','asset-favorites','content-assets','content-asset-detail'].includes(page))$('#header-page').textContent='资产 / '+(page==='assets'?'AI 成片库':'内容资产');
 if(wbIsTool()){$('#header-page').textContent='Ad agent / '+pages[page][1];$('#view').insertAdjacentHTML('afterbegin',`<div class="wb-tool-context"><a href="#ad-agent">← 返回 Agent 对话</a><span>Ad agent · ${E(pages[page][1])}</span><button data-r-action="af-workflows">切换工作流</button></div>`);}
 if(['brand-assets','deliverables','idea-notes'].includes(page))$('#view').insertAdjacentHTML('afterbegin','<div class="wb-tool-context"><a href="#ad-agent">← 返回 Agent</a><a href="#brand-assets">品牌与资料</a><a href="#deliverables">成片与文稿</a><a href="#idea-notes">灵感笔记</a></div>');
 if(page==='insights'&&$('#view .ip-heading h1')&&!$('#view .ip-trend-page'))$('#view .ip-heading h1').textContent='内容洞察';
 wbSyncAgentMenu();
 if(wbTaskDialog.open)wbDrawTasks();
};
// Agent navigation and dedicated inner pages share the existing conversation host.
paths.pause='M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M9 8v8 M15 8v8';
paths.lightning='M13 2 4 14h7l-1 8 10-13h-7z';
paths.wrench='M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4z';
Object.assign(WB,{agentSection:'chat',taskQuery:'',taskStatus:'all',knowledgeTab:'team',knowledgeQuery:'',knowledgeDisabled:false,knowledgeLayout:'list',knowledgeSort:'recent',skillTab:'shared',skillQuery:''});
afRail.innerHTML=`<a href="#assistant" class="af-logo" aria-label="返回首页" title="返回首页">➤</a>${afRailButton('af-new','新建对话','plus')}${afRailButton('wb-toggle-agent-rail','历史对话','collapse')}${afRailButton('wb-automation','自动化','lightning')}${afRailButton('af-config','知识库管理','book')}${afRailButton('af-skills','技能管理','wrench')}${afRailButton('af-search','搜索','search')}<div class="af-rail-bottom" aria-hidden="true"></div>`;
afRail.querySelectorAll(':scope > button').forEach(button=>{button.dataset.tooltip=button.getAttribute('aria-label');button.removeAttribute('title');});
wbAgentActions.remove();
const wbAgentPage=document.createElement('section');wbAgentPage.id='wb-agent-page';assistantShell.append(wbAgentPage);
const wbAgentBack=document.createElement('button');wbAgentBack.id='wb-agent-back';wbAgentBack.type='button';wbAgentBack.dataset.rAction='wb-agent-back';wbAgentBack.setAttribute('aria-label','返回工作台');wbAgentBack.dataset.tooltip='返回工作台';wbAgentBack.innerHTML='←';afRail.prepend(wbAgentBack);
document.addEventListener('click',event=>{const trigger=event.target.closest('a[href="#ad-agent"],[data-route="ad-agent"]');if(trigger&&location.hash!=='#ad-agent')WB.agentReturnHash=location.hash||'#assistant';},true);
R.invoke('wb-agent-back',()=>{location.hash=WB.agentReturnHash&&WB.agentReturnHash!=='#ad-agent'?WB.agentReturnHash:'#assistant';});
const wbHistoryToggle=document.createElement('button');wbHistoryToggle.className='wb-history-toggle';wbHistoryToggle.dataset.rAction='wb-toggle-agent-rail';wbHistoryToggle.title='显示或收起历史记录';wbHistoryToggle.setAttribute('aria-label','显示或收起历史记录');wbHistoryToggle.innerHTML=icon('collapse');$('.aw-main').prepend(wbHistoryToggle);
if(!workspace.shellPreferences.agentMenuV2){workspace.shellPreferences.agentSidebarCollapsed=true;workspace.shellPreferences.agentMenuV2=true;persist();}
function wbAgentOpen(section){WB.agentSection=section;AW.folder=null;assistantTab='chat';if(location.hash!=='#ad-agent')location.hash='ad-agent';else renderAssistant();}
R.invoke('wb-automation',()=>wbAgentOpen('automation'));
R.invoke('af-config',()=>wbAgentOpen('knowledge'));
R.invoke('af-skills',()=>wbAgentOpen('skills'));
R.invoke('af-new',()=>{WB.agentSection='chat';awNewChat(state.id);});
const wbSelectChat=R.actions['aw-select-chat'];R.invoke('aw-select-chat',b=>{WB.agentSection='chat';wbSelectChat(b);});
const wbNewChat=awNewChat;awNewChat=function(id){WB.agentSection='chat';wbNewChat(id);};
const wbOpenAssistant=openAssistant;openAssistant=function(ref){WB.agentSection='chat';wbOpenAssistant(ref);};
function wbPageHead(title,description=''){return `<header class="wb-agent-page-head"><h1>${title}</h1>${description?`<p>${description}</p>`:''}</header>`;}
function wbAgentEmpty(title){return `<div class="wb-agent-empty">${icon('folder')}<span>${title}</span></div>`;}
function wbAutomationPage(){
 const all=R.data.tasks.filter(t=>t.projectId===state.id),rows=all.filter(t=>(WB.taskStatus==='all'||t.status===WB.taskStatus)&&t.title.toLowerCase().includes(WB.taskQuery.toLowerCase()));
 return wbPageHead('自动化','管理定时执行的 Agent 任务，查看执行历史与结果')+`<div class="wb-agent-page-body"><div class="wb-automation-stats">${[['运行中','pulse'],['已暂停','pause'],['今日执行','plan'],['凭证过期','wrench']].map(([label,glyph])=>`<article><span>${icon(glyph)}${label}</span><b>—</b></article>`).join('')}</div><div class="wb-agent-toolbar"><input id="wb-task-query" aria-label="搜索任务标题" placeholder="搜索任务标题" value="${E(WB.taskQuery)}"><select id="wb-task-status" aria-label="任务状态">${[['all','全部'],['draft','待启用'],['paused','已暂停的草稿']].map(([id,label])=>`<option value="${id}" ${WB.taskStatus===id?'selected':''}>${label}</option>`).join('')}</select><span>共 ${all.length} 个任务</span><button class="solid wb-push-right" data-r-action="new-task">＋ 新建任务</button></div><div class="wb-agent-table"><table><thead><tr><th>任务</th><th>状态</th><th>调度</th><th>上次执行</th><th>操作</th></tr></thead><tbody>${rows.map(t=>`<tr><td><b>${E(t.title)}</b><small>${E(t.role||'默认 Agent')}</small></td><td>${t.status==='paused'?'草稿已暂停':'待启用'}</td><td>${E(t.schedule)}</td><td>未执行</td><td>${[['edit-task','编辑'],['pause-task',t.status==='paused'?'恢复':'暂停'],['task-history','记录'],['delete-task','删除']].map(([action,label])=>awButton(action,label,t.id)).join('')}</td></tr>`).join('')||'<tr><td colspan="5" class="wb-table-empty">没有数据</td></tr>'}</tbody></table></div><p class="wb-page-note">调度服务未连接，运行数据暂不可用；新建任务将保存为待启用草稿。</p></div>`;
}
const wbTaskDrawer=document.createElement('dialog');wbTaskDrawer.id='wb-task-drawer';wbTaskDrawer.setAttribute('aria-label','新建自动化任务');document.body.append(wbTaskDrawer);
function wbTaskSchedule(form){
 const trigger=form.elements.trigger.value,time=form.elements.time.value||'09:00';
 if(trigger==='一次性')return `${form.elements.date.value||new Date().toISOString().slice(0,10)} ${time} · Asia/Shanghai`;
 const frequency=form.elements.frequency.value,detail=frequency==='每周'?`每周${form.elements.weekday.value}`:frequency==='每月'?`每月 ${form.elements.monthday.value} 日`:frequency;
 return `${detail} ${time} · Asia/Shanghai`;
}
function wbDrawTaskForm(id){
 const task=R.data.tasks.find(t=>t.id===id)||{},once=task.trigger==='一次性',schedule=task.schedule||'',time=schedule.match(/\b\d{2}:\d{2}\b/)?.[0]||'09:00',date=schedule.match(/\d{4}-\d{2}-\d{2}/)?.[0]||new Date(Date.now()+86400000).toISOString().slice(0,10),frequency=schedule.startsWith('每周')?'每周':schedule.startsWith('每月')?'每月':'每天';
 wbTaskDrawer.innerHTML=`<form id="wb-task-form"><header><h2>${id?'编辑任务':'新建任务'}</h2><button type="button" id="wb-task-close" aria-label="关闭任务面板">×</button></header><main><section class="wb-task-field"><label>任务标题 <span id="wb-task-title-count">${[...(task.title||'')].length} 字</span></label><p>用一句话描述任务用途，便于在列表和侧栏中识别。</p><input name="title" required maxlength="60" value="${E(task.title||'')}" placeholder="例如：每周投放效果复盘"></section><section class="wb-task-field"><label>执行指令 <span id="wb-task-prompt-count">${[...(task.prompt||'')].length} 字</span></label><p>写清楚 Agent 到点要完成的目标、数据范围、输出格式和通知要求。</p><textarea name="prompt" required maxlength="2000" placeholder="例如：请统计过去 7 天各广告计划消耗、转化和 ROI，找出异常波动原因，并按结论、数据依据、建议动作输出。">${E(task.prompt||'')}</textarea></section><label class="wb-task-row"><span>Agent 角色</span><select name="role">${['默认营销 Agent','公关与知识库资源助手','设计 Agent'].map(role=>`<option ${role===(task.role||'默认营销 Agent')?'selected':''}>${role}</option>`).join('')}</select></label><label class="wb-task-row"><span>任务类型</span><select name="trigger"><option ${!once?'selected':''}>周期任务</option><option ${once?'selected':''}>一次性</option></select></label><section id="wb-task-cycle" class="wb-task-schedule" ${once?'hidden':''}><label><span>重复频率</span><select name="frequency"><option ${frequency==='每天'?'selected':''}>每天</option><option ${frequency==='每周'?'selected':''}>每周</option><option ${frequency==='每月'?'selected':''}>每月</option></select></label><label id="wb-task-weekday" ${frequency==='每周'?'':'hidden'}><span>执行日</span><select name="weekday">${['一','二','三','四','五','六','日'].map(day=>`<option ${schedule.includes('周'+day)?'selected':''}>${day}</option>`).join('')}</select></label><label id="wb-task-monthday" ${frequency==='每月'?'':'hidden'}><span>每月日期</span><input name="monthday" type="number" min="1" max="28" value="${schedule.match(/每月 (\d+)/)?.[1]||1}"></label></section><section id="wb-task-once" class="wb-task-schedule" ${once?'':'hidden'}><label><span>执行日期</span><input name="date" type="date" value="${date}"></label></section><label class="wb-task-row"><span>执行时间</span><input name="time" type="time" value="${time}" required></label><aside><b id="wb-task-preview"></b><small>触发精度约 ±1 分钟 · 时区 Asia/Shanghai</small></aside></main><footer><button type="button" id="wb-task-cancel">取消</button><button class="solid" type="submit">${id?'保存':'创建'}</button></footer></form>`;
 const form=$('#wb-task-form'),sync=()=>{const isOnce=form.elements.trigger.value==='一次性',repeat=form.elements.frequency.value;$('#wb-task-cycle').hidden=isOnce;$('#wb-task-once').hidden=!isOnce;$('#wb-task-weekday').hidden=isOnce||repeat!=='每周';$('#wb-task-monthday').hidden=isOnce||repeat!=='每月';$('#wb-task-preview').textContent='预览：'+wbTaskSchedule(form)+' 执行';};
 form.elements.title.oninput=()=>$('#wb-task-title-count').textContent=[...form.elements.title.value].length+' 字';form.elements.prompt.oninput=()=>$('#wb-task-prompt-count').textContent=[...form.elements.prompt.value].length+' 字';for(const input of form.querySelectorAll('select,input[type=date],input[type=time],input[type=number]'))input.onchange=sync;sync();
 $('#wb-task-close').onclick=$('#wb-task-cancel').onclick=()=>wbTaskDrawer.close();
 form.onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));values.schedule=wbTaskSchedule(form);values.notification=task.notification||'保存在 Agent 待办';if(id)Object.assign(task,values);else R.data.tasks.push({...values,id:uid(),projectId:state.id,status:'draft',created:now()});persist();wbTaskDrawer.close();if(page==='ad-agent')renderAssistant();else render();toast(id?'任务已保存':'任务已创建');};
}
R.taskForm=function(id){wbDrawTaskForm(id);if(!wbTaskDrawer.open)wbTaskDrawer.showModal();$('#wb-task-form [name=title]').focus();};
function wbKnowledgePage(){
 let rows=workspace.knowledge.filter(k=>(WB.knowledgeTab==='shared'?k.sharedWithMe:!k.sharedWithMe)&&(!k.disabled||WB.knowledgeDisabled)&&(k.name+' '+k.content).toLowerCase().includes(WB.knowledgeQuery.toLowerCase()));
 rows.sort(WB.knowledgeSort==='name'?(a,b)=>a.name.localeCompare(b.name,'zh-CN'):(a,b)=>(Date.parse(b.updated||b.created)||0)-(Date.parse(a.updated||a.created)||0));
 return `<header class="wb-knowledge-head"><div class="wb-inner-tabs">${[['team','团队'],['shared','与我共享']].map(([id,label])=>awButton('wb-knowledge-tab',label,id,WB.knowledgeTab===id?'active':'')).join('')}</div><select aria-label="知识库工作空间"><option>当前工作空间</option></select><span class="wb-knowledge-label">知识库</span></header><div class="wb-agent-page-body"><div class="wb-agent-toolbar"><input id="wb-knowledge-query" aria-label="搜索知识库项目" placeholder="搜索项目" value="${E(WB.knowledgeQuery)}"><button data-r-action="wb-knowledge-query">查询</button><label class="wb-push-right"><input id="wb-knowledge-disabled" type="checkbox" ${WB.knowledgeDisabled?'checked':''}>包含停用项目</label><select id="wb-knowledge-sort" aria-label="项目排序"><option value="recent">最近更新</option><option value="name" ${WB.knowledgeSort==='name'?'selected':''}>名称排序</option></select><div class="wb-layout-buttons">${[['list','☷','列表视图'],['grid','▦','网格视图']].map(([id,glyph,label])=>`<button data-r-action="wb-knowledge-layout" data-id="${id}" class="${WB.knowledgeLayout===id?'active':''}" aria-label="${label}">${glyph}</button>`).join('')}</div><button class="solid" data-r-action="wb-new-knowledge">＋ 新建项目</button></div><div class="wb-knowledge-list ${WB.knowledgeLayout}">${rows.map(k=>`<article><div>${icon('book')}<h3>${E(k.name)}</h3>${k.disabled?'<small>已停用</small>':''}</div><p>${E((k.content||'').slice(0,180))}</p><footer><small>${(k.content||'').length} 字 · ${workspace.projects.filter(p=>p.bindings?.knowledge?.includes(k.id)).length} 个项目引用</small><button data-r-action="wb-edit-knowledge" data-id="${E(k.id)}">查看 / 编辑</button>${awButton('wb-disable-knowledge',k.disabled?'启用':'停用',k.id)}</footer></article>`).join('')}</div>${rows.length?'':wbAgentEmpty(WB.knowledgeTab==='shared'?'暂无与我共享的项目':'暂无项目')}</div>`;
}
function wbSkillsPage(){
 const rows=(WB.skillTab==='mine'?R.data.skills:R.catalog?.skills||[]).filter(s=>(s.name+' '+(s.description||'')+' '+(s.author||'')).toLowerCase().includes(WB.skillQuery.toLowerCase()));
 return wbPageHead('技能管理')+`<div class="wb-skills-body"><p class="wb-page-note">个人技能可在聊天中选择；共享区当前展示内置技能，复制到我的技能后可编辑。</p><div class="wb-agent-toolbar"><div class="wb-inner-tabs">${[['mine','我的技能'],['shared','共享技能']].map(([id,label])=>awButton('wb-skill-tab',label,id,WB.skillTab===id?'active':'')).join('')}</div><input class="wb-push-right" id="wb-skill-query" aria-label="搜索技能名称、描述或发布者" placeholder="搜索名称、描述或发布者" value="${E(WB.skillQuery)}">${WB.skillTab==='mine'?'<button data-r-action="new-skill">＋ 新建技能</button><button data-r-action="import-skill">导入技能</button><input hidden id="skill-file-input" type="file" accept=".zip,.md">':''}</div><div class="wb-skill-cards">${rows.map(s=>`<article><div><h3>${E(s.name)}</h3><button data-r-action="wb-skill-view" data-id="${E(s.id)}">查看</button></div><p>${E(s.description||'个人技能')}</p><small>${E(s.author||s.category||(WB.skillTab==='mine'?'个人技能':'内置技能'))}${s.updated?' · '+E(s.updated):''}</small></article>`).join('')||wbAgentEmpty('暂无匹配的技能')}</div></div>`;
}
function wbRenderAgentPage(){
 const section=WB.agentSection,active=section!=='chat'&&assistantShell.dataset.presentation==='page';
 assistantShell.classList.toggle('wb-inner-page',active);
 afRail.querySelectorAll('button').forEach(b=>{const selected=({'af-new':'chat','wb-automation':'automation','af-config':'knowledge','af-skills':'skills'})[b.dataset.rAction]===section;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(!active)return;
 wbAgentPage.innerHTML=section==='automation'?wbAutomationPage():section==='knowledge'?wbKnowledgePage():wbSkillsPage();
 const bindQuery=(id,key)=>{const el=$(id);if(el)el.oninput=e=>{WB[key]=e.target.value;const pos=e.target.selectionStart;wbRenderAgentPage();$(id).focus();$(id).setSelectionRange(pos,pos);};};
 bindQuery('#wb-task-query','taskQuery');bindQuery('#wb-knowledge-query','knowledgeQuery');bindQuery('#wb-skill-query','skillQuery');
 if($('#wb-task-status'))$('#wb-task-status').onchange=e=>{WB.taskStatus=e.target.value;wbRenderAgentPage();};
 if($('#wb-knowledge-disabled'))$('#wb-knowledge-disabled').onchange=e=>{WB.knowledgeDisabled=e.target.checked;wbRenderAgentPage();};
 if($('#wb-knowledge-sort'))$('#wb-knowledge-sort').onchange=e=>{WB.knowledgeSort=e.target.value;wbRenderAgentPage();};
 if($('#skill-file-input'))$('#skill-file-input').onchange=R.importSkill;
}
for(const [action,key] of [['wb-knowledge-tab','knowledgeTab'],['wb-knowledge-layout','knowledgeLayout'],['wb-skill-tab','skillTab']])R.invoke(action,b=>{WB[key]=b.dataset.id;if(key==='skillTab')R.skillTab=WB.skillTab==='mine'?'mine':'source';wbRenderAgentPage();});
R.invoke('wb-knowledge-query',()=>wbRenderAgentPage());
function wbKnowledgeForm(id){const k=workspace.knowledge.find(k=>k.id===id);modal(k?'编辑知识库项目':'新建知识库项目','保存品牌规范、产品资料或内容方法，供 Agent 对话引用。',[{key:'name',label:'项目名称',required:true,value:k?.name},{key:'content',label:'知识内容',multi:true,required:true,value:k?.content}],v=>{if(k)Object.assign(k,v,{updated:now()});else workspace.knowledge.push({...v,id:uid(),created:now(),updated:now()});});}
R.invoke('wb-new-knowledge',()=>wbKnowledgeForm());R.invoke('wb-edit-knowledge',b=>wbKnowledgeForm(b.dataset.id));
R.invoke('wb-disable-knowledge',b=>{const k=workspace.knowledge.find(k=>k.id===b.dataset.id);modal(k.disabled?'启用知识库项目':'停用知识库项目','保留项目内容和已有引用，停用项目在列表中默认隐藏。',[],()=>{k.disabled=!k.disabled;});});
R.invoke('wb-skill-view',b=>{R.skillTab=WB.skillTab==='mine'?'mine':'source';return R.actions['select-skill'](b);});
const wbLegacySkills=R.views.skills;R.views.skills=function(){if(page==='ad-agent'&&WB.agentSection==='skills'){WB.skillTab=R.skillTab==='mine'?'mine':'shared';wbRenderAgentPage();}else wbLegacySkills();};
const wbInnerRender=renderAssistant;renderAssistant=function(){wbInnerRender();wbRenderAgentPage();};

R.invoke('wb-smart-publish',()=>{sessionStorage.setItem('open-smart-publish','1');location.hash='ad-agent';render();});
R.invoke('wb-intelligent-publish',()=>{sessionStorage.setItem('open-intelligent-publish','1');location.hash='ad-agent';render();});
render();
const apfStyle=document.createElement('link');apfStyle.rel='stylesheet';apfStyle.href=new URL('ad-publish-flow.css',document.baseURI).href;document.head.append(apfStyle);
const apfScript=document.createElement('script');apfScript.src=new URL('ad-publish-flow.js',document.baseURI).href;document.body.append(apfScript);
