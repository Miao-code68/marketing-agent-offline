'use strict';
const IT={tab:'active',selected:null,urls:[],notifications:[]};
workspace.inspirationTaskHidden??=[];
function itEntries(){
 const entries=Object.values(workspace.videoAnalyses||{});
 for(const p of workspace.projects){
  for(const s of Object.values(workspace.accountFission?.[p.id]?.sessions||{}))if(s.analysis)entries.push(s.analysis);
  for(const c of p.chats||[])if(c.videoWorkflow)for(const run of c.videoWorkflow.runs||[])entries.push({reference:c.videoWorkflow.reference,run});
 }
 return [...new Map(entries.filter(e=>e?.reference&&e.run&&e.reference.ownerId===state.id).map(e=>[e.run.id||e.run.localId,e])).values()].filter(e=>!workspace.inspirationTaskHidden.includes(e.run.id||e.run.localId)).reverse();
}
function itStatus(r){return {completed:'已完成',needs_input:'待补充',failed:'失败',interrupted:'已中断',submitted:'生成中'}[r.status]||'进行中';}
function itKey(e){return e.run.id||e.run.localId;}
const itDialog=document.createElement('dialog');itDialog.id='inspiration-tasks';itDialog.className='it-dialog';document.body.append(itDialog);
const itNotice=document.createElement('div');itNotice.className='it-notices';itNotice.setAttribute('aria-live','polite');document.body.append(itNotice);
const itEntry=document.createElement('button');itEntry.className='it-entry';itEntry.hidden=true;itEntry.textContent='◷ 灵感任务';itEntry.onclick=()=>{IT.selected=null;itDraw();itDialog.showModal();};document.body.append(itEntry);
function itDraw(){
 const all=itEntries(),complete=all.filter(e=>e.run.status==='completed'),active=all.filter(e=>e.run.status!=='completed');
 itEntry.textContent=`◷ 灵感任务${active.length?' · '+active.length:''}`;
 if(IT.selected){itDetail();return;}
 const rows=IT.tab==='completed'?complete:active;
 itDialog.innerHTML=`<header><div><small>INSPIRATION TASKS</small><h2>灵感任务</h2></div><button data-it="close" aria-label="关闭任务中心">×</button></header><div class="it-tabs"><button data-it="active" class="${IT.tab==='active'?'selected':''}">进行中 <b>${active.length}</b></button><button data-it="completed" class="${IT.tab==='completed'?'selected':''}">已完成 <b>${complete.length}</b></button></div><p class="it-caption">当前空间的视频解析与制作任务 · 待补充和异常任务保留在进行中</p><div class="it-table"><table><thead><tr><th>参考视频</th><th>任务</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(e=>`<tr><td><div class="it-reference">${e.reference.poster?`<img src="${E(e.reference.poster)}" alt="">`:''}<b>${E(e.reference.title)}</b></div></td><td>${({analyze:'灵感解析',remake:'同款脚本',refine:'脚本编辑',generate:'视频制作',continue:'继续处理'})[e.run.action]||'灵感任务'}</td><td>${e.run.created?E(new Date(e.run.created<1e12?e.run.created*1000:e.run.created).toLocaleString()):'—'}</td><td><span class="it-status ${e.run.status==='completed'?'done':''}">${itStatus(e.run)}</span></td><td><button data-it="view" data-key="${E(itKey(e))}">查看详情</button>${!vwBusy(e.run)&&e.run.status!=='submitted'?`<button data-it="hide" data-key="${E(itKey(e))}">移除记录</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5" class="it-empty">暂无任务<br><small>在灵感库点击「查看灵感」后，解析进度会显示在这里。</small></td></tr>'}</tbody></table></div>`;
}
function itDetail(){
 const e=itEntries().find(e=>itKey(e)===IT.selected);if(!e){IT.selected=null;itDraw();return;}
 const {reference:ref,run}=e;
 itDialog.innerHTML=`<header><button data-it="back">← 任务列表</button><h2>灵感拆解</h2><button data-it="close" aria-label="关闭详情">×</button></header><div class="it-detail"><section class="it-overview"><video controls preload="metadata" poster="${E(ref.poster||'')}" aria-label="参考视频"></video><div><span class="it-status ${run.status==='completed'?'done':''}">${itStatus(run)}</span><h2>${E(ref.title)}</h2><p>${E(ref.platform||'本地视频')} · ${ref.duration?IM.time(ref.duration):'时长待识别'}</p><p role="status">${E(run.message||'')}</p>${run.connectionError?`<p>${E(run.connectionError)}</p><button data-it="resume">重新连接</button>`:''}</div></section>${run.result?vwAnalysisHTML(run.result):'<div class="it-empty">正在处理时可以关闭此面板，完成后会通知你。</div>'}</div>`;
 const video=itDialog.querySelector('video');inspirationMedia(ref.mediaId).then(file=>{if(file&&video.isConnected){const url=URL.createObjectURL(file);IT.urls.push(url);video.src=url;}});
}
vwAnalysisHTML=function(result){
 const groups=['剧情演绎','视听效果','营销属性','适用人群'];
 return `<section class="it-analysis"><h3>内容概览</h3><p class="vw-summary">${E(result.summary||'暂无内容概览')}</p>${result.conversion_path?.length?`<div class="it-path">${result.conversion_path.map(x=>`<span>${E(x)}</span>`).join('<i>→</i>')}</div>`:''}<h3>创意标签分析</h3><div class="it-tag-groups">${groups.map((g,i)=>`<section><small>${i<2?'靠什么内容吸引用户':'为什么吸引用户'}</small><h4>${g}</h4>${(result.content_tags||[]).filter(t=>t.group===g&&t.values?.length).map(t=>`<div class="it-tag"><b>${E(t.label)}</b><p>${t.values.map(v=>`<span>${E(v)}</span>`).join('')}</p><small>依据：${E(t.evidence||'待核实')}</small></div>`).join('')||'<p class="it-muted">待识别 · 暂无可靠依据</p>'}</section>`).join('')}</div><h3>分镜脚本 <small>${result.segments?.length||0} 个分镜</small></h3><div class="it-shots">${(result.segments||[]).map((s,i)=>`<article><div class="it-shot-head"><span class="it-number">${String(i+1).padStart(2,'0')}</span><h4>${E(s.title||'分镜 '+(i+1))}</h4><button data-it="seek" data-time="${Number(s.start)||0}">${IM.time(s.start)}–${IM.time(s.end)} ▷</button></div><div class="it-shot-body"><section><small>画面事实</small><p>${E(s.original)}</p></section><section><small>表达机制 · 分析判断</small><p>${E(s.mechanism||'待分析')}</p></section><div class="it-shot-facts">${[['吸睛点',s.attraction],['核心卖点',s.selling_point],['视听表达',s.visual_language]].map(([k,v])=>`<div><small>${k}</small><p>${E(v||'待识别')}</p></div>`).join('')}</div>${s.prompt?`<section class="it-prompt"><small>可借鉴的分镜提示词</small><p>${E(s.prompt)}</p><button data-it="copy">复制提示词</button></section>`:''}</div></article>`).join('')}</div>${result.uncertainties?.length?`<aside class="vw-uncertainties"><b>待核实信息</b><ul>${result.uncertainties.map(x=>`<li>${E(x)}</li>`).join('')}</ul></aside>`:''}</section>`;
};
function itNotify(ref,run){
 if(run.status!=='completed'||run.notified)return;run.notified=true;vwSave();
 IT.notifications.push({reference:ref,run});itDrawNotices();
}
function itDrawNotices(){itNotice.innerHTML=IT.notifications.map(e=>`<section><b>✓ ${e.run.action==='analyze'?'灵感解析完成':'灵感任务完成'}</b><p>${E(e.reference.title)}</p><div><button data-it="dismiss" data-key="${E(itKey(e))}">关闭</button><button data-it="notice-view" data-key="${E(itKey(e))}">查看</button></div></section>`).join('');}
document.addEventListener('inspiration-job-change',event=>{itNotify(event.detail.reference,event.detail.run);itDraw();});
const itRefresh=vwRefresh;vwRefresh=function(){itRefresh();if(!IT.selected)itDraw();};
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-it]');if(!b)return;const action=b.dataset.it,key=b.dataset.key;
 if(action==='seek'){const video=b.closest('dialog')?.querySelector('video')||document.querySelector('.vw-user-video video');if(video){video.currentTime=Number(b.dataset.time);video.play().catch(()=>{});}else toast('请在解析详情中播放参考视频');return;}
 if(action==='copy'){try{await navigator.clipboard.writeText(b.parentElement.querySelector('p').textContent);toast('分镜提示词已复制');}catch{toast('复制失败，请手动选择提示词复制');}return;}
 if(action==='close'){itDialog.close();return;}
 if(action==='notice-view'){const notice=IT.notifications.find(e=>itKey(e)===key);if(notice&&notice.reference.ownerId!==state.id)switchProject(notice.reference.ownerId);}
 if(action==='dismiss'||action==='notice-view'){IT.notifications=IT.notifications.filter(e=>itKey(e)!==key);itDrawNotices();}
 if(action==='view'||action==='notice-view'){IT.selected=key;itDraw();if(!itDialog.open)itDialog.showModal();return;}
 if(action==='back')IT.selected=null;
 if(action==='active'||action==='completed'){IT.tab=action;IT.selected=null;}
 if(action==='hide'){workspace.inspirationTaskHidden.push(key);vwSave();}
 if(action==='resume'){const e=itEntries().find(e=>itKey(e)===IT.selected);if(e)vwPoll(e.reference,e.run);}
 itDraw();
});
itDialog.addEventListener('close',()=>{IT.urls.forEach(URL.revokeObjectURL);IT.urls=[];IT.selected=null;});
itDraw();for(const e of itEntries())if(vwBusy(e.run))vwPoll(e.reference,e.run);
window.addEventListener('hashchange',()=>{IT.selected=null;itDraw();});
