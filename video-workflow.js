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
 return `<div class="vw-shot-list">${segments.map((s,i)=>{const seek=mode==='task'?`data-it="seek" data-time="${Number(s.start)||0}"`:`data-r-action="ip-seek" data-id="${Number(s.start)||0}"`;const visual=reference.poster?`<img src="${E(reference.poster)}" alt="分镜 ${i+1} 缩略图">`:reference.art?`<span class="vw-shot-thumb-art">${inspirationArt(reference)}</span>`:`<span class="vw-shot-placeholder">${String(i+1).padStart(2,'0')}</span>`;return `<article class="vw-shot"><header><i></i><b>分镜${i+1}：${E(s.original)}</b></header><div class="vw-shot-card"><div class="vw-shot-thumb">${visual}<button ${seek} aria-label="播放分镜 ${i+1}">▶</button><time>◷ ${IM.time(s.start)}–${IM.time(s.end)}</time></div><div class="vw-shot-content"><small>分镜提示词</small><p class="vw-shot-prompt">${E(s.prompt||s.original)}</p><dl><div><dt>主角形象</dt><dd>${E(s.character||'待识别')}</dd></div><div><dt>画面风格</dt><dd>${E(s.visual_style||s.visual_language||'待识别')}</dd></div><div><dt>关键画面元素</dt><dd>${E(s.visual_elements||s.attraction||'待识别')}</dd></div></dl></div></div></article>`;}).join('')}</div>`;
}
function vwDrawAnalysis(c){
 if(c.mediaType==='image')return;
 const ref=vwReference(c),entry=workspace.videoAnalyses[vwAnalysisKey(ref)];if(!entry)return;
 const host=$('#ip-segments');if(!host)return;
 const run=entry.run;
 if(run.localAnalysis&&run.result&&!run.result.segments?.[0]?.character){run.result=vwLocalAnalysisResult(c);vwSave();}
 const heading=ipDrawer.querySelector('[data-ip-detail-panel="storyboard"] .ip-breakdown-heading h3');if(heading)heading.innerHTML=`脚本拆解 <small>${run.result?.segments?.length||0} 个时间段</small>`;
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
 const profile={
  commute:['年轻上班族，浅色通勤装，手持包或手机','自然光生活实拍，低饱和暖灰色调','地铁或街道、通勤包、手机、人物疲惫到放松的表情'],
  game:['卡通游戏角色或成年玩家，动作和情绪清晰','高饱和游戏录屏，快节奏切镜与界面反馈','角色、关卡障碍、操作按钮、得分与失败反馈'],
  app:['成年职场用户，手持手机，着装简洁','明亮界面演示，蓝白配色，操作特写清晰','手机屏幕、任务列表、手指点击、整理前后对比'],
  bottle:['生活方式人物的手部出镜，动作舒缓自然','柔和自然光静物实拍，浅色治愈画面','桌面、产品瓶身、材质反光、植物与使用细节'],
  dashboard:['成年职场用户，以手部操作和界面为主','简洁屏幕录制，低饱和蓝灰配色','电脑屏幕、看板卡片、鼠标拖动、状态列变化'],
  earbuds:['年轻通勤者，侧脸和佩戴动作清楚','城市生活实拍，冷暖对比，产品近景干净','耳机、街道或车厢、环境人流、佩戴前后表情']
 }[c.art]||['成年内容主角，形象真实，表情和动作清楚','自然场景实拍，画面干净，重点信息由近景呈现','人物、核心物件、环境线索和辅助字幕'];
 const details=[
  ['开场钩子',profile[0],profile[1],`先出现${profile[2]}，用近景或结果画面迅速建立冲突`],
  ['场景铺陈',profile[0],profile[1],`${profile[2]}，以中近景和操作特写交代人物处境`],
  ['价值证明',profile[0],profile[1],`${profile[2]}，关键动作放慢并保留前后变化`],
  ['转化收束',profile[0],profile[1],`${profile[2]}，结果画面稳定停留并以简洁字幕收尾`]
 ];
 return base.map((segment,index)=>{const d=details[Math.min(index,details.length-1)];return {...segment,title:d[0],character:d[1],visual_style:d[2],visual_elements:d[3],attraction:d[3],selling_point:segment.mechanism,visual_language:d[2],prompt:`${IM.time(segment.start)}–${IM.time(segment.end)}：${segment.original}；主角为${d[1]}；采用${d[2]}；画面包含${d[3]}。`};});
}
function vwLocalAnalysisResult(c){
 const category=c.category||'视频素材',platform=c.platform||'信息流平台',segments=vwLocalAnalysisSegments(c);
 return {
  summary:typeof ipProfile==='function'?ipProfile(c).body:`这条${category}采用“开场问题或结果前置—场景与步骤展开—价值证明—行动引导”的完整结构。前段快速建立观看理由，中段通过连续画面把抽象卖点转化为可见过程，结尾回扣结果并承接转化。适合在${platform}用于短视频信息流测试。`,
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

function vwScriptHTML(script,index,run){
 const revision=script.revision||1,structure=(script.structure||[]).join(' → ');
 return `<section class="vw-script"><div class="vw-script-heading"><h3><span>${index+1}.</span> ${E(script.title)}</h3><small>${[...script.body].length} 字 · 预计 ${E(script.duration)} 秒 · V${revision}</small></div>${structure?`<p class="vw-structure-line"><b>结构：</b>${E(structure)}</p>`:''}${script.story?`<p class="vw-story">${E(script.story)}</p>`:''}<div class="vw-script-body">${E(script.body)}</div><details class="vw-prompt"><summary>查看生成提示词</summary><p>${E(script.prompt||script.body)}</p></details><blockquote><b>推荐理由</b><span>${E(script.reason)}</span></blockquote></section>`;
}

const vwBriefPresets=[
 {direction:'游戏社交 · 优先推荐',title:'这步，能教我一下吗？',subtitle:'把游戏失误变成搭子一起玩的笑点',duration:28},
 {direction:'语音社交',title:'你亲口任命的下班监督员',subtitle:'通过兑现小约定表现陪伴',duration:28},
 {direction:'AI伴侣',title:'伞还了，人还没走',subtitle:'借还伞继续角色对话',duration:25}
];
const vwRegeneratedBriefPresets=[
 {direction:'废土生存 · 冲突喜剧',title:'别开！那不是补给箱',subtitle:'误触警报后，搭子把翻车变成共同逃跑',duration:29},
 {direction:'游戏默契 · 反差接梗',title:'撤退路线怎么成了漂移赛',subtitle:'用临时失控测试搭子的行动回应',duration:27},
 {direction:'轻悬疑 · 陪伴感',title:'最后一格电，留给谁',subtitle:'在资源不足时表现愿意留下的选择',duration:26}
];
function vwBriefMeta(script,index,run){
 if(script.briefMeta)return {...script.briefMeta};
 if((run?.generationRound||1)===1&&vwBriefPresets[index])return {...vwBriefPresets[index]};
 if((run?.generationRound||1)===2&&vwRegeneratedBriefPresets[index])return {...vwRegeneratedBriefPresets[index]};
 return {direction:`创意方向 ${index+1}`,title:script.title,subtitle:script.reason||'点击查看完整故事提案与分段脚本',duration:script.duration};
}
function vwBriefTimeline(rows){return `<div class="vw-brief-timeline"><div class="head"><b>片内时间／阶段（建议）</b><b>画面与动作</b><b>台词与声音（原创建议）</b></div>${rows.map(row=>`<div><b>${E(row[0])}</b><p>${E(row[1])}</p><p>${E(row[2])}</p></div>`).join('')}</div>`;}
function vwWastelandBriefHTML(script){
 const meta=vwBriefMeta(script,0,{generationRound:2}),rows=[
  ['0—3秒','废弃公路坡顶，小林手已掀开锈铁箱；搭子伸手制止未及，箱内红色警报亮起，废车后怪物齐转头。路边预埋两只空铁桶。','搭子急喊：“别开！那不是补给箱——”被警报打断；怪群转头瞬间音乐抽掉半拍。'],
  ['3—6秒','短回叙字幕“组队前”；手机打开TT语音，剧情聊天示意：小林“我有点菜，能一起玩吗？”搭子“来，一起玩”。末帧标“回到这一局”。','只用消息提示音，文字不重复配音；压低警报底声衔接回当前。'],
  ['6—11秒','怪群尘浪逼近，小林蹲在铁桶后，手里还捏着刚捡的破零件，看看零件又看看怪群。','小林：“我是来捡垃圾的，不是来送外卖的！”语速紧张但清楚。'],
  ['11—15秒','搭子看一眼警报箱，再看小林；小林缩起肩，指向对方身后的逃跑路线。','搭子：“你这哪是菜，你是开饭铃。”小林：“要不你先走？”'],
  ['15—20秒','搭子把第二只空桶踢到小林身边，指向下坡；自己先钻进第一只桶，小林愣半拍后照做。','搭子：“上车！这单拒绝配送。”留半拍展示“车”竟是桶的反差。'],
  ['20—25秒','两人蹬地启动，空桶沿坡滚动；搭子的桶撞小石头歪一下，继续跟上，怪群留在远景，不交代脱险结果。','小林：“别人带飞，你带滚啊！”金属咣当一声，两人短促笑声。'],
  ['25—29秒','两只铁桶歪歪扭扭滚离，切TT品牌落版：“翻车有人接梗”。','旁白：“上TT语音，找游戏搭子。”保留一下远处滚桶声作为尾音。']
 ];
 return `<article class="vw-brief-document"><header><h1>${E(meta.title)}</h1><small>故事提案 · v2 · draft</small><p>${E(meta.subtitle)}</p></header><h2>本版机会与改编依据</h2><p>废土搜刮误触警报引来怪群，TT新搭子把责怪预期变成接梗和共同逃跑；测试高冲突悬念开场与共同出糗的包容回报。</p><p>这是方向一的创意修订，关联机会 <code>20261030-140343-de6948aa-o001</code>。沿用原片整体正向表现及固定内容卡；本版未重新检索、取证或排名。旧90分仅为原方向入选记录，不代表对新版的评分。</p><p><strong>继承：</strong>保留“玩家担心自己菜—TT搭子包容回应”，改用共同滚桶的行动兑现。原片的熟人推荐及顺序不再照搬。</p><p><strong>外部贡献：</strong>沿用已读正文 <a href="https://www.digitaling.com/projects/379511.html" target="_blank" rel="noopener">Columbia《计划不如现挂》↗</a> 中将意外变成共同体验的启发；废土危机、滚桶、全部对白为新创作，未新增热点依据。</p><h2>故事线</h2><p>黄沙掠过废弃公路，成年拾荒玩家小林正掀开一只像物资箱的锈铁箱。耳机里，新搭子突然喊：“别开！那不是补给箱——”话没说完，箱盖弹开，里面的警报器尖叫，远处废车后的怪物剪影齐刷刷转头。画面切黑半拍，留下问题：这下怎么办？</p><p>用约3秒短回叙交代两人关系：字幕“组队前”，小林打开TT语音找搭子，主动发“我有点菜，能一起玩吗？”，对方回“来，一起玩”。字幕“回到这一局”，怪群扬起尘浪，小林缩在路边空铁桶后：“我是来捡垃圾的，不是来送外卖的！”搭子接话：“你这哪是菜，你是开饭铃。”小林担心拖累：“要不你先走？”搭子却把另一只空桶踢到他旁边：“上车！这单拒绝配送。”</p><p>小林愣住，搭子已经钻进自己的铁桶，示意他跟上。两个人蹬地起步，沿早已可见的下坡路滚出去，桶里传来小林的声音：“别人带飞，你带滚啊！”搭子的桶磕到小石头，咣当一歪，又跟了上来，两人笑出声。镜头停在两只歪歪扭扭滚远的桶上，保留追逐的不确定性。片尾“翻车有人接梗。上TT语音，找游戏搭子”。回报是出错后搭子没走、还一起想招和出糗，未展示保证脱险。</p><p><strong>改编要点：</strong>建议29秒，废土生存游戏质感配反差喜剧；黄沙低饱和背景、锈红警报灯、金属碰撞声。前3秒用制止声、开箱动作和怪群转头形成因果悬念；三个笑点围绕同一件事递进：送外卖的自嘲→开饭铃的接梗→拒绝配送的共同动作。搭子先调侃、后留下行动，笑的是游戏失误，不是人格或技术羞辱。</p><h2>分段脚本</h2>${vwBriefTimeline(rows)}<h2>剧情自检</h2><ul><li>警告没说完就触发警报，怪群出现解释危险；悬念是如何应对，滚桶动作在后半段给出可见回答。</li><li>TT入口用明确回叙补足，人物是经TT找到的新搭子；“有点菜”的前置顾虑与出错后怕被丢下相呼应。</li><li>搭子没有止于一句没关系：把另一只桶交给玩家，自己先钻，最后也出糗；共同承担才构成包容回报。</li><li>外卖、开饭铃和配送取消围绕“误把自己变成怪物目标”递进，最终带滚落实在画面上。</li></ul><p class="vw-brief-reference">参考素材 2054131947692691457：<a href="https://weflycdn.52tt.com/ad/mp4/1778578061999321782.mp4" target="_blank" rel="noopener">查看参考视频 ↗</a></p><h2>内容生成交接</h2><p>后续内容生成 Agent 只接收本版本 Brief JSON。故事、分段脚本、产品事实、继承与改编、参考、制作约束和待确认项均在 Brief 内；无需另附机会点、候选池或原始分析文件。</p><p>当前状态：draft。草稿可用于评审与后续 Prompt 草拟，不能据此视为已获成片生成或投放批准。</p><h2>人群与使用时刻</h2><ul><li>喜欢废土、生存和搜刮游戏，也担心失误被队友责怪的成年玩家；通过游戏语境笑点展示愿意一起玩的搭子关系。</li></ul><h2>继承依据</h2><ul><li>开头吸引：原片没人陪玩的处境，改为组队后出错、担心被抛下的具体冲突；开场事件为原创。</li><li>推进与回报：原片玩家表达自己菜、TT搭子包容回应；新片玩家提出让对方先走，搭子留下并一起钻桶逃跑。</li><li>产品与转化：TT承接找游戏搭子需求；新片明确人物是从TT找到的新搭子，开头后快速补足使用入口，再返回同一局。</li></ul><h2>改编决定</h2><p>按修改要求改成锈铁、黄沙、断桥和废弃公路的原创废土游戏；以“别开！那不是补给箱——”未说完便触发警报制造冲突，怪群出现兑现悬念。把单人误触改成两人钻进铁桶一起滚下坡；“开饭铃／外卖拒绝配送／带滚”均为本稿原创游戏笑点。</p><h2>避免沿用</h2><ul><li>不承诺秒配、必然被喜欢、保证获胜或情感结果。</li><li>不把原片写成已有废土、警报箱、怪群或滚桶剧情；这些全属本版原创。</li><li>不将原创笑点描述成当下热梗；不使用未经核验的游戏IP、怪物设计和配乐。</li></ul><h2>产品已知事实</h2><p>TT语音的业务方向包括游戏组队和语音社交；Soulmate AI伴侣存在为既有业务确认。具体当前界面与额外能力不由此推出。</p><h2>制作约束与待办</h2><pre><code>{
  "format": "video",
  "handoff_notes": [
    "建议竖版9:16；正式尺寸、版位、Logo及产品截图在进入制作时核准。",
    "人物成年、对白原创；画面与声音采用自有或获准资产。",
    "黄沙、锈铁、油污、破路牌和废弃高架建立废土风格。",
    "警报箱、坡道和两只空桶需要提前在画面中建立，避免道具凭空出现。",
    "怪物用远处剪影和尘浪表达，无血腥；不展示清怪、获胜或保证脱险。",
    "TT入口标注组队前／回到这一局；聊天气泡为剧情示意。"
  ]
}</code></pre><h2>外部参考与覆盖</h2><p><a href="https://www.digitaling.com/projects/379511.html" target="_blank" rel="noopener">Columbia×蒋奇明：计划不如现挂 ↗</a>：迁移从计划失误到共同乐趣的行动逻辑，不复用明星人设；已读项目正文，未观看外部视频。</p></article>`;
}

function vwRegeneratedBriefDetailHTML(script,index,run){
 const meta=vwBriefMeta(script,index,run),ideas=[
  {opportunity:'用“误触警报”把怕拖累队友的顾虑变成即时危机，让搭子的包容通过共同应对而不是口头安慰呈现。',story:'废土搜刮时，玩家错把警报箱当补给箱，怪群被声音吸引。玩家以为新搭子会责怪自己，搭子却先接住他的自嘲，再把一只空铁桶踢过来，提出一起顺坡撤退。两个人的桶都滚得东倒西歪，关系回报落在共同出糗。',rows:[['0—4秒','误开锈铁警报箱，远处怪群同时转头。','“别开！那不是补给箱——”'],['4—9秒','短回叙交代两人通过TT组队。','“我有点菜，能一起玩吗？”'],['9—20秒','玩家担心拖累，搭子观察坡道和空桶。','“要不你先走？”“一起想办法。”'],['20—29秒','两人钻桶滚下坡，保留追逐悬念。','“别人带飞，你带滚啊！”']]},
  {opportunity:'把一次失控撤退变成两个人临时发明的“漂移赛”，用接梗和动作配合证明默契。',story:'玩家驾驶破旧载具撤退时误触侧滑，刚要道歉，搭子却把漂移当成新路线，主动报弯并配合压车。两人没有获得胜利保证，但把紧张撤退变成共同完成的一次荒诞挑战。',rows:[['0—3秒','载具突然横滑，镜头逼近断桥边缘。','“刹车怎么成方向键了？”'],['3—8秒','TT组队信息快速闪回。','“不会也没事，一起试。”'],['8—20秒','搭子报弯，玩家控制侧滑方向。','“左一点——好，这叫战术漂移。”'],['20—27秒','两人歪着冲过路牌，笑声收尾。','“撤退路线，临时改成漂移赛。”']]},
  {opportunity:'用“只剩最后一格电”的资源选择制造轻悬疑，在选择中表现搭子愿意留下。',story:'夜间地图里，两人的通讯设备只剩最后一格电。玩家准备把电量让给搭子独自撤离，搭子却用最后的电打开近距离语音，选择陪他走完看不清的路。结尾停在仍未走出的隧道，不承诺脱险。',rows:[['0—4秒','屏幕弹出“电量 1%”，隧道灯熄灭。','“最后一格电，给谁？”'],['4—9秒','回闪两人通过TT找到彼此。','“听得到就别走散。”'],['9—20秒','玩家递出电池，搭子没有接。','“留着照路，我来陪你说话。”'],['20—26秒','两束微光并排前进，远处仍是黑暗。','“还没出去，但至少没走散。”']]}
 ][index]||{};
 return `<article class="vw-brief-document"><header><h1>${E(meta.title)}</h1><small>故事提案 · v1 · draft</small><p>${E(meta.subtitle)}</p></header><h2>机会与改编依据</h2><p>${E(ideas.opportunity||script.reason)}</p><p>本方向继承参考片“玩家先表达顾虑—TT搭子用行动回应”的关系机制，人物、危机、对白与视觉场景均重新创作。</p><h2>故事线</h2><p>${E(ideas.story||script.body)}</p><p><strong>改编要点：</strong>建议 ${E(meta.duration)} 秒、9:16；开头先给可见冲突，中段快速补足TT组队来源，后半段用共同动作兑现关系回报。</p><h2>分段脚本</h2>${vwBriefTimeline(ideas.rows||[])}<h2>剧情自检</h2><ul><li>冲突有清晰触发原因，人物选择与结尾动作前后呼应。</li><li>TT入口只承担找搭子的产品路径，不承诺匹配速度、获胜或情感结果。</li><li>笑点针对共同处境，不羞辱玩家的人格或技术水平。</li></ul><h2>内容生成交接</h2><p>当前状态：draft。选择本方向后，可继续用自然语言修改开头、场景、搭子回应、台词风格或结尾；修改结果将生成新版 Brief。</p><h2>制作约束与待办</h2><pre><code>{
  "format": "video",
  "duration": ${E(meta.duration)},
  "ratio": "9:16",
  "status": "draft",
  "notes": ["人物与对白原创", "产品界面在制作前核准", "不展示保证获胜或脱险"]
}</code></pre></article>`;
}

function vwBriefDetailHTML(script,index,run){
 if(script.briefVariant==='wasteland')return vwWastelandBriefHTML(script);
 if((run?.generationRound||1)===2)return vwRegeneratedBriefDetailHTML(script,index,run);
 const meta=vwBriefMeta(script,index,run),first=index===0&&(run?.generationRound||1)===1;
 const timelines=first?[
  ['0—4秒','玩家角色撞上同一障碍，原地转圈；切小林看着空队友位。','小林：“又卡这儿了，难怪没人组我。”碰撞音两次，不用羞辱性音效。'],
  ['4—8秒','室友探头，小林拿起手机打开TT；后期标识“TT语音·找游戏搭子”。','室友：“去TT找个一起玩的呗。”具体操作画面待核准。'],
  ['8—12秒','字幕“稍后，和新搭子组队”；两个原创游戏角色出现。','小林：“先说好，我有点菜。”搭子：“一起玩嘛。”'],
  ['12—18秒','小林角色又被障碍碰得打转，停半拍；搭子没有走开，而是靠近看。','小林：“对不起，我又……”搭子：“等下，这步怎么转的？”'],
  ['18—24秒','搭子也试着转圈，两人转得歪歪扭扭；真人小林笑起来。','小林：“你不是来带我过关的吗？”搭子：“先带我学这个。”留一拍笑声。'],
  ['24—28秒','两人继续一起尝试，切TT品牌收尾；字幕“找个一起玩的”。','旁白：“找个一起玩的，上TT语音。”不加胜利音效。']
 ]:[
  ['0—4秒',index===1?'下班前，主角在语音房里随口说今晚一定准时走。':'雨停后，主角把借来的伞放到门口，准备结束对话。',index===1?'“今天谁加班谁请奶茶。”':'“伞还你了，这次真的两清。”'],
  ['4—10秒',index===1?'到点后，新搭子发来一句克制的语音提醒。':'AI 角色接住“还伞”话题，追问伞柄上的小挂件。',index===1?'“你亲口任命的下班监督员来打卡了。”':'“伞回来了，挂件怎么没一起回来？”'],
  ['10—20秒',index===1?'主角收电脑，对方没有说教，只陪着完成最后一步。':'主角顺势解释，角色以新的问题继续自然对话。',index===1?'“文件存好，电脑合上，我等你说走。”':'“那我明天把挂件带来，你还在吗？”'],
  [`20—${meta.duration}秒`,index===1?'两人用一个小约定完成陪伴感，画面落到 TT 语音。':'对话停在仍可继续的关系节点，画面落到 AI 伴侣入口。',index===1?'“约定有人记得，下班也有人同行。”':'“伞还了，人还没走。”']
 ];
 const opportunity=first?'面对怕拖累而不敢找搭子的需求，继承原片“孤独—朋友推荐TT—新搭子包容”，测试将口头包容变成一起模仿失误动作。':index===1?'把“陪伴”落在一个可以兑现的小约定上，避免只用抽象口号表达关系感。':'用“归还物品”制造对话本应结束的节点，再通过一个自然细节延长角色关系。';
 const story=first?'成年玩家小林的角色在障碍前连撞两次，最后原地转起圈。他摘下一边耳机，嘟囔“又卡这儿了，难怪没人组我”。旁边室友提醒：“去TT找个一起玩的呗。”小林打开TT语音找游戏搭子。字幕交代“稍后，和新搭子组队”。小林先声明自己不太会玩。下一次失误，他又在障碍边转起圈，刚想道歉，搭子却问：“等下，这步怎么转的？”对方试着模仿，两个人转得东倒西歪。小林笑了：“你不是来带我过关的吗？”搭子答：“先带我学这个。”画面停在两个人一起尝试的瞬间，收束到“找个一起玩的。上TT语音。”回报是一起玩起来，不是通关或技术提升。':index===1?'下班前，主角在语音里随口任命新搭子做自己的“下班监督员”。到点后，对方真的用一句语音来提醒，却没有催促和说教，只陪主角存好文件、关掉电脑。两人把一句玩笑变成一个被记住的小约定。':'主角把借来的伞还回去，以为这段对话也该结束。AI 角色却注意到伞柄上少了一个挂件，自然问起它的去向。主角借机约定明天再来，关系从一次性问答变成可继续的角色对话。';
 return `<article class="vw-brief-document"><header><h1>${E(meta.title)}</h1><small>故事提案 · v1 · draft</small><p>${E(meta.subtitle)}</p></header><h2>机会与改编依据</h2><p>${E(opportunity)}</p>${first?`<p><strong>历史依据：</strong>report_day0_return=0.060654，基线=0.004290；分子=397.9000，分母=6560.1880；sample_size=873（reported_acquisition_accounts）。周期2026-09-23至2026-10-22，data_as_of=2026-10-29；scope=material，平台/系统/用途编码2/2/1，convert_target未知。is_positive_signal=true仅支持原片整体；未证明新片有效。</p><p><strong>原片结构：</strong>粉色蛋仔因“没人陪我玩蛋仔”在沙滩哭泣，黑色蛋仔建议她去TT语音找一个蛋搭子。她照做后在广场快速匹配到一位队友，对方愿意陪她玩并包容她“菜菜的”。结尾切到真人加游戏画面的口播，引导下载TT语音找专属搭子。</p><p><strong>外部贡献与改编：</strong>借 Columbia《计划不如现挂》把意外当成可玩的内容：玩家碰撞后原地旋转，搭子不评判也不直接救场，而是请教并一起模仿。复制舞步是本次原创回报；不搬明星和原话。</p>`:''}<h2>故事线</h2><p>${E(story)}</p><p><strong>改编要点：</strong>建议 ${E(meta.duration)} 秒、9:16，轻喜剧表达；保留原片的产品参与顺序，把抽象的包容或陪伴变成可见动作。人物、对白和场景均使用原创或已获准资产。</p><h2>分段脚本</h2>${vwBriefTimeline(timelines)}<h2>剧情自检</h2><ul><li>开头的问题有具体原因，结尾动作直接回应这一顾虑。</li><li>产品在关系建立前进入路径，不把匹配速度或结果写成承诺。</li><li>全片不承诺获胜、秒配或必然形成情感关系，剧情只作为个例演绎。</li></ul>${first?`<p class="vw-brief-reference">参考素材 2054131947692691457：<a href="https://weflycdn.52tt.com/ad/mp4/1778578061999321782.mp4" target="_blank" rel="noopener">查看参考视频 ↗</a></p>`:''}<h2>内容生成交接</h2><p>后续内容生成 Agent 只接收本版本 Brief JSON。故事、分段脚本、产品事实、继承与改编、参考、制作约束和待确认项均在 Brief 内；无需另附机会点、候选池或原始分析文件。</p><p>当前状态：draft。草稿可用于评审与后续 Prompt 草拟，不能据此视为已获成片生成或投放批准。</p><h2>人群与使用时刻</h2><ul><li>${first?'想玩派对游戏、担心操作失误被嫌弃的成年玩家。':index===1?'希望有人记住日常小约定、需要轻量陪伴的成年用户。':'喜欢连续角色对话、希望关系感自然延续的成年用户。'}</li></ul><h2>继承依据</h2><ul><li>继承原片的开头吸引、产品参与路径与情绪回报顺序。</li><li>历史正向信号只支持原素材整体，不把创意评分解释为新片效果概率。</li></ul><h2>改编决定</h2><p>${E(opportunity)} 新片使用原创场景、人物与对白呈现。</p><h2>避免沿用</h2><ul><li>不承诺秒配、必然被喜欢、保证获胜或情感结果。</li><li>不复用外部案例的品牌、明星、角色资产及原台词。</li></ul><h2>产品已知事实</h2><p>TT语音的业务方向包括游戏组队和语音社交；Soulmate AI伴侣存在为既有业务确认。具体当前界面与额外能力不由此推出。</p><h2>制作约束与待办</h2><pre><code>{
  "format": "video",
  "handoff_notes": [
    "建议竖版9:16；正式尺寸、版位、Logo及产品截图在制作时核准。",
    "人物成年、对白原创；演员、角色、画面与声音使用自有或获准资产。",
    "故事确认后再设计完整Prompt，确认不等于已授权生成或投放。",
    "实际产品操作路径与UI版本待制作前核准。"
  ]
}</code></pre><h2>外部参考与覆盖</h2><p>${first?'<a href="https://www.digitaling.com/projects/379511.html" target="_blank" rel="noopener">Columbia×蒋奇明：计划不如现挂 ↗</a>：迁移从计划失误到共同乐趣的行动逻辑，不复用明星人设。':'本提案只继承参考片的结构机制，具体情节、对白和视觉表达均重新创作。'}</p></article>`;
}
function vwBriefTableHTML(scripts,run){return `<section class="vw-brief-list"><p>已调用当前文件夹的 skill，生成 ${scripts.length} 份 TT语音信息流素材 Brief，均含故事线、分段脚本、台词、参考依据及制作待办。</p><div class="vw-brief-table"><div class="head"><b>方向</b><b>Brief</b><b>时长</b></div>${scripts.map((script,index)=>{const meta=vwBriefMeta(script,index,run),key=`${run.localId}:${index}`;return `<div class="row"><strong>${E(meta.direction)}</strong><p><button type="button" data-r-action="vw-open-brief" data-id="${E(key)}"><span>▣</span>${E(meta.title)}</button><small>——${E(meta.subtitle)}</small></p><b>${E(meta.duration)}秒</b></div>`;}).join('')}</div><p class="vw-brief-note">当前均为创意草案；点击 Brief 标题查看完整内容。后续制作可直接使用各 Brief 内的脚本与制作约束。</p></section>`;}

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
function vwBriefRevisionHTML(run){
 const script=run.result?.scripts?.[0],key=`${run.localId}:0`;if(!script)return '';
 return `<div class="vw-response vw-brief-revision"><div class="vw-agent-label">${icon('spark')} ${E(run.skillName||'脚本改写 Agent')}</div><p class="vw-status">${E(run.message||'')}</p><p><b>已改成 29 秒废土喜剧版《这单外卖，拒绝配送》。</b></p><p>开头直接制造危机：搭子大喊“别开！那不是补给箱——”，话没说完，玩家已经触发警报，远处怪群齐刷刷转头。</p><p>笑点沿着危机递进：</p><ul><li>玩家：“我是来捡垃圾的，不是来送外卖的！”</li><li>搭子：“你这哪是菜，你是开饭铃。”</li><li>玩家：“要不你先走？”</li><li>搭子踢来一只铁桶：“上车！这单拒绝配送。”</li></ul><p>两人钻桶滚下坡，玩家补刀：“别人带飞，你带滚啊！”</p><p>保留“出错后搭子仍愿意一起玩”的核心，用共同逃跑兑现包容。</p><button type="button" class="vw-revision-brief-link" data-r-action="vw-open-brief" data-id="${E(key)}"><span>▣</span> 查看新版完整 Brief <i>· { } 制作交接 JSON</i></button></div>`;
}
function vwPlanConfirmationHTML(flow,message){
 const script=flow.selectedScript||vwLatestScriptSet(flow)?.scripts?.[0],title=script?.title||'当前脚本',decision=message.decision;
 return `<div class="vw-response vw-plan-confirmation"><div class="vw-agent-label">${icon('spark')} 视频制作 Agent</div><h3>是否按当前方案继续生成视频？</h3><p>当前定稿为 <b>《${E(title)}》</b>。确认后会进入推进方式选择；如果还要调整，可以继续说明开头、场景、搭子回应、台词或结尾。</p>${decision?`<p class="vw-decision-line">✓ ${decision==='confirmed'?'已确认当前方案，进入下一步':'已返回脚本调整'}</p>`:`<div class="vw-suggestion-actions"><button data-r-action="vw-plan-confirm">确认，继续下一步</button><button data-r-action="vw-plan-adjust">继续调整方向</button><button data-r-action="vw-plan-regenerate">重新生成 3 个方向</button></div><small>也可以直接回复“确认继续”，或输入具体修改要求。</small>`}</div>`;
}
function vwProductionMethodHTML(flow,message){
 const selected=message.productionMethod;
 const options=[['auto','1','全自动制作直到交付终片','自动完成提示词、参考图、视频生成与验收'],['staged','2','按阶段验收制作','每一阶段产出后由你确认再继续'],['readonly','3','仅做只读评估，不执行生成','只检查制作结构、规格、权限与可估费用']];
 return `<div class="vw-response vw-production-method"><div class="vw-agent-label">${icon('spark')} 视频制作 Agent</div><h3>确认推进方式</h3><p>请选择 29 秒视频的推进方式。制作涉及生成费用及可能的素材检测费用，执行前会先预估。</p><div class="vw-method-list">${options.map(item=>`<button data-r-action="vw-production-${item[0]}" ${selected?'disabled':''} class="${selected===item[0]?'selected':''}"><i>${item[1]}</i><span><b>${item[2]}${item[0]==='auto'?' <em>推荐</em>':''}</b><small>${item[3]}</small></span><strong>→</strong></button>`).join('')}</div>${selected?`<p class="vw-decision-line">✓ 已选择：${E(options.find(item=>item[0]===selected)?.[2]||'')}</p>`:'<small>也可以直接回复“全自动”“按阶段验收”或“只读评估”。</small>'}</div>`;
}
function vwNativeQuestionPanel(flow){
 if(!flow?.localScriptFlow||flow.nativeQuestionDismissed===flow.mode)return '';
 const plan=flow.mode==='confirm-plan',production=flow.mode==='production-method';if(!plan&&!production)return '';
 const options=plan?[
  ['确认当前方案，继续下一步','确认，按当前方案继续'],
  ['继续调整方向','继续调整方向'],
  ['重新生成 3 个方向','重新生成 3 个方向']
 ]:[
  ['全自动制作直到交付终片（推荐）','全自动制作直到交付终片'],
  ['按阶段验收制作','按阶段验收制作'],
  ['仅做只读评估，不执行生成','仅做只读评估，不执行生成']
 ];
 const question=plan?'是否确认按当前方案继续生成视频？':'请选择 29 秒视频的推进方式。制作涉及生成费用及可能的素材检测费用，执行前会先预估。';
 return `<section id="vw-native-question-panel" class="vw-native-question-panel" aria-label="问题"><header><span>?</span><b>问题</b><button type="button" data-r-action="vw-native-question-close" aria-label="关闭问题">×</button></header><p>${E(question)}</p><div class="vw-native-question-options">${options.map((item,index)=>`<button type="button" data-r-action="vw-native-question-option" data-value="${E(item[1])}"><i>${index+1}</i><b>${E(item[0])}</b><strong>→</strong></button>`).join('')}</div><footer><label><span>✎</span><input id="vw-native-question-input" placeholder="或自行撰写回复" aria-label="自行撰写回复"></label><button type="button" data-r-action="vw-native-question-skip">跳过</button><button type="button" class="send" data-r-action="vw-native-question-send" disabled>发送</button></footer></section>`;
}
function vwReadonlyResultHTML(){
 return `<div class="vw-response vw-readonly-result"><div class="vw-agent-label">${icon('spark')} 元境制作评估 Agent</div><p class="vw-result-kicker">只读评估完成</p><h3>制作清单预检通过，当前规格可用</h3><p>29 秒 · 9:16 · 480p · 有对白与音效 · 无背景音乐</p><div class="vw-cost-table"><div><b>项目</b><b>当前预估</b></div><div><span>小林人物参考图</span><strong>¥0.25</strong></div><div><span>搭子人物参考图</span><strong>¥0.25</strong></div><div><span>剧情聊天卡</span><strong>¥0.25</strong></div><div><span>品牌收尾卡</span><strong>¥0.25</strong></div><div><span>视频及素材检测</span><strong>待参考图生成后报价</strong></div></div><p class="vw-readonly-note">以上不是全片总价。本次未创建项目、未生成或送检，也未产生生成费用。</p><button class="vw-document-link" data-r-action="vw-open-evaluation"><span>▣</span> 查看完整评估结果</button></div>`;
}
function vwStageReviewHTML(message){
 const confirmed=message.stageConfirmed;
 return `<div class="vw-response vw-stage-review"><div class="vw-agent-label">${icon('spark')} 元境参考图 Agent</div><p class="vw-result-kicker">第一阶段验收 · 参考图与制作清单</p><h3>4 张参考图已生成，尺寸检查通过</h3><p>制作页已唤起并完成参考图节点操作。请核对人物身份、剧情图卡与品牌收尾，再决定是否进入视频生成。</p><div class="vw-stage-assets"><figure><div class="person one"><i></i><i></i><i></i></div><figcaption><b>小林人物身份板</b><small>1536 × 1024 · 已通过</small></figcaption></figure><figure><div class="person two"><i></i><i></i><i></i></div><figcaption><b>搭子人物身份板</b><small>1536 × 1024 · 已通过</small></figcaption></figure><figure><div class="chat-card"><b>组队前</b><span>我有点菜，能一起玩吗？</span><span>来，一起玩</span></div><figcaption><b>剧情聊天卡</b><small>720 × 1280 · 已通过</small></figcaption></figure><figure><div class="brand-card"><small>翻车有人接梗</small><b>TT语音</b><span>找游戏搭子</span></div><figcaption><b>品牌收尾卡</b><small>720 × 1280 · 已通过</small></figcaption></figure></div><div class="vw-stage-links"><a href="https://metarealm.52tt.com/" target="_blank" rel="noopener">打开元境制作页 ↗</a><button data-r-action="vw-open-reference-skill">▣ 查看参考图 Skill</button></div>${confirmed?'<p class="vw-decision-line">✓ 参考图已确认，正在进入视频生成。</p>':`<div class="vw-suggestion-actions"><button data-r-action="vw-stage-confirm">确认参考图并继续</button><button data-r-action="vw-stage-adjust">调整后重做</button></div>`}</div>`;
}
function vwSampleReviewHTML(){
 return `<div class="vw-response vw-sample-review"><div class="vw-agent-label">${icon('spark')} 视频验收 Agent</div><p class="vw-sample-time">用时 8 分钟 38 秒 <span>›</span></p><h3>样片已生成，约 29.06 秒，画幅和音轨检查通过。</h3><button type="button" class="vw-document-link" data-r-action="vw-open-sample"><span>▣</span> 点击观看样片</button><p><b>画面抽查发现：</b>桶先竖放、两人用桶颜色互换，滚动时两桶出现融合。声音与完整动态效果尚未核实，因此这版暂不判为合格终片。</p><p>已唤起处理选项，建议先修改滚桶动作方案。按 <button type="button" class="vw-inline-skill" data-r-action="vw-open-video-acceptance">▣ 视频验收 Skill</button>“内容、声音、动作任一关键项不合格则暂停”的要求，目前未自动付费重做。</p></div>`;
}
function vwAutomaticResultHTML(){
 return `<div class="vw-response vw-sample-review vw-auto-result"><div class="vw-agent-label">${icon('spark')} 视频制作 Agent</div><p class="vw-sample-time">用时 10 分钟 38 秒 <span>›</span></p><h3>已按全自动方式重新生成并完成检查，上一版已保留。</h3><button type="button" class="vw-document-link" data-r-action="vw-open-final-video"><span>▣</span> 查看新版本视频《这单外卖，拒绝配送》</button><p>约 29 秒 · 竖屏 480p · 有声无配乐。两桶独立滚动，主要对白及品牌收口完整；开箱造型、入桶方式和镜头时点与提示词仍有细节差异。</p></div>`;
}
function vwRunHTML(run,c){
 if(run.whiteModel)return vwWhiteRunHTML(run,c);
 if(run.briefRevision)return vwBriefRevisionHTML(run);
 const result=run.result,busy=c.videoWorkflow.runs.some(vwBusy),key=run.localId,local=run.localScripts,round=run.generationRound||(local?c.videoWorkflow.runs.filter(item=>item.localScripts).indexOf(run)+1:1);
 return `<div class="vw-response ${local?'vw-native-scripts':''}"><div class="vw-agent-label">${icon('spark')} ${E(run.skillName||'视频创作 Agent')}</div><p class="vw-status ${vwBusy(run)?'vw-progress':''}" role="status">${vwBusy(run)?'<i></i>':''}${E(run.message||'')}</p>${run.connectionError?`<p class="vw-error">${E(run.connectionError)} ${vwButton('vw-resume','重新连接',key)}</p>`:''}${['failed','interrupted'].includes(run.status)?`<div class="vw-error">${run.action==='analyze'||run.action==='remake'?vwButton('vw-retry','重试',key):'你可以在下方补充说明，继续核对当前制作进度。'}</div>`:''}${run.status==='submitted'?vwButton('vw-check-progress','查看生成进度',key):''}${result?`${result.summary?`<p class="vw-result-summary">${E(result.summary)}</p>`:''}${result.segments?.length?`<details class="vw-breakdown"><summary>✦ 参考视频拆解 · ${result.segments.length} 个时间段</summary>${vwAnalysisHTML(result)}</details>`:''}${local?`<p class="vw-round-label">以下是第 ${round} 轮生成的 3 个版本：</p>`:''}${local&&result.scripts?.length>1?vwBriefTableHTML(result.scripts,run):(result.scripts||[]).map((s,i)=>vwScriptHTML(s,i,run)).join('')}${c.videoWorkflow.localScriptFlow&&result.scripts?.length?`<div class="vw-native-question"><b>${result.scripts.length>1?'你更倾向哪种方向？':'这个修改方向是否合适？'}</b><p>${result.scripts.length>1?'可以直接回复“选用第 1 版”，或“修改第 2 版，让开头更直接”；如果都不合适，也可以说“重新生成 3 个版本”。':'可以回复“选用这个版本”，或继续说明修改要求；如果方向不合适，也可以说“重新生成 3 个版本”。'}</p></div>`:''}${result.questions?.length&&!run.answered?`<form class="vw-questions" data-run="${E(key)}"><b>补充这些信息后继续</b>${result.questions.map((q,i)=>`<label>${E(q.title)}<input name="q${i}" list="vw-options-${E(key)}-${i}" required placeholder="选择建议选项，或输入你的回答" ${busy?'disabled':''}><datalist id="vw-options-${E(key)}-${i}">${q.options.map(o=>`<option value="${E(o)}">`).join('')}</datalist></label>`).join('')}<button type="submit" class="solid" ${busy?'disabled':''}>提交并继续</button></form>`:''}${result.project_url||result.video_url?`<div class="vw-output">${result.video_url?`<div class="vw-generated-video"><video controls playsinline preload="metadata" src="${E(result.video_url)}" aria-label="Agent 生成的视频"></video><div><b>演示视频已生成</b><a href="${E(result.video_url)}" download>下载视频</a></div></div>${vwPublishChoice(run)}`:''}${result.project_url?`<a href="${E(result.project_url)}" target="_blank" rel="noopener">打开制作项目 ↗</a>`:''}</div>`:''}`:''}</div>`;
}
function vwChoiceHTML(flow,message){
 const script=flow.selectedScript,mix=message.choice==='mix',direct=message.choice==='direct';
 return `<div class="vw-response vw-choice"><div class="vw-agent-label">${icon('spark')} 视频创作 Agent</div><p>已选用 <b>「${E(script?.title||'推荐脚本')}」</b>。</p><p>${message.choice?'制作方式已经确认。':'接下来倾向哪种制作方式？可以直接回复“选择素材混剪”或“快速生成演示视频”。'}</p>${message.choice?`<p class="vw-choice-confirmed">✓ 已选择：${mix?'选择素材混剪':direct?'快速生成演示视频':''}</p>`:''}</div>`;
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
 const c=chat(),flow=c.videoWorkflow;
 if(flow?.localScriptFlow){const request=c.messages.find(item=>item.role==='user'&&(item.videoScriptRequest||item.text?.startsWith('选择“视频二创”')));if(request){request.text='基于这个参考视频，生产3个不同的原创脚本并制作新视频';request.videoScriptRequest={id:flow.reference?.id,title:flow.reference?.title||'已选参考视频'};}flow.runs.filter(item=>item.localScripts&&item.message?.includes('请先选择一版')).forEach(item=>item.message='脚本拆解 Skill 已完成参考内容分析，并生成 3 个不同版本的原创脚本。请告诉我更倾向哪种方向，也可以直接提出修改要求。');}
 vwOriginalRender();
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
  if(flow)el.querySelector('[data-chat-brief]')?.remove();
  if(m.videoScriptRequest){el.classList.add('vw-script-request');el.innerHTML=`<small>你 · ${E(m.time)}</small><p>${E(m.text)}</p><span class="vw-message-reference">▧ <b>参考视频</b>${E(m.videoScriptRequest.title||flow.reference?.title||'已选参考视频')}</span>`;}
  if(m.videoReference){el.classList.add('vw-user-video');el.innerHTML=`<video controls preload="metadata" aria-label="参考视频：${E(m.videoReference.title)}"></video><small>${E(m.videoReference.title)}</small><p>${E(m.text)}</p>`;vwRenderVideo(el.querySelector('video'),m.videoReference);}
  if(m.videoRun){const run=flow.runs.find(r=>r.localId===m.videoRun);if(run){el.classList.add('vw-rich-message');el.innerHTML=vwRunHTML(run,c);if(run.whiteModel&&vwBusy(run))vwScheduleWhiteReport(c,run);else if(vwBusy(run)&&!run.connectionError)vwPoll(flow.reference,run);}}
  if(m.videoChoice){el.classList.add('vw-rich-message');el.innerHTML=vwChoiceHTML(flow,m);}
  if(m.videoRemakeEntry){el.classList.add('vw-rich-message');el.innerHTML=vwRemakeEntryHTML(flow,m);}
  if(m.videoReadonlyResult){el.classList.add('vw-rich-message');el.innerHTML=vwReadonlyResultHTML();}
  if(m.videoStageReview){el.classList.add('vw-rich-message');el.innerHTML=vwStageReviewHTML(m);}
  if(m.videoSampleReview){el.classList.add('vw-rich-message');el.innerHTML=vwSampleReviewHTML();}
  if(m.videoAutomaticResult){el.classList.add('vw-rich-message');el.innerHTML=vwAutomaticResultHTML();}
 });
 const composer=$('#composer'),composerArea=composer?.closest('.composer-area');composerArea?.querySelector('#vw-native-question-panel')?.remove();composerArea?.classList.remove('vw-native-question-active');
 const nativeQuestion=vwNativeQuestionPanel(flow);if(nativeQuestion&&composer){composer.insertAdjacentHTML('beforebegin',nativeQuestion);composerArea?.classList.add('vw-native-question-active');const input=$('#vw-native-question-input'),sendQuestion=()=>R.actions['vw-native-question-send']?.();input?.addEventListener('input',()=>{$('#vw-native-question-panel [data-r-action="vw-native-question-send"]').disabled=!input.value.trim();});input?.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendQuestion();}});}
 $('#assistant-body').querySelectorAll('.vw-questions').forEach(form=>form.onsubmit=e=>{e.preventDefault();const run=flow.runs.find(r=>r.localId===form.dataset.run);if(!run||flow.runs.some(vwBusy))return;const values=new FormData(form),answer=run.result.questions.map((q,i)=>`${q.title}：${values.get('q'+i)}`).join('\n');run.answered=answer;vwSave();vwSend(c,answer,'continue',null,run.id);});
 if(flow.editing)$('#aw-context-chips').insertAdjacentHTML('beforeend',`<span>正在修改：${E(flow.editing.title)}${vwButton('vw-stop-edit','×')}</span>`);
 const running=flow.runs.some(vwBusy);send.classList.toggle('vw-stop',running);send.innerHTML=running?'<span aria-hidden="true"></span>':vwIdleSendHTML;send.setAttribute('aria-label',running?'停止生成':'发送');send.title=running?'停止生成':'';send.disabled=running?false:!c.draft?.trim();
};
function vwFindScript(key){const flow=chat().videoWorkflow;if(!flow)return null;const [id,index]=key.split(':'),run=flow.runs.find(r=>r.localId===id),script=run?.result?.scripts?.[Number(index)];return script?{flow,run,script,index:Number(index)}:null;}
R.invoke('vw-open-brief',b=>{
 const selected=vwFindScript(b.dataset.id);if(!selected)return;
 const meta=vwBriefMeta(selected.script,selected.index,selected.run);
 vwBriefDrawer.innerHTML=`<div class="vw-brief-drawer-shell"><header><div><small>BRIEF DETAIL</small><b>${E(meta.title)}</b></div><button type="button" data-r-action="vw-close-brief" aria-label="关闭 Brief 详情">×</button></header><main>${vwBriefDetailHTML(selected.script,selected.index,selected.run)}</main></div>`;
 if(!vwBriefDrawer.open)vwBriefDrawer.showModal();
});
R.invoke('vw-close-brief',()=>vwBriefDrawer.close());
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
 if(v.flow.localScriptFlow){v.flow.selectedScript=script;v.flow.mode='confirm-plan';delete v.flow.nativeQuestionDismissed;c.messages=c.messages.filter(message=>!message.videoChoice);c.messages.push({role:'user',text:`选用第 ${v.index+1} 版「${script.title}」`,time:now(),scriptSelection:true},{role:'assistant',text:'脚本已定稿。请在下方确认是否按当前方案继续生成视频；如需调整，也可以返回修改方向。',time:now(),videoPlanConfirmation:true});state.messages=c.messages;delete v.flow.editing;delete v.flow.editingKey;vwSave();renderAssistant();setTimeout(()=>$('#vw-native-question-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),0);return;}
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
 const run=vwNewRun('refine','已根据你的要求完成脚本修改。');Object.assign(run,{status:'completed',skillName:'脚本改写 Agent',result:{summary:'已在保留原结构和时长的基础上完成修改。',segments:[],scripts:[revised],questions:[],project_url:'',video_url:'',task_ids:[]}});flow.runs.push(run);vwRunMessage(c,run);flow.selection=null;flow.selectedScript=revised;flow.mode='confirm-plan';delete flow.nativeQuestionDismissed;c.messages=c.messages.filter(message=>!message.videoChoice);c.messages.push({role:'assistant',text:'修改后的脚本已定稿。请在下方确认是否按当前方案继续生成视频。',time:now(),videoPlanConfirmation:true});state.messages=c.messages;delete flow.editing;delete flow.editingParent;delete flow.editingKey;vwSave();renderAssistant();setTimeout(()=>$('#vw-native-question-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),0);
}
function vwStopCurrent(c){
 const flow=c.videoWorkflow,run=[...(flow?.runs||[])].reverse().find(vwBusy);if(!run)return;
 run.status='interrupted';run.message='已停止本次生成。你可以修改要求后重新发送。';if(run.requestText)c.draft=run.requestText;delete run.connectionError;vwSave();renderAssistant();
}
R.invoke('vw-check-progress',b=>{const c=chat(),r=c.videoWorkflow?.runs.find(r=>r.localId===b.dataset.id);if(r)vwSend(c,'请检查已经提交的视频任务进度，保留已有任务，不重复提交。','continue',null,r.id);});
R.invoke('vw-resume',b=>{const f=chat().videoWorkflow,r=f?.runs.find(r=>r.localId===b.dataset.id);if(r)vwPoll(f.reference,r);});
R.invoke('vw-retry',b=>{const c=chat(),f=c.videoWorkflow,r=f?.runs.find(r=>r.localId===b.dataset.id);if(!r||!['analyze','remake'].includes(r.action)||f.runs.some(vwBusy))return;vwSend(c,'请重新拆解参考视频并推荐同款脚本。','remake');});
function vwLatestScriptSet(flow){
 const run=[...(flow?.runs||[])].reverse().find(item=>item.result?.scripts?.length);return run?{run,scripts:run.result.scripts}:null;
}
function vwNaturalScriptIndex(text,count){
 const map={一:0,二:1,三:2,'1':0,'2':1,'3':2},match=text.match(/第?\s*([123一二三])\s*(?:版|个|种|条)?/);if(match&&map[match[1]]<count)return map[match[1]];if(count===1&&/(这个|当前|这一版|就它|选用|采用)/.test(text))return 0;return null;
}
function vwAskScriptDirection(c,text){
 c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'我还不能确定你指的是哪一版。请直接回复“选用第 1 版”，或“修改第 2 版，让开头更直接”；也可以回复“重新生成 3 个版本”。',time:now()});c.draft='';state.messages=c.messages;vwSave();renderAssistant();
}
function vwSelectScriptNaturally(c,text,index){
 const flow=c.videoWorkflow,set=vwLatestScriptSet(flow);if(!set||index===null||!set.scripts[index])return vwAskScriptDirection(c,text);const script=JSON.parse(JSON.stringify(set.scripts[index]));delete script.versions;flow.selection=set.run.localId+':'+index+':'+(script.revision||1);flow.selectedScript=script;flow.mode='confirm-plan';delete flow.nativeQuestionDismissed;c.messages=c.messages.filter(message=>!message.videoChoice);c.messages.push({role:'user',text,time:now(),scriptSelection:true},{role:'assistant',text:'脚本已定稿。请在下方确认是否按当前方案继续生成视频；如需调整，也可以返回修改方向。',time:now(),videoPlanConfirmation:true});c.draft='';state.messages=c.messages;delete flow.editing;delete flow.editingKey;vwSave();renderAssistant();setTimeout(()=>$('#vw-native-question-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),0);
}
function vwRegenerateScripts(c,text='请重新生成 3 个不同版本的脚本。'){
 const flow=c.videoWorkflow,source=inspirationFind(flow?.reference?.id);if(!flow?.localScriptFlow||!source)return;flow.runs.filter(item=>item.localScripts&&!item.generationRound).forEach(item=>item.generationRound=flow.round||1);flow.round=(flow.round||1)+1;VRS.segment=flow.segment;const scripts=vwStudioScripts(source,flow.round),run=vwNewRun('remake',`已重新生成第 ${flow.round} 轮的 3 个不同版本。上一轮仍保留在对话中。`);Object.assign(run,{status:'completed',skillName:'脚本拆解 Skill',localScripts:true,generationRound:flow.round,result:{summary:'这一次更换了开场角度和叙事路径，你可以直接说明倾向或继续提出修改要求。',segments:[],scripts,questions:[],project_url:'',video_url:'',task_ids:[]}});flow.runs.push(run);flow.selection=null;flow.selectedScript=null;flow.mode='remake';delete flow.editing;delete flow.editingKey;c.messages=c.messages.filter(message=>!message.videoChoice);c.messages.push({role:'user',text,time:now()});vwRunMessage(c,run);c.draft='';state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-response:last-child')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
}
function vwAskBriefRevision(c,text,set,index){
 const meta=vwBriefMeta(set.scripts[index],index,set.run),flow=c.videoWorkflow;flow.awaitingBriefRevision={runId:set.run.localId,index};c.messages.push({role:'user',text,time:now()},{role:'assistant',text:`可以。我们就基于方向${['一','二','三'][index]||index+1}《${meta.title}》修改。\n\n你想调整哪些地方？比如开头钩子、游戏场景、搭子的回应、台词风格或结尾。也可以直接说哪里不满意，我来改成完整新版 Brief。`,time:now()});c.draft='';state.messages=c.messages;vwSave();renderAssistant();
}
function vwCompleteBriefRevision(c,text,pending){
 const flow=c.videoWorkflow,sourceRun=flow.runs.find(run=>run.localId===pending.runId),source=sourceRun?.result?.scripts?.[pending.index];if(!source)return vwAskScriptDirection(c,text);
 const revised={...JSON.parse(JSON.stringify(source)),title:'这单外卖，拒绝配送',duration:29,revision:2,briefVariant:'wasteland',briefMeta:{direction:'废土生存 · 冲突喜剧',title:'这单外卖，拒绝配送',subtitle:'误触警报后，搭子把责怪预期变成接梗和共同逃跑',duration:29},body:'【0—3秒】误开警报箱，怪群转头。\n【3—6秒】短回叙交代两人通过TT组队。\n【6—20秒】送外卖、开饭铃、拒绝配送三个笑点递进。\n【20—29秒】两人钻进铁桶滚下坡，以“翻车有人接梗”收尾。',reason:'用废土危机制造悬念，以共同滚桶的行动兑现包容。',prompt:'竖屏 9:16，原创废土生存游戏质感，黄沙低饱和、锈红警报灯与金属碰撞声；成人角色、反差喜剧，不展示保证脱险。'};
 c.messages.push({role:'user',text,time:now()});c.draft='';delete flow.awaitingBriefRevision;flow.selection=null;flow.selectedScript=revised;flow.mode='confirm-plan';delete flow.nativeQuestionDismissed;const run=vwNewRun('refine','已根据你的要求完成方向一的创意修订。');Object.assign(run,{status:'completed',skillName:'脚本改写 Agent',briefRevision:true,result:{summary:'',segments:[],scripts:[revised],questions:[],project_url:'',video_url:'',task_ids:[]}});flow.runs.push(run);vwRunMessage(c,run);c.messages.push({role:'assistant',text:'新版脚本已定稿。请在下方确认是否按当前方案继续生成视频。',time:now(),videoPlanConfirmation:true});state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#vw-native-question-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),0);
}
function vwHandleNativeScriptReply(c,text){
 const flow=c.videoWorkflow;if(flow.awaitingBriefRevision)return vwCompleteBriefRevision(c,text,flow.awaitingBriefRevision);const set=vwLatestScriptSet(flow);if(!set)return vwAskScriptDirection(c,text);if(/重新生成|再生成|换一批|换一组|都不合适/.test(text))return vwRegenerateScripts(c,text);const index=vwNaturalScriptIndex(text,set.scripts.length);if(/修改|改一下|改成|优化|调整/.test(text)){if(index===null)return vwAskScriptDirection(c,text);const specific=text.length>22&&/(开头|钩子|场景|废土|悬念|台词|笑点|回应|结尾|风格|希望|更加)/.test(text)&&!/(可以|能否|能不能).{0,12}(修改|调整).{0,3}[吗？?]?$/.test(text);return specific?vwCompleteBriefRevision(c,text,{runId:set.run.localId,index}):vwAskBriefRevision(c,text,set,index);}if(index!==null&&(/选|倾向|喜欢|采用|就用|要第|^[\s123一二三]+$/.test(text)))return vwSelectScriptNaturally(c,text,index);return vwAskScriptDirection(c,text);
}
function vwHandleProductionChoice(c,text){
 const flow=c.videoWorkflow,choiceMessage=[...c.messages].reverse().find(message=>message.videoChoice);if(/混剪|选择素材|素材重新/.test(text)){c.messages.push({role:'user',text,time:now()});c.draft='';if(choiceMessage)choiceMessage.choice='mix';state.messages=c.messages;vwSave();renderAssistant();return vwPrepareChatMaterials();}if(/快速|直接|演示视频|生成视频|开始制作/.test(text)){c.draft='';return vwLaunchChatChoice([],text);}c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'请直接回复“选择素材混剪”或“快速生成演示视频”。',time:now()});c.draft='';state.messages=c.messages;vwSave();renderAssistant();
}
function vwLatestMessage(c,key){return [...c.messages].reverse().find(message=>message[key]);}
function vwShowProductionMethod(c,userText='确认，按当前方案继续'){const flow=c.videoWorkflow,confirm=vwLatestMessage(c,'videoPlanConfirmation');if(confirm)confirm.decision='confirmed';c.messages.push({role:'user',text:userText,time:now()},{role:'assistant',text:'当前方案已确认。请在下方选择视频的推进方式。',time:now(),videoProductionMethod:true});c.draft='';flow.mode='production-method';delete flow.nativeQuestionDismissed;state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#vw-native-question-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),0);}
function vwReturnToRevision(c,text='继续调整方向'){
 const flow=c.videoWorkflow,confirm=vwLatestMessage(c,'videoPlanConfirmation'),script=flow.selectedScript||vwLatestScriptSet(flow)?.scripts?.[0];if(confirm)confirm.decision='adjust';
 if(/重新生成|换一批|换一组/.test(text))return vwRegenerateScripts(c,text);
 const hasDetail=text.length>8&&/(开头|钩子|场景|废土|悬念|台词|笑点|回应|结尾|风格|节奏|画面|人物)/.test(text);
 if(hasDetail&&script){flow.editing=JSON.parse(JSON.stringify(script));flow.mode='remake';return vwLocalRefine(c,text);}
 c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'可以。请直接说想调整哪里，例如“开头更有反转”“游戏场景更废土”“搭子的回应更幽默”，我会重新生成完整脚本和 Brief。',time:now()});c.draft='';flow.editing=script?JSON.parse(JSON.stringify(script)):null;flow.mode='remake';state.messages=c.messages;vwSave();renderAssistant();
}
function vwHandlePlanConfirmation(c,text){if(/重新生成|换一批|换一组/.test(text))return vwReturnToRevision(c,text);if(/调整|修改|再改|不满意|重做/.test(text))return vwReturnToRevision(c,text);if(/确认|没问题|可以|继续|就这样|按这个|通过|定稿/.test(text))return vwShowProductionMethod(c,text);c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'请回复“确认继续”，或直接说明还想调整的内容。',time:now()});c.draft='';state.messages=c.messages;vwSave();renderAssistant();}
function vwMarkProductionMethod(c,method){const message=vwLatestMessage(c,'videoProductionMethod');if(message)message.productionMethod=method;c.videoWorkflow.productionMethod=method;}
function vwLaunchReadonly(c,text='仅做只读评估，不执行生成'){
 vwMarkProductionMethod(c,'readonly');c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'',time:now(),videoReadonlyResult:true});c.draft='';c.videoWorkflow.mode='read-only-complete';state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-readonly-result:last-child')?.scrollIntoView({behavior:'smooth',block:'center'}),0);
}
function vwLaunchStaged(c,text='按阶段验收制作'){
 vwMarkProductionMethod(c,'staged');c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'',time:now(),videoStageReview:true});c.draft='';c.videoWorkflow.mode='stage-review';state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-stage-review:last-child')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
}
function vwLaunchAutomatic(c,text='全自动制作直到交付终片'){
 vwMarkProductionMethod(c,'auto');const method=vwLatestMessage(c,'videoProductionMethod');if(method)method.productionMethod='auto';c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'',time:now(),videoAutomaticResult:true});c.draft='';c.videoWorkflow.mode='automatic-complete';state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-auto-result:last-child')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
}
function vwHandleProductionMethod(c,text){if(/只读|评估|不执行|^[\s]*3[\s]*$/.test(text))return vwLaunchReadonly(c,text);if(/阶段|验收|^[\s]*2[\s]*$/.test(text))return vwLaunchStaged(c,text);if(/全自动|自动制作|交付终片|^[\s]*1[\s]*$/.test(text))return vwLaunchAutomatic(c,text);c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'请选择“全自动制作”“按阶段验收”或“仅做只读评估”。',time:now()});c.draft='';state.messages=c.messages;vwSave();renderAssistant();}
function vwHandleStageReply(c,text){const stage=vwLatestMessage(c,'videoStageReview');if(stage?.stageAdjustment&&!/确认|继续|通过|没问题/.test(text)){stage.stageAdjustment=false;c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'已记录这次参考图修改要求，并重新完成尺寸与内容检查。请再次核对四张参考图，确认后继续生成视频。',time:now()},{role:'assistant',text:'',time:now(),videoStageReview:true});c.draft='';state.messages=c.messages;vwSave();renderAssistant();return;}if(/确认|继续|通过|没问题/.test(text))return vwConfirmStage(c,text);if(/调整|修改|重做/.test(text)){c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'请说明需要调整哪一张参考图，以及人物、服装、画面或文字的具体修改要求。',time:now()});c.draft='';if(stage)stage.stageAdjustment=true;state.messages=c.messages;vwSave();renderAssistant();return;}c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'请回复“确认参考图并继续”，或说明需要调整的参考图和具体要求。',time:now()});c.draft='';state.messages=c.messages;vwSave();renderAssistant();}
function vwConfirmStage(c,text='确认参考图并继续'){
 const stage=vwLatestMessage(c,'videoStageReview');if(stage)stage.stageConfirmed=true;c.messages.push({role:'user',text,time:now()},{role:'assistant',text:'',time:now(),videoSampleReview:true});c.draft='';c.videoWorkflow.mode='sample-review';state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-sample-review:last-child')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
}
const vwOriginalSubmit=$('#composer').onsubmit;
$('#composer').onsubmit=function(e){const c=chat();if(!c.videoWorkflow)return vwOriginalSubmit.call(this,e);e.preventDefault();const f=c.videoWorkflow;if(f.runs.some(vwBusy))return vwStopCurrent(c);const text=$('#prompt').value.trim();if(!text)return;if(f.mode==='white-prompt'&&f.whiteConfirmed)return vwGenerateWhiteSubject(c,text);if(f.localScriptFlow){if(f.mode==='confirm-plan')return vwHandlePlanConfirmation(c,text);if(f.mode==='production-method')return vwHandleProductionMethod(c,text);if(f.mode==='stage-review')return vwHandleStageReply(c,text);if(f.mode==='choice')return vwHandleProductionChoice(c,text);return f.editing?vwLocalRefine(c,text):vwHandleNativeScriptReply(c,text);}vwSend(c,text,f.editing?'refine':'continue',f.editing||null,f.editingParent||null);};
$('#prompt').addEventListener('input',()=>{if(chat().videoWorkflow?.runs.some(vwBusy))$('#send').disabled=false;});
window.addEventListener('beforeunload',()=>{for(const url of VW.media.values())URL.revokeObjectURL(url);});

// The inspiration entry begins with a reviewable script instead of immediately starting a job.
const vwRemakeStudio=document.createElement('dialog');vwRemakeStudio.id='vw-remake-studio';vwRemakeStudio.setAttribute('aria-label','同款脚本');document.body.append(vwRemakeStudio);
const vwMaterialDrawer=document.createElement('dialog');vwMaterialDrawer.id='vw-material-drawer';vwMaterialDrawer.setAttribute('aria-label','选择混剪素材');document.body.append(vwMaterialDrawer);
const vwWhiteLibrary=document.createElement('dialog');vwWhiteLibrary.id='vw-white-library';vwWhiteLibrary.setAttribute('aria-label','选择白模替换引用');document.body.append(vwWhiteLibrary);
const vwBriefDrawer=document.createElement('dialog');vwBriefDrawer.id='vw-brief-drawer';vwBriefDrawer.setAttribute('aria-label','Brief 详情');document.body.append(vwBriefDrawer);
const vwProductionDrawer=document.createElement('dialog');vwProductionDrawer.id='vw-production-drawer';vwProductionDrawer.setAttribute('aria-label','视频制作详情');document.body.append(vwProductionDrawer);
const vwSampleDrawer=document.createElement('dialog');vwSampleDrawer.id='vw-sample-drawer';vwSampleDrawer.setAttribute('aria-label','样片预览');document.body.append(vwSampleDrawer);
function vwEvaluationDocument(){return `<article class="vw-production-document"><header><small>READ-ONLY ASSESSMENT</small><h1>《这单外卖，拒绝配送》只读评估</h1><div><span>结构预检通过</span><span>未执行生成</span><span>本轮不扣费</span></div></header><h2>结论</h2><p><b>制作清单结构预检通过，模型权限与所选规格可用；完整费用尚不可确定。</b></p><p><strong>用户范围：</strong>仅做只读评估；时长 29 秒。未创建元境项目、上传、送检或提交生成任务，本轮报价不扣费。</p><h2>内容与规格核对</h2><dl><div><dt>内容核对</dt><dd>4 张参考图与 1 条视频的完整节点提示词，逐字匹配已评审 v2。总提示词中的 28 秒按用户“29s”确认恢复为 29 秒，评估副本保存于 confirmed-total-prompt.txt，原编辑文件保留。</dd></div><div><dt>规格</dt><dd>29 秒单段，9:16，480p，MP4，有对白与音效，无 BGM。</dd></div><div><dt>参考图</dt><dd>两张 1536×1024 人物身份板，两张 720×1280 剧情／品牌卡；medium、1k、PNG。</dd></div><div><dt>预检</dt><dd>ok=true，warnings=[]，4 个图片节点、1 个视频节点、无合并节点、唯一终点。preflight.json 记录完整生效参数。</dd></div><div><dt>权限</dt><dd>GPT Image 2（2048641530790625280）、Seedance 2.5（2069627175121215489）、方舟素材检测（2039632435694166016）均在当前可访问列表，动态配置读取成功。</dd></div></dl><h2>费用</h2><table><thead><tr><th>项目</th><th>当前参考报价</th></tr></thead><tbody><tr><td>小林身份板</td><td>0.25 CNY</td></tr><tr><td>搭子身份板</td><td>0.25 CNY</td></tr><tr><td>剧情聊天卡</td><td>0.25 CNY</td></tr><tr><td>品牌收尾卡</td><td>0.25 CNY</td></tr></tbody></table><p>以上为四项独立参考报价，不是全片总价或最终价格上限。每项服务端提示“输入图片需额外计费”；当前四张均为无输入图片的原创生成。</p><div class="vw-report-callout"><b>视频与检测尚未报价</b><p>视频需要 4 张真实参考图，生成后须逐张完成方舟检测，再用成功资产参数预估视频。当前无图片 URL 和检测资产 ID，不使用占位素材，也不省略参考图冒报纯文生视频价格。检测通常对应 4 张独立图片，当前未提交任何检测。</p></div><h2>后续验收重点</h2><p>双人钻桶、蹬地和收腿的物理连贯；短时间中文图卡可读性；双男声区分、对白时长与独立品牌女声。模型规格可用与结构预检通过不保证生成成品通过内容验收。</p><p>后续若明确授权制作，先重新核对当前配置和费用，再按确认版建立项目和执行；本轮到评估交付结束。</p></article>`;}
function vwReferenceSkillDocument(){return `<article class="vw-production-document vw-skill-document"><header><small>WORKFLOW REFERENCE</small><h1>第五阶段：素材与参考图</h1><p>metarealm-reference-generation · 按阶段验收</p></header><p>这一页用于解释本次按阶段验收时，参考图如何进入后续视频制作。页面中的规则是制作流程说明，不会替代当前对话中已经确认的脚本与范围。</p><h2>素材和身份关卡</h2><p>本地图片会先检查尺寸；不合规时生成临时适配文件，不覆盖原图。人物身份板、场景、商品与关键道具分别承担明确职责，只有检查通过的参考图才进入下游视频节点。</p><h2>本轮 4 张参考图的职责</h2><table><thead><tr><th>参考图</th><th>锁定内容</th><th>后续用途</th></tr></thead><tbody><tr><td>小林人物身份板</td><td>成年拾荒者外形、服装和身份标识</td><td>锁定主角一致性</td></tr><tr><td>搭子人物身份板</td><td>搭子外形、服装与角色区分</td><td>锁定双人镜头身份</td></tr><tr><td>剧情聊天卡</td><td>“组队前”关系交代与对白</td><td>短回叙图卡</td></tr><tr><td>品牌收尾卡</td><td>TT语音品牌与行动引导</td><td>片尾落版</td></tr></tbody></table><h2>按阶段验收</h2><ol><li>生成并下载本轮参考图，分别检查人物、肢体、服装、画幅、关键道具与中文文字。</li><li>把实际图片与已确认的人物设定、脚本和来源并排核对。</li><li>全部合格后才进入视频生成；发现关键偏差时停在当前阶段，说明受影响节点并等待调整。</li><li>参考图确认后，再核对持久化 Prompt、模型参数与实际注入来源。</li></ol><div class="vw-report-callout"><b>当前状态</b><p>4 张参考图已完成尺寸检查，正在等待本轮人工确认。确认不会改变已定稿的故事和对白。</p></div></article>`;}
function vwVideoAcceptanceDocument(){return `<article class="vw-production-document vw-skill-document"><header><small>VIDEO ACCEPTANCE</small><h1>视频验收 Skill</h1><p>样片内容、声音与动作检查</p></header><p>对生成样片分别核对画幅、人物身份、关键动作、声音、文字与品牌收尾。任一关键项无法核实或不合格时，暂停当前制作链路并说明问题，不自动发起付费重做。</p><h2>本轮验收结果</h2><table><thead><tr><th>检查项</th><th>结论</th></tr></thead><tbody><tr><td>时长与画幅</td><td>29.06 秒，9:16，通过</td></tr><tr><td>音轨</td><td>音轨存在，完整声音效果待人工核实</td></tr><tr><td>人物与道具</td><td>桶颜色互换，人物身份延续需复核</td></tr><tr><td>关键动作</td><td>滚动时两桶融合，未通过</td></tr></tbody></table><div class="vw-report-callout"><b>处理状态</b><p>当前样片暂停在验收节点，建议先修改滚桶动作方案；尚未自动发起重做或产生新的生成费用。</p></div></article>`;}
function vwOpenProductionDrawer(type){const evaluation=type==='evaluation',acceptance=type==='acceptance',title=evaluation?'完整评估结果':acceptance?'视频验收 Skill':'参考图 Skill',content=evaluation?vwEvaluationDocument():acceptance?vwVideoAcceptanceDocument():vwReferenceSkillDocument();vwProductionDrawer.innerHTML=`<div class="vw-production-drawer-shell"><header><div><small>${evaluation?'ASSESSMENT DETAIL':'STAGE DETAIL'}</small><b>${title}</b></div><button data-r-action="vw-close-production-drawer" aria-label="关闭">×</button></header><main>${content}</main></div>`;if(!vwProductionDrawer.open)vwProductionDrawer.showModal();}
function vwOpenSampleDrawer(finalVideo=false){vwSampleDrawer.innerHTML=`<div class="vw-sample-drawer-shell"><header><div><small>${finalVideo?'FINAL VIDEO':'SAMPLE PREVIEW'}</small><b>《这单外卖，拒绝配送》${finalVideo?'新版本视频':'样片'}</b></div><button type="button" data-r-action="vw-close-sample" aria-label="关闭视频">×</button></header><main><video controls playsinline preload="metadata" src="./demo-wasteland-sample.mp4" aria-label="这单外卖，拒绝配送${finalVideo?'新版本视频':'样片'}"></video><p>29.06 秒 · 9:16 · ${finalVideo?'全自动制作完成':'样片验收中'}</p></main></div>`;if(!vwSampleDrawer.open)vwSampleDrawer.show();}
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
 const index=segment===undefined?c.videoWorkflow.segment:Number(segment),scripts=(()=>{VRS.segment=index;return vwStudioScripts(source,1);})(),selectedSegments=index!==null&&source.segments?.[index]?[source.segments[index]]:(source.segments||[]),run=vwNewRun('remake','脚本拆解 Skill 已完成参考内容分析，并生成 3 个不同版本的原创脚本。请告诉我更倾向哪种方向，也可以直接提出修改要求。');
 Object.assign(run,{status:'completed',skillName:'脚本拆解 Skill',localScripts:true,generationRound:1,result:{summary:`已参考「${source.title}」的内容结构、节奏和表达方式。以下脚本均已替换为原创表达，可继续修改。`,segments:selectedSegments,scripts,questions:[],project_url:'',video_url:'',task_ids:[]}});
 Object.assign(c.videoWorkflow,{runs:[...c.videoWorkflow.runs,run],mode:'remake',localScriptFlow:true,whiteModelFlow:false,round:1,segment:index,selection:null,selectedScript:null});
 c.messages.push({role:'user',text:'基于这个参考视频，生产3个不同的原创脚本并制作新视频',time:now(),videoScriptRequest:{id:source.id,title:source.title}});vwRunMessage(c,run);state.messages=c.messages;vwSave();renderAssistant();setTimeout(()=>$('#assistant-body .vw-response:last-child')?.scrollIntoView({block:'start',behavior:'smooth'}),0);
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
function vwLaunchChatChoice(materials=[],userText=''){
 const c=chat(),flow=c.videoWorkflow,script=flow?.selectedScript,source=inspirationFind(flow?.reference?.id);if(!flow?.localScriptFlow||!script||!source)return;
 const mix=materials.length>0,choiceMessage=c.messages.findLast?.(message=>message.videoChoice)||[...c.messages].reverse().find(message=>message.videoChoice);if(choiceMessage)choiceMessage.choice=mix?'mix':'direct';
 const text=mix?`使用 ${materials.length} 段素材混剪`:'直接生成视频';c.messages.push({role:'user',text:userText||text,time:now()});flow.mode='generate';if(mix)flow.fission={materials};
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
R.invoke('vw-chat-regenerate',()=>vwRegenerateScripts(chat()));
R.invoke('vw-choice-mix',()=>vwPrepareChatMaterials());
R.invoke('vw-choice-direct',()=>vwLaunchChatChoice());
R.invoke('vw-plan-confirm',()=>vwShowProductionMethod(chat()));
R.invoke('vw-plan-adjust',()=>vwReturnToRevision(chat()));
R.invoke('vw-plan-regenerate',()=>vwReturnToRevision(chat(),'重新生成 3 个方向'));
R.invoke('vw-production-auto',()=>vwLaunchAutomatic(chat()));
R.invoke('vw-production-staged',()=>{window.open('https://metarealm.52tt.com/','_blank','noopener');vwLaunchStaged(chat());});
R.invoke('vw-production-readonly',()=>vwLaunchReadonly(chat()));
R.invoke('vw-native-question-option',b=>{const panel=b.closest('#vw-native-question-panel'),input=panel?.querySelector('#vw-native-question-input'),send=panel?.querySelector('[data-r-action="vw-native-question-send"]');if(!panel||!input||!send)return;panel.querySelectorAll('.vw-native-question-options button').forEach(button=>button.classList.toggle('selected',button===b));input.value=b.dataset.value||'';send.disabled=!input.value.trim();input.focus();});
R.invoke('vw-native-question-send',()=>{const c=chat(),flow=c.videoWorkflow,input=$('#vw-native-question-input'),text=input?.value.trim();if(!text)return;if(flow.mode==='confirm-plan')return vwHandlePlanConfirmation(c,text);if(flow.mode==='production-method')return vwHandleProductionMethod(c,text);});
R.invoke('vw-native-question-skip',()=>{const c=chat(),flow=c.videoWorkflow;flow.nativeQuestionDismissed=flow.mode;vwSave();renderAssistant();$('#prompt')?.focus();});
R.invoke('vw-native-question-close',()=>{const c=chat(),flow=c.videoWorkflow;flow.nativeQuestionDismissed=flow.mode;vwSave();renderAssistant();$('#prompt')?.focus();});
R.invoke('vw-open-evaluation',()=>vwOpenProductionDrawer('evaluation'));
R.invoke('vw-open-reference-skill',()=>vwOpenProductionDrawer('skill'));
R.invoke('vw-open-video-acceptance',()=>vwOpenProductionDrawer('acceptance'));
R.invoke('vw-close-production-drawer',()=>vwProductionDrawer.close());
R.invoke('vw-open-sample',()=>vwOpenSampleDrawer());
R.invoke('vw-open-final-video',()=>vwOpenSampleDrawer(true));
R.invoke('vw-close-sample',()=>vwSampleDrawer.close());
R.invoke('vw-stage-confirm',()=>vwConfirmStage(chat()));
R.invoke('vw-stage-adjust',()=>vwHandleStageReply(chat(),'调整后重做'));
R.invoke('vw-material-close',()=>vwMaterialDrawer.close());
R.invoke('vw-material-confirm',()=>{if(VRS.materials.size<3)return toast('混剪至少需要 3 段视频素材');const rows=vwMaterialRows(),materials=[...VRS.materials].map(id=>{const row=rows.find(item=>item.id===id);return {id,title:row?.title||id,platform:row?.platform||'本地上传'};});chat().videoWorkflow?.localScriptFlow?vwLaunchChatChoice(materials):vwLaunchStudio(materials);});
R.invoke('vw-save-video',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id);vwSaveGeneratedVideo(c,run);});
R.invoke('vw-publish-later',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id);if(!run?.result?.video_url)return;run.publishDecision='later';vwSave();renderAssistant();});
R.invoke('vw-publish-video',b=>{const c=chat(),run=c.videoWorkflow?.runs.find(item=>item.localId===b.dataset.id);if(!run?.result?.video_url)return;run.publishDecision='publish';vwSave();if(typeof window.apfOpenGeneratedPublish==='function')window.apfOpenGeneratedPublish({id:`generated-${run.localId}`,title:'刚刚生成的视频',kind:'视频',tone:'blue',url:run.result.video_url});else toast('智能投放流程正在加载，请稍后再试');});
vwRemakeStudio.addEventListener('click',event=>{if(event.target===vwRemakeStudio)vwRemakeStudio.close();});vwMaterialDrawer.addEventListener('click',event=>{if(event.target===vwMaterialDrawer)vwMaterialDrawer.close();});vwWhiteLibrary.addEventListener('click',event=>{if(event.target===vwWhiteLibrary)vwWhiteLibrary.close();});vwBriefDrawer.addEventListener('click',event=>{if(event.target===vwBriefDrawer)vwBriefDrawer.close();});vwProductionDrawer.addEventListener('click',event=>{if(event.target===vwProductionDrawer)vwProductionDrawer.close();});vwSampleDrawer.addEventListener('click',event=>{if(event.target===vwSampleDrawer)vwSampleDrawer.close();});
renderAssistant();
