/* Pure view resolution: role preferences never grant business permissions. */
(function(root) {
  const roles = {
    lead: {label:'营销负责人',description:'查看从机会到复盘的项目全貌',stages:['opportunity','planning','creation','execution','review']},
    strategy: {label:'策略策划',description:'从资料与用户声音形成营销方向',stages:['sources','opportunity','planning','creation']},
    creator: {label:'内容创作者',description:'围绕计划与品牌资料完成内容草稿',stages:['assignment','brand','creation','locked']},
    operator: {label:'投放运营',description:'准备计划与素材，配置执行并查看数据',stages:['planning','locked','managed','execution','data']},
    analyst: {label:'数据分析',description:'核对数据、归因与审计，推动下一轮调整',stages:['data','attribution','review','planning']}
  };
  const definitions = {
    sources:['搜集资料','insights','收集竞品、行业与用户资料，并保留来源。'],
    opportunity:['发现机会','insights','整理资料观察并核对证据，再用于营销计划。'],
    opinion:['舆情观察','opinion','检查项目中的评论线索，人工核对关注事项。'],
    planning:['制定计划','plan','明确目标、渠道与内容方向，拆成可执行任务。'],
    assignment:['查看任务','plan','查看项目计划和未完成任务，选择任务继续创作。'],
    brand:['品牌资料','brand-assets','补充产品事实、目标人群和品牌表达。'],
    creation:['内容创作','creation','创建或修改项目草稿，保留计划关联。'],
    locked:['锁定草稿','creation','锁定已核对的内容；锁定仅表示防止修改。'],
    managed:['配置托管','autopilot','明确规则范围、执行频率与审核人，保存配置草稿。'],
    execution:['投放执行','automation','接入执行服务后，在原系统确认启用与发布。'],
    data:['查看数据','data','导入当前项目的广告导出文件，核对账户和时间范围。'],
    attribution:['内容归因','attribution','接入业务数据后，查看素材表现与归因报告。'],
    review:['广告审计','audit','进入原广告审计核对运行数据；结果尚未自动绑定当前项目。']
  };
  function resolveRole(preferences, memberId, projectId, defaults={}) {
    const user=preferences.users?.[memberId]||{};
    const choices=[[user.projects?.[projectId]?.role,'本项目记忆'],[defaults.projectRole,'项目角色'],[user.defaultRole,'个人默认'],[defaults.accountRole,'账号角色'],['lead','初次默认']];
    const [id,source]=choices.find(([value])=>roles[value]);
    return {id,source,...roles[id]};
  }
  function stages(project, roleId, hasImport=false) {
    const list=key=>Array.isArray(project[key])?project[key]:[];
    const sources=list('sources'),insights=list('insights'),plans=list('plans'),drafts=list('drafts');
    const tasks=plans.flatMap(p=>p.tasks||[]),pending=tasks.filter(t=>!t.done).length;
    const comments=sources.filter(s=>s.kind==='用户评论').length;
    const brand=['brand','audience','voice'].filter(key=>String(project[key]||'').trim()).length;
    const lockCount=drafts.filter(d=>d.locked).length;
    const facts={
      sources:[sources.length>0?'ready':'pending',`${sources.length} 份资料${sources.some(s=>s.demo)?' · 含示例':''}`,sources.slice(-3).map(s=>s.title)],
      opportunity:[insights.length>0?'ready':'pending',`${insights.length} 份观察 · 待人工确认`,insights.slice(-3).map(i=>i.title)],
      opinion:[comments?'ready':'pending',`${comments} 份评论资料 · 规则初筛`,sources.filter(s=>s.kind==='用户评论').slice(-3).map(s=>s.title)],
      planning:[plans.length?'ready':'pending',`${plans.length} 个计划 · ${pending} 项未完成任务`,plans.slice(-3).map(p=>p.title)],
      assignment:[plans.length?'ready':'pending',`${pending} 项未完成 / ${tasks.length} 项项目任务`,tasks.filter(t=>!t.done).slice(0,3).map(t=>t.title)],
      brand:[brand===3?'ready':'pending',`已填写 ${brand}/3 项品牌背景`,[]],
      creation:[drafts.length?'ready':'pending',`${drafts.length} 篇草稿 · ${lockCount} 篇已锁定`,drafts.slice(-3).map(d=>d.title)],
      locked:[lockCount?'ready':'pending',`${lockCount} 篇已锁定 · 未表示已发布`,drafts.filter(d=>d.locked).slice(-3).map(d=>d.title)],
      managed:[list('rules').length?'ready':'pending',`${list('rules').length} 条规则草稿 · 未启用`,list('rules').slice(-3).map(r=>r.name)],
      execution:['blocked','执行服务未接入',[]],
      data:[hasImport?'ready':'pending',hasImport?'当前页面已有导入数据':'等待导入广告数据',[]],
      attribution:['blocked','归因数据服务未接入',[]],
      review:['available','审计工具可用 · 未关联项目',[]]
    };
    return roles[roleId].stages.map(id=>{
      const [label,route,description]=definitions[id], [status,detail,items]=facts[id];
      return {id,label:roleId==='lead'&&id==='review'?'营销复盘':label,route,description,status,detail,items};
    });
  }
  const model={roles,resolveRole,stages};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;
  else root.MarketingJourney=model;
})(globalThis);
