'use strict';
paths.plus='M12 5v14 M5 12h14';paths.search='M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M15 15l6 6';paths.settings='M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6';
// One shared conversation workspace, with a focused entry and contextual business entry.
const afDescriptions={
'普通计划搭建':'复用模板或素材 ID，批量搭建普通广告计划。','达人广告搭建':'复制达人广告组、合并达人素材并确认发布。','星广联投搭建':'批量搭建星广广告，管理多任务 ID 与发布。','渠道效果查询':'按日、周、月查看各层级渠道的投放效果。','业务获客查询':'从部门、产品和渠道维度了解获客表现。','综合报告':'汇总市场获客数据，生成图表与标准报告。','账户与策略诊断':'分析账户表现，排查归因与回传策略问题。','素材效果分析':'分析视频素材与分镜表现，获取创意建议。','素材筛选':'筛选可发布素材，寻找优质创意参考。','素材补产规划':'结合账户需求和库存，规划素材补产。','品牌资产获取':'获取企业与产品 Logo 合集及资源入口。','定时任务管理':'配置周期任务，管理执行时间和运行状态。','流量包标签管理':'维护专属标签，让 Agent 理解业务分类。','结算与对账':'上传结算文件，解析数据并核对差异。','技能创建':'创建、修改和优化你的专属技能。','图表与记录展示':'统一图表与操作记录的展示方式。','历史追溯与排障':'查询历史会话与日志，追溯执行问题。'};
const afGlyphs={'批量基建':'plus','盯盘洞察':'chart','资产准备':'folder','投放管理':'plan','自定义与辅助':'settings'};
const afBatchSkills=[
 {id:'normal-plan-batch-publish-builder',group:'批量基建',category:'普通计划搭建',name:'批量复制普通计划',description:'支持新账户进行批量复制发布；支持调整出价、预算和素材，素材支持托管、算法推荐卡筛选。'},
 {id:'batch-publish-builder',group:'批量基建',category:'达人广告搭建',name:'批量复制达人计划',description:'支持替换素材，素材支持通过填写素材结构卡筛选；批量发布组合不可指定，走系统默认。'},
 {id:'xingguang-batch-publish-builder',group:'批量基建',category:'星广联投搭建',name:'批量复制星广计划',description:'支持替换星广任务 ID 和素材；素材仅支持基于创建时间筛选，批量发布组合支持素材一致分配和素材平均分配。'}
];
const afSkillPrompts={
 'report-tool-selector':'查询【产品】在【开始日期】至【结束日期】的【渠道】投放日报，按天展示消耗、获客设备数、获客成本和次留率。',
 'report-tool-selector-week':'查询【产品】上周在【媒体平台／二级渠道】的投放效果，展示消耗、获客、成本和留存数据。',
 'report-tool-selector-month':'查询【产品】在【月份】的【渠道】投放月报，展示消耗、获客、成本和留存指标。',
 'all-dept-wide-table-query':'查询全部门【日期范围】的获客数据，按媒体汇总消耗、获客设备数、获客成本和次留率，注明留存数据的完整日期范围。',
 'xinmeiti-wide-table-query':'查询新媒体部门【产品】在【时间范围】的获客表现，按媒体和推广类型汇总消耗、获客设备数、留存率与 ROI。',
 'kaihei-pc-query':'查询开黑 PC 在【时间范围】的获客数据，按媒体展示消耗、获客设备数、获客成本、留存率和 ROI。',
 'market-data-report':'生成【月份】的标准市场数据报告，包含默认五组图表，并导出 Excel。',
 'account-analysis':'分析【产品】在【一级渠道】、【平台】平台的账户现状，负责人【负责人】，素材类型【素材类型】，对比【完整月份 A】与【完整月份 B】；缺少产品标识时请先询问。',
 'meta-ai-diagnosis':'基于以上投放数据和操作记录，分析成本上升、转化及留存变化的可能原因，区分数据事实与推测，并给出优化建议。',
 'cb-strategy-troubleshooting':'排查账户【账户 ID】在【开始日期】至【结束日期】的激活回传策略，查看回传比例和成功数，定位异常策略。',
 'content-attribution':'对素材【素材 ID 列表】进行内容归因分析，周期为【开始日期】至【结束日期】，查看分镜表现及创意优化建议。',
 'asset-library-selector':'为普通计划发布筛选【产品】的【素材类型】素材，条件为【筛选条件】，返回符合条件的素材 ID。',
 'reference-material-analysis':'分析【产品】在【渠道】的【素材方向】，对比【完整月份 A】与【完整月份 B】，找出优质、跑量大但付费差和两期利润 TOP5 参考素材。',
 'material-gap-analysis':'分析【产品】在【渠道】、【平台】的素材缺口，负责人【负责人】，素材类型【素材类型】，对比【完整月份 A】和【完整月份 B】，输出分类、计划产量与库存缺口。',
 'account-asset-gap-analysis':'对【产品】、【一级渠道】、负责人【负责人】的【素材类型】进行账户素材缺口分析，周期为【完整月份 A】和【完整月份 B】，输出账户分类、库存、补产与素材分配结果。',
 'knowledge-logo-material':'帮我查找【企业／产品名称】的 Logo 素材，并提供相关品牌资料入口。',
 'scheduled-task':'每周一上午 10 点，查询【产品】上周的【渠道】投放数据，汇总消耗、获客和成本，生成周报。',
 'union-packages-label':'帮我更新流量包标签映射：【流量包 A】归为【标签 A】，【流量包 B】归为【标签 B】，保留其他已有映射。',
 'settlement-import':'我要批量导入结算单 Excel，请打开上传入口，解析文件并展示导入结果和需要复核的差异。',
 'skill-creator':'帮我创建一个用于【业务场景】的 Skill，输入是【输入内容】，期望输出【交付结果】，请先梳理触发条件、执行步骤和依赖工具。',
 'meta-echarts-renderer':'将以上数据绘制为双轴图，左轴用柱状图展示消耗，右轴用折线图展示次留率，明确标注单位和图例。',
 'meta-operation-record-renderer':'将以上操作记录按时间整理为时间轴卡片，清晰展示操作类别和变更内容。',
 'agent-session-history':'查询会话【session_id】的完整记录，包括用户消息、工具调用及执行结果，帮助我回溯处理过程。',
 'log-search':'发布失败日志查询，taskid=【发布任务 ID】。'
};
const afFeaturedIds=['normal-plan-batch-publish-builder','report-tool-selector','account-analysis','asset-library-selector','scheduled-task','skill-creator'];
function afSkillEntry(id){return afBatchSkills.find(item=>item.id===id)||AS.skills.find(item=>item.id===id);}
function afCustomTipCard(tip){return `<article class="af-custom-tip-card ${tip.favorite?'favorite':''}"><button type="button" class="af-custom-tip-main" data-r-action="aw-use-custom-tip" data-id="${E(tip.id)}"><span><h3>${E(tip.name)}</h3><em>${tip.favorite?'已收藏':'刚刚'}</em></span><p>${E(tip.prompt.replace(/【|】/g,'').slice(0,92))}${tip.prompt.length>92?'…':''}</p><footer>${tip.favorite?'收藏':'自定义妙招'}<span>键入输入框 ↗</span></footer></button>${awCustomTipActions(tip)}</article>`;}
function afSceneCard(entry){const key=`skill:${entry.id}`,basePrompt=afSkillPrompts[entry.id]||`请使用「${entry.name}」帮助我完成当前任务。${entry.description}`,info=awRegisterBuiltin({key,kind:'skill',skillId:entry.id,name:entry.name,description:entry.description,prompt:basePrompt,components:[]}),favorite=awBuiltinFavorite(key);return `<article class="af-category-card ${favorite?'favorite':''}"><button type="button" class="af-category-card-main" data-r-action="af-primary-skill" data-id="${E(entry.id)}"><div><h3>${E(info.name)}</h3><span>1 个技能</span></div><p>${E(info.description)}</p><footer>${E(entry.category||entry.group)}<span>键入默认提示词 ↗</span></footer><span class="af-card-art" aria-hidden="true">${icon(afGlyphs[entry.group]||'spark')}</span></button>${awBuiltinTipActions(info)}</article>`;}
awRenderScenes=function(){
 const scenes=$('#aw-scenes'),c=awChat(),active=!!(c.messages.length||c.reference||c.confirmationContext||c.diagnosisContext||(c.adPublishFlow&&c.adPublishFlow.stage!=='compose')||c.videoWorkflow?.runs?.length);
 assistantShell.classList.toggle('aw-conversation-active',active);
 if(active){scenes.hidden=true;scenes.innerHTML='';return;}
 scenes.hidden=false;
 const visibleGroups=AS.groups,favorites=workspace.customTips.filter(tip=>tip.favorite),favoriteSkills=workspace.builtinTipFavorites.filter(key=>key.startsWith('skill:')).map(key=>afSkillEntry(key.slice(6))).filter(Boolean);if(AW.group==='收藏'&&!favorites.length&&!favoriteSkills.length)AW.group='自定义与辅助';
 const groupMeta=visibleGroups.find(group=>group.name===AW.group),categories=groupMeta?.categories||[];
 let entries=[];
 if(AW.group==='收藏')entries=favoriteSkills;
 else if(AW.group==='精选场景')entries=afFeaturedIds.map(afSkillEntry).filter(Boolean);
 else if(AW.group==='批量基建')entries=afBatchSkills.filter(entry=>!AW.category||entry.category===AW.category);
 else if(AW.group!=='收藏')entries=AS.skills.filter(entry=>entry.group===AW.group&&(!AW.category||entry.category===AW.category));
 const custom=AW.group==='自定义与辅助'||AW.group==='收藏',tips=AW.group==='收藏'?favorites:workspace.customTips;
 const customCards=(custom?entries.map(afSceneCard).join('')+tips.map(afCustomTipCard).join('')+(AW.group==='自定义与辅助'?`<button type="button" class="af-custom-tip-add" data-r-action="aw-create-custom-tip" aria-label="新建自定义妙招"><b>＋</b><small role="tooltip">自定义妙招</small></button>`:''):'');
 const tabs=[...(favorites.length||favoriteSkills.length?['收藏']:[]),'精选场景',...visibleGroups.map(group=>group.name)];
 const categoryNav=categories.length?`<nav class="af-skill-categories" aria-label="二级场景分类">${['',...categories].map(name=>awButton('aw-category',name||'全部',name,name===AW.category?'active':'')).join('')}</nav>`:'';
 scenes.innerHTML=`<nav class="aw-scene-groups" aria-label="一级场景分类">${tabs.map(name=>awButton('aw-group',(name==='收藏'?'☆ ':icon(afGlyphs[name]||'spark'))+E(name),name,name===AW.group?'active':'')).join('')}</nav>${categoryNav}<div class="af-category-grid ${custom?'af-custom-tip-grid':''}" aria-label="${AW.group==='收藏'?'收藏妙招':custom?'自定义与辅助技能':'场景技能'}">${custom?customCards:entries.map(afSceneCard).join('')}</div>`;
};
AW.group='精选场景';
R.invoke('af-primary-skill',b=>{
 const batch=afBatchSkills.find(entry=>entry.id===b.dataset.id),edit=workspace.builtinTipEdits[`skill:${b.dataset.id}`];if(batch&&!edit)return R.actions['aw-use-skill']?.({dataset:{id:batch.id}});
 const entry=batch||AS.skills.find(item=>item.id===b.dataset.id);if(!entry)return;
 const c=awChat(),prompt=workspace.builtinTipEdits[`skill:${entry.id}`]?.prompt||afSkillPrompts[entry.id]||`请使用「${entry.name}」帮助我完成当前任务。${entry.description}`;
 const tokens=[...prompt.matchAll(/【([^】]+)】/g)].map(match=>match[1]).filter(name=>awComponentNames.has(name));
 delete c.adPublishFlow;delete c.videoWorkflow;delete c.customTipId;delete c.customTipTemplate;c.skillIds=[entry.id];c.tipComponents=[];
 if(tokens.length){c.customTipTemplate=prompt;c.tipComponents=[...new Set(tokens)].map(name=>({name,value:awComponentDefaults[name]||awComponentOptions[name]?.[0]||'请选择'}));c.draft=awResolveCustomTip(c);}else c.draft=prompt;
 c.updated=Date.now();persist();renderAssistant();
 const first=document.querySelector('#aw-rich-prompt select');if(first)first.focus();else{$('#prompt').focus();$('#prompt').setSelectionRange(c.draft.length,c.draft.length);}$('#composer').scrollIntoView({block:'center',behavior:'smooth'});
});
const afRail=document.createElement('nav');afRail.className='af-rail';afRail.setAttribute('aria-label','Agent 导航');
const afRailButton=(action,label,glyph)=>`<button type="button" data-r-action="${action}" aria-label="${label}" title="${label}">${icon(glyph)}</button>`;
afRail.innerHTML=`<a href="#assistant" class="af-logo" aria-label="返回营销工作台" title="返回营销工作台">➤</a>${afRailButton('af-new','新建对话','plus')}${afRailButton('af-projects','项目与对话','folder')}${afRailButton('af-workflows','工作流','plan')}${afRailButton('af-skills','技能','spark')}${afRailButton('af-config','知识与连接器','book')}${afRailButton('af-search','搜索对话','search')}<div class="af-rail-bottom" aria-hidden="true"></div>`;
assistantShell.prepend(afRail);
R.invoke('af-projects',b=>R.actions['aw-toggle-sidebar'](b));R.invoke('af-search',b=>R.actions['aw-search'](b));
R.invoke('af-new',()=>awNewChat(state.id));
R.invoke('af-skills',()=>{AW.folder=null;assistantTab='chat';renderAssistant();assistantShell.querySelector('[data-r-action="aw-pick-skill"]').click();});
R.invoke('af-config',()=>{AW.folder=null;assistantTab='config';renderAssistant();});
R.invoke('af-workflows',()=>{modal('工作流','从业务页面配置任务，也可以随时带着当前项目资料继续与 Agent 对话。',[],()=>{});$('#modal-fields').innerHTML=`<div class="af-workflow-links">${[['insights','内容洞察'],['creation','内容创作'],['plan','营销计划'],['automation','自动化任务']].map(([id,label])=>`<a href="#${id}" data-af-workflow>${label} →</a>`).join('')}</div>`;$('#modal-fields').querySelectorAll('[data-af-workflow]').forEach(a=>a.onclick=()=>$('#modal').close());$('#save').textContent='关闭';});
const afRenderAssistant=renderAssistant;renderAssistant=function(){afRenderAssistant();assistantShell.classList.toggle('af-chat',assistantTab==='chat'&&!AW.folder);const welcome=$('#assistant-body .chat-welcome');if(welcome)welcome.innerHTML='<h2>你好，今天有什么可以帮到你？</h2>';$('#prompt').placeholder='告诉 Ad agent 你想完成的工作，或选择下方场景开始…';};
render();
