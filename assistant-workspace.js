'use strict';
const AS=window.AssistantScenarios;
const AW={group:'批量基建',category:'',folder:null,query:'',skillQuery:'',uploading:false,tipsOpen:false,tipGroup:'精选场景',customComponents:new Set(),customTipEditingId:null};
workspace.assistantPresets??=[];workspace.archivedProjects??=[];workspace.customTips??=[];
const awComponentGroups={
 '营销单元 / 资产':['账户 ID','新账户 ID','参考账户 ID','营销单元/项目 ID','参考营销单元/项目 ID','目标营销单元/项目 ID','创意 ID','推广产品','产品','产品描述','账号-微信小店','素材','素材 ID 列表','素材类型','素材方向','营销载体','渠道','一级渠道','媒体平台／二级渠道','平台','负责人','企业／产品名称'],
 '日期 / 时间':['日期范围','开始日期','结束日期','月份','时间范围','完整月份 A','完整月份 B'],
 '金额':['转化目标','日预算','目标 ROI','金额','出价'],
 '数值':['数值','系数','调整幅度'],
 '其他':['出价类型','参考文件','规则','指标','核心指标','下钻维度','城市','创意关键词','行业/类目','筛选条件','业务场景','输入内容','交付结果','session_id','发布任务 ID','流量包 A','流量包 B','标签 A','标签 B']
};
const awComponentDefaults={'日期范围':'近 7 天','开始日期':'2026-10-01','结束日期':'2026-10-28','月份':'2026 年 10 月','时间范围':'近 7 天','完整月份 A':'2026 年 8 月','完整月份 B':'2026 年 9 月','转化目标':'下单','日预算':'100 元','目标 ROI':'1.5','金额':'100 元','出价':'智能推荐','账户 ID':'当前账户','营销单元/项目 ID':'智能推荐','产品':'TT 语音','渠道':'巨量引擎','一级渠道':'巨量引擎','媒体平台／二级渠道':'巨量引擎／信息流','平台':'iOS','负责人':'张淼','素材类型':'视频','素材方向':'产品演示'};
const awComponentOptions={
 '账户 ID':['当前账户','全部账户','指定账户'],'新账户 ID':['新账户 86037001','新账户 10839002','手动填写'],'参考账户 ID':['当前账户','账户 86037001','账户 10839002'],'营销单元/项目 ID':['智能推荐','当前项目','指定项目'],'参考营销单元/项目 ID':['当前项目','最近高效项目','指定项目'],'目标营销单元/项目 ID':['智能推荐','当前项目','指定项目'],'创意 ID':['智能推荐','最近创建','指定创意'],'推广产品':['当前产品','智能推荐','指定产品'],'产品描述':['使用项目资料','自动提取','手动补充'],'账号-微信小店':['当前小店','全部小店','指定小店'],'素材':['智能推荐','最近上传','手动选择'],'营销载体':['短视频','图文','落地页'],
 '产品':['TT 语音','开黑 PC','千音','指定产品'],'渠道':['巨量引擎','腾讯广告','快手','全部渠道'],'一级渠道':['巨量引擎','腾讯广告','快手'],'媒体平台／二级渠道':['巨量引擎／信息流','腾讯广告／优量汇','快手／主站'],'平台':['iOS','Android','PC','全平台'],'负责人':['张淼','当前负责人','指定负责人'],'素材类型':['视频','图片','图文','全部素材'],'素材方向':['产品演示','痛点反转','体验记录','指定方向'],'素材 ID 列表':['最近选中素材','1983290180812011522, 1981868491465003010','手动填写'],'企业／产品名称':['TT 语音','开黑','千音','指定名称'],'筛选条件':['产品标签 + 已授权','近 30 天 + 视频','自定义条件'],
 '日期范围':['近 3 天','近 7 天','近 30 天','本月'],'开始日期':['2026-10-01','2026-10-08','2026-10-21'],'结束日期':['2026-10-28','2026-10-27','2026-10-21'],'月份':['2026 年 10 月','2026 年 9 月','2026 年 8 月'],'时间范围':['近 7 天','近 30 天','本月','上月'],'完整月份 A':['2026 年 8 月','2026 年 7 月','2026 年 6 月'],'完整月份 B':['2026 年 9 月','2026 年 8 月','2026 年 7 月'],'转化目标':['下单','下单-下单 ROI','平台上报-下单'],'日预算':['100 元','500 元','1000 元','自定义'],'目标 ROI':['1.0','1.5','2.0','自定义'],'金额':['100 元','500 元','1000 元','自定义'],'出价':['智能推荐','目标转化出价','成本上限'],'数值':['1','3','5','10'],'系数':['0.8','1.0','1.2','1.5'],'调整幅度':['降低 10%','保持不变','提高 10%','提高 20%'],
 '出价类型':['智能出价','目标转化出价','成本上限'],'参考文件':['项目资料','最近上传文件','指定文件'],'规则':['系统推荐','已保存规则','自定义规则'],'指标':['消耗','点击率','转化成本','ROI'],'核心指标':['转化成本','目标转化量','ROI','消耗'],'下钻维度':['账户','营销单元/项目','计划','创意'],'城市':['全部城市','一线城市','指定城市'],'创意关键词':['智能提取','项目关键词','手动填写'],'行业/类目':['项目类目','智能识别','手动选择'],'业务场景':['投放诊断','批量建计划','素材复盘','自定义场景'],'输入内容':['账户与日期','素材与渠道','业务数据','自定义输入'],'交付结果':['分析报告','执行清单','可确认方案','自定义结果'],'session_id':['当前会话','最近会话','指定 session_id'],'发布任务 ID':['RUN-20261028-001','最近失败任务','指定任务 ID'],'流量包 A':['新客流量包','高价值流量包','指定流量包'],'流量包 B':['召回流量包','自然量流量包','指定流量包'],'标签 A':['新客','高价值','自定义标签'],'标签 B':['召回','自然量','自定义标签']
};
const awComponentNames=new Set(Object.values(awComponentGroups).flat());
function awEnsureDemoHistory(){
 const owner=workspace.projects[0];if(!owner||workspace.assistantHistoryDemoSeeded)return;
 const base=Date.now(),rows=[
  ['demo-history-running','分析项目功能与 Skill 模块','运行中',0],
  ['demo-history-approval','复现项目并添加可视化前端','等待批准',15],
  ['demo-history-discussing','对比广告投放工作台与营销 Agent','讨论中',42],
  ['demo-history-confirm','拆解 App Growing 功能模块','待确认',95],
  ['demo-history-done','复现 AI 营销 Agent 项目','已完成',160]
 ];
 owner.chats??=[];const known=new Set(owner.chats.map(item=>item.id));rows.slice().reverse().forEach(([id,title,demoStatus,minutes])=>{if(!known.has(id))owner.chats.push({id,title,demoStatus,messages:[],draft:'',created:base-minutes*60000,updated:base-minutes*60000,skillIds:[],presetIds:[],attachments:[]});});
 workspace.assistantHistoryDemoSeeded=true;persist();
}
function awConversationStatus(c){
 if(c.demoStatus)return c.demoStatus;
 if(c.confirmationContext?.status==='confirmed')return '已完成';
 if(c.confirmationContext)return '待确认';
 if(c.videoWorkflow?.activeRun||c.adPublishFlow?.stage==='processing')return '运行中';
 if(c.adPublishFlow&&c.adPublishFlow.stage!=='compose')return '待确认';
 if(c.messages?.length)return '已完成';
 return '草稿';
}
function awHistoryStatusMarkup(c){const status=awConversationStatus(c),cls={'运行中':'running','等待批准':'approval','讨论中':'discussing','待确认':'pending','已完成':'done','草稿':'draft'}[status]||'draft';return `<em class="aw-history-status ${cls}">${E(status)}</em>${status==='运行中'?'<i class="aw-history-spinner" aria-hidden="true"></i>':''}`;}
awEnsureDemoHistory();
const awButton=(action,label,id='',cls='')=>`<button type="button" class="${cls}" data-r-action="${action}" data-id="${E(id)}">${label}</button>`;
const awSkill=id=>AS.skills.find(s=>s.id===id)||R.data.skills.find(s=>s.id===id);
function awChat(){const c=chat();c.skillIds??=[];c.presetIds??=[];c.attachments??=[];return c;}
const assistantShell=$('#assistant-drawer');assistantShell.classList.add('aw-shell');
const awLayout=document.createElement('div');awLayout.className='aw-layout';awLayout.innerHTML='<aside class="aw-sidebar"><div id="aw-sidebar-top"></div><input id="aw-chat-search" aria-label="搜索项目与对话" placeholder="搜索项目与对话"><div id="aw-projects"></div><div id="aw-sidebar-footer"></div></aside><section class="aw-main"><div id="aw-topbar"></div><div id="aw-main-scroll"></div></section>';
assistantShell.append(awLayout);
assistantShell.querySelector('.drawer-head').insertAdjacentHTML('afterbegin',awButton('aw-toggle-sidebar','☰','','aw-mobile-projects'));
R.invoke('aw-toggle-sidebar',()=>assistantShell.classList.toggle('aw-sidebar-open'));

$('#aw-sidebar-top').append($('#assistant-new'));$('#assistant-new').textContent='＋ 新建对话';
$('#aw-sidebar-top').insertAdjacentHTML('beforeend',awButton('aw-new-project',icon('folder')+' 新建项目'));
$('#aw-topbar').append(assistantShell.querySelector('.drawer-context'),assistantShell.querySelector('.drawer-tabs'));
$('#aw-main-scroll').append($('#assistant-body'),assistantShell.querySelector('.composer-area'));
$('#aw-main-scroll').insertAdjacentHTML('beforeend','<section id="aw-scenes"></section>');
assistantShell.querySelector('.drawer-head b').textContent='营销对话助手';
assistantShell.querySelector('.composer-tools').innerHTML=`${awButton('aw-tips',icon('spark')+' 妙招')}${awButton('aw-upload',icon('folder')+' 本地上传')}${awButton('aw-pick-skill',icon('spark')+' 指定技能')}${awButton('aw-presets','▦ 策略预设')}<button type="button" id="add-source" class="aw-source-button">＋ 参考资料</button><span class="aw-send-space"></span>`+$('#send').outerHTML;
$('#add-source').onclick=()=>addSource();
$('#composer').insertAdjacentHTML('beforebegin','<section id="aw-tips-panel" hidden></section><div id="aw-context-chips"></div>');
$('#prompt').insertAdjacentHTML('beforebegin','<section id="aw-rich-prompt" aria-label="自定义妙招提示词" hidden></section>');
const awFiles=document.createElement('input');awFiles.type='file';awFiles.multiple=true;awFiles.hidden=true;awFiles.id='aw-file-input';assistantShell.append(awFiles);
const awCustomTipDialog=document.createElement('dialog');awCustomTipDialog.id='aw-custom-tip-dialog';awCustomTipDialog.setAttribute('aria-label','自定义妙招');document.body.append(awCustomTipDialog);
$('#aw-chat-search').oninput=e=>{AW.query=e.target.value;awRenderProjects();};
function awRenderProjects(){
  const q=AW.query.toLowerCase();
  const projectHtml=`<div class="aw-sidebar-label">项目 <span>${workspace.projects.length}</span></div>`+workspace.projects.map(p=>{
    const chats=(p.chats||[]).filter(c=>!q||(p.name+c.title).toLowerCase().includes(q));if(q&&!chats.length&&!p.name.toLowerCase().includes(q))return '';
    return `<section class="aw-project ${p.id===state.id?'current':''}"><div class="aw-project-head" data-project-drop="${E(p.id)}">${awButton('aw-folder',icon('folder')+`<span>${E(p.name)}</span>`,p.id,'aw-folder-button')}<details class="aw-project-menu"><summary aria-label="项目操作：${E(p.name)}">···</summary><div>${awButton('aw-folder','打开文件夹',p.id)}${p.nameLocked?'<span class="aw-name-locked">名称已与文件夹绑定</span>':awButton('aw-rename-project','重命名',p.id)}${awButton('aw-delete-project','删除项目',p.id,'danger')}</div></details>${awButton('aw-new-chat','＋',p.id,'aw-project-plus')}</div>${(p.id===state.id||q)?`<div class="aw-chat-list">${chats.map(c=>`<div class="aw-chat-row" draggable="true" data-chat-owner="${E(p.id)}" data-chat-id="${E(c.id)}"><button data-r-action="aw-select-chat" data-id="${E(c.id)}" data-owner="${E(p.id)}" class="${p.id===state.id&&c.id===state.chatId&&!AW.folder?'active':''}" title="${E(c.title)}">${icon('chat')}<span>${E(c.title)}</span></button><button class="aw-move-button" data-r-action="aw-move-chat" data-id="${E(c.id)}" data-owner="${E(p.id)}" aria-label="移动对话：${E(c.title)}" title="移动到其他项目">↗</button></div>`).join('')||'<small>还没有对话</small>'}</div>`:''}</section>`;
  }).join('');
  const now=Date.now(),day=86400000,history=workspace.projects.flatMap(p=>(p.chats||[]).map(c=>({p,c,at:c.updated||c.created||0}))).filter(({p,c})=>!q||(p.name+' '+c.title+' '+(c.draft||'')+' '+c.messages.map(m=>m.text||'').join(' ')).toLocaleLowerCase().includes(q)).sort((a,b)=>b.at-a.at);
  const groups=[['7天内',r=>r.at>=now-7*day],['30天内',r=>r.at<now-7*day&&r.at>=now-30*day],['更早',r=>r.at<now-30*day]];
  const historyHtml=`<section class="aw-history-section"><div class="aw-sidebar-label">历史对话 <span>${history.length}</span></div>${groups.map(([label,test])=>{const rows=history.filter(test);return rows.length?`<div class="aw-history-group"><h3>${label}</h3>${rows.map(({p,c})=>`<button type="button" data-r-action="aw-select-chat" data-id="${E(c.id)}" data-owner="${E(p.id)}" class="${p.id===state.id&&c.id===state.chatId&&!AW.folder?'active':''}" title="${E(p.name+' · '+c.title)}"><span>${E(c.title)}</span>${awHistoryStatusMarkup(c)}<small>${E(p.name)}</small></button>`).join('')}</div>`:'';}).join('')||'<p class="aw-history-empty">还没有历史对话</p>'}</section>`;
  $('#aw-projects').innerHTML=projectHtml+historyHtml;
  $('#aw-projects').querySelectorAll('.aw-project-plus').forEach(b=>b.setAttribute('aria-label','在此项目中新建对话'));
  $('#aw-sidebar-footer').innerHTML=awButton('aw-settings',icon('book')+' 技能 · 连接器 · 知识')+(workspace.archivedProjects.length?awButton('aw-trash','已删除项目 · '+workspace.archivedProjects.length):'')+'<small>本地工作空间</small>';
}

const awTipCatalog={
 '精选场景':[
  ['小店艾米一键新手起投','快速准备账户、产品、预算和素材方案','帮我为新账户搭建一套新手起投方案。请先让我选择目标账户和产品，再推荐广告组、计划数量、预算、出价和素材分配方式，整理成可确认的创建方案。',1178],
  ['批量新建创意','为投放中的项目自动补充新素材','帮我根据今天新上传的素材，为当前投放中的营销单元/项目批量补充创意。请先匹配素材与产品，列出建议组合，确认后再创建。',1274],
  ['批量清理低效创意','按证据筛选并清理低效内容','帮我筛选近 7 天消耗达到 100 元、目标转化量为 0 的低效创意。先展示账户、计划、消耗和转化证据，再让我确认需要清理的范围。',628],
  ['批量关停无效营销单元/项目','发现无效投放并给出关停清单','帮我筛选近 7 天消耗达到 100 元、目标转化量为 0 的营销单元/项目。请列出异常原因、证据和建议，确认后批量关停。',386],
  ['竞价投放转智投','核对配置并生成迁移方案','帮我把符合条件的竞价投放营销单元转为智能投放项目。先核对账户、原计划、预算、素材和转化目标，生成迁移方案供我确认。',3306]
 ],
 '批量基建':[
  ['普通计划批量搭建','复用模板批量搭建普通广告','帮我在选定账户下批量复制普通广告组模板。让我选择目标账户、模板广告组、模板计划、广告组数量、计划数量和素材分配方式，生成确认方案。',986,'normal-plan-batch-publish-builder'],
  ['达人广告批量搭建','复制达人广告组与计划','帮我在选定账户下批量复制达人广告组与计划。让我选择目标账户、模板广告组、模板计划和素材方式，整理后让我确认。',742,'batch-publish-builder'],
  ['星广联投批量搭建','按任务 ID 批量创建星广广告','帮我在选定账户下批量搭建星广联投广告。让我选择目标账户、模板广告组、模板计划、任务 ID、广告组和计划数量，以及素材分配规则。',615,'xingguang-batch-publish-builder']
 ],
 '盯盘洞察':[
  ['渠道效果洞察','比较渠道消耗、获客和成本变化','帮我查看最近 7 天各一级、二级渠道的消耗、获客、留存和成本变化，标出异常波动并给出需要进一步核对的数据。',824],
  ['账户异常诊断','识别消耗、转化和素材异常','帮我检查当前账户最近 7 天的异常投放，重点查看消耗上升、转化为 0、点击率下降和素材疲劳，并按严重程度给出证据与建议。',1109],
  ['素材归因分析','从素材和分镜定位表现差异','帮我分析最近 7 天素材表现，按素材和分镜汇总消耗、点击、转化和成本，找出高潜与低效素材并提出补产方向。',673]
 ],
 '资产准备':[
  ['筛选可发布素材','按账户与产品筛选候选素材','帮我筛选适合本次投放的可发布素材。请让我选择账户、产品、素材类型、创建时间和标签，再按质量与适配度给出候选清单。',528],
  ['素材补产规划','计算库存缺口与补产优先级','帮我根据近两个完整自然月的账户表现和现有素材库存，计算素材缺口并给出 P0/P1/P2 补产计划。',441],
  ['品牌资产整理','盘点素材与授权状态','帮我整理当前项目可用的品牌与产品资产，包括 Logo、产品图、视频和文案，并标出缺失项和授权状态。',319]
 ],
 '自定义与辅助':[]
};
workspace.builtinTipFavorites??=[];workspace.builtinTipEdits??={};
const awBuiltinTips=new Map();
function awBuiltinFavorite(key){return workspace.builtinTipFavorites.includes(key);}
function awBuiltinInfo(info){const edit=workspace.builtinTipEdits[info.key];return edit?{...info,...edit}:info;}
function awRegisterBuiltin(info){const current=awBuiltinInfo(info);awBuiltinTips.set(info.key,current);return current;}
function awBuiltinTipActions(info){const favorite=awBuiltinFavorite(info.key);return `<span class="aw-custom-tip-actions aw-builtin-tip-actions"><button type="button" data-r-action="aw-edit-builtin-tip" data-id="${E(info.key)}" aria-label="编辑${E(info.name)}" title="编辑">✎</button><button type="button" data-r-action="aw-favorite-builtin-tip" data-id="${E(info.key)}" class="${favorite?'active':''}" aria-label="${favorite?'取消收藏':'收藏'}${E(info.name)}" title="${favorite?'取消收藏':'收藏'}">${favorite?'★':'☆'}</button></span>`;}
function awCustomTipActions(tip){return `<span class="aw-custom-tip-actions"><button type="button" data-r-action="aw-edit-custom-tip" data-id="${E(tip.id)}" aria-label="编辑${E(tip.name)}" title="编辑">✎</button><button type="button" data-r-action="aw-favorite-custom-tip" data-id="${E(tip.id)}" class="${tip.favorite?'active':''}" aria-label="${tip.favorite?'取消收藏':'收藏'}${E(tip.name)}" title="${tip.favorite?'取消收藏':'收藏'}">${tip.favorite?'★':'☆'}</button><button type="button" data-r-action="aw-delete-custom-tip" data-id="${E(tip.id)}" aria-label="删除${E(tip.name)}" title="删除">⌫</button></span>`;}
function awSavedTipCard(tip){return `<article class="aw-saved-custom-tip"><button type="button" class="aw-saved-custom-tip-main" data-r-action="aw-use-custom-tip" data-id="${E(tip.id)}"><span><b>${E(tip.name)}</b><em>${tip.favorite?'已收藏':'刚刚'}</em></span><small>${E(tip.prompt.replace(/【|】/g,'').slice(0,65))}${tip.prompt.length>65?'…':''}</small></button>${awCustomTipActions(tip)}</article>`;}
function awCatalogTipCard(group,row,index){const key=`catalog:${group}:${index}`,info=awRegisterBuiltin({key,kind:'catalog',group,index,name:row[0],description:row[1],prompt:row[2],components:[]}),favorite=awBuiltinFavorite(key);return `<article class="aw-builtin-tip ${favorite?'favorite':''}"><button type="button" class="aw-builtin-tip-main" data-r-action="aw-use-tip" data-group="${E(group)}" data-id="${index}"><span><b>${E(info.name)}</b><em>♨ ${row[3]}次</em></span><small>${E(info.description)}</small></button>${awBuiltinTipActions(info)}</article>`;}
function awRenderTips(){
 const panel=$('#aw-tips-panel');panel.hidden=!AW.tipsOpen;
 if(!AW.tipsOpen){panel.innerHTML='';return;}
 const customFavorites=workspace.customTips.filter(tip=>tip.favorite),catalogFavorites=workspace.builtinTipFavorites.filter(key=>key.startsWith('catalog:'));if(AW.tipGroup==='收藏'&&!customFavorites.length&&!catalogFavorites.length)AW.tipGroup='自定义与辅助';const custom=AW.tipGroup==='自定义与辅助',tips=custom?workspace.customTips:customFavorites,rows=awTipCatalog[AW.tipGroup]||[],tabs=[...(customFavorites.length||catalogFavorites.length?['收藏']:[]),...Object.keys(awTipCatalog)];
 const favoriteBuiltins=AW.tipGroup==='收藏'?catalogFavorites.map(key=>{const [,group,index]=key.split(':');const row=awTipCatalog[group]?.[Number(index)];return row?awCatalogTipCard(group,row,Number(index)):'';}).join(''):'';
 const cards=AW.tipGroup==='收藏'?favoriteBuiltins+tips.map(awSavedTipCard).join(''):custom?tips.map(awSavedTipCard).join('')+`<button type="button" class="aw-custom-tip-add" data-r-action="aw-create-custom-tip" aria-label="新建自定义妙招"><b>＋</b><small role="tooltip">自定义妙招</small></button>`:rows.map((row,index)=>awCatalogTipCard(AW.tipGroup,row,index)).join('');
 panel.innerHTML=`<div class="aw-tip-head"><strong>妙招</strong><span>选择后会填入输入框，你可以继续修改</span>${awButton('aw-close-tips','收起')}</div><nav class="aw-tip-tabs" aria-label="妙招分类">${tabs.map(name=>awButton('aw-tip-group',E(name),name,name===AW.tipGroup?'active':'')).join('')}</nav><div class="aw-tip-grid ${custom||AW.tipGroup==='收藏'?'aw-custom-tip-grid':''}">${cards}</div>`;
}
function awRenderScenes(){
  if(awChat().messages.length){$('#aw-scenes').hidden=true;$('#aw-scenes').innerHTML='';return;}
  $('#aw-scenes').hidden=false;
  const group=AS.groups.find(g=>g.name===AW.group),rows=AS.skills.filter(s=>s.group===AW.group&&(!AW.category||s.category===AW.category));
  $('#aw-scenes').innerHTML=`<div class="aw-scenes-head"><h3>从一个场景开始</h3><span>${AS.skills.length} 个技能 · ${AS.groups.reduce((total,item)=>total+item.categories.length,0)} 个场景分类</span></div><div class="aw-scene-groups">${AS.groups.map(g=>awButton('aw-group',`${g.name}<small>${g.count}</small>`,g.name,g.name===AW.group?'active':'')).join('')}</div><div class="aw-scene-categories">${['',...group.categories].map(c=>awButton('aw-category',c||'全部场景',c,c===AW.category?'active':'')).join('')}</div>${AW.group==='自定义与辅助'?'<p class="aw-advanced-note">高级辅助能力 · 日志与历史查询仍需原系统权限。</p>':''}<div class="aw-scenario-grid">${rows.map(s=>`<article class="aw-scenario"><small>${E(s.category)}</small><h4>${E(s.name)}</h4><p>${E(s.description)}</p><div>${awButton('aw-use-skill','开始这个场景 →',s.id)}${awButton('aw-skill-info','详情',s.id)}</div></article>`).join('')}</div><p class="aw-scenario-note">技能说明来自原项目；选择场景会准备需求，实际执行需连接原系统。</p>`;
}
function awResolveCustomTip(c){return (c.customTipTemplate||'').replace(/【([^】]+)】/g,(token,name)=>{const item=(c.tipComponents||[]).find(component=>component.name===name);return item?`${name}：${item.value||awComponentDefaults[name]||'请选择'}`:token;});}
function awRenderRichPrompt(c){
 const host=$('#aw-rich-prompt');if(!host)return;const active=!!c.customTipTemplate&&!!c.tipComponents?.length;host.hidden=!active;$('#composer').classList.toggle('aw-custom-tip-active',active);if(!active){host.innerHTML='';return;}
 let cursor=0,html='',match;const token=/【([^】]+)】/g;while((match=token.exec(c.customTipTemplate))){html+=E(c.customTipTemplate.slice(cursor,match.index)).replace(/\n/g,'<br>');const item=c.tipComponents.find(component=>component.name===match[1]);if(item){const options=awComponentOptions[item.name]||[item.value||awComponentDefaults[item.name]||'请选择'];html+=`<label class="aw-inline-component"><span>${E(item.name)}：</span><select data-aw-component="${E(item.name)}" aria-label="选择${E(item.name)}的值">${options.map(value=>`<option ${value===(item.value||awComponentDefaults[item.name])?'selected':''}>${E(value)}</option>`).join('')}</select></label>`;}else html+=E(match[0]);cursor=token.lastIndex;}html+=E(c.customTipTemplate.slice(cursor)).replace(/\n/g,'<br>');host.innerHTML=`<div>${html}</div><button type="button" data-r-action="aw-edit-custom-prompt">编辑文字</button>`;
 host.querySelectorAll('select[data-aw-component]').forEach(select=>select.onchange=()=>{const item=c.tipComponents.find(component=>component.name===select.dataset.awComponent);if(!item)return;item.value=select.value;c.draft=awResolveCustomTip(c);persist();renderAssistant();});
}
function awRenderChips(){const c=awChat();c.tipComponents??=[];
 $('#aw-context-chips').innerHTML=c.skillIds.map(id=>`<span class="aw-skill-chip">⚒ 技能：${E(awSkill(id)?.name||id)}${awButton('aw-remove-skill','×',id)}</span>`).join('')+c.presetIds.map(id=>{const p=workspace.assistantPresets.find(x=>x.id===id);return p?`<span>策略 · ${E(p.name)}${awButton('aw-remove-preset','×',id)}</span>`:'';}).join('')+c.attachments.map(f=>`<span title="${E(f.status)}">▧ ${E(f.name)}${awButton('aw-remove-file','×',f.id)}</span>`).join('');
 awRenderRichPrompt(c);
 $('#send').disabled=!c.draft?.trim()||AW.uploading;
}
const awOriginalRender=renderAssistant;
renderAssistant=function(){
 awOriginalRender();awRenderProjects();awRenderChips();awRenderScenes();awRenderTips();
 assistantShell.classList.toggle('aw-folder-view',!!AW.folder);assistantShell.classList.toggle('aw-has-messages',!!chat().messages.length);
 if(assistantTab==='chat'&&!chat().messages.length&&!AW.folder){const welcome=$('#assistant-body .chat-welcome');if(welcome)welcome.innerHTML='<span class="aw-welcome-mark">✧</span><h2>今天，有什么营销工作要完成？</h2><p>选择一个技能，带上资料，从这里开始。</p>';}
 if(AW.folder)awRenderFolder();
 const users=chat().messages.filter(m=>m.role==='user');$('#assistant-body').querySelectorAll('.message.user').forEach((el,i)=>{const m=users[i];if(m?.requestContext)el.insertAdjacentHTML('beforeend',`<div class="aw-message-context">${m.requestContext.skills.map(s=>`<span>✧ ${E(s.name)}</span>`).join('')}${m.requestContext.presets.map(p=>`<span>策略：${E(p.name)}</span>`).join('')}${m.requestContext.files.map(f=>awButton('aw-download-file','▧ '+E(f.name),f.id)).join('')}</div>`);});
 if(typeof renderDiagnosisContext==='function')renderDiagnosisContext();
 if(typeof renderConfirmationContext==='function')renderConfirmationContext();
};
function awNewChat(projectId){assistantShell.classList.remove('aw-sidebar-open');AW.folder=null;AW.tipsOpen=false;assistantTab='chat';if(projectId&&projectId!==state.id)switchProject(projectId);const c={id:uid(),title:'新对话',messages:[],draft:'',created:Date.now(),knowledge:null,connectors:null,reference:null,skillIds:[],presetIds:[],attachments:[]};state.chats.unshift(c);state.chatId=c.id;state.messages=c.messages;persist();renderAssistant();$('#prompt').focus();}
$('#assistant-new').onclick=()=>awNewChat(state.id);
R.invoke('aw-new-chat',b=>awNewChat(b.dataset.id));
R.invoke('aw-new-project',()=>{assistantShell.classList.remove('aw-sidebar-open');AW.folder=null;newProject();});
R.invoke('aw-tips',()=>{AW.tipsOpen=!AW.tipsOpen;awRenderTips();});
R.invoke('aw-close-tips',()=>{AW.tipsOpen=false;awRenderTips();});
R.invoke('aw-tip-group',b=>{AW.tipGroup=b.dataset.id;AW.tipsOpen=true;awRenderTips();});
R.invoke('aw-use-tip',b=>{const group=b.dataset.group||AW.tipGroup,row=awTipCatalog[group]?.[Number(b.dataset.id)];if(!row)return;AW.tipsOpen=false;const key=`catalog:${group}:${Number(b.dataset.id)}`,edit=workspace.builtinTipEdits[key];if(row[4]&&!edit){awRenderTips();return R.actions['aw-use-skill']?.({dataset:{id:row[4]}});}const c=awChat(),prompt=edit?.prompt||row[2],components=[...prompt.matchAll(/【([^】]+)】/g)].map(match=>match[1]).filter(name=>awComponentNames.has(name));c.draft=prompt;delete c.customTipTemplate;c.tipComponents=[];if(components.length){c.customTipTemplate=prompt;c.tipComponents=[...new Set(components)].map(name=>({name,value:awComponentDefaults[name]||awComponentOptions[name]?.[0]||'请选择'}));c.draft=awResolveCustomTip(c);}persist();renderAssistant();$('#prompt').focus();});
function awCustomEditorText(editor){
 const read=node=>{if(node.nodeType===Node.TEXT_NODE)return node.nodeValue||'';if(node.nodeType!==Node.ELEMENT_NODE)return'';if(node.matches('[data-aw-editor-token]'))return`【${node.dataset.awEditorToken}】`;if(node.tagName==='BR')return'\n';const block=/^(DIV|P|LI)$/.test(node.tagName),value=[...node.childNodes].map(read).join('');return block&&node!==editor?`\n${value}`:value;};
 return read(editor).replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').replace(/^\n|\n$/g,'');
}
function awSetCustomEditorText(editor,text,focus=false){
 const pattern=/【([^】]+)】/g;let cursor=0,html='',match;while((match=pattern.exec(text||''))){html+=E((text||'').slice(cursor,match.index)).replace(/\n/g,'<br>');html+=awComponentNames.has(match[1])?`<span class="aw-editor-token" data-aw-editor-token="${E(match[1])}" contenteditable="false">${E(match[1])}</span>`:E(match[0]);cursor=pattern.lastIndex;}html+=E((text||'').slice(cursor)).replace(/\n/g,'<br>');editor.innerHTML=html;if(focus){editor.focus();const range=document.createRange(),selection=getSelection();range.selectNodeContents(editor);range.collapse(false);selection.removeAllRanges();selection.addRange(range);}
}
function awSyncCustomEditor(){const editor=$('#aw-custom-tip-draft'),full=$('#aw-custom-tip-full');if(!editor||!full)return;const text=awCustomEditorText(editor);if(!full.dataset.edited)full.value=text;if(/【[^】]+】/.test(editor.innerText)&&!editor.querySelector('.aw-editor-token'))awSetCustomEditorText(editor,text,true);}
function awRememberCustomCaret(){const editor=$('#aw-custom-tip-draft'),selection=getSelection();if(!editor||!selection?.rangeCount||!editor.contains(selection.anchorNode))return;AW.customEditorRange=selection.getRangeAt(0).cloneRange();}
function awPlaceCustomToken(editor,name){let range=AW.customEditorRange;if(!range||!editor.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(editor);range.collapse(false);}range.deleteContents();const token=document.createElement('span');token.className='aw-editor-token';token.dataset.awEditorToken=name;token.contentEditable='false';token.textContent=name;range.insertNode(token);const space=document.createTextNode(' ');token.after(space);range.setStartAfter(space);range.collapse(true);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);AW.customEditorRange=range.cloneRange();editor.focus();awSyncCustomEditor();}
function awDrawCustomTipDialog(tip,builtinKey=null){
 tip=tip||null;AW.builtinTipEditingKey=builtinKey;AW.customTipEditingId=builtinKey?null:tip?.id||null;AW.customEditorRange=null;const tokens=[...(tip?.prompt||'').matchAll(/【([^】]+)】/g)].map(match=>match[1]).filter(name=>awComponentNames.has(name));AW.customComponents=new Set([...(tip?.components||[]),...tokens]);
 awCustomTipDialog.innerHTML=`<div class="aw-custom-tip-shell"><section><header><h2>${tip?'编辑妙招':'自定义妙招'}</h2><button type="button" data-r-action="aw-close-custom-tip" aria-label="关闭">×</button></header><label><b>妙招</b><div id="aw-custom-tip-draft" class="aw-custom-token-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="输入妙招内容，点击右侧标签插入组件"></div></label><p>点击右侧标签插入；已选标签会以淡蓝色引用块显示。</p><label><b>完整指令</b><textarea id="aw-custom-tip-full" placeholder="保存后填入对话框的完整提示词">${E(tip?.prompt||'')}</textarea></label><label><b>妙招名称 <small>（选填）</small></b><input id="aw-custom-tip-name" value="${E(tip?.name||'')}" placeholder="例如：目标大于消耗营销单元监控-暂停"></label><footer><button type="button" data-r-action="aw-close-custom-tip">取消</button><button type="button" class="solid" data-r-action="aw-save-custom-tip">${tip?'保存修改':'保存'}</button></footer></section><aside><h2>引用标签</h2>${Object.entries(awComponentGroups).map(([group,names])=>`<div><h3>${E(group)}</h3><div>${names.map(name=>`<button type="button" class="${AW.customComponents.has(name)?'active':''}" data-r-action="aw-toggle-custom-component" data-id="${E(name)}">${E(name)}</button>`).join('')}</div></div>`).join('')}</aside></div>`;
 awSetCustomEditorText($('#aw-custom-tip-draft'),tip?.prompt||'');awCustomTipDialog.showModal();const editor=$('#aw-custom-tip-draft');editor.focus();
 editor.oninput=()=>{awSyncCustomEditor();awRememberCustomCaret();};editor.onkeyup=awRememberCustomCaret;editor.onmouseup=awRememberCustomCaret;editor.onfocus=awRememberCustomCaret;$('#aw-custom-tip-full').oninput=e=>e.target.dataset.edited='1';awCustomTipDialog.querySelectorAll('[data-r-action=aw-toggle-custom-component]').forEach(button=>button.onmousedown=e=>e.preventDefault());
}
R.invoke('aw-create-custom-tip',()=>awDrawCustomTipDialog());
R.invoke('aw-close-custom-tip',()=>{AW.customTipEditingId=null;AW.builtinTipEditingKey=null;awCustomTipDialog.close();});
R.invoke('aw-toggle-custom-component',b=>{const name=b.dataset.id,editor=$('#aw-custom-tip-draft'),full=$('#aw-custom-tip-full');if(AW.customComponents.has(name)){AW.customComponents.delete(name);b.classList.remove('active');editor.querySelectorAll(`[data-aw-editor-token="${CSS.escape(name)}"]`).forEach(node=>node.remove());awSyncCustomEditor();}else{AW.customComponents.add(name);b.classList.add('active');awPlaceCustomToken(editor,name);}if(!full.dataset.edited)full.value=awCustomEditorText(editor);});
R.invoke('aw-save-custom-tip',()=>{const draft=awCustomEditorText($('#aw-custom-tip-draft')).trim(),full=$('#aw-custom-tip-full').value.trim()||draft;if(!full)return toast('请先填写妙招内容');const clean=full.replace(/【[^】]+】/g,'').trim(),name=$('#aw-custom-tip-name').value.trim()||clean.slice(0,22)||'未命名妙招',tokens=[...full.matchAll(/【([^】]+)】/g)].map(match=>match[1]).filter(component=>awComponentNames.has(component)),components=[...new Set([...AW.customComponents,...tokens])];if(AW.builtinTipEditingKey)workspace.builtinTipEdits[AW.builtinTipEditingKey]={name,prompt:full,components,updated:Date.now()};else{const existing=workspace.customTips.find(item=>item.id===AW.customTipEditingId);if(existing)Object.assign(existing,{name,prompt:full,components,updated:Date.now()});else workspace.customTips.unshift({id:uid(),name,prompt:full,components,created:Date.now(),favorite:false});AW.tipGroup='自定义与辅助';AW.group='自定义与辅助';}AW.customTipEditingId=null;AW.builtinTipEditingKey=null;persist();awCustomTipDialog.close();renderAssistant();});
R.invoke('aw-edit-builtin-tip',b=>{const info=awBuiltinTips.get(b.dataset.id);if(info)awDrawCustomTipDialog(info,info.key);});
R.invoke('aw-favorite-builtin-tip',b=>{const key=b.dataset.id,index=workspace.builtinTipFavorites.indexOf(key);index>=0?workspace.builtinTipFavorites.splice(index,1):workspace.builtinTipFavorites.push(key);if(!workspace.builtinTipFavorites.length&&!workspace.customTips.some(item=>item.favorite)){if(AW.group==='收藏')AW.group='精选场景';if(AW.tipGroup==='收藏')AW.tipGroup='精选场景';}persist();renderAssistant();});
R.invoke('aw-edit-custom-tip',b=>{const tip=workspace.customTips.find(item=>item.id===b.dataset.id);if(tip)awDrawCustomTipDialog(tip);});
R.invoke('aw-delete-custom-tip',b=>{const tip=workspace.customTips.find(item=>item.id===b.dataset.id);if(!tip)return;modal('删除自定义妙招',`确认删除“${tip.name}”？删除后不能恢复。`,[],()=>{workspace.customTips=workspace.customTips.filter(item=>item.id!==tip.id);const c=awChat();if(c.customTipId===tip.id){delete c.customTipId;delete c.customTipTemplate;c.tipComponents=[];c.draft='';}if(AW.group==='收藏'&&!workspace.customTips.some(item=>item.favorite))AW.group='自定义与辅助';if(AW.tipGroup==='收藏'&&!workspace.customTips.some(item=>item.favorite))AW.tipGroup='自定义与辅助';renderAssistant();});$('#save').textContent='删除';});
R.invoke('aw-favorite-custom-tip',b=>{const tip=workspace.customTips.find(item=>item.id===b.dataset.id);if(!tip)return;tip.favorite=!tip.favorite;if(!tip.favorite&&AW.group==='收藏'&&!workspace.customTips.some(item=>item.favorite))AW.group='自定义与辅助';if(!tip.favorite&&AW.tipGroup==='收藏'&&!workspace.customTips.some(item=>item.favorite))AW.tipGroup='自定义与辅助';persist();renderAssistant();});
R.invoke('aw-use-custom-tip',b=>{const tip=workspace.customTips.find(item=>item.id===b.dataset.id);if(!tip)return;const c=awChat(),tokens=[...tip.prompt.matchAll(/【([^】]+)】/g)].map(match=>match[1]).filter(component=>awComponentNames.has(component)),components=[...new Set([...(tip.components||[]),...tokens])];delete c.adPublishFlow;delete c.videoWorkflow;delete c.customTipTemplate;c.skillIds=[];c.presetIds=[];c.tipComponents=[];c.customTipId=tip.id;c.customTipTemplate=tip.prompt;c.tipComponents=components.map(name=>({name,value:awComponentDefaults[name]||awComponentOptions[name]?.[0]||'请选择'}));c.draft=awResolveCustomTip(c);AW.tipsOpen=false;persist();renderAssistant();document.querySelector('#aw-rich-prompt select')?.focus();});
R.invoke('aw-edit-custom-prompt',()=>{const c=awChat();delete c.customTipTemplate;c.tipComponents=[];persist();renderAssistant();$('#prompt').focus();$('#prompt').setSelectionRange(c.draft.length,c.draft.length);});
R.invoke('aw-tip-component',b=>{const c=awChat(),item=c.tipComponents.find(item=>item.name===b.dataset.id);if(!item)return;const options=awComponentOptions[item.name];modal('设置'+item.name,'修改后会同步更新妙招提示词。',[options?{key:'value',label:item.name,options,value:item.value||options[0]}:{key:'value',label:item.name,value:item.value||awComponentDefaults[item.name]||'',required:true}],value=>{item.value=value.value;c.draft=awResolveCustomTip(c);persist();renderAssistant();});});
R.invoke('aw-select-chat',b=>{assistantShell.classList.remove('aw-sidebar-open');AW.folder=null;AW.tipsOpen=false;assistantTab='chat';if(state.id!==b.dataset.owner)switchProject(b.dataset.owner);state.chatId=b.dataset.id;state.messages=chat().messages;persist();renderAssistant();});
R.invoke('aw-folder',b=>{assistantShell.classList.remove('aw-sidebar-open');if(state.id!==b.dataset.id)switchProject(b.dataset.id);AW.folder=b.dataset.id;assistantTab='chat';renderAssistant();});
R.invoke('aw-rename-project',b=>{const p=workspace.projects.find(x=>x.id===b.dataset.id);if(p.nameLocked)return toast('项目名称已与本地文件夹绑定，不可直接修改');modal('重命名项目','名称更改后，资料与对话仍保留在该项目中。',[{key:'name',label:'项目名称',required:true,value:p.name}],v=>{p.name=v.name.trim();});});
function awEmptyProject(){return {version:1,id:uid(),name:'我的工作空间',brand:'',goal:'',audience:'',channels:'',voice:'',sources:[],insights:[],plans:[],drafts:[],rules:[],messages:[],history:[]};}
R.invoke('aw-delete-project',b=>{const p=workspace.projects.find(x=>x.id===b.dataset.id);modal('删除项目',`「${p.name}」及其中的对话、资料将移入已删除项目，可恢复。`,[],()=>{workspace.archivedProjects.push({...p,deletedAt:Date.now()});workspace.projects=workspace.projects.filter(x=>x.id!==p.id);if(state.id===p.id){state=workspace.projects[0]||awEmptyProject();if(!workspace.projects.length)workspace.projects.push(state);ensureProject();imported=null;search='';filter='all';}AW.folder=null;});});
R.invoke('aw-trash',()=>{modal('已删除项目','可恢复完整项目、对话和附件记录。',[],()=>{});$('#modal-fields').innerHTML=workspace.archivedProjects.map(p=>`<div class="aw-trash-row"><span>${E(p.name)}</span>${awButton('aw-restore-project','恢复',p.id)}</div>`).join('');});
R.invoke('aw-restore-project',b=>{const p=workspace.archivedProjects.find(x=>x.id===b.dataset.id);if(!p)return;delete p.deletedAt;workspace.archivedProjects=workspace.archivedProjects.filter(x=>x.id!==p.id);workspace.projects.push(p);persist();$('#modal').close();render();});
R.invoke('aw-settings',()=>{AW.folder=null;goManage('settings');});
function awRenderFolder(){
 const files=[...new Map(state.chats.flatMap(c=>[...(c.attachments||[]),...c.messages.flatMap(m=>m.requestContext?.files||[])]).map(f=>[f.id,f])).values()];
 $('#assistant-body').innerHTML=`<div class="aw-folder-content"><small>PROJECT FOLDER</small><h2>${E(state.name)}</h2><p>项目里的对话、文件和工作成果。</p>${state.folderName?`<div class="aw-local-folder"><span>本地文件夹：${E(state.folderName)}</span>${awButton('aw-open-local-folder','在访达中打开',state.id)}<small>对话与附件仍保存在当前浏览器；此目录用于存放本地工作文件。</small></div>`:''}<div class="aw-folder-stats"><span><b>${state.chats.length}</b>段对话</span><span><b>${files.length}</b>个附件</span><span><b>${state.drafts.length}</b>份草稿</span></div><h3>上传文件</h3>${files.map(f=>`<div class="aw-file-row"><span><b>${E(f.name)}</b><small>${E(f.status)} · ${Math.ceil(f.size/1024)} KB</small></span>${awButton('aw-download-file','下载',f.id)}</div>`).join('')||'<p>上传到本项目对话中的文件会出现在这里。</p>'}<h3>工作成果</h3><div class="aw-folder-links">${[['insights','参考资料',state.sources.length],['plan','营销计划',state.plans.length],['creation','内容草稿',state.drafts.length]].map(([id,label,n])=>awButton('aw-open-work',`${label} · ${n} →`,id)).join('')}</div><h3>项目对话</h3>${state.chats.map(c=>`<button class="aw-folder-chat" data-r-action="aw-select-chat" data-id="${E(c.id)}" data-owner="${E(state.id)}">${icon('chat')}${E(c.title)}<small>${c.messages.length} 条消息</small></button>`).join('')}</div>`;
}
R.invoke('aw-open-work',b=>{AW.folder=null;goManage(b.dataset.id);});
for(const [action,key] of [['aw-group','group'],['aw-category','category']])R.invoke(action,b=>{AW[key]=b.dataset.id;if(key==='group')AW.category='';awRenderScenes();});
R.invoke('aw-use-skill',b=>{const s=awSkill(b.dataset.id);if(!s)return;AW.folder=null;assistantTab='chat';const c=awChat();c.skillIds=[s.id];c.draft=`我想使用「${s.name}」。请先整理所需信息与执行步骤，列出需要我补充的条件。`;delete c.customTipTemplate;c.tipComponents=[];persist();renderAssistant();$('#prompt').focus();$('#composer').scrollIntoView({block:'center',behavior:'smooth'});});
for(const [action,key] of [['aw-remove-skill','skillIds'],['aw-remove-preset','presetIds'],['aw-remove-file','attachments']])R.invoke(action,b=>{const c=awChat();c[key]=c[key].filter(x=>key==='attachments'?x.id!==b.dataset.id:x!==b.dataset.id);persist();awRenderChips();});
R.invoke('aw-skill-info',b=>{const s=awSkill(b.dataset.id);modal(s.name,'技能说明；实际执行需要原系统服务。',[],()=>{});$('#modal-fields').innerHTML=`<p>${E(s.description)}</p><p><code>${E(s.id)}</code></p>${R.catalog?.skills.some(x=>x.id===s.id)?awButton('aw-skill-source','查看源码定义',s.id):''}`;});
R.invoke('aw-skill-source',async b=>{const s=await api('/api/release/skill?id='+encodeURIComponent(b.dataset.id));Object.assign(s,R.catalog.skills.find(x=>x.id===b.dataset.id));$('#modal').close();R.skillDialog(s,false);});
const awPicker=document.createElement('dialog');awPicker.id='aw-skill-picker';awPicker.setAttribute('aria-label','选择技能');document.body.append(awPicker);
let awPickerAnchor=null,awImportBusy=false;
function awPositionPicker(){
 if(!awPicker.open||!awPickerAnchor?.isConnected)return;
 const r=awPickerAnchor.getBoundingClientRect(),w=awPicker.offsetWidth,h=awPicker.offsetHeight;
 awPicker.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';
 const top=r.top-h-8>=8?r.top-h-8:r.bottom+h+8<innerHeight?r.bottom+8:Math.max(8,innerHeight-h-8);
 awPicker.style.top=top+'px';
}
function awDrawPicker(){
 const q=AW.skillQuery.trim().toLowerCase(),matches=s=>(s.name+' '+s.id+' '+(s.category||'')+' '+(s.description||'')).toLowerCase().includes(q);
 const groups=[['个人技能',R.data.skills.filter(matches),true],['公共技能',AS.skills.filter(matches),false]];
 $('#aw-picker-list').innerHTML=groups.map(([name,rows,personal])=>`<section class="aw-skill-group"><h3>${name}</h3>${rows.map(s=>{
  const badge=personal?'个人':s.group==='盯盘洞察'?'报表':s.group==='批量基建'?'搭建':s.group==='资产准备'?'素材':s.group==='投放管理'?'管理':'辅助';
  return `<label class="aw-skill-option" title="${E(s.name+' · '+(s.description||'个人技能'))}"><input type="radio" name="aw-selected-skill" value="${E(s.id)}" aria-label="${E(s.name)}" ${awChat().skillIds[0]===s.id?'checked':''}><span class="aw-skill-badge ${personal?'personal':''}">${badge}</span><b>${E(s.name)}</b><span class="aw-skill-summary">${E(s.description||'个人技能')}</span><span class="aw-skill-check" aria-hidden="true">✓</span></label>`;
 }).join('')||`<p class="aw-skill-empty">${q?'暂无匹配技能':'暂无'}</p>`}</section>`).join('');
 $('#aw-picker-list').onchange=e=>{if(e.target.type!=='radio')return;const c=awChat();c.skillIds=[e.target.value];persist();awRenderChips();};
}
R.invoke('aw-pick-skill',b=>{
 awPickerAnchor=b;AW.skillQuery='';
 awPicker.innerHTML='<div class="aw-skill-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg><input id="aw-picker-query" aria-label="搜索技能" placeholder="搜索技能" autocomplete="off"><button type="button" id="aw-picker-close" aria-label="关闭技能选择">×</button></div><div id="aw-picker-list"></div><div id="aw-picker-status" role="status" aria-live="polite"></div><footer><button type="button" id="aw-picker-import">⇧ 导入技能（ZIP）</button><input type="file" id="aw-skill-zip" hidden accept=".zip,application/zip"></footer>';
 awDrawPicker();$('#aw-picker-query').oninput=e=>{AW.skillQuery=e.target.value;awDrawPicker();};$('#aw-picker-close').onclick=()=>awPicker.close();
 $('#aw-picker-import').disabled=awImportBusy;$('#aw-picker-import').onclick=()=>$('#aw-skill-zip').click();
 $('#aw-skill-zip').onchange=async e=>{
  const file=e.target.files[0];if(!file||awImportBusy)return;awImportBusy=true;$('#aw-picker-import').disabled=true;$('#aw-picker-status').textContent='正在导入…';
  try{
   if(!/\.zip$/i.test(file.name))throw Error('请选择 ZIP 技能包');if(file.size>4*1024*1024)throw Error('技能包不能超过 4 MB');
   const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   if(!token)token=(await api('/api/bootstrap')).token;
   const imported=await api('/api/release/import-skill',{content:btoa(binary)});
   const skill={...imported,id:uid(),description:'从本地文件导入 · 未发布'},skills=[...R.data.skills,skill];
   localStorage.setItem(workspaceKey,JSON.stringify({...workspace,release:{...workspace.release,skills}}));R.data.skills.push(skill);persist();
   AW.skillQuery='';$('#aw-picker-query').value='';awDrawPicker();$('#aw-picker-list').scrollTop=0;$('#aw-picker-status').textContent='导入成功，已加入个人技能';
  }catch(error){$('#aw-picker-status').textContent='导入失败：'+error.message;}finally{awImportBusy=false;$('#aw-picker-import').disabled=false;$('#aw-skill-zip').value='';}
 };
 awPicker.showModal();awPositionPicker();$('#aw-picker-query').focus({preventScroll:true});
});
awPicker.addEventListener('click',e=>{if(e.target===awPicker){const r=awPicker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)awPicker.close();}});
awPicker.addEventListener('close',()=>awPickerAnchor?.isConnected&&awPickerAnchor.focus({preventScroll:true}));
window.addEventListener('resize',awPositionPicker);

function awFileDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('mkt-assistant-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function awStoreFile(id,file){const db=await awFileDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('files',file?'readwrite':'readonly'),req=file?tx.objectStore('files').put(file,id):tx.objectStore('files').get(id);let value;req.onsuccess=()=>value=req.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('文件保存中断'));});}finally{db.close();}}
R.invoke('aw-upload',()=>awFiles.click());
awFiles.onchange=async()=>{const files=[...awFiles.files],target=awChat();if(!files.length)return;if(target.attachments.length+files.length>10){toast('每段对话最多添加 10 个待发送附件');awFiles.value='';return;}AW.uploading=true;awRenderChips();try{for(const file of files){if(file.size>20*1024*1024)throw Error('单个附件请控制在 20 MB 以内');const id=uid(),text=/\.(txt|md|csv|json)$/i.test(file.name)&&file.size<=200000?await file.text():null;await awStoreFile(id,file);target.attachments.push({id,name:file.name,size:file.size,type:file.type,text:text?.slice(0,20000),status:text!==null?'已读取文本（最多 2 万字）':'已保存文件 · 尚未解析'});}persist();toast('附件已保存到当前浏览器');}catch(e){persist();toast(e.message);}finally{AW.uploading=false;awFiles.value='';awRenderChips();}};
R.invoke('aw-download-file',async b=>{const file=await awStoreFile(b.dataset.id);if(!file)throw Error('此浏览器中未找到文件，请重新添加');const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name||'附件';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const awOriginalSubmit=$('#composer').onsubmit;
$('#composer').onsubmit=e=>{if(AW.uploading){e.preventDefault();return;}const c=awChat();if(!$('#prompt').value.trim()){e.preventDefault();return;}const snapshot={skills:c.skillIds.map(id=>awSkill(id)).filter(Boolean).map(s=>({id:s.id,name:s.name})),presets:c.presetIds.map(id=>workspace.assistantPresets.find(p=>p.id===id)).filter(Boolean).map(p=>structuredClone(p)),files:structuredClone(c.attachments)};const previous=c.messages.length;awOriginalSubmit(e);if(c.messages.length>previous){c.updated=Date.now();c.messages[previous].requestContext=snapshot;const reply=c.messages.at(-1);reply.text+=(snapshot.skills.length?'\n\n已选技能：'+snapshot.skills.map(s=>s.name).join('、')+'。仅记录选择，尚未执行。':'')+(snapshot.presets.length?'\n策略预设：'+snapshot.presets.map(p=>p.name).join('、')+'；配置快照已随本条消息保存。':'')+(snapshot.files.length?'\n附件：'+snapshot.files.map(f=>f.name+'（'+f.status+'）').join('、')+'。未发送给外部模型。':'');c.attachments=[];persist();renderAssistant();$('#assistant-body').scrollTop=$('#assistant-body').scrollHeight;}};
const awOriginalInput=$('#prompt').oninput;$('#prompt').oninput=()=>{awOriginalInput();if(AW.uploading)$('#send').disabled=true;};
const awOriginalOpen=openAssistant;openAssistant=function(reference){AW.folder=null;awOriginalOpen(reference);};
// Existing tab and history controls continue to operate with the new project sidebar.
document.addEventListener('click',e=>{const b=e.target.closest('[data-atab],[data-session]');if(b){AW.folder=null;renderAssistant();}});
// Assistant navigation: conversation search, theme preference and project moves.
const awMagnify='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
const awBrand=document.createElement('div');awBrand.className='aw-brandbar';awBrand.innerHTML=`<span class="aw-brand-icon">序</span><b>对话助手</b><button type="button" id="aw-theme-toggle" aria-label="切换为深色界面" title="切换黑白界面">☾</button><button type="button" data-r-action="aw-search" aria-label="搜索对话" title="搜索对话">${awMagnify}</button>`;
$('.aw-sidebar').prepend(awBrand);
$('#aw-chat-search').remove();
function awSyncTheme(){const dark=R.data.preferences.appearance==='dark';$('#aw-theme-toggle').textContent=dark?'☼':'☾';$('#aw-theme-toggle').setAttribute('aria-label',dark?'切换为浅色界面':'切换为深色界面');}
$('#aw-theme-toggle').onclick=()=>{R.data.preferences.appearance=R.data.preferences.appearance==='dark'?'light':'dark';persist();R.applyPreferences();awSyncTheme();};awSyncTheme();
const awSearch=document.createElement('dialog');awSearch.id='aw-search-dialog';awSearch.setAttribute('aria-label','搜索对话');document.body.append(awSearch);
function awSearchRows(query){
  const q=query.trim().toLocaleLowerCase(),start=new Date().setHours(0,0,0,0),seven=new Date(start);seven.setDate(seven.getDate()-7);const thirty=new Date(start);thirty.setDate(thirty.getDate()-30);
  const rows=workspace.projects.flatMap(p=>(p.chats||[]).map(c=>({p,c,at:c.updated||c.created||0}))).filter(({p,c})=>!q||(p.name+' '+c.title+' '+(c.draft||'')+' '+c.messages.map(m=>m.text||'').join(' ')).toLocaleLowerCase().includes(q)).sort((a,b)=>b.at-a.at);
  const groups=[['7天内',r=>r.at>=+seven],['30天内',r=>r.at<+seven&&r.at>=+thirty],['更早',r=>r.at<+thirty]];
  $('#aw-search-results').innerHTML=groups.map(([label,test])=>{const items=rows.filter(test);return items.length?`<section class="aw-search-group"><h3>${label}</h3>${items.map(({p,c})=>`<button type="button" class="aw-search-result" data-r-action="aw-search-select" data-id="${E(c.id)}" data-owner="${E(p.id)}">${icon('chat')}<span><b>${E(c.title)}</b>${q?`<small>${E((c.messages.find(m=>(m.text||'').toLocaleLowerCase().includes(q))?.text||c.draft||'').slice(0,90))}</small>`:''}</span><em>${E(p.name)}</em></button>`).join('')}</section>`:'';}).join('')||'<div class="aw-search-empty">没有找到相关对话<br><small>试试对话标题、内容或项目名称</small></div>';
  $('#aw-search-count').textContent=rows.length+' 段对话';
}
R.invoke('aw-search',()=>{awSearch.innerHTML=`<div class="aw-search-input">${awMagnify}<input id="aw-search-query" aria-label="搜索对话内容" placeholder="搜索对话" autocomplete="off"><button id="aw-search-close" aria-label="关闭对话搜索">×</button></div><div id="aw-search-results"></div><footer><span id="aw-search-count"></span><span>↑ ↓ 选择 · Enter 打开 · Esc 关闭</span></footer>`;awSearchRows('');$('#aw-search-query').oninput=e=>awSearchRows(e.target.value);$('#aw-search-close').onclick=()=>awSearch.close();awSearch.showModal();$('#aw-search-query').focus();});
R.invoke('aw-search-select',b=>{awSearch.close();R.actions['aw-select-chat'](b);});
awSearch.addEventListener('click',e=>{if(e.target===awSearch)awSearch.close();});
awSearch.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Enter'].includes(e.key))return;const rows=[...awSearch.querySelectorAll('.aw-search-result')],i=rows.indexOf(document.activeElement);if(!rows.length)return;if(e.key==='Enter'){if(i<0){e.preventDefault();rows[0].click();}return;}e.preventDefault();rows[i<0?(e.key==='ArrowDown'?0:rows.length-1):(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length].focus();});
function awMoveDialog(id,owner){
  const source=workspace.projects.find(p=>p.id===owner),c=source?.chats.find(c=>c.id===id);if(!c)return;
  if(workspace.projects.length<2){toast('请先新建一个目标项目，再移动对话');return;}
  modal('移动对话',`将「${c.title}」移入其他项目。消息、草稿、附件与技能会保留，后续使用目标项目的背景与配置。`,[],()=>{});
  $('#modal-fields').innerHTML=`<label>目标项目<select name="target" required>${workspace.projects.filter(p=>p.id!==owner).map(p=>`<option value="${E(p.id)}">${E(p.name)}</option>`).join('')}</select></label>`;
  saveHandler=v=>{
    const next=structuredClone(workspace),from=next.projects.find(p=>p.id===owner),to=next.projects.find(p=>p.id===v.target);if(!from||!to||from===to)throw Error('请选择其他项目。');
    const index=from.chats.findIndex(c=>c.id===id);if(index<0)throw Error('对话已移动，请刷新列表。');const moved=from.chats.splice(index,1)[0];
    if((to.chats||[]).some(c=>c.id===id))throw Error('目标项目已有相同对话。');
    moved.knowledge=(moved.knowledge??from.bindings?.knowledge??[]).filter(k=>(to.bindings?.knowledge||[]).includes(k));moved.connectors=(moved.connectors??from.bindings?.connectors??[]).filter(k=>(to.bindings?.connectors||[]).includes(k));
    moved.moves??=[];moved.moves.push({from:owner,to:to.id,at:Date.now()});
    to.chats??=[];to.chats.unshift(moved);to.chatId=id;to.messages=moved.messages;
    if(from.chatId===id){from.chatId=from.chats[0]?.id||null;from.messages=from.chats[0]?.messages||[];}
    next.activeId=to.id;localStorage.setItem(workspaceKey,JSON.stringify(next));
    Object.assign(source,from);const target=workspace.projects.find(p=>p.id===to.id);Object.assign(target,to);state=target;workspace.activeId=target.id;imported=null;search='';filter='all';AW.folder=null;assistantTab='chat';assistantShell.classList.remove('aw-sidebar-open');toast('对话已移入「'+target.name+'」');
  };
}
R.invoke('aw-move-chat',b=>awMoveDialog(b.dataset.id,b.dataset.owner));
$('#aw-projects').addEventListener('dragstart',e=>{const row=e.target.closest('[data-chat-owner]');if(!row)return;e.dataTransfer.setData('application/x-workbench-chat',JSON.stringify({id:row.dataset.chatId,owner:row.dataset.chatOwner}));e.dataTransfer.effectAllowed='move';});
$('#aw-projects').addEventListener('dragover',e=>{const target=e.target.closest('[data-project-drop]');if(target&&[...e.dataTransfer.types].includes('application/x-workbench-chat')){e.preventDefault();e.dataTransfer.dropEffect='move';}});
$('#aw-projects').addEventListener('drop',e=>{const target=e.target.closest('[data-project-drop]');if(!target)return;const raw=e.dataTransfer.getData('application/x-workbench-chat');if(!raw)return;e.preventDefault();try{const {id,owner}=JSON.parse(raw);if(owner===target.dataset.projectDrop)return;awMoveDialog(id,owner);$('#modal-fields [name=target]').value=target.dataset.projectDrop;}catch{toast('无法移动这段对话，请通过对话菜单重试');}});
R.invoke('aw-open-local-folder',async b=>{const p=workspace.projects.find(p=>p.id===b.dataset.id);if(!p?.folderName)return;if(!token)token=(await api('/api/bootstrap')).token;await api('/api/projects/open-folder',{id:p.id,name:p.folderName});});
const awNavRender=renderAssistant;renderAssistant=function(){awNavRender();awSyncTheme();};

renderAssistant();

// Ad agent is a full-page view of the same assistant, sharing live conversation state.
pages['ad-agent']=['bot','Ad agent'];
const awOpenBeforePage=openAssistant;
const awRenderBeforePage=render;
const awHead=assistantShell.querySelector('.drawer-head');
const awSidebarButton=awHead.querySelector('.aw-mobile-projects');
awSidebarButton.setAttribute('aria-label','项目与历史对话');awSidebarButton.title='项目与历史对话';
R.views['ad-agent']=function(){
 $('#view').innerHTML='<div id="ad-agent-page-host"></div>';
 if(assistantShell.matches(':modal'))assistantShell.close();
 assistantShell.dataset.presentation='page';assistantShell.classList.remove('expanded');
 assistantShell.setAttribute('role','region');assistantShell.setAttribute('aria-label','Ad agent');awHead.querySelector('b').textContent='Ad agent';
 $('#ad-agent-page-host').append(assistantShell);
 if(!assistantShell.open)assistantShell.show();
 renderAssistant();
};
render=function(){
 // Detach before the host is rebuilt, preserving DOM listeners and unsent input.
 if(assistantShell.parentElement!==document.body)document.body.append(assistantShell);
 const agentPage=location.hash==='#ad-agent';
 if(!agentPage&&assistantShell.dataset.presentation==='page'){
  assistantShell.close();delete assistantShell.dataset.presentation;
  assistantShell.removeAttribute('role');assistantShell.setAttribute('aria-label','全局对话助手');awHead.querySelector('b').textContent='营销对话助手';
  assistantShell.classList.remove('aw-sidebar-open');
 }
 $('#app').classList.toggle('ad-agent-page',agentPage);
 awRenderBeforePage();
};
openAssistant=function(reference){
 if(page!=='ad-agent')return awOpenBeforePage(reference);
 if(reference)chat().reference=reference;
 AW.folder=null;assistantTab='chat';renderAssistant();$('#prompt').focus();persist();
};
render();
