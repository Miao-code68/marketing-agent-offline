'use strict';
const J=window.MarketingJourney;
// 未接入账号身份前，只保存当前浏览器使用者的视角，不生成虚构员工账号。
const localMemberId='local-me';
pages.journey=['target','协作流程'];
pages['brand-assets']=['book','品牌与资料'];R.views['brand-assets']=assetView;
workspace.journeyPreferences??={version:1,users:{}};
workspace.journeyPreferences.users[localMemberId]??={defaultRole:null,projects:{}};
function myJourneyPreference(){
  const user=workspace.journeyPreferences.users[localMemberId];
  user.projects[state.id]??={selected:{}};
  return user.projects[state.id];
}
const navigationGroups=[
  {id:'strategy',label:'策略洞察',icon:'eye',routes:['insights']},
  {id:'content',label:'内容供给',icon:'pen',routes:['creation','assets']},
  {id:'operations',label:'智能投放与经营转化',icon:'bot',routes:['plan','autopilot','automation']},
  {id:'review',label:'营销复盘',icon:'chart',routes:['data','attribution','audit']}
];
R.navigationPage=null;
R.renderNavigation=function(){
  workspace.navigationGroups??={};
  const link=id=>`<a href="#${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(pages[id][0])}<span>${pages[id][1]}</span></a>`;
  $('#navigation').innerHTML=`<div class="journey-home-link">${link('assistant')}<a id="ad-agent-open" href="#ad-agent" class="${page==='ad-agent'?'active':''}" ${page==='ad-agent'?'aria-current="page"':''}>${icon('bot')}<span>Ad agent</span></a></div>`+navigationGroups.map(group=>{
    const active=group.routes.includes(page);
    if(active&&R.navigationPage!==page)workspace.navigationGroups[group.id]=true;
    const open=workspace.navigationGroups[group.id]!==false;
    return `<details class="journey-nav-group ${active?'has-active':''}" data-nav-group="${group.id}" ${open?'open':''}><summary>${icon(group.icon)}<span>${group.label}</span><i aria-hidden="true">⌄</i></summary><div class="journey-subnav">${group.routes.map(link).join('')}</div></details>`;
  }).join('');
  R.navigationPage=page;
  document.querySelectorAll('[data-nav-group]').forEach(group=>{
    group.querySelector('summary').onclick=event=>{
      event.preventDefault();group.open=!group.open;
      workspace.navigationGroups[group.dataset.navGroup]=group.open;persist();
    };
  });
  const parent=navigationGroups.find(g=>g.routes.includes(page));
  if(parent)$('#header-page').textContent=parent.label+' / '+pages[page][1];
};

R.views.journey=function(){
  const role=J.resolveRole(workspace.journeyPreferences,localMemberId,state.id);
  const pref=myJourneyPreference();
  const scope=pref.scope||'mine';
  const viewRole=scope==='all'?'lead':role.id;
  const stages=J.stages(state,viewRole,!!imported?.snapshot);
  const selected=stages.find(s=>s.id===pref.selected[viewRole])||stages.find(s=>s.status==='pending')||stages[0];
  const ready=stages.filter(s=>s.status==='ready').length;
  $('#view').innerHTML=head('PROJECT WORKSPACE','项目总览','围绕当前项目，用适合你的工作顺序继续推进。')+
    `<div class="journey-project-card"><span class="journey-symbol">${icon('target')}</span><div><small>当前营销目标</small><h2>${E(state.goal||'先明确这次营销要解决什么问题')}</h2><p>${E(state.name)} · 资料、计划与成果在项目内共享</p></div><button class="small" data-config="goal">${state.goal?'编辑目标':'设置目标'}</button></div>
    <section class="journey-card" aria-label="营销进度线"><div class="journey-heading"><div><div class="eyebrow">MY WORKFLOW</div><h2>我的营销工作</h2></div><div class="journey-scope"><button data-r-action="journey-scope" data-id="mine" class="${scope==='mine'?'active':''}">我的工作</button><button data-r-action="journey-scope" data-id="all" class="${scope==='all'?'active':''}">项目全貌</button></div></div>
    <div class="journey-role"><label for="journey-role">当前工作视角<select id="journey-role">${Object.entries(J.roles).map(([id,value])=>`<option value="${id}" ${id===role.id?'selected':''}>${value.label}</option>`).join('')}</select></label><span>${E(role.source)} · 本地选择</span><button class="small" data-r-action="journey-default">设为我的默认</button></div>
    <p class="journey-description">${scope==='all'?'项目全貌展示完整营销链路；切回我的工作，继续当前角色的流程。':E(role.description)}。${ready} 个阶段已有本地资料或草稿。</p>
    <ol class="journey-track" style="--stage-count:${stages.length}">${stages.map((s,index)=>`<li class="${s.status} ${selected.id===s.id?'selected':''}"><button data-r-action="journey-stage" data-id="${s.id}" aria-pressed="${selected.id===s.id}"><span class="journey-node">${String(index+1).padStart(2,'0')}</span><strong>${s.label}</strong><small>${s.status==='ready'?'已有资料':s.status==='blocked'?'待接入':s.status==='available'?'工具可用':'待开始'}</small></button></li>`).join('')}</ol>
    <div class="journey-detail"><div class="journey-detail-top"><div><span class="tag ${selected.status==='blocked'?'gold':''}">${E(selected.detail)}</span><h3>${selected.label}</h3><p>${selected.description}</p></div><button class="solid" data-route="${selected.route}">${selected.status==='blocked'?'查看接入与配置':'进入'+pages[selected.route][1]} →</button></div>${selected.items.length?`<div class="journey-evidence">${selected.items.map(item=>`<span>${icon('folder')}${E(item)}</span>`).join('')}</div>`:''}</div>
    <div class="journey-explainer"><span>视角按项目记忆，状态随项目资料更新。</span><button data-r-action="journey-explain">如何切换？</button></div></section>
    <div class="journey-resources"><a href="#knowledge">${icon('book')}知识库管理 <span>↗</span></a><a href="#skills">${icon('spark')}技能管理 <span>↗</span></a><a href="#projectcap">${icon('shield')}项目能力配置 <span>↗</span></a></div>
    <div class="section-heading"><h2>当前项目成果</h2><span>共享给不同工作视角</span></div><div class="journey-artifacts">${[['insights','内容观察',state.insights.length],['plan','营销计划',state.plans.length],['creation','内容草稿',state.drafts.length]].map(([route,label,count])=>`<button data-route="${route}"><small>${label}</small><b>${count}</b><span>查看 →</span></button>`).join('')}</div>`;
  $('#journey-role').onchange=e=>{pref.role=e.target.value;pref.scope='mine';persist();render();};
};
R.invoke('journey-scope',b=>{myJourneyPreference().scope=b.dataset.id;persist();render();});
R.invoke('journey-stage',b=>{
  const role=J.resolveRole(workspace.journeyPreferences,localMemberId,state.id);
  const viewRole=myJourneyPreference().scope==='all'?'lead':role.id;
  myJourneyPreference().selected[viewRole]=b.dataset.id;persist();render();
});
R.invoke('journey-default',()=>{
  const role=J.resolveRole(workspace.journeyPreferences,localMemberId,state.id);
  workspace.journeyPreferences.users[localMemberId].defaultRole=role.id;persist();render();toast('已设为默认；已有项目的单独选择保持不变');
});
R.invoke('journey-explain',()=>{
  modal('工作视角如何确定','当前版本按浏览器中的“我”保存选择；尚未接入员工登录身份。',[],()=>{});
  $('#modal-fields').innerHTML='<div class="journey-help"><p><b>1. 本项目优先</b><br>在项目中选过的角色会被记住，切换项目会使用各自的选择。</p><p><b>2. 个人默认兜底</b><br>新项目使用“设为我的默认”的角色；首次进入默认展示营销负责人视角。</p><p><b>3. 项目成果共享</b><br>角色改变工作顺序与入口。阶段状态来自当前项目的资料、计划和草稿；未接入的执行服务显示待接入。</p><p><b>接入账号系统后</b><br>由已验证的用户身份与项目成员角色提供默认值，偏好按用户和项目隔离。当前切换角色不会授予管理权限。</p></div>';
});
render();
