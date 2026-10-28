(function(root){
  // 聚合只建立引用，不复制或迁移原项目任务和草稿。
  function tasks(workspace){
    const personal=(workspace.dashboard?.tasks||[]).map(t=>({...t,kind:'personal',key:'personal:'+t.id,origin:'我的待办'}));
    const planned=(workspace.projects||[]).flatMap(project=>(project.plans||[]).flatMap(plan=>(plan.tasks||[]).map(t=>({
      ...t,kind:'plan',key:project.id+':'+plan.id+':'+t.id,projectId:project.id,planId:plan.id,origin:plan.title,route:'plan'
    }))));
    return [...personal,...planned];
  }
  function drafts(workspace){
    return (workspace.projects||[]).flatMap(project=>(project.drafts||[]).map(d=>({...d,projectId:project.id}))).reverse();
  }
  function sources(workspace){
    return (workspace.projects||[]).flatMap(project=>(project.sources||[]).map(s=>({...s,projectId:project.id}))).reverse();
  }
  function localDay(date=new Date()){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function filtered(tasks,filter,today=localDay()){
    if(filter==='done')return tasks.filter(t=>t.done);
    if(filter==='today')return tasks.filter(t=>!t.done&&t.due&&t.due<=today);
    return tasks.filter(t=>!t.done);
  }
  const methods=[
    {id:'method-scene',kind:'method',tag:'场景切入',title:'从一个真实使用场景开始',text:'挑选一个用户经常遇到的小问题，用产品事实说明如何应对。',accent:'blue',mark:'01'},
    {id:'method-question',kind:'method',tag:'用户问答',title:'把用户的疑问变成选题',text:'选择一条真实评论，先回答疑问，再补充可验证的信息与使用边界。',accent:'violet',mark:'02'},
    {id:'method-explain',kind:'method',tag:'产品表达',title:'让一个卖点变得具体',text:'用细节、过程或对照讲清产品特点，准备两种开头供后续测试。',accent:'mint',mark:'03'}
  ];
  function diagnostics(workspace){
    return (workspace.dashboard?.diagnostics||[]).filter(d=>(workspace.projects||[]).some(p=>p.id===d.projectId)).sort((a,b)=>({high:0,medium:1,low:2}[a.severity]-{high:0,medium:1,low:2}[b.severity])||b.observedAt-a.observedAt);
  }
  function receiveDiagnosis(workspace,input){
    if(!input||!['automation','plan'].includes(input.targetType))throw Error('诊断对象必须是自动化任务或计划');
    if(!(workspace.projects||[]).some(p=>p.id===input.projectId))throw Error('诊断所属项目不存在');
    for(const key of ['projectId','targetId','findingKey','reportId','targetName','title','point','evidence','suggestion']){
      if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>6000)throw Error('诊断缺少有效字段：'+key);
    }
    if(!['high','medium','low'].includes(input.severity))throw Error('请提供有效影响程度');
    const observedAt=typeof input.observedAt==='number'?input.observedAt:Date.parse(input.observedAt);
    if(!Number.isFinite(observedAt)||observedAt<=0||observedAt>Date.now()+60000)throw Error('诊断时间无效');
    const id=JSON.stringify([input.projectId,input.targetType,input.targetId,input.findingKey]);
    const rows=workspace.dashboard?.diagnostics||[],old=rows.find(d=>d.id===id);
    if(old&&observedAt<=old.observedAt)return rows;
    const row={id,projectId:input.projectId,targetType:input.targetType,targetId:input.targetId,findingKey:input.findingKey,reportId:input.reportId,targetName:input.targetName,title:input.title,point:input.point,evidence:input.evidence,suggestion:input.suggestion,severity:input.severity,cause:typeof input.cause==='string'?input.cause.slice(0,6000):'',automationName:typeof input.automationName==='string'?input.automationName.slice(0,500):'',automationId:typeof input.automationId==='string'?input.automationId.slice(0,500):'',evidenceDetails:typeof input.evidenceDetails==='string'?input.evidenceDetails.slice(0,6000):'',observedAt,status:'pending',chatId:old?.chatId||null,createdAt:old?.createdAt||Date.now()};
    return [...rows.filter(d=>d.id!==id),row];
  }
  function diagnosticPrompt(d){return `${d.isExample?'【交互示例，非真实账户异常】\n':''}请根据以下异常提醒，核对统计口径和样本量，分析可能原因，并提出具体整改方案及复核指标。\n\n诊断对象：${d.targetType==='automation'?'自动化任务':'营销计划'} · ${d.targetName}\n对象 ID：${d.targetId}\n异常点位：${d.point}\n发现的问题：${d.title}\n影响程度：${{high:'高',medium:'中',low:'低'}[d.severity]}\n来源自动化任务：${d.automationName||'报告未提供'}\n事实：${d.evidence}${d.evidenceDetails?"\n统计明细："+d.evidenceDetails:""}\n可能原因（待核实）：${d.cause||'报告未提供，需继续诊断'}\n建议：${d.suggestion}\n诊断报告：${d.reportId}\n发现时间：${new Date(d.observedAt).toLocaleString('zh-CN')}\n\n请结合当前配置说明原因、需要修改的字段及预期影响。先与我确认修改方案，不要直接执行。`;}
  function confirmations(workspace){return (workspace.dashboard?.confirmations||[]).filter(c=>workspace.projects.some(p=>p.id===c.projectId)).sort((a,b)=>b.observedAt-a.observedAt);}
  function normalizeWorkflow(input){
    if(input==null)return null;
    const text=(value,max=500)=>typeof value==='string'&&value.trim()&&value.length<=max;
    if(!text(input.taskName)||!text(input.runId)||!text(input.currentNodeId)||!Array.isArray(input.nodes)||!input.nodes.length||input.nodes.length>40)throw Error('确认流程需要任务名称、执行批次、当前节点和步骤');
    const nodes=input.nodes.map(n=>{
      if(!n||!text(n.id)||!text(n.label)||!['completed','pending','waiting','running'].includes(n.status))throw Error('确认流程节点无效');
      if(n.parentId!=null&&!text(n.parentId))throw Error('确认流程父节点无效');
      return {id:n.id,label:n.label,parentId:n.parentId||null,status:n.status,detail:typeof n.detail==='string'?n.detail.slice(0,3000):''};
    });
    const byId=new Map(nodes.map(n=>[n.id,n]));
    if(byId.size!==nodes.length||!byId.has(input.currentNodeId))throw Error('确认流程节点重复或当前节点不存在');
    for(const node of nodes){const seen=new Set([node.id]);let parent=node.parentId;while(parent){if(!byId.has(parent)||seen.has(parent))throw Error('确认流程层级无效');seen.add(parent);parent=byId.get(parent).parentId;}}
    if(byId.get(input.currentNodeId).status!=='pending')throw Error('当前确认节点必须等待人工确认');
    return {taskName:input.taskName,runId:input.runId,currentNodeId:input.currentNodeId,nodes};
  }
  function confirmationWorkflow(c){
    if(c.workflow)return c.workflow;
    return {taskName:c.title,runId:'',currentNodeId:'review',nodes:[{id:'review',label:{decision:'方案决策',content:'内容审核',publish:'发布确认'}[c.kind]||'人工确认',parentId:null,status:'pending',detail:c.summary}]};
  }
  function receiveConfirmation(workspace,input){
    if(!input||!['decision','content','publish'].includes(input.kind))throw Error('待确认类型无效');
    if(!workspace.projects.some(p=>p.id===input.projectId))throw Error('所属项目不存在');
    for(const key of ['requestId','title','summary','details','version','sourceChatId'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>10000)throw Error('确认事项缺少有效字段：'+key);
    const observedAt=typeof input.observedAt==='number'?input.observedAt:Date.parse(input.observedAt);
    if(!Number.isFinite(observedAt)||observedAt<=0||observedAt>Date.now()+60000)throw Error('确认事项时间无效');
    const id=JSON.stringify([input.projectId,input.requestId]),rows=workspace.dashboard?.confirmations||[],old=rows.find(c=>c.id===id);
    if(old&&observedAt<=old.observedAt)return rows;
    const sameVersion=old?.version===input.version;
    const workflow=normalizeWorkflow(input.workflow);
    const row={id,projectId:input.projectId,requestId:input.requestId,kind:input.kind,title:input.title,summary:input.summary,details:input.details,version:input.version,sourceChatId:input.sourceChatId,objectId:typeof input.objectId==='string'?input.objectId:'',workflow,observedAt,status:'pending',chatId:old?.chatId||null};
    // Only an identical payload may retain an earlier decision.
    if(sameVersion&&old.title===row.title&&old.sourceChatId===row.sourceChatId&&old.summary===row.summary&&old.details===row.details&&old.kind===row.kind&&old.objectId===row.objectId&&JSON.stringify(old.workflow||null)===JSON.stringify(workflow)){row.status=old.status;for(const key of ['decisionAt','decisionVersion','decisionNodeId','decisionRunId'])if(old[key]!=null)row[key]=old[key];}
    return [...rows.filter(c=>c.id!==id),row];
  }
  function confirmationPrompt(c){return `${c.isExample?'【交互示例，非真实待确认事项】\n':''}请继续讨论这项待确认事项：${c.title}\n类型：${{decision:'方案决策',content:'生成内容审核',publish:'投放发布'}[c.kind]}\n版本：${c.version}${c.workflow?"\n任务："+c.workflow.taskName+"\n执行批次："+c.workflow.runId+"\n待确认节点："+c.workflow.nodes.find(n=>n.id===c.workflow.currentNodeId).label:""}\n待确认内容：${c.summary}\n具体内容：${c.details}\n请先回答我的问题并讨论修改，未经明确确认不要发布或执行。`;}
  const model={tasks,drafts,sources,localDay,filtered,methods,diagnostics,receiveDiagnosis,diagnosticPrompt,confirmations,receiveConfirmation,confirmationPrompt,confirmationWorkflow};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.DashboardModel=model;
})(globalThis);
