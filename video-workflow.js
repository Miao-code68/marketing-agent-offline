'use strict';
// Real skill jobs stay attached to the originating conversation, even after navigation.
const VW={polling:new Set(),opening:new Set(),media:new Map(),whiteTimers:new Set()};
workspace.videoAnalyses??={};
const vwBusy=r=>['preparing','queued','running'].includes(r?.status);
const vwIdleSendHTML=$('#send').innerHTML;
const vwButton=(action,label,id='',extra='')=>`<button type="button" data-r-action="${action}" data-id="${E(id)}" ${extra}>${label}</button>`;
async function vwAPI(path,body,raw=false){
 if(!token)token=(await api('/api/bootstrap')).token;
 const response=await fetch('/api/video-workflow/'+path,{method:body?'POST':'GET',headers:{'X-Local-Token':token,...(body?{'Content-Type':raw?'application/octet-stream':'application/json'}:{})},...(body?{body:raw?body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'视频任务请求失败');return data;
}
function vwReference(c){return {id:c.id,ownerId:c.ownerId||state.id,mediaId:c.mediaId,title:c.title,poster:c.poster||'',duration:c.duration,platform:c.platform,mediaType:c.mediaType};}
function vwContext(ownerId){const p=workspace.projects.find(p=>p.id===ownerId);return p?{brand:p.brand||'',audience:p.audience||'',goal:p.goal||'',voice:p.voice||''}:{};}
function vwSave(){persist();}
function vwRefresh(){
 const active=document.activeElement=== $('#prompt'),start=$('#prompt').selectionStart,end=$('#prompt').selectionEnd;
 if(assistantShell.open)renderAssistant();
 if(active){$('#prompt').focus({preventScroll:true});$('#prompt').setSelectionRange(start,end);}
 if(ipDrawer.open&&IS.active&&!IS.editing){const c=inspirationFind(IS.active);if(c)vwDrawAnalysis(c);}
}
async function vwUpload(reference){
 const file=await inspirationMedia(reference.mediaId);
 if(!file)throw Error('参考视频文件未找到，请在灵感库重新上传后再试。');
 return (await vwAPI('upload',file,true)).upload_id;
}
function vwAnalysisKey(ref){return `${ref.ownerId}:${ref.mediaId}`;}
function vwRunMessage(c,run){c.messages.push({role:'assistant',time:now(),text:'',videoRun:run.localId});}
async function vwStart(reference,run,request){
 try{
  if(!reference.uploadId)reference.uploadId=await vwUpload(reference);
  const job=await vwAPI('start',{request_id:run.requestId,upload_id:reference.uploadId,context:vwContext(reference.ownerId),...request});
  Object.assign(run,job);vwSave();vwRefresh();vwPoll(reference,run);
 }catch(e){run.status='failed';run.message=e.message;vwSave();vwRefresh();}
}
function vwNewRun(action,message){return {localId:uid(),requestId:crypto.randomUUID(),action,status:'preparing',message:message||'正在读取参考视频…'};}
async function vwPoll(reference,run){
 if(!run.id||!vwBusy(run)||VW.polling.has(run.id))return;
 VW.polling.add(run.id);
 try{
  while(vwBusy(run)){
   await new Promise(resolve=>setTimeout(resolve,2000));
   try{
    const job=await vwAPI('job?id='+encodeURIComponent(run.id));
    const changed=JSON.stringify(job)!==JSON.stringify(run.serverSnapshot);
    const previousStatus=run.status;Object.assign(run,job);if(previousStatus!==run.status)document.dispatchEvent(new CustomEvent('inspiration-job-change',{detail:{reference,run}}));run.serverSnapshot=job;delete run.connectionError;
    if(changed){vwSave();vwRefresh();}
   }catch(e){run.connectionError=e.message;vwSave();vwRefresh();break;}
  }
 }finally{VW.polling.delete(run.id);}
}
function vwAnalysisHTML(result,reference,mode='task'){return `<section class="it-analysis"><h3>内容概要</h3><p class="vw-summary">${E(result.summary||'暂无内容概要')}</p><h3>分镜脚本 <small>${result.segments?.length||0} 个分镜</small></h3>${vwStoryboardHTML(result,reference,mode)}</section>`;}
function vwStoryboardHTML(result,reference={},mode='drawer'){
 const segments=result.segments||[];if(!segments.length)return '<div class="ip-empty"><h3>这条视频还没有分镜脚本</h3><p>当前仅展示已有的内容概要。</p></div>';
 return `<div class="vw-shot-list">${segments.map((s,i)=>{const seek=mode==='task'?`data-it="seek" data-time="${Number(s.start)||0}"`:`data-r-action="ip-seek" data-id="${Number(s.start)||0}"`;const visual=reference.poster?`<img src="${E(reference.poster)}" alt="分镜 ${i+1} 缩略图">`:reference.art?`<span class="vw-shot-thumb-art">${inspirationArt(reference)}</span>`:`<span class="vw-shot-placeholder">${String(i+1).padStart(2,'0')}</span>`;return `<article class="vw-shot"><header><i></i><b>分镜${i+1}：${E(s.original)}</b></header><div class="vw-shot-card"><div class="vw-shot-thumb">${visual}<button ${seek} aria-label="播放分镜 ${i+1}">▶</button><time>◷ ${IM.time(s.start)}–${IM.time(s.end)}</time></div><div class="vw-shot-content"><small>分镜提示词</small><p class="vw-shot-prompt">${E(s.prompt||s.original)}</p><dl><div><dt>吸睛点</dt><dd>${E(s.attraction||'待识别')}</dd></div><div><dt>核心卖点</dt><dd>${E(s.selling_point||'待识别')}</dd></div><div><dt>视觉语言</dt><dd>${E(s.visual_language||'待识别')}</dd></div></dl></div></div></article>`;}).join('')}</div>`;
}
function vwDrawAnalysis(c){
 if(c.mediaType==='image')return;
 const ref=vwReference(c),entry=workspace.videoAnalyses[vwAnalysisKey(ref)];if(!entry)return;
 const host=$('#ip-segments');if(!host)return;
 const run=entry.run;
 const headings=ipDrawer.querySelectorAll('.ip-breakdown-heading h3');if(headings[0])headings[0].textContent='内容概要';if(headings[1])headings[1].innerHTML=`分镜脚本 <small>${run.result?.segments?.length||0} 个时间段</small>`;
 const summary=ipDrawer.querySelector('#ip-summary');if(summary&&run.result?.summary)summary.textContent=run.result.summary;
 host.innerHTML=`<section class="vw-analysis">${run.result?vwStoryboardHTML(run.result,c,'drawer'):''}${vwBusy(run)?`<p role="status" class="vw-progress"><i></i>${E(run.message)}</p>`:!run.result?`<p role="alert">${E(run.message)}</p>`:''}${run.connectionError?`<p role="alert">${E(run.connectionError)}</p>${vwButton('vw-analysis-resume','重新连接',c.id)}`:''}${['failed','interrupted'].includes(run.status)?vwButton('vw-analyze','重新拆解',c.id):''}</section>`;
}
function vwLocalAnalysisSegments(c){
 const duration=Math.max(12,Number(c.duration)||30),hook=Math.min(4,duration*.18),middle=Math.max(hook+3,duration*.68),end=Math.max(middle+2,duration-3),base=c.segments?.length?c.segments.map(segment=>({...segment})):[
  {start:0,end:hook,original:'开场快速抛出冲突或结果，建立观看理由。',mechanism:'用结果前置或强反差在前几秒抓住注意力。'},
  {start:hook,end:middle,original:'展开核心场景，连续展示问题与关键细节。',mechanism:'用清晰场景和递进信息维持理解与兴趣。'},
  {start:middle,end:end,original:'呈现解决方式、产品价值或前后变化。',mechanism:'让卖点进入真实使用过程，减少生硬口播。'},
  {start:end,end:duration,original:'总结结果并给出下一步行动。',mechanism:'用明确 CTA 收束内容并推动转化。'}
 ];
 const details=[
  ['开场钩子','问题前置 · 结果悬念','迅速建立与目标用户有关的真实问题','近景或结果画面先出现，主标题同步落版'],
  ['场景铺陈','场景代入 · 信息递进','把核心使用情境和操作门槛说清楚','中近景与操作特写交替，关键词字幕跟随动作'],
  ['价值证明','过程演示 · 前后对照','通过可见步骤证明产品或内容价值','关键动作放慢并停留，使用对照画面强化差异'],
  ['转化收束','结果回扣 · 行动引导','总结收益并降低下一步行动成本','结果画面稳定停留，CTA 字幕清晰收尾']
 ];
 return base.map((segment,index)=>{const d=details[Math.min(index,details.length-1)];return {...segment,title:d[0],attraction:d[1],selling_point:d[2],visual_language:d[3],prompt:`${IM.time(segment.start)}–${IM.time(segment.end)}：${segment.original}；镜头表达采用${d[3]}；重点突出“${d[2]}”，保持自然真实，不添加未经验证的效果。`};});
}
function vwLocalAnalysisResult(c){
 const category=c.category||'视频素材',platform=c.platform||'信息流平台',segments=vwLocalAnalysisSegments(c);
 return {
  summary:`这条${category}采用“开场问题或结果前置—场景与步骤展开—价值证明—行动引导”的完整结构。前段快速建立观看理由，中段通过连续画面把抽象卖点转化为可见过程，结尾回扣结果并承接转化。适合在${platform}用于短视频信息流测试，也便于替换产品、主体和 CTA 后继续复用。`,
  conversion_path:['注意力钩子','问题与场景','过程演示','价值证明','行动引导'],
  content_tags:[
   {group:'剧情演绎',label:'内容组织',values:['问题前置','过程推进','结果收束'],evidence:'开场建立问题，中段按步骤推进，结尾回扣结果并给出下一步动作。'},
   {group:'剧情演绎',label:'叙事节奏',values:['快速进入','递进解释','明确收尾'],evidence:'各时间段职责清晰，信息从吸引注意逐步转向价值证明。'},
   {group:'视听效果',label:'镜头表达',values:['近景特写','操作切镜','字幕强化'],evidence:'用局部细节和动作变化承载信息，重要节点由字幕辅助理解。'},
   {group:'视听效果',label:'节奏设计',values:['前段紧凑','重点停留','结尾稳态'],evidence:'开场快速建立冲突，中段为核心步骤留出识别时间，结尾稳定展示结果。'},
   {group:'营销属性',label:'转化路径',values:['痛点共鸣','场景化卖点','CTA 引导'],evidence:'先让用户识别自身问题，再展示解决过程，最后提供明确行动入口。'},
   {group:'营销属性',label:'卖点方式',values:['过程可视化','结果可感知'],evidence:'卖点放进真实场景和具体动作中呈现，降低纯口播带来的理解成本。'},
   {group:'适用人群',label:'核心受众',values:['效率敏感人群','关注实用价值用户'],evidence:'内容强调具体问题、操作步骤和可感知结果，对目标明确的用户更友好。'},
   {group:'适用人群',label:'适配场景',values:[platform,'短视频信息流','素材复刻与二创'],evidence:`结构短、信息密度清晰，适合${platform}的快速浏览与多版本测试。`}
  ],segments,uncertainties:['当前为在线演示解析；接入真实视频解析服务后，可进一步核对人物、产品、对白、镜头运动和音频细节。']
 };
}
function vwStartLocalAnalysis(c,key){
 const ref=vwReference(c),run=vwNewRun('analyze','灵感内容解析 Skill 正在读取素材，识别开场钩子、内容结构与转化动作…');
 Object.assign(run,{status:'running',skillName:'灵感内容解析 Skill',localAnalysis:true});workspace.videoAnalyses[key]={reference:ref,run};vwSave();vwDrawAnalysis(c);
 setTimeout(()=>{if(workspace.videoAnalyses[key]?.run!==run)return;run.status='completed';run.message='灵感内容解析已完成';run.result=vwLocalAnalysisResult(c);vwSave();document.dispatchEvent(new CustomEvent('inspiration-job-change',{detail:{reference:ref,run}}));if(ipDrawer.open&&IS.active===c.id)vwDrawAnalysis(c);},850);
}
async function vwAnalyze(id,force=false){
 const c=inspirationFind(id);if(!c||c.mediaType==='image')return;
 const ref=vwReference(c),key=vwAnalysisKey(ref);let entry=workspace.videoAnalyses[key];
 if(entry&&!force){vwDrawAnalysis(c);vwPoll(entry.reference,entry.run);return;}
 if(entry&&vwBusy(entry.run))return;
 if(c.demo||window.__STATIC_DEMO__)return vwStartLocalAnalysis(c,key);
 const run=vwNewRun('analyze');entry={reference:ref,run};workspace.videoAnalyses[key]=entry;vwSave();vwDrawAnalysis(c);
 await vwStart(ref,run,{action:'analyze',message:'请拆解这个参考视频，说明实际画面、内容结构和可借鉴机制。'});
}
const vwOriginalOpen=openInspiration;
openInspiration=async function(id){await vwOriginalOpen(id);if(ipDrawer.open&&IS.active===id)vwAnalyze(id);};
R.invoke('vw-analyze',b=>vwAnalyze(b.dataset.id,true));
R.invoke('vw-analysis-resume',b=>{const c=inspirationFind(b.dataset.id);if(c){const e=workspace.videoAnalyses[vwAnalysisKey(vwReference(c))];if(e)vwPoll(e.reference,e.run);}});

const vwImageRemake=R.actions['ip-remake'];
R.invoke('ip-remake',async b=>{
 const source=inspirationFind(b.dataset.id);if(!source)return;
 if(source.mediaType==='image')return vwImageRemake(b);
 if(VW.opening.has(source.id))return;
 if(source.demo||!source.mediaId)return toast('这条参考尚未关联原视频，请先上传视频再制作同款。');
 VW.opening.add(source.id);
 try{
  ipDrawer.close();if(ipLarge.open)ipLarge.close();
  awNewChat(source.ownerId||state.id);
  const c=chat(),reference=vwReference(source);
  c.title='制作同款 · '+source.title;
  c.videoWorkflow={reference,runs:[],mode:'remake'};
  c.reference={id:source.id,title:source.title,text:'参考视频 · 剪同款'};
  c.messages.push({role:'user',text:'剪同款',time:now(),videoReference:reference});
  const run=vwNewRun('remake');c.videoWorkflow.runs.push(run);vwRunMessage(c,run);
  WB.agentSection='chat';assistantTab='chat';AW.folder=null;location.hash='ad-agent';vwSave();render();renderAssistant();$('#prompt').focus();
  await vwStart(reference,run,{action:'remake',message:'剪同款'});
 }finally{VW.opening.delete(source.id);}
});

function vwScriptHTML(script,index,run,disabled){
 const key=run.localId+':'+index,revision=script.revision||1,flow=chat().videoWorkflow,selected=flow?.selection?.startsWith(key+':'),editing=flow?.editingKey===key;
 const structure=(script.structure||[]).join(' → ');
 return `<section class="vw-script ${selected?'selected':''} ${editing?'editing':''}"><div class="vw-script-heading"><h3><span>${index+1}.</span> ${E(script.title)}</h3><small>${[...script.body].length} 字 · 预计 ${E(script.duration)} 秒 · V${revision}</small></div>${structure?`<p class="vw-structure-line"><b>结构：</b>${E(structure)}</p>`:''}${script.story?`<p class="vw-story">${E(script.story)}</p>`:''}<div class="vw-script-body">${E(script.body)}</div><details class="vw-prompt"><summary>查看生成提示词</summary><p>${E(script.prompt||script.body)}</p></details><blockquote><b>推荐理由</b><span>${E(script.reason)}</span></blockquote>${editing?`<form class="vw-inline-editor" data-script-key="${E(key)}"><label>脚本名称<input name="title" value="${E(script.title)}" required></label><label>脚本内容<textarea name="body" rows="8" required>${E(script.body)}</textarea></label><details><summary>同时修改生成提示词</summary><textarea name="prompt" rows="5" required>${E(script.prompt||script.body)}</textarea></details><div><button type="button" data-r-action="vw-cancel-inline-edit">取消</button><button type="button" data-r-action="vw-agent-edit-inline">让 Agent 帮我改</button><button type="button" class="solid" data-r-action="vw-save-inline-edit">保存为 V${revision+1}</button></div></form>`:`<div class="vw-script-actions">${vwButton('vw-edit-script','✎ 编辑此稿',key,disabled?'disabled':'')}${vwButton('vw-select-script',selected?'✓ 已选用':'✓ 选用此稿',key,`${selected?'class="selected" disabled':''} ${disabled?'disabled':''}`)}</div>`}</section>`;
}
const vwWhitePrompt=`【参考素材：已确认的白模视频，作为唯一运动蓝图】
严格继承白模视频里全部规则，禁止改动：
1. 完全沿用白模的相机轨迹、镜头角度、运镜速度
2. 完全沿用白模所有物体的空间位置、部件比例、遮挡层级、时序动作、位移旋转节奏
3. 物体占位、边界、碰撞关系和白模保持一致，不新增、不删减部件，不改变运动轨迹

【替换主体描述】
把白模对应的主体替换为：【在这里填写你想要的新主体，例如：金属质感智能扫地机器人、哑光橙色露营帐篷、卡通风格猫咪玩偶】


主体细节：【补充材质、颜色、风格、细节】

【渲染与光影】
写实渲染，自然柔和环境光，真实材质反射，干净背景【自定义背景，如纯白背景/室内客厅地面】，光影跟随镜头自然变化，主体光影和镜头视角匹配。

【强制一致性约束】
帧间稳定，无闪烁、无变形漂移、无穿模，新主体严格贴合白模的轮廓边界，动作和白模同步。`;
const vwWhiteNodes=[
 '读取用户上传原始视频，转为 3D 白模蓝图视频，提取结构、遮挡、相机轨迹、物体运动时序信息。',
 '输出 5 维核对报告：结构拓扑、遮挡层级、相机运镜、动作时序、白模样式，并附原图与白模关键帧对比，等待用户确认。',
 '确认通过后读取白模蓝图，按照新主体描述替换主体，完整保留运动、镜头与遮挡规则并渲染新视频。',
 '输出成片并保留本次白模蓝图，支持后续多次替换不同主体复用。'
];
function vwRemakeEntryHTML(flow,message){
 const selected=message.choice;
 return `<div class="vw-response vw-remake-entry"><div class="vw-agent-label">${icon('spark')} 制作同款 Agent</div><section><small>制作路径选择</small><h3>这条参考内容想怎么制作？</h3><p>可以复刻原视频的运动蓝图并替换主体，也可以参考原视频结构完成脚本二创。</p><div><button data-r-action="vw-remake-white" ${selected?'disabled':''}><b>视频复刻</b><span>保留原脚本生成白模视频，替换主体背景等元素</span></button><button data-r-action="vw-remake-script" ${selected?'disabled':''}><b>视频二创</b><span>基于原视频，生成类似脚本并生产新视频</span></button></div>${selected?`<strong>✓ 已选择：${selected==='white'?'视频复刻':'视频二创'}</strong>`:''}</section></div>`;
}

function vwWhiteReferenceBlock(flow){
 const references=flow?.whiteReferences||[];if(!references.length)return '';
 return `\n\n【引用组件】\n${references.map(item=>`- ${item.typeLabel}：${item.title}（ID：${item.id}）`).join('\n')}`;
}
function vwWhitePromptBase(text=''){return text.split('\n\n【引用组件】\n')[0];}
function vwWhiteReferenceBar(flow){
 const references=flow.whiteReferences||[];
 return `<div id="vw-white-reference-bar" class="vw-white-reference-bar"><button type="button" data-r-action="vw-white-library-open"><span>▦</span><b>素材确认</b><small>${references.length?`已选 ${references.length} 项`:'视频 · 图片 · CTA 组件库'}</small><i>⌄</i></button>${references.length?`<div class="vw-white-reference-chips">${references.map(item=>`<span>${E(item.typeLabel)} · ${E(item.title)}</span>`).join('')}</div>`:'<p>可选择视频、图片或 CTA 组件作为新主体与背景的参考。</p>'}</div>`;
}
function vwWhiteReferenceSpacing(text=''){
 const marker='把白模对应的主体替换为：',start=text.indexOf(marker);if(start<0)return text;
 const end=text.indexOf('\n',start+marker.length);if(end<0)return text;
 const rest=text.slice(end).replace(/^\n+/,''),breaks=text.slice(end).match(/^\n+/)?.[0].length||0;
 return breaks>=3?text:text.slice(0,end)+'\n\n\n'+rest;
}
function vwAlignWhitePrompt(ensureVisible=false){
 const prompt=$('#prompt'),bar=$('#vw-white-reference-bar'),composer=$('#composer'),text=prompt?.value||'',marker='把白模对应的主体替换为：',start=text.indexOf(marker);if(!prompt||!bar||!composer||start<0)return;
 const nextLine=text.indexOf('\n',start+marker.length),end=nextLine<0?text.length:nextLine;
 composer.querySelector('.vw-white-prompt-mirror')?.remove();
 const style=getComputedStyle(prompt),mirror=document.createElement('div');mirror.className='vw-white-prompt-mirror';mirror.textContent=text;Object.assign(mirror.style,{left:`${prompt.offsetLeft}px`,top:`${prompt.offsetTop}px`,width:`${prompt.offsetWidth}px`,padding:style.padding,font:style.font,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing});composer.append(mirror);
 const node=mirror.firstChild,range=document.createRange();range.setStart(node,end);range.collapse(true);
 const caret=range.getBoundingClientRect(),mirrorBox=mirror.getBoundingClientRect(),rawTop=caret.top-mirrorBox.top,rawLeft=caret.right-mirrorBox.left;
 const paddingLeft=parseFloat(style.paddingLeft)||0,paddingRight=parseFloat(style.paddingRight)||0,lineHeight=parseFloat(style.lineHeight)||24,barWidth=bar.offsetWidth||225,barHeight=bar.offsetHeight||38;
 if(ensureVisible)prompt.scrollTop=Math.max(0,rawTop-lineHeight*1.5);
 const contentLeft=prompt.offsetLeft+paddingLeft,contentRight=prompt.offsetLeft+prompt.clientWidth-paddingRight;
 let left=prompt.offsetLeft+rawLeft+8,top=prompt.offsetTop+rawTop-prompt.scrollTop-(barHeight-lineHeight)/2;
 if(left+barWidth>contentRight){left=contentLeft;top+=lineHeight;}
 bar.style.left=`${Math.max(contentLeft,left)}px`;bar.style.right='auto';bar.style.top=`${top}px`;
 bar.style.visibility=top+barHeight<prompt.offsetTop||top>prompt.offsetTop+prompt.clientHeight?'hidden':'visible';
 bar.dataset.anchor='主体替换文字';
 mirror.remove();
}
function vwWhiteOriginal(source){
 return `<div class="vw-white-original-art">${source?inspirationArt(source):'<span>原视频</span>'}</div>`;
}
function vwWhiteRunHTML(run,c){
 const report=run.whiteReport,stage=run.whiteStage||1,source=inspirationFind(c.videoWorkflow?.reference?.id),state=index=>stage>index?'done':stage===index?'active':'pending';
 const rows=report?[
  ['结构拓扑',report.topology,'核对部件、比例和空间关系是否完整'],
  ['遮挡层级',report.occlusion,'核对前后层级、接触边界和穿插关系'],
  ['相机运镜',report.camera,'核对轨迹、角度、速度和关键帧视角'],
  ['动作时序',report.timing,'核对位移、旋转、停顿和动作节奏'],
  ['白模样式',report.style,'核对白模轮廓、表面和边界表达']
 ]:[];
 return `<div class="vw-response vw-white-flow"><div class="vw-agent-label">${icon('spark')} 白模蓝图 Agent</div><p class="vw-status ${vwBusy(run)?'vw-progress':''}" role="status">${vwBusy(run)?'<i></i>':''}${E(run.message||'')}</p><div class="vw-white-stagebar"><span class="${stage>=1?'active':''}">解析视频</span><i>→</i><span class="${stage>=2?'active':''}">生成白模视频</span><i>→</i><span class="${report?'active':''}">五维核对</span><i>→</i><span class="${stage>=4?'active':''}">输出成片</span></div><ol class="vw-white-nodes">${vwWhiteNodes.map((text,index)=>`<li class="${state(index+1)}"><span>${index+1}</span><p>${E(text)}</p></li>`).join('')}</ol>${report?`<section class="vw-white-report"><header><div><small>WHITE MODEL CHECK</small><h3>白模蓝图 5 维核对报告</h3><p>蓝图已提取完成。确认后将把这套运动规则作为后续视频的唯一运动依据。</p></div><span>${run.whiteConfirmed?'已确认':'等待确认'}</span></header><div class="vw-keyframes"><figure><div>${vwWhiteOriginal(source)}</div><figcaption>原视频关键帧 · 结构与运动参考</figcaption></figure><figure><div class="vw-blueprint-frame"><span></span><i></i><b>3D WHITE MODEL</b></div><figcaption>白模关键帧 · 已锁定运动蓝图</figcaption></figure></div><div class="vw-white-table"><div><b>核对维度</b><b>白模核对结果</b><b>确认重点</b></div>${rows.map(row=>`<div><strong>${E(row[0])}</strong><p>${E(row[1])}</p><span>${E(row[2])}</span></div>`).join('')}</div><footer>${vwButton('vw-white-edit','编辑报告',run.localId,run.whiteConfirmed?'disabled':'')}${vwButton('vw-white-confirm',run.whiteConfirmed?'已确认并带入提示词':'确认白模蓝图',run.localId,`class="solid" ${run.whiteConfirmed?'disabled':''}`)}</footer></section>`:''}</div>`;
}
function vwPublishChoice(run){
 const decision=run.publishDecision;
 if(decision==='saved')return `<div class="vw-publish-choice decided saved"><span>✓ 已保存到资产库，可在“资产 → AI 成片库”继续查看和使用。</span></div>`;
 if(decision==='later')return `<div class="vw-publish-choice decided"><span>已选择暂不发布，本次成片仍保留在当前对话中。</span><button data-r-action="vw-save-video" data-id="${E(run.localId)}">保存到资产库</button><button data-r-action="vw-publish-video" data-id="${E(run.localId)}">发布计划</button></div>`;
 if(decision==='publish')return `<div class="vw-publish-choice decided"><span>已带入智能投放，继续选择账户、广告组和计划。</span></div>`;
 return `<div class="vw-publish-choice"><div><small>NEXT STEP</small><b>视频已经生成，接下来如何处理？</b><span>可以保存到 AI 成片库，也可以暂不发布或直接创建发布计划。</span></div><button class="save" data-r-action="vw-save-video" data-id="${E(run.localId)}">保存到资产库</button><button data-r-action="vw-publish-later" data-id="${E(run.localId)}">暂不发布</button><button class="solid" data-r-action="vw-publish-video" data-id="${E(run.localId)}">发布计划</button></div>`;
}
function vwRunHTML(run,c){
 if(run.whiteModel)return vwWhiteRunHTML(run,c);
 const result=run.result,busy=c.videoWorkflow.runs.some(vwBusy),key=run.localId,local=run.localScripts,round=run.generationRound||(local?c.videoWorkflow.runs.filter(item=>item.localScripts).indexOf(run)+1:1);
 return `<div class="vw-response ${local?'vw-native-scripts':''}"><div class="vw-agent-label">${icon('spark')} ${E(run.skillName||'视频创作 Agent')}</div><p class="vw-status ${vwBusy(run)?'vw-progress':''}" role="status">${vwBusy(run)?'<i></i>':''}${E(run.message||'')}</p>${run.connectionError?`<p class="vw-error">${E(run.connectionError)} ${vwButton('vw-resume','重新连接',key)}</p>`:''}${['failed','interrupted'].includes(run.status)?`<div class="vw-error">${run.action==='analyze'||run.action==='remake'?vwButton('vw-retry','重试',key):'你可以在下方补充说明，继续核对当前制作进度。'}</div>`:''}${run.status==='submitted'?vwButton('vw-check-progress','查看生成进度',key):''}${result?`${result.summary?`<p class="vw-result-summary">${E(result.summary)}</p>`:''}${result.segments?.length?`<details class="vw-breakdown"><summary>✦ 参考视频拆解 · ${result.segments.length} 个时间段</summary>${vwAnalysisHTML(result)}</details>`:''}${local?`<p class="vw-round-label">以下是第 ${round} 轮生成的 3 个版本：</p>`:''}${(result.scripts||[]).map((s,i)=>vwScriptHTML(s,i,run,busy)).join('')}${local?`<div class="vw-native-followups"><span>如果方向不合适，可以保留这一轮并让 Agent 再生成一组。</span>${vwButton('vw-chat-regenerate','↻ 重新生成 3 个版本',key)}</div>`:''}${result.questions?.length&&!run.answered?`<form class="vw-questions" data-run="${E(key)}"><b>补充这些信息后继续</b>${result.questions.map((q,i)=>`<label>${E(q.title)}<input name="q${i}" list="vw-options-${E(key)}-${i}" required placeholder="选择建议选项，或输入你的回答" ${busy?'disabled':''}><datalist id="vw-options-${E(key)}-${i}">${q.options.map(o=>`<option value="${E(o)}">`).join('')}</datalist></label>`).join('')}<button type="submit" class="solid" ${busy?'disabled':''}>提交并继续</button></form>`:''}${result.project_url||result.video_url?`<div class="vw-output">${result.video_url?`<div class="vw-generated-video"><video controls playsinline preload="metadata" src="${E(result.video_url)}" aria-label="Agent 生成的视频"></video><div><b>演示视频已生成</b><a href="${E(result.video_url)}" download>下载视频</a></div></div>${vwPublishChoice(run)}`:''}${result.project_url?`<a href="${E(result.project_url)}" target="_blank" rel="noopener">打开制作项目 ↗</a>`:''}</div>`:''}`:''}</div>`;
}
function vwChoiceHTML(flow,message){
 const script=flow.selectedScript,mix=message.choice==='mix',direct=message.choice==='direct';
 return `<div class="vw-response vw-choice"><div class="vw-agent-label">${icon('spark')} 视频创作 Agent</div><p>已选用 <b>「${E(script?.title||'推荐脚本')}」</b>。</p><p>接下来可以选择素材重新混剪，或者先快速生成一条演示视频。</p><div class="vw-suggestion-actions"><button data-r-action="vw-choice-mix" ${message.choice?'disabled':''}>选择素材混剪</button><button data-r-action="vw-choice-direct" ${message.choice?'disabled':''}>快速生成演示视频</button></div>${message.choice?`<p class="vw-choice-confirmed">✓ 已选择：${mix?'选择素材混剪':direct?'快速生成演示视频':''}</p>`:''}</div>`;
}
async function vwRenderVideo(el,reference){
 try{
  let url=VW.media.get(reference.mediaId);
  if(!url){const file=await inspirationMedia(reference.mediaId);if(!file)return;if(VW.media.has(reference.mediaId))url=VW.media.get(reference.mediaId);else{url=URL.createObjectURL(file);VW.media.set(reference.mediaId,url);}}
  if(el.isConnected)el.src=url;
 }catch(e){if(el.isConnected)el.replaceWith(document.createTextNode('参考视频暂不可读取'));}
}
const vwOriginalRender=renderAssistant;
renderAssistant=function(){
 vwOriginalRender();const c=chat(),flow=c.videoWorkflow;
 assistantShell.querySelectorAll('#vw-white-reference-bar').forEach(node=>node.remove());
 $('#composer')?.classList.remove('vw-white-reference-active');
 assistantShell.classList.toggle('vw-conversation',!!flow&&assistantTab==='chat'&&!AW.folder&&WB.agentSection==='chat');
 const send=$('#send');send.classList.remove('vw-stop');send.innerHTML=vwIdleSendHTML;send.setAttribute('aria-label','发送');
 if(!flow||assistantTab!=='chat'||AW.folder||WB.agentSection!=='chat')return;
 $('#aw-context-chips').insertAdjacentHTML('afterbegin',`<span class="vw-selected-skill">${icon('spark')}${flow.whiteModelFlow?'白模蓝图 Skill':flow.localScriptFlow&&flow.mode==='remake'?'脚本拆解 Skill':flow.mode==='generate'?'视频生成':'制作同款'}</span><span>▧ ${E(flow.reference.title)}</span>`);
 $('#prompt').placeholder=flow.editing?'描述你想修改的内容，例如：开头更简洁，保留第二段的场景…':'补充产品信息、调整脚本，或继续视频制作…';
 if(flow.mode==='white-prompt'&&flow.whiteConfirmed){const prompt=$('#prompt'),spaced=vwWhiteReferenceSpacing(prompt.value);if(spaced!==prompt.value){prompt.value=c.draft=spaced;flow.whitePromptBase=vwWhiteReferenceSpacing(flow.whitePromptBase||vwWhitePromptBase(spaced));vwSave();}$('#composer').classList.add('vw-white-reference-active');prompt.insertAdjacentHTML('afterend',vwWhiteReferenceBar(flow));prompt.onscroll=()=>vwAlignWhitePrompt(false);prompt.oninput=()=>requestAnimationFrame(()=>vwAlignWhitePrompt(false));vwAlignWhitePrompt(false);requestAnimationFrame(()=>vwAlignWhitePrompt(true));}
 $('#assistant-body').querySelectorAll('.message').forEach((el,i)=>{
  const m=c.messages[i];if(!m)return;
  if(m.videoReference){el.classList.add('vw-user-video');el.innerHTML=`<video controls preload="metadata" aria-label="参考视频：${E(m.videoReference.title)}"></video><small>${E(m.videoReference.title)}</small><p>${E(m.text)}</p>`;vwRenderVideo(el.querySelector('video'),m.videoReference);}
  if(m.videoRun){const run=flow.runs.find(r=>r.localId===m.videoRun);if(run){el.classList.add('vw-rich-message');el.innerHTML=vwRunHTML(run,c);if(run.whiteModel&&vwBusy(run))vwScheduleWhiteReport(c,run);else if(vwBusy(run)&&!run.connectionError)vwPoll(flow.reference,run);}}
  if(m.videoChoice){el.classList.add('vw-rich-message');el.innerHTML=vwChoiceHTML(flow,m);}
  if(m.videoRemakeEntry){el.classList.add('vw-rich-message');el.innerHTML=vwRemakeEntryHTML(flow,m);}
 });
 $('#assistant-body').querySelectorAll('.vw-questions').forEach(form=>form.onsubmit=e=>{e.preventDefault();const run=flow.runs.find(r=>r.localId===form.dataset.run);if(!run||flow.runs.some(vwBusy))return;const values=new FormData(form),answer=run.result.questions.map((q,i)=>`${q.title}：${values.get('q'+i)}`).join('\n');run.answered=answer;vwSave();vwSend(c,answer,'continue',null,run.id);});
 if(flow.editing)$('#aw-context-chips').insertAdjacentHTML('beforeend',`<span>正在修改：${E(flow.editing.title)}${vwButton('vw-stop-edit','×')}</span>`);
 const running=flow.runs.some(vwBusy);send.classList.toggle('vw-stop',running);send.innerHTML=running?'<span aria-hidden="true"></span>':vwIdleSendHTML;send.setAttribute('aria-label',running?'停止生成':'发送');send.title=running?'停止生成':'';send.disabled=running?false:!c.draft?.trim();
};
function vwFindScript(key){const flow=chat().videoWorkflow;if(!flow)return null;const [id,index]=key.split(':'),run=flow.runs.find(r=>r.localId===id),script=run?.result?.scripts?.[Number(index)];return script?{flow,run,script,index:Number(index)}:null;}
R.invoke('vw-edit-script',b=>{
 const selected=vwFindScript(b.dataset.id);if(!selected)return;
 const flow=chat().videoWorkflow;flow.editingKey=b.dataset.id;flow.editing=JSON.parse(JSON.stringify(selected.script));vwSave();renderAssistant();
 requestAnimationFrame(()=>$('#assistant-body .vw-script.editing textarea[name="body"]')?.focus());
});
R.invoke('vw-cancel-inline-edit',()=>{const flow=chat().videoWorkflow;delete flow.editing;delete flow.editingKey;vwSave();renderAssistant();});
R.invoke('vw-save-inline-edit',b=>{
 const form=b.closest('.vw-inline-editor'),value=vwFindScript(form?.dataset.scriptKey);if(!form||!value)return;
 const data=new FormData(form),s=value.script;s.versions??=[];s.versions.push({body:s.body,prompt:s.prompt,revision:s.revision||1});s.title=String(data.get('title')||'').trim();s.body=String(data.get('body')||'').trim();s.prompt=String(data.get('prompt')||'').trim();s.revision=(s.revision||1)+1;
 delete value.flow.editing;delete value.flow.editingKey;value.flow.selection=null;vwSave();renderAssistant();toast(`已保存为 V${s.revision}`);
});
R.invoke('vw-agent-edit-inline',b=>{
 const form=b.closest('.vw-inline-editor'),value=vwFindScript(form?.dataset.scriptKey);if(!form||!value)return;
 const data=new FormData(form),c=chat(),editing={...JSON.parse(JSON.stringify(value.script)),title:String(data.get('title')||'').trim(),body:String(data.get('body')||'').trim(),prompt:String(data.get('prompt')||'').trim()};c.videoWorkflow.editing=editing;c.videoWorkflow.editingParent=value.run.id;c.videoWorkflow.editingKey=form.dataset.scriptKey;c.draft=`请帮我修改下面这份脚本，并保留可继续制作视频的完整结构。\n\n【原脚本名称】\n${editing.title}\n\n【原脚本】\n${editing.body}\n\n【生成提示词】\n${editing.prompt||editing.body}\n\n【修改要求】\n`;vwSave();renderAssistant();$('#prompt').focus();$('#prompt').setSelectionRange(c.draft.length,c.draft.length);
});
R.invoke('vw-stop-edit',()=>{const flow=chat().videoWorkflow;delete flow.editing;delete flow.editingParent;delete flow.editingKey;vwSave();renderAssistant();});
R.invoke('vw-select-script',b=>{
 const v=vwFindScript(b.dataset.id);if(!v||v.flow.runs.some(vwBusy))return;
 const c=chat(),selection=b.dataset.id+':'+(v.script.revision||1);if(v.flow.selection===selection)return toast('这份脚本已选用，请在当前对话继续制作。');v.flow.selection=selection;const script=JSON.parse(JSON.stringify(v.script));delete script.versions;
 if(v.flow.localScriptFlow){v.flow.selectedScript=script;v.flow.mode='choice';c.messages=c.messages.filter(message=>!message.videoChoice);c.messages.push({role:'user',text:`选用第 ${v.index+1} 版「${script.title}」`,time:now(),scriptSelection:true},{role:'assistant',text:'',time:now(),videoChoice:true});state.messages=c.messages;delete v.flow.editing;delete v.flow.editingKey;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-choice')?.scrollIntoView({behavior:'smooth',block:'center'}),0);return;}
 c.draft=`选用「${script.title}」V${script.revision||1}，请按这个脚本开始制作视频。\n\n【脚本】\n${script.body}\n\n【生成提示词】\n${script.prompt||script.body}`;
 v.flow.mode='generate';v.flow.selectedScript=script;delete v.flow.editing;vwSave();renderAssistant();
 vwSend(c,c.draft,'generate',script,v.run.id);
});
async function vwSend(c,text,action='continue',script=null,previousJob=null){
 const flow=c.videoWorkflow;if(!flow||flow.runs.some(vwBusy))return;
 if(c.attachments?.length)return toast('当前视频流程使用灵感库中的参考视频；请先移除待发送附件，将补充信息直接写在对话框中。');
 const previous=previousJob||flow.runs.slice().reverse().find(r=>r.id)?.id;
 c.messages.push({role:'user',text,time:now()});c.draft='';
 const run=vwNewRun(action);flow.runs.push(run);vwRunMessage(c,run);vwSave();vwRefresh();
 await vwStart(flow.reference,run,{action,message:text,script,previous_job:previous,...(flow.fission?{materials:flow.fission.materials,context:{...vwContext(flow.reference.ownerId),fission:flow.fission}}:{})});
}
function vwLocalRefine(c,text){
 const flow=c.videoWorkflow,source=flow?.editing;if(!flow?.localScriptFlow||!source)return;
 const marker='【修改要求】',tail=text.includes(marker)?text.slice(text.lastIndexOf(marker)+marker.length).trim():text.trim(),instruction=tail||'优化开头、表达节奏和行动引导';
 c.messages.push({role:'user',text,time:now()});c.draft='';
 const revised=JSON.parse(JSON.stringify(source));revised.versions??=[];revised.versions.push({body:source.body,prompt:source.prompt,revision:source.revision||1});revised.title=`${source.title} · Agent 修改版`;revised.body=`【Agent 调整说明】${instruction}\n${source.body}`;revised.prompt=`${source.prompt||source.body}\n\n修改要求：${instruction}`;revised.reason=`已根据“${instruction}”完成调整，并保留原脚本的时长与制作结构。`;revised.revision=(source.revision||1)+1;
 const run=vwNewRun('refine','已根据你的要求完成脚本修改。请检查后选用，也可以继续编辑。');Object.assign(run,{status:'completed',skillName:'脚本改写 Agent',result:{summary:'已在保留原结构和时长的基础上完成修改。',segments:[],scripts:[revised],questions:[],project_url:'',video_url:'',task_ids:[]}});flow.runs.push(run);vwRunMessage(c,run);flow.selection=null;flow.selectedScript=null;flow.mode='remake';c.messages=c.messages.filter(message=>!message.videoChoice);state.messages=c.messages;delete flow.editing;delete flow.editingParent;delete flow.editingKey;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-response:last-child')?.scrollIntoView({behavior:'smooth',block:'center'}),0);
}
function vwStopCurrent(c){
 const flow=c.videoWorkflow,run=[...(flow?.runs||[])].reverse().find(vwBusy);if(!run)return;
 run.status='interrupted';run.message='已停止本次生成。你可以修改要求后重新发送。';if(run.requestText)c.draft=run.requestText;delete run.connectionError;vwSave();renderAssistant();
}
R.invoke('vw-check-progress',b=>{const c=chat(),r=c.videoWorkflow?.runs.find(r=>r.localId===b.dataset.id);if(r)vwSend(c,'请检查已经提交的视频任务进度，保留已有任务，不重复提交。','continue',null,r.id);});
R.invoke('vw-resume',b=>{const f=chat().videoWorkflow,r=f?.runs.find(r=>r.localId===b.dataset.id);if(r)vwPoll(f.reference,r);});
R.invoke('vw-retry',b=>{const c=chat(),f=c.videoWorkflow,r=f?.runs.find(r=>r.localId===b.dataset.id);if(!r||!['analyze','remake'].includes(r.action)||f.runs.some(vwBusy))return;vwSend(c,'请重新拆解参考视频并推荐同款脚本。','remake');});
const vwOriginalSubmit=$('#composer').onsubmit;
$('#composer').onsubmit=function(e){const c=chat();if(!c.videoWorkflow)return vwOriginalSubmit.call(this,e);e.preventDefault();const f=c.videoWorkflow;if(f.runs.some(vwBusy))return vwStopCurrent(c);const text=$('#prompt').value.trim();if(!text)return;if(f.mode==='white-prompt'&&f.whiteConfirmed)return vwGenerateWhiteSubject(c,text);if(f.localScriptFlow&&f.editing)return vwLocalRefine(c,text);vwSend(c,text,f.editing?'refine':'continue',f.editing||null,f.editingParent||null);};
$('#prompt').addEventListener('input',()=>{if(chat().videoWorkflow?.runs.some(vwBusy))$('#send').disabled=false;});
window.addEventListener('beforeunload',()=>{for(const url of VW.media.values())URL.revokeObjectURL(url);});

// The inspiration entry begins with a reviewable script instead of immediately starting a job.
const vwRemakeStudio=document.createElement('dialog');vwRemakeStudio.id='vw-remake-studio';vwRemakeStudio.setAttribute('aria-label','同款脚本');document.body.append(vwRemakeStudio);
const vwMaterialDrawer=document.createElement('dialog');vwMaterialDrawer.id='vw-material-drawer';vwMaterialDrawer.setAttribute('aria-label','选择混剪素材');document.body.append(vwMaterialDrawer);
const vwWhiteLibrary=document.createElement('dialog');vwWhiteLibrary.id='vw-white-library';vwWhiteLibrary.setAttribute('aria-label','选择白模替换引用');document.body.append(vwWhiteLibrary);
const VRS={source:null,segment:null,scripts:[],selected:null,round:1,materials:new Set(),uploads:[]};
const VWL={tab:'video',draft:new Map()};
const vwWhiteLibraryItems={
 video:[
  {id:'video-1989290108012011522',title:'情绪开场 · 3 秒抓住注意力',meta:'9:16 视频 · 12 秒'},
  {id:'video-1981868491465003010',title:'产品演示 · 核心卖点直给',meta:'9:16 视频 · 18 秒'},
  {id:'video-1971540586660364289',title:'真实反馈 · 使用前后对比',meta:'9:16 视频 · 15 秒'},
  {id:'video-1965115693066',title:'生活方式 · 自然场景运镜',meta:'16:9 视频 · 20 秒'}
 ],
 image:[
  {id:'image-1971540648659529730',title:'品牌人物 · 口播解释',meta:'竖版图片 · 1080 × 1440'},
  {id:'image-1983808827209838594',title:'功能清单 · 信息卡片',meta:'方形图片 · 1080 × 1080'},
  {id:'image-1978803615291004431',title:'纯白产品场景',meta:'横版图片 · 1920 × 1080'},
  {id:'image-1978803615291004432',title:'室内客厅背景',meta:'横版图片 · 1920 × 1080'}
 ],
 cta:[
  {id:'cta-buy-now',title:'立即购买',meta:'主行动按钮 · 高转化'},
  {id:'cta-coupon',title:'领取优惠券',meta:'优惠组件 · 强利益点'},
  {id:'cta-learn-more',title:'了解更多',meta:'信息承接 · 轻转化'},
  {id:'cta-download',title:'立即下载',meta:'应用下载 · 强行动'},
  {id:'cta-book',title:'预约体验',meta:'线索收集 · 服务类'},
  {id:'cta-shop',title:'进入店铺',meta:'店铺承接 · 电商类'}
 ]
};
function vwWhiteLibraryLabel(type){return type==='video'?'视频':type==='image'?'图片':'CTA 组件';}
function vwWhiteLibraryItem(type,id){const item=vwWhiteLibraryItems[type]?.find(row=>row.id===id);return item?{...item,type,typeLabel:vwWhiteLibraryLabel(type)}:null;}
function vwWhiteLibraryArt(item,type,index){
 if(type==='cta')return `<div class="vwl-art vwl-cta"><span>${E(item.title)}</span><small>CTA</small></div>`;
 return `<div class="vwl-art vwl-${type} tone-${index%4}"><i>${type==='video'?'▶':'▧'}</i><span>${type==='video'?'VIDEO':'IMAGE'}</span></div>`;
}
function vwDrawWhiteLibrary(){
 const type=VWL.tab,items=vwWhiteLibraryItems[type],count=VWL.draft.size;
 vwWhiteLibrary.innerHTML=`<div class="vwl-shell"><header><div><small>REFERENCE LIBRARY</small><h2>选择新主体与背景参考</h2><p>已选内容会作为引用组件写入白模换主体提示词。</p></div><button type="button" data-r-action="vw-white-library-close" aria-label="关闭">×</button></header><nav>${[['video','视频'],['image','图片'],['cta','CTA 组件库']].map(([id,label])=>`<button type="button" class="${type===id?'active':''}" data-r-action="vw-white-library-tab" data-id="${id}">${label}</button>`).join('')}</nav><section class="vwl-list ${type==='cta'?'cta':''}">${items.map((item,index)=>{const key=`${type}:${item.id}`,selected=VWL.draft.has(key);return `<button type="button" class="vwl-item ${selected?'selected':''}" data-r-action="vw-white-reference-toggle" data-type="${type}" data-id="${E(item.id)}">${vwWhiteLibraryArt(item,type,index)}<span><b>${E(item.title)}</b><small>ID：${E(item.id)} · ${E(item.meta)}</small></span><i>${selected?'✓':'＋'}</i></button>`;}).join('')}</section><footer><span>已选择 <b>${count}</b> 个引用</span><div><button type="button" data-r-action="vw-white-library-close">取消</button><button type="button" class="solid" data-r-action="vw-white-library-apply">使用已选内容</button></div></footer></div>`;
}
function vwStudioScripts(source,round=1){
 const segments=VRS.segment!==null&&source.segments?.[VRS.segment]?[source.segments[VRS.segment]]:(source.segments||[]),mechanism=segments.map(s=>s.mechanism).filter(Boolean).join('、')||'快速建立情境、展示核心卖点并用行动引导收束',subject=source.summary||source.title;
 const pool=[
  {title:'痛点反转型',duration:28,structure:['用户痛点','意外转折','产品解法','行动引导'],body:`【0–3 秒】直接抛出目标用户最熟悉的困扰，用一句反问留住注意力。\n【3–10 秒】还原真实使用场景，并放大问题带来的不便。\n【10–22 秒】自然带出产品，用近景展示关键卖点和使用过程。\n【22–28 秒】给出结果对比，以清晰行动引导结束。`,reason:`保留“${mechanism}”的节奏，但换成原创场景和表达。`,prompt:`竖屏 9:16，真实生活感，围绕“${subject}”拍摄；前 3 秒强钩子，中段近景展示产品，结尾行动引导。`},
  {title:'体验记录型',duration:32,structure:['场景代入','第一次体验','细节证明','真实结论'],body:`【0–4 秒】从正在发生的生活场景切入，说明为什么开始这次体验。\n【4–14 秒】用第一视角记录使用步骤，不急于下结论。\n【14–26 秒】展示两个可以被看见的细节变化，并补充真实感受。\n【26–32 秒】总结适合的人群和使用建议，邀请观众继续了解。`,reason:'以体验过程增强可信度，适合使用实拍素材和自然口播。',prompt:`竖屏纪实风，第一视角体验“${subject}”，自然光、真实环境音、细节特写。`},
  {title:'清单种草型',duration:25,structure:['结果前置','三点清单','场景证明','收藏引导'],body:`【0–3 秒】先展示最终效果，告诉观众接下来只讲三个重点。\n【3–17 秒】按“一、二、三”快速说明核心卖点，每一点配一段对应画面。\n【17–22 秒】回到完整使用场景，证明三个卖点如何共同解决问题。\n【22–25 秒】用收藏或进一步了解的动作收尾。`,reason:'信息密度高，适合多素材快剪和清晰字幕。',prompt:`竖屏快节奏清单视频，主题“${subject}”，三个卖点分别配独立素材。`},
  {title:'误区纠正型',duration:27,structure:['常见误区','事实拆解','正确示范','评论互动'],body:`【0–4 秒】说出用户在“${subject}”上最容易相信的一条误区。\n【4–12 秒】用画面证据解释误区为什么会影响结果。\n【12–23 秒】展示正确做法，并给出可以立刻照做的步骤。\n【23–27 秒】邀请观众留言自己遇到过的类似问题。`,reason:'用“先否定、再证明”的结构制造认知反差，让新一轮脚本与上一轮明显不同。',prompt:`竖屏知识解释风，围绕“${subject}”做误区纠正；开头大字标题，中段对比演示，结尾评论互动。`},
  {title:'双场景对比型',duration:30,structure:['两种选择','同步对照','结果揭晓','结论推荐'],body:`【0–3 秒】左右分屏展示两种不同选择，并提出“结果会差多少”。\n【3–18 秒】同步记录两个场景的操作过程，关键步骤保持同屏对照。\n【18–26 秒】揭晓结果差异，用特写突出决定性细节。\n【26–30 秒】给出适用人群和明确选择建议。`,reason:'通过平行对照让差异直接可见，适合展示产品效果和使用门槛。',prompt:`9:16 竖屏双栏对比，主题“${subject}”，统一机位与光线，关键差异使用字幕标注。`},
  {title:'限时挑战型',duration:24,structure:['挑战目标','倒计时过程','意外结果','参与邀请'],body:`【0–3 秒】宣布一个与“${subject}”有关的限时挑战，并亮出倒计时。\n【3–16 秒】用三个快速镜头记录挑战过程，每一步都显示进度。\n【16–21 秒】展示最终结果和过程中最意外的发现。\n【21–24 秒】邀请观众尝试同款挑战并分享结果。`,reason:'挑战任务自带进度感和观看动力，适合快速演示型成片。',prompt:`竖屏挑战视频，节奏明快，画面含倒计时和进度条，主题“${subject}”。`},
  {title:'问答揭秘型',duration:26,structure:['高频问题','答案悬念','过程揭秘','一句总结'],body:`【0–3 秒】把评论区最高频的问题直接放大到画面中央。\n【3–9 秒】先给半个答案，保留最关键的信息制造悬念。\n【9–22 秒】用连续特写完整展示“${subject}”的真实过程。\n【22–26 秒】用一句易记的结论回答开头问题。`,reason:'用真实问题驱动观看，适合强调可信度和过程细节。',prompt:`竖屏问答风，开场评论气泡，中段过程特写，主题“${subject}”，结尾一句话总结。`},
  {title:'前后变化型',duration:29,structure:['结果前置','回到之前','关键动作','同框验证'],body:`【0–3 秒】先放最终画面，让观众看见最明显的变化。\n【3–10 秒】回到开始前的状态，说明原本的问题。\n【10–24 秒】完整展示造成变化的三个关键动作。\n【24–29 秒】以前后同框和真实感受完成验证。`,reason:'结果前置可以快速建立期待，再用过程证明变化不是偶然。',prompt:`竖屏前后对比，主题“${subject}”，同机位拍摄，变化节点加入时间标签。`},
  {title:'避坑指南型',duration:31,structure:['失败画面','三个坑点','正确替代','收藏提醒'],body:`【0–4 秒】展示一次典型失败，并提醒“这三个坑别再踩”。\n【4–22 秒】逐条说明三个坑点，每条同时给出正确替代动作。\n【22–27 秒】展示按正确方法完成后的结果。\n【27–31 秒】用清单截图和收藏提示结束。`,reason:'失败示例和解决办法成对出现，信息实用且有明确收藏价值。',prompt:`竖屏避坑清单，主题“${subject}”，错误用红色标记，正确做法用蓝色标记。`},
  {title:'幕后揭秘型',duration:33,structure:['成片结果','幕后转场','制作细节','反差收尾'],body:`【0–3 秒】展示精致的最终成片，随后用转场切到真实幕后。\n【3–20 秒】依次展示准备、拍摄和调整“${subject}”的关键细节。\n【20–28 秒】对比镜头外和镜头内的效果差异。\n【28–33 秒】用一个轻松反差瞬间结束并引导关注。`,reason:'幕后内容可以降低距离感，同时自然解释产品或内容如何完成。',prompt:`竖屏幕后花絮风，主题“${subject}”，手持纪实镜头与正式成片交替剪辑。`},
  {title:'用户证言型',duration:28,structure:['真实评价','使用片段','细节佐证','人群建议'],body:`【0–4 秒】用一句克制的真实评价开场，不直接给出夸张结论。\n【4–18 秒】穿插三个使用“${subject}”的生活片段，保留自然环境音。\n【18–24 秒】补充一个可验证的细节作为佐证。\n【24–28 秒】说明更适合哪类用户。`,reason:'弱化硬广表达，用生活片段和可验证细节建立信任。',prompt:`竖屏用户证言，主题“${subject}”，自然口播、生活实拍、克制字幕。`},
  {title:'一天跟拍型',duration:35,structure:['早晨出发','中途使用','高频时刻','晚间复盘'],body:`【0–5 秒】从早晨准备开始，交代今天为什么会用到“${subject}”。\n【5–20 秒】跟拍两个真实使用场景，展示操作而不是讲解。\n【20–29 秒】记录一天中使用频率最高的时刻。\n【29–35 秒】晚间复盘体验，并给出是否继续使用的结论。`,reason:'时间线让多个卖点自然出现，适合需要展示多场景价值的内容。',prompt:`竖屏日记跟拍，主题“${subject}”，晨间到夜晚自然光变化，时间戳串联。`}
 ];
 const offset=((round-1)*3)%pool.length;
 return Array.from({length:3},(_,index)=>pool[(offset+index)%pool.length]).map((script,index)=>({...script,prompt:`${script.prompt} 第 ${round} 轮重新生成。`,id:`${round}-${index}`,revision:1,generationRound:round}));
}
function vwStudioCard(script,index){const selected=VRS.selected===index;return `<article class="vw-studio-script ${selected?'selected':''}"><header><div><small>推荐脚本 ${index+1}</small><h3>${E(script.title)}</h3></div><span>${script.body.length} 字 · 预计 ${script.duration} 秒</span></header><div class="vw-structure">${script.structure.map(E).map(x=>`<span>${x}</span>`).join('<i>＋</i>')}</div><p>${E(script.body)}</p><footer><small>✧ 推荐理由：${E(script.reason)}</small><div><button data-r-action="vw-studio-edit" data-id="${index}">编辑</button><button class="solid" data-r-action="vw-studio-select" data-id="${index}">${selected?'已选用':'选用'}</button></div></footer></article>`;}
function vwDrawStudio(){
 const source=VRS.source,script=VRS.selected===null?null:VRS.scripts[VRS.selected];if(!source)return;
 vwRemakeStudio.innerHTML=`<div class="vw-studio-shell"><header><div><small>REMIX SCRIPT</small><h2>先选脚本，再决定制作方式</h2><p>已参考「${E(source.title)}」的结构与节奏，文案、场景和表达均可继续修改。</p></div><button data-r-action="vw-studio-close" aria-label="关闭">×</button></header><div class="vw-studio-toolbar"><span>共 ${VRS.scripts.length} 份原创脚本 · 第 ${VRS.round} 轮</span><button data-r-action="vw-studio-regenerate">↻ 重新生成脚本</button></div><section class="vw-studio-list">${VRS.scripts.map(vwStudioCard).join('')}</section><footer class="vw-studio-actions"><div>${script?`<b>已选：${E(script.title)}</b><span>可以直接生成，也可以选择至少 3 段视频进行混剪。</span>`:'<b>请先选用一份脚本</b><span>选用后仍可返回编辑或重新生成。</span>'}</div><button data-r-action="vw-studio-materials" ${script?'':'disabled'}>选择素材混剪</button><button class="solid" data-r-action="vw-studio-generate" ${script?'':'disabled'}>直接生成视频</button></footer></div>`;
}
function vwOpenStudio(source,segment){
 VRS.source=source;VRS.segment=segment===undefined?null:Number(segment);VRS.round=1;VRS.selected=null;VRS.materials.clear();VRS.uploads=[];VRS.scripts=vwStudioScripts(source,1);
 if(ipDrawer.open)ipDrawer.close();if(ipLarge.open)ipLarge.close();vwDrawStudio();if(!vwRemakeStudio.open)vwRemakeStudio.showModal();
}
function vwMaterialRows(){const assets=typeof caRows==='function'?caRows().filter(row=>row.mediaType==='video').slice(0,12):ipAllReferences().filter(row=>row.mediaType==='video').slice(0,12);return [...assets,...VRS.uploads];}
function vwMaterialPreview(row){if(row.poster)return `<img src="${E(row.poster)}" alt="${E(row.title)}">`;if(typeof caThumb==='function'&&!row.file)return caThumb(row);return '<span class="vw-material-placeholder">▶</span>';}
function vwCreateDemoVideo(c,run){
 run.status='running';run.message=run.demoRunningMessage||'正在根据选中的脚本生成演示视频…';vwSave();if(chat()===c)renderAssistant();
 setTimeout(()=>{if(!vwBusy(run))return;run.status='completed';run.message=run.demoCompleteMessage||'视频已经生成，可以直接预览或下载。';run.result={summary:'',segments:[],scripts:[],questions:[],project_url:'',video_url:'/demo-generated-video.mp4',task_ids:[]};if(run.whiteReplacement){const blueprint=c.videoWorkflow?.runs.find(item=>item.localId===c.videoWorkflow.whiteBlueprintRun);if(blueprint){blueprint.whiteStage=4;blueprint.message='白模蓝图已确认并完成主体替换，本次蓝图可以继续复用。';}}vwSave();if(chat()===c)renderAssistant();},1100);
}
function vwDrawMaterials(){
 const rows=vwMaterialRows(),count=VRS.materials.size;
 vwMaterialDrawer.innerHTML=`<div class="vw-material-shell"><header><div><small>MIX MATERIALS</small><h2>选择混剪素材</h2><p>从内容资产选择，或上传本地视频；至少选择 3 段。</p></div><button data-r-action="vw-material-close" aria-label="关闭">×</button></header><div class="vw-material-tabs"><button class="active">内容资产</button><label>＋ 本地上传<input id="vw-material-upload" type="file" accept="video/*" multiple hidden></label><span>已选 ${count} / 至少 3 段</span></div><section class="vw-material-grid">${rows.map(row=>`<label class="vw-material-card ${VRS.materials.has(row.id)?'selected':''}"><input type="checkbox" value="${E(row.id)}" ${VRS.materials.has(row.id)?'checked':''}><div>${vwMaterialPreview(row)}${VRS.materials.has(row.id)?'<i>✓</i>':''}</div><b>${E(row.title)}</b><small>${E(row.platform||'本地上传')} · ${IM.time(row.duration||15)}</small></label>`).join('')}</section><footer><button data-r-action="vw-material-close">取消</button><button class="solid" data-r-action="vw-material-confirm" ${count<3?'disabled':''}>使用这 ${count} 段素材混剪</button></footer></div>`;
 const input=$('#vw-material-upload');if(input)input.onchange=e=>{for(const file of e.target.files){const id='local-'+uid();VRS.uploads.push({id,title:file.name,platform:'本地上传',mediaType:'video',duration:15,file});VRS.materials.add(id);}vwDrawMaterials();};
 vwMaterialDrawer.querySelectorAll('.vw-material-card input').forEach(input=>input.onchange=()=>{input.checked?VRS.materials.add(input.value):VRS.materials.delete(input.value);vwDrawMaterials();});
}
function vwLaunchStudio(materials=[]){
 const source=VRS.source,script=VRS.scripts[VRS.selected];if(!source||!script)return;
 vwMaterialDrawer.close();vwRemakeStudio.close();awNewChat(source.ownerId||state.id);const c=chat(),reference=vwReference(source),mix=materials.length>0;
 c.title=(mix?'混剪同款 · ':'制作同款 · ')+source.title;c.videoWorkflow={reference,runs:[],mode:'generate',selectedScript:JSON.parse(JSON.stringify(script)),...(mix?{fission:{materials}}:{})};c.reference={id:source.id,title:source.title,text:mix?`参考视频 · ${materials.length} 段素材混剪`:'参考视频 · 制作同款'};
 const text=`选用「${script.title}」开始${mix?`使用 ${materials.length} 段素材混剪`:'生成视频'}。\n\n【脚本】\n${script.body}\n\n【生成提示词】\n${script.prompt}`;c.messages.push({role:'user',text,time:now(),videoReference:reference});
 const run=vwNewRun('generate',mix?'正在整理脚本与混剪素材…':'正在按选中脚本创建视频…');c.videoWorkflow.runs.push(run);vwRunMessage(c,run);WB.agentSection='chat';assistantTab='chat';AW.folder=null;location.hash='ad-agent';vwSave();render();renderAssistant();
 if(!mix)vwCreateDemoVideo(c,run);else{run.status='submitted';run.message=`已提交混剪任务：使用 ${materials.length} 段素材，完成后将归档到 AI 成片库。`;run.result={summary:'脚本和制作方式已确认，视频任务正在排队。',segments:[],scripts:[],questions:[],project_url:'',video_url:'',task_ids:[]};vwSave();renderAssistant();}
}
function vwAppendScriptRemake(c,source,segment){
 const index=segment===undefined?c.videoWorkflow.segment:Number(segment),scripts=(()=>{VRS.segment=index;return vwStudioScripts(source,1);})(),selectedSegments=index!==null&&source.segments?.[index]?[source.segments[index]]:(source.segments||[]),run=vwNewRun('remake','脚本拆解 Skill 已完成参考内容分析，并生成 3 个不同版本的原创脚本。请先选择一版，也可以编辑或重新生成。');
 Object.assign(run,{status:'completed',skillName:'脚本拆解 Skill',localScripts:true,generationRound:1,result:{summary:`已参考「${source.title}」的内容结构、节奏和表达方式。以下脚本均已替换为原创表达，可继续修改。`,segments:selectedSegments,scripts,questions:[],project_url:'',video_url:'',task_ids:[]}});
 Object.assign(c.videoWorkflow,{runs:[...c.videoWorkflow.runs,run],mode:'remake',localScriptFlow:true,whiteModelFlow:false,round:1,segment:index,selection:null,selectedScript:null});
 c.messages.push({role:'user',text:'选择“视频二创”，请基于原视频生成 3 个不同版本的原创脚本并制作新视频。',time:now()});vwRunMessage(c,run);state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-response:last-child')?.scrollIntoView({block:'start',behavior:'smooth'}),0);
}
function vwStartChatEntry(source,segment){
 const index=segment===undefined?null:Number(segment),reference=vwReference(source);
 if(typeof WB!=='undefined')WB.agentReturnHash=location.hash&&location.hash!=='#ad-agent'?location.hash:'#insights';
 awNewChat(source.ownerId||state.id);const c=chat();c.title='制作同款 · '+source.title;c.videoWorkflow={reference,runs:[],mode:'remake-choice',segment:index,entryChoice:true,selection:null,selectedScript:null};c.reference={id:source.id,title:source.title,text:'参考内容 · 制作同款'};
 c.messages.push({role:'user',text:'制作同款',time:now(),videoReference:reference},{role:'assistant',text:'',time:now(),videoRemakeEntry:true});state.messages=c.messages;
 WB.agentSection='chat';assistantTab='chat';AW.folder=null;location.hash='ad-agent';vwSave();render();renderAssistant();setTimeout(()=>$('#assistant-body .vw-remake-entry')?.scrollIntoView({block:'center'}),0);
}
function vwDefaultWhiteReport(){return {
 topology:'识别到 1 个主运动主体、3 个可见结构组件和稳定的中心连接关系；主体比例与关键帧外轮廓已锁定。',
 occlusion:'主体始终位于前景，右侧组件在 04–07 秒短暂遮挡主结构；前后层级和接触边界已记录，无穿插。',
 camera:'镜头从中景缓慢前推至近景，随后轻微向右环绕约 12°；焦点持续跟随主体中心，速度变化平滑。',
 timing:'00–03 秒主体静止建立画面，03–08 秒完成位移与顺时针旋转，08–12 秒减速停稳；动作关键帧已对齐。',
 style:'中性灰白 Clay 白模，硬边结构配柔和环境光；轮廓边界、接触阴影和碰撞占位清晰可辨。'
};}
function vwScheduleWhiteReport(c,run){
 if(!run?.whiteModel||!vwBusy(run)||VW.whiteTimers.has(run.localId))return;VW.whiteTimers.add(run.localId);
 const update=(delay,fn)=>setTimeout(()=>{if(!vwBusy(run))return;fn();vwSave();if(chat()===c)renderAssistant();},delay);
 update(650,()=>{run.whiteStage=2;run.message='原视频解析完成，正在生成 3D 白模蓝图视频…';});
 update(1550,()=>{run.status='completed';run.whiteStage=3;run.message='白模视频已经生成，5 维核对报告等待确认。';run.whiteReport=vwDefaultWhiteReport();VW.whiteTimers.delete(run.localId);});
}
function vwStartWhiteModel(c,source){
 const flow=c.videoWorkflow,run=vwNewRun('white-model','正在解析原视频的结构、遮挡、相机轨迹和动作时序…');Object.assign(flow,{whiteModelFlow:true,localScriptFlow:false,mode:'white-model',whiteReferences:[]});Object.assign(run,{status:'running',skillName:'白模蓝图 Agent',whiteModel:true,whiteStage:1});flow.runs.push(run);flow.whiteBlueprintRun=run.localId;c.messages.push({role:'user',text:'选择“视频复刻”，请保留原脚本并先生成可复用的 3D 白模运动蓝图。',time:now()});vwRunMessage(c,run);state.messages=c.messages;vwSave();renderAssistant();vwScheduleWhiteReport(c,run);
}
function vwGenerateWhiteSubject(c,text){
 const flow=c.videoWorkflow,blueprint=flow.runs.find(run=>run.localId===flow.whiteBlueprintRun);c.messages.push({role:'user',text,time:now()});c.draft='';flow.mode='white-generate';if(blueprint)blueprint.whiteStage=3;
 const run=vwNewRun('generate-white-subject','正在读取已确认的白模蓝图…');Object.assign(run,{skillName:'白模换主体 Agent',whiteReplacement:true,requestText:text,references:JSON.parse(JSON.stringify(flow.whiteReferences||[])),demoRunningMessage:'正在严格继承白模的镜头、结构、遮挡和动作规则，结合引用内容渲染新主体…',demoCompleteMessage:'新主体视频已经生成。白模运动蓝图已保留，可以继续复用。'});flow.runs.push(run);vwRunMessage(c,run);state.messages=c.messages;vwSave();renderAssistant();vwCreateDemoVideo(c,run);
}
function vwPrepareChatMaterials(){
 const flow=chat().videoWorkflow,source=inspirationFind(flow?.reference?.id);if(!flow?.selectedScript||!source)return;
 VRS.source=source;VRS.segment=flow.segment;VRS.scripts=[flow.selectedScript];VRS.selected=0;VRS.materials.clear();VRS.uploads=[];vwDrawMaterials();if(!vwMaterialDrawer.open)vwMaterialDrawer.showModal();
}
function vwLaunchChatChoice(materials=[]){
 const c=chat(),flow=c.videoWorkflow,script=flow?.selectedScript,source=inspirationFind(flow?.reference?.id);if(!flow?.localScriptFlow||!script||!source)return;
 const mix=materials.length>0,choiceMessage=c.messages.findLast?.(message=>message.videoChoice)||[...c.messages].reverse().find(message=>message.videoChoice);if(choiceMessage)choiceMessage.choice=mix?'mix':'direct';
 const text=mix?`使用 ${materials.length} 段素材混剪`:'直接生成视频';c.messages.push({role:'user',text,time:now()});flow.mode='generate';if(mix)flow.fission={materials};
 const run=vwNewRun('generate',mix?'正在整理选中脚本与混剪素材…':'正在按选中脚本生成视频…');flow.runs.push(run);vwRunMessage(c,run);state.messages=c.messages;vwSave();vwMaterialDrawer.close();renderAssistant();
 const request=`选用「${script.title}」V${script.revision||1} 开始${text}。\n\n【脚本】\n${script.body}\n\n【生成提示词】\n${script.prompt||script.body}`;
 if(!mix)vwCreateDemoVideo(c,run);else{run.status='submitted';run.message=`已提交混剪任务：使用 ${materials.length} 段素材，完成后将归档到 AI 成片库。`;run.result={summary:'脚本与制作方式已经确认，视频任务正在排队。',segments:[],scripts:[],questions:[],project_url:'',video_url:'',task_ids:[]};vwSave();renderAssistant();}
}

async function vwSaveGeneratedVideo(c,run){
 if(!run?.result?.video_url)return;
 if(run.assetId){run.publishDecision='saved';vwSave();toast('已保存到资产库');location.hash='assets';return;}
 try{
  const response=await fetch(run.result.video_url);if(!response.ok)throw Error('成片读取失败');
  const blob=await response.blob(),mediaId=`ai-video-file-${run.localId}`,assetId=`ai-video-${run.localId}`,script=c.videoWorkflow?.selectedScript;
  await inspirationMedia(mediaId,new File([blob],`AI成片-${run.localId}.mp4`,{type:blob.type||'video/mp4'}));
  workspace.generatedMedia??=[];
  workspace.generatedMedia.unshift({id:assetId,origin:'ai-generated',status:'completed',mediaType:'video',mediaId,title:`${script?.title||'视频二创'} · AI 成片`,summary:'由视频二创流程生成并保存的演示成片。',platform:'AI 生成',category:'AI 成片',duration:script?.duration||28,ratio:'竖屏 9:16',created:Date.now(),ownerId:c.ownerId||state.id,demo:true,art:'app'});
  run.assetId=assetId;run.publishDecision='saved';vwSave();renderAssistant();toast('已保存到资产库');setTimeout(()=>{location.hash='assets';},350);
 }catch(error){toast(error.message||'保存到资产库失败，请重试');}
}
function vwOpenAgentPage(){
 if(!document.documentElement.classList.contains('insights-only'))return false;
 const target=new URL('ad-agent.html',location.href);target.search=location.search;target.searchParams.delete('from');target.hash='ad-agent';location.assign(target.href);return true;
}
function vwStartDirectCreation(source,choice){
 if(typeof WB!=='undefined')WB.agentReturnHash=location.hash&&location.hash!=='#ad-agent'?location.hash:'#insights';
 awNewChat(source.ownerId||state.id);const c=chat(),reference=vwReference(source);c.title=(choice==='white'?'复刻同款 · ':'视频二创 · ')+source.title;c.videoWorkflow={reference,runs:[],mode:choice==='white'?'white-model':'remake',segment:null,entryChoice:false,selection:null,selectedScript:null};c.reference={id:source.id,title:source.title,text:choice==='white'?'参考视频 · 复刻同款':'参考视频 · 视频二创'};WB.agentSection='chat';assistantTab='chat';AW.folder=null;vwSave();choice==='white'?vwStartWhiteModel(c,source):vwAppendScriptRemake(c,source,null);vwSave();if(vwOpenAgentPage())return;location.hash='ad-agent';render();renderAssistant();
}
R.invoke('ip-remake',b=>{const source=inspirationFind(b.dataset.id);if(!source)return;if(source.mediaType==='image')return vwImageRemake(b);if(ipDrawer.open)ipDrawer.close();if(ipLarge.open)ipLarge.close();vwStartChatEntry(source,b.dataset.segment);});
R.invoke('ip-remake-white',b=>{const source=inspirationFind(b.dataset.id);if(!source)return;if(ipDrawer.open)ipDrawer.close();vwStartDirectCreation(source,'white');});
R.invoke('ip-remake-script',b=>{const source=inspirationFind(b.dataset.id);if(!source)return;if(ipDrawer.open)ipDrawer.close();vwStartDirectCreation(source,'script');});
R.invoke('vw-remake-script',()=>{const c=chat(),flow=c.videoWorkflow,source=inspirationFind(flow?.reference?.id);if(!flow?.entryChoice||!source)return;const message=[...c.messages].reverse().find(item=>item.videoRemakeEntry);if(message)message.choice='script';flow.entryChoice=false;vwAppendScriptRemake(c,source,flow.segment);});
R.invoke('vw-remake-white',()=>{const c=chat(),flow=c.videoWorkflow,source=inspirationFind(flow?.reference?.id);if(!flow?.entryChoice||!source)return;const message=[...c.messages].reverse().find(item=>item.videoRemakeEntry);if(message)message.choice='white';flow.entryChoice=false;vwStartWhiteModel(c,source);});
R.invoke('vw-white-edit',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id),report=run?.whiteReport;if(!report||run.whiteConfirmed)return;modal('编辑白模核对报告','可以修正白模识别结果。保存后将使用更新后的蓝图信息继续制作。',[{key:'topology',label:'结构拓扑',multi:true,required:true,value:report.topology,max:2000},{key:'occlusion',label:'遮挡层级',multi:true,required:true,value:report.occlusion,max:2000},{key:'camera',label:'相机运镜',multi:true,required:true,value:report.camera,max:2000},{key:'timing',label:'动作时序',multi:true,required:true,value:report.timing,max:2000},{key:'style',label:'白模样式',multi:true,required:true,value:report.style,max:2000}],value=>{Object.assign(report,value);run.message='白模核对报告已更新，请确认后继续。';vwSave();renderAssistant();});});
R.invoke('vw-white-confirm',b=>{const c=chat(),flow=c.videoWorkflow,run=flow?.runs.find(item=>item.localId===b.dataset.id);if(!run?.whiteReport||run.whiteConfirmed)return;run.whiteConfirmed=true;run.whiteStage=3;run.message='白模蓝图已经确认。请补充新主体描述，也可以引用视频、图片或 CTA 组件。';flow.whiteConfirmed=true;flow.mode='white-prompt';flow.whiteReferences=[];flow.whitePromptBase=vwWhitePrompt;c.draft=vwWhitePrompt;vwSave();renderAssistant();$('#prompt').focus();const marker='【在这里填写你想要的新主体';const start=c.draft.indexOf(marker);if(start>=0)$('#prompt').setSelectionRange(start,start+marker.length);vwAlignWhitePrompt();});
R.invoke('vw-white-library-open',()=>{const c=chat(),flow=c.videoWorkflow;if(flow?.mode!=='white-prompt'||!flow.whiteConfirmed)return;flow.whitePromptBase=vwWhitePromptBase($('#prompt').value||c.draft||vwWhitePrompt);VWL.tab='video';VWL.draft=new Map((flow.whiteReferences||[]).map(item=>[`${item.type}:${item.id}`,JSON.parse(JSON.stringify(item))]));vwDrawWhiteLibrary();if(!vwWhiteLibrary.open)vwWhiteLibrary.showModal();});
R.invoke('vw-white-library-tab',b=>{if(!vwWhiteLibrary.open)return;VWL.tab=b.dataset.id;vwDrawWhiteLibrary();});
R.invoke('vw-white-reference-toggle',b=>{const item=vwWhiteLibraryItem(b.dataset.type,b.dataset.id);if(!item)return;const key=`${item.type}:${item.id}`;VWL.draft.has(key)?VWL.draft.delete(key):VWL.draft.set(key,item);vwDrawWhiteLibrary();});
R.invoke('vw-white-library-close',()=>vwWhiteLibrary.close());
R.invoke('vw-white-library-apply',()=>{const c=chat(),flow=c.videoWorkflow;if(!flow?.whiteConfirmed)return vwWhiteLibrary.close();flow.whiteReferences=[...VWL.draft.values()];const base=flow.whitePromptBase||vwWhitePromptBase($('#prompt').value||c.draft||vwWhitePrompt);c.draft=base+vwWhiteReferenceBlock(flow);vwSave();vwWhiteLibrary.close();renderAssistant();$('#prompt').focus();$('#prompt').setSelectionRange(c.draft.length,c.draft.length);vwAlignWhitePrompt();});
R.invoke('vw-studio-close',()=>vwRemakeStudio.close());
R.invoke('vw-studio-regenerate',()=>{VRS.round++;VRS.selected=null;VRS.scripts=vwStudioScripts(VRS.source,VRS.round);vwDrawStudio();toast('已重新生成 3 份脚本');});
R.invoke('vw-studio-edit',b=>{const index=Number(b.dataset.id),script=VRS.scripts[index];if(!script)return;modal('编辑同款脚本','可以直接修改脚本文案和生成提示词，保存后继续选用。',[{key:'title',label:'脚本名称',required:true,value:script.title},{key:'body',label:'脚本文案',multi:true,required:true,value:script.body,max:20000},{key:'prompt',label:'生成提示词',multi:true,required:true,value:script.prompt,max:20000}],value=>{Object.assign(script,value,{revision:(script.revision||1)+1});vwDrawStudio();});});
R.invoke('vw-studio-select',b=>{VRS.selected=Number(b.dataset.id);vwDrawStudio();vwRemakeStudio.querySelector('.vw-studio-actions')?.scrollIntoView({block:'nearest',behavior:'smooth'});});
R.invoke('vw-studio-generate',()=>vwLaunchStudio());
R.invoke('vw-studio-materials',()=>{if(VRS.selected===null)return;vwDrawMaterials();vwMaterialDrawer.showModal();});
R.invoke('vw-chat-regenerate',b=>{const c=chat(),flow=c.videoWorkflow,source=inspirationFind(flow?.reference?.id);if(!flow?.localScriptFlow||!source)return;flow.runs.filter(item=>item.localScripts&&!item.generationRound).forEach(item=>item.generationRound=flow.round||1);flow.round=(flow.round||1)+1;VRS.segment=flow.segment;const scripts=vwStudioScripts(source,flow.round),run=vwNewRun('remake',`已重新生成第 ${flow.round} 轮的 3 个不同版本。上一轮仍保留在对话中。`);Object.assign(run,{status:'completed',skillName:'脚本拆解 Skill',localScripts:true,generationRound:flow.round,result:{summary:'这一次更换了开场角度和叙事路径，你可以直接编辑或选用其中一版。',segments:[],scripts,questions:[],project_url:'',video_url:'',task_ids:[]}});flow.runs.push(run);flow.selection=null;flow.selectedScript=null;flow.mode='remake';delete flow.editing;delete flow.editingKey;c.messages=c.messages.filter(message=>!message.videoChoice);c.messages.push({role:'user',text:'请重新生成 3 个不同版本的脚本。',time:now()});vwRunMessage(c,run);state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-response:last-child')?.scrollIntoView({behavior:'smooth',block:'start'}),0);});
R.invoke('vw-choice-mix',()=>vwPrepareChatMaterials());
R.invoke('vw-choice-direct',()=>vwLaunchChatChoice());
R.invoke('vw-material-close',()=>vwMaterialDrawer.close());
R.invoke('vw-material-confirm',()=>{if(VRS.materials.size<3)return toast('混剪至少需要 3 段视频素材');const rows=vwMaterialRows(),materials=[...VRS.materials].map(id=>{const row=rows.find(item=>item.id===id);return {id,title:row?.title||id,platform:row?.platform||'本地上传'};});chat().videoWorkflow?.localScriptFlow?vwLaunchChatChoice(materials):vwLaunchStudio(materials);});
R.invoke('vw-save-video',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id);vwSaveGeneratedVideo(c,run);});
R.invoke('vw-publish-later',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id);if(!run?.result?.video_url)return;run.publishDecision='later';vwSave();renderAssistant();});
R.invoke('vw-publish-video',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id);if(!run?.result?.video_url)return;run.publishDecision='publish';vwSave();if(typeof window.apfOpenGeneratedPublish==='function')window.apfOpenGeneratedPublish({id:`generated-${run.localId}`,title:'刚刚生成的视频',kind:'视频',tone:'blue',url:run.result.video_url});else toast('智能投放流程正在加载，请稍后再试');});
vwRemakeStudio.addEventListener('click',event=>{if(event.target===vwRemakeStudio)vwRemakeStudio.close();});vwMaterialDrawer.addEventListener('click',event=>{if(event.target===vwMaterialDrawer)vwMaterialDrawer.close();});vwWhiteLibrary.addEventListener('click',event=>{if(event.target===vwWhiteLibrary)vwWhiteLibrary.close();});
renderAssistant();
