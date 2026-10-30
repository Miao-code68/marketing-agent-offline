'use strict';
const IM=window.InspirationModel;
workspace.inspiration??={saved:[]};
const IS={tab:'videos',platform:'',first:'',second:'',third:'',tagOpen:false,query:'',sort:'newest',mediaKind:'video',overviewQuery:'',hotDate:'',hotStart:'',hotEnd:'',page:1,pageSize:6,collection:'all',active:null,objectURL:null,editing:false,detailTab:'info',trendPlatform:'抖音',trendType:'star',trendView:'cloud',trendKeyword:'',trendStart:'2026-10-21',trendEnd:'2026-10-27'};
const ipButton=(action,id,label,active=false)=>`<button data-r-action="${action}" data-id="${E(id)}" class="${active?'active':''}" aria-pressed="${active}">${E(label)}</button>`;

// All three libraries share rendering, taxonomy and date validation. Only their data source differs.
workspace.inspiration.saved??=[];
workspace.generatedMedia??=[]; // Completed AI outputs with a persisted mediaId; uploads are never inferred to be AI outputs.
const ipLibraryDefaults={...IS},ipLibraryStates={};let ipLibraryActive='insights';
let ipTrendSamples=[];
const ipLibraryMode=()=>['assets','asset-favorites'].includes(page)?page:'insights';
function ipNormalize(c){return {segments:[],ratio:'',summary:'',platform:'',...c,mediaType:c.mediaType||'video',category:c.category==='混合剪辑'?'混剪素材':c.category,hotDate:c.created?IM.dateKey(new Date(c.created)):c.hotDate};}
function ipSeed(value){return [...String(value||'video')].reduce((sum,char)=>sum+char.charCodeAt(0),0);}
function ipContentMeta(c){
 const seed=ipSeed(c.id||c.title);return {publishedAt:c.publishedAt||'2026/10/30',likes:c.likes??(2680+seed%6800),comments:c.comments??(86+seed%520),favorites:c.favorites??(420+seed%1900),shares:c.shares??(61+seed%640)};
}
function ipMetric(value){return Number(value||0).toLocaleString('zh-CN');}
const ipProfiles={
 commute:{tags:['生活方式','通勤场景','剧情演绎','轻松快乐','共鸣'],body:'视频从日常通勤中的疲惫时刻切入，用人物动作和环境变化把普通路程拍成一段有节奏的生活记录。前段快速建立“下班后也想留一点时间给自己”的情绪，中段用连续场景展示行动过程，结尾以轻松状态回扣主题。'},
 game:{tags:['游戏广告','操作教学','游戏玩家','好奇','成就感'],body:'视频以游戏关卡中的即时问题开场，主角先展示一次失败操作，再逐步拆出正确路径和关键动作。画面在角色全景、操作界面和局部特写之间切换，让用户不用实际试玩也能理解玩法、难点和完成后的反馈。'},
 app:{tags:['教程演示','效率工具','职场场景','实用','视觉满足感'],body:'视频围绕一个高频效率问题展开，先展示任务堆积的状态，再通过手机界面的连续操作演示整理步骤。重点信息由字幕同步标注，结尾呈现整理前后的差异，帮助用户快速判断这个方法是否适合自己的工作与生活。'},
 bottle:{tags:['产品种草','生活方式','细节展示','治愈','轻松快乐'],body:'视频以日常桌面为场景，通过手部动作、产品材质特写和使用前后的细节变化呈现体验。内容不依赖长口播，而是用连续近景让用户看清产品外观、使用方式和适合的生活场景，整体节奏舒缓。'},
 dashboard:{tags:['教程演示','职场效率','操作教学','实用','清晰'],body:'视频从杂乱信息难以推进的问题切入，随后在桌面端界面中依次展示分类、拖动和状态更新。每一步都有明确画面反馈，最后以完整看板收束，让用户快速理解工具的核心能力和实际使用流程。'},
 earbuds:{tags:['产品种草','通勤场景','体验记录','轻松快乐','共鸣'],body:'视频以通勤环境中的声音干扰为问题，主角戴上耳机后，通过环境声变化、人物表情和产品特写展示体验。画面强调佩戴方式、外观细节与移动场景，结尾回到自然放松的通勤状态。'}
};
function ipProfile(c){
 const base=ipProfiles[c.art]||{tags:[c.category||'热点','短视频','场景演绎','好奇','轻松快乐'],body:c.summary||`视频围绕“${c.title}”展开，通过开场吸引、场景推进、关键信息展示和结果收束，让用户无需完整观看也能了解主要人物、事件、内容价值与行动方向。`};
 return {tags:c.insightTags||base.tags,body:c.bodyText||base.body};
}
function ipCardMeta(c){const m=ipContentMeta(c);return `<div class="ip-card-publish">发布时间：${E(m.publishedAt)}</div><div class="ip-card-metrics"><span>赞 ${ipMetric(m.likes)}</span><span>评论 ${ipMetric(m.comments)}</span><span>收藏 ${ipMetric(m.favorites)}</span></div>`;}
function ipAllReferences(){return [...workspace.projects.flatMap(p=>p.sources.filter(s=>s.inspiration).map(s=>({...s.inspiration,id:s.id,ownerId:p.id}))),...IM.demos].map(ipNormalize);}
function ipGeneratedRows(){return workspace.generatedMedia.filter(c=>c.origin==='ai-generated'&&c.status==='completed'&&c.mediaId&&['image','video'].includes(c.mediaType)).map(c=>ipNormalize({...c,generated:true}));}
function ipIsSaved(c){return workspace.inspiration.saved.some(s=>s.id===c.id&&(s.ownerId||null)===(c.ownerId||null));}
function inspirationRows(){
 if(ipLibraryMode()==='assets')return ipGeneratedRows();
 const rows=ipAllReferences();
 const scoped=rows.filter(c=>c.demo||c.ownerId===state.id);
 return ipLibraryMode()==='asset-favorites'||IS.collection==='saved'?scoped.filter(ipIsSaved):scoped;
}
function inspirationFind(id){return inspirationRows().find(x=>x.id===id)||ipAllReferences().find(x=>x.id===id)||ipGeneratedRows().find(x=>x.id===id)||ipTrendSamples.find(x=>x.id===id);}
function ipFavoriteButton(c){const saved=ipIsSaved(c);return c.generated?'':`<button class="ip-favorite" data-r-action="ip-favorite" data-id="${E(c.id)}" aria-label="${saved?'取消收藏':'收藏'}：${E(c.title)}" aria-pressed="${saved}" data-tooltip="${saved?'取消收藏':'收藏'}">${icon('star')}</button>`;}
R.invoke('ip-favorite',b=>{
 const c=inspirationFind(b.dataset.id);if(!c||c.generated)return;
 const saved=ipIsSaved(c)?workspace.inspiration.saved.filter(s=>!(s.id===c.id&&(s.ownerId||null)===(c.ownerId||null))):[...workspace.inspiration.saved,{id:c.id,ownerId:c.ownerId||null,savedAt:Date.now()}];
 try{localStorage.setItem(workspaceKey,JSON.stringify({...workspace,inspiration:{...workspace.inspiration,saved}}));workspace.inspiration.saved=saved;persist();inspirationCards();ipNotify(ipIsSaved(c)?'已加入我的收藏':'已取消收藏');}catch{ipNotify('收藏保存失败，请重试');}
});
function ipEmptyLibrary(){
 const mode=ipLibraryMode(),hasRows=inspirationRows().length>0;
 const title=hasRows?'没有符合筛选的素材':mode==='assets'?'还没有 AI 生成的内容':mode==='asset-favorites'?'还没有收藏的灵感':'还没有素材';
 const description=hasRows?'试试其他平台、标签、时间或素材类型。':mode==='assets'?'AI 生成的图片、视频会归档在这里。':mode==='asset-favorites'?'在灵感库点击收藏，将喜欢的图片与视频收进这里。':'上传图片或视频，开始积累创作参考。';
 return `<div class="ip-empty">${icon(mode==='asset-favorites'?'star':'folder')}<h3>${title}</h3><p>${description}</p>${hasRows?'<button data-r-action="ip-reset">清除筛选</button>':''}${mode==='assets'?'<button data-r-action="wb-generate">去 Agent 创作 →</button>':mode==='asset-favorites'?'<a href="#insights">去灵感库看看 →</a>':'<button data-r-action="ip-import">添加素材</button>'}</div>`;
}
function inspirationArt(c){
  if(c.poster?.startsWith('data:image/jpeg;base64,'))return `<img src="${E(c.poster)}" alt="${E(c.title)}的素材预览">`;
  if(!c.demo)return `<div class="ip-no-poster">${icon('folder')}<span>视频资料</span></div>`;
  const bg={commute:'#dccfba',game:'#668fa8',app:'#b5c9ea',bottle:'#c6d8c2',dashboard:'#b7b5db',earbuds:'#c2c8de'}[c.art];
  const phone=`<rect x="124" y="19" width="112" height="204" rx="17" fill="#f9fbff" stroke="#fff" stroke-width="4"/><rect x="157" y="25" width="46" height="7" rx="4" fill="#bcc8da"/>`;
  let drawing='';
  if(c.art==='app')drawing=phone+`<text x="137" y="59" font-size="12" fill="#445e8f">我的一天</text>`+[0,1,2,3].map(i=>`<rect x="135" y="${73+i*33}" width="90" height="26" rx="6" fill="${i===1?'#dce9fd':'#eff2f7'}"/><circle cx="145" cy="${86+i*33}" r="4" fill="#89a9de"/><path d="M156 ${84+i*33}h55 m-55 6h36" stroke="#b1c2db" stroke-width="3"/>`).join('');
  else if(c.art==='game')drawing=`<rect x="64" y="25" width="232" height="191" rx="18" fill="#294e68"/><text x="180" y="51" text-anchor="middle" fill="#f4dfac" font-size="14">LEVEL 03</text>`+Array.from({length:20},(_,i)=>`<rect x="${81+i%5*40}" y="${66+Math.floor(i/5)*32}" width="31" height="24" rx="6" fill="${['#f6d482','#9ccdaf','#7eb5d4','#eeb7a0'][i%4]}"/>`).join('')+`<path d="M96 78v31h81v33h40" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
  else if(c.art==='dashboard')drawing=`<rect x="44" y="38" width="274" height="166" rx="12" fill="#f9faff"/><rect x="44" y="38" width="274" height="23" rx="9" fill="#d5daed"/><circle cx="58" cy="49" r="3" fill="#b09ccf"/>`+[0,1,2].map(i=>`<rect x="${57+i*83}" y="76" width="74" height="111" rx="6" fill="${['#edf0fc','#e8f0fa','#e6f1ed'][i]}"/>`+[0,1,2].map(j=>`<rect x="${63+i*83}" y="${89+j*29}" width="61" height="21" rx="4" fill="white"/><path d="M${70+i*83} ${99+j*29}h42" stroke="#b5c5da" stroke-width="3"/>`).join('')).join('');
  else if(c.art==='earbuds')drawing=`<ellipse cx="185" cy="205" rx="90" ry="12" fill="#7482a328"/><rect x="113" y="103" width="137" height="84" rx="35" fill="#fff"/><path d="M116 133h132" stroke="#d9e1ef"/><rect x="133" y="39" width="29" height="75" rx="14" fill="#f7f9fe" transform="rotate(-16 148 76)"/><rect x="200" y="39" width="29" height="75" rx="14" fill="#f7f9fe" transform="rotate(16 215 76)"/><circle cx="183" cy="157" r="3" fill="#adc3b8"/>`;
  else drawing=`<rect x="0" y="173" width="360" height="80" fill="#b7a68c55"/><path d="M38 0v173 M90 0v173" stroke="#ffffff40" stroke-width="14"/><ellipse cx="188" cy="202" rx="64" ry="12" fill="#7d725b25"/><rect x="148" y="63" width="78" height="130" rx="23" fill="${c.art==='bottle'?'#e9eedc':'#faf7ef'}"/><rect x="147" y="53" width="80" height="26" rx="10" fill="${c.art==='bottle'?'#6d8979':'#8a9da6'}"/><path d="M166 88v76" stroke="white" stroke-width="6" stroke-linecap="round"/><text x="188" y="136" text-anchor="middle" font-size="11" letter-spacing="2" fill="#9aab9c">DAILY</text><path d="M275 170v-55m0 21q-28-3-23-25q26 0 23 25m1 14q27-4 25-25q-25 2-25 25" fill="#78977f" stroke="#78977f" stroke-width="3"/>`;
  return `<svg viewBox="0 0 360 240" role="img" aria-label="${E(c.title)}：创意封面"><rect width="360" height="240" fill="${bg}"/><circle cx="310" cy="32" r="103" fill="#ffffff17"/>${drawing}</svg>`;
}
function ipSelect(id,label,values,value,placeholder='不限',disabled=false){return `<label class="ip-field"><span>${label}</span><select id="ip-${id}" ${disabled?'disabled':''}><option value="">${placeholder}</option>${values.map(x=>`<option value="${E(x)}" ${x===value?'selected':''}>${E(x)}</option>`).join('')}</select></label>`;}
function ipTaxonomyPicker(){
  const roots=IM.children(null),root=roots.find(n=>n.name_zh===IS.first);
  const fields=root?IM.children(root.id):[],field=fields.find(n=>n.name_zh===IS.second);
  const options=field?IM.children(field.id):[],path=[IS.first,IS.second,IS.third].filter(Boolean);
  const button=(level,value,label,active,hasChildren=false)=>`<button type="button" data-r-action="ip-tag-level" data-level="${level}" data-id="${E(value)}" class="${active?'active':''}" aria-pressed="${active}"><span>${E(label)}</span>${hasChildren?'<i>›</i>':''}</button>`;
  return `<div class="ip-taxonomy-field"><span>内容标签</span><details id="ip-taxonomy-picker" ${IS.tagOpen?'open':''}><summary aria-label="选择内容标签"><span>${path.length?path.map(E).join(' / '):'全部内容标签'}</span><i>⌄</i></summary><div class="ip-taxonomy-menu"><header><b>按标签树筛选</b><small>一级 → 二级 → 三级 · 标签树 v${E(IM.taxonomyVersion)}</small>${path.length?'<button type="button" data-r-action="ip-tag-clear">清除</button>':''}</header><div class="ip-taxonomy-columns"><section><h3>一级标签</h3>${roots.map(n=>button('first',n.name_zh,n.name_zh,n.name_zh===IS.first,IM.children(n.id).length>0)).join('')}</section><section class="${root?'':'disabled'}"><h3>二级标签</h3>${root?fields.map(n=>button('second',n.name_zh,n.name_zh,n.name_zh===IS.second,IM.children(n.id).length>0)).join(''):'<p>请先选择一级标签</p>'}</section><section class="${field?'':'disabled'}"><h3>三级标签</h3>${field?(field.type==='value'?`<label class="ip-taxonomy-text">整体概述关键词<input id="ip-overview" placeholder="输入关键词筛选概述" value="${E(IS.overviewQuery)}"></label>`:options.map(n=>button('third',n.name_zh,n.name_zh,n.name_zh===IS.third)).join('')):'<p>请先选择二级标签</p>'}</section></div><footer>${path.length?`当前范围：${path.map(E).join(' › ')}`:'选择任意层级即可筛选，继续向右可缩小范围'}</footer></div></details></div>`;
}
function inspirationFilters(){
  return `<section class="ip-filters" aria-label="素材筛选"><div class="ip-filter-grid">${ipSelect('platform','来源平台',ipPlatforms(),IS.platform,'全部平台')}<div class="ip-field"><span>热点时间</span><button id="ip-hot-date" type="button" aria-haspopup="dialog" aria-controls="ip-date-picker" aria-expanded="false" title="${E(ipRangeLabel())}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/></svg><span>${E(ipRangeLabel())}</span><span aria-hidden="true">⌄</span></button></div>${ipTaxonomyPicker()}<div class="ip-filter-tools"><span>上传时间 · 近 30 天</span><button class="ip-reset" data-r-action="ip-reset">重置筛选 ↺</button></div></div>${IS.hotStart?'<div class="ip-filter-bottom">仅显示所选时间范围内的素材，热点时间取素材上传时间。</div>':''}</section>`;
}
function inspirationCards(){
  stopInlineVideo();
  const pool=inspirationRows().filter(x=>(IS.collection!=='mine'||!x.demo)&&x.mediaType===IS.mediaKind),rows=IM.filterRows(pool,IS);
  const pages=Math.max(1,Math.ceil(rows.length/IS.pageSize));IS.page=Math.min(Math.max(1,IS.page),pages);
  $('#ip-count').textContent=rows.length;
  $('#ip-grid').classList.toggle('ip-image-wall',IS.mediaKind==='image');
  $('#ip-grid').innerHTML=rows.slice((IS.page-1)*IS.pageSize,IS.page*IS.pageSize).map(c=>`<article class="ip-card" data-clip="${E(c.id)}"><div class="ip-cover">${inspirationArt(c)}<span class="ip-platform-badge">${E(c.platform)}</span><span class="ip-duration">${c.mediaType==='image'?'图片':IM.time(c.duration)}</span><div class="ip-hover"><div class="ip-card-actions"><button data-r-action="${c.generated?'ip-expand':'ip-open'}" data-id="${E(c.id)}">${icon('eye')}${c.generated?'预览内容':'查看灵感'}</button></div></div><div class="ip-inline-host" hidden></div></div><div class="ip-card-copy"><div class="ip-card-title"><h3>${E(c.title)}</h3>${ipFavoriteButton(c)}${!c.demo&&!c.generated&&ipLibraryMode()==='insights'?`<button class="ip-card-delete" data-r-action="ip-delete" data-id="${E(c.id)}" aria-label="删除 ${E(c.title)}" data-tooltip="删除">${icon('trash')}</button>`:''}</div><div class="ip-card-tags">${c.category?`<span>${E(c.category)}</span>`:''}${c.tagging?.status==='pending'?'<span class="ip-ai-pending">待 AI 识别</span>':''}<span>${E(c.ratio)}</span></div>${ipCardMeta(c)}</div></article>`).join('')||ipEmptyLibrary();
  const visible=Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-IS.page)<=1);let last=0;
  $('#ip-pagination').innerHTML=`<span>共 ${rows.length} 条</span><label>每页 <select id="ip-page-size" aria-label="每页条数">${[6,12,24].map(n=>`<option value="${n}" ${IS.pageSize===n?'selected':''}>${n} 条</option>`).join('')}</select></label><div class="ip-page-buttons"><button data-r-action="ip-page" data-id="${IS.page-1}" aria-label="上一页" ${IS.page===1?'disabled':''}>‹</button>${visible.map(n=>{const gap=n-last>1?'<span>…</span>':'';last=n;return gap+`<button data-r-action="ip-page" data-id="${n}" ${n===IS.page?'aria-current="page" class="active"':''}>${n}</button>`;}).join('')}<button data-r-action="ip-page" data-id="${IS.page+1}" aria-label="下一页" ${IS.page===pages?'disabled':''}>›</button></div><span>${IS.page} / ${pages} 页</span>`;
  $('#ip-page-size').onchange=e=>{IS.pageSize=Number(e.target.value);IS.page=1;inspirationCards();};
  document.querySelectorAll('.ip-card').forEach(card=>card.addEventListener('mouseleave',()=>{if(inlineVideo.id===card.dataset.clip)stopInlineVideo();}));
}

const ipTrendPlatforms=['抖音','快手','小红书','红果短剧','B站'];
const ipTrendType={label:'热梗词云',hint:'汇总近期有记忆点、适合借势和二创的表达',color:'#7357ea',soft:'#f0edff',words:['烧心','牛来','中国人能飞','omg你吓到我了','我不知道您到底是怎么了','随橙想呢？','不知道','我的身材很曼妙','我要验牌','不是吧阿sir','包出片的','好一个抽象圣体','这把高端局','邪修上分法','情绪价值拉满','轻轻松松拿下','被硬控三十秒','主打一个听劝','赛博功德＋1','这段掐了别播','谁懂啊','尊嘟假嘟','这合理吗','是我站得还不够高吗','这谁顶得住','你礼貌吗','可以但没必要','怎么个事儿','为什么会这样','到底是谁在用','拿捏住了','天塌了有我的嘴顶着','这很难评','水灵灵地出现了','全网都在等一个结局','一整个爱住','听劝式改造','抽象但有用','这泼天的富贵','你先别急','评论区比正片精彩','好好好这么玩是吧','谁允许你这么会的','不懂但大受震撼','又幸福了姐','一眼万年','反向种草成功','显眼包实锤','给我干哪来了','情绪稳定不了一点']};
const ipTrendTitles={
 '抖音':['下班后的 30 分钟，原来可以这样过','把通勤拍成电影感，三步就够了','租房党的一平米幸福改造','挑战一周不点外卖，结果真香了','新手第一次尝试，避开这三个坑'],
 '快手':['普通人的真实一天，最后太治愈了','花小钱也能有的生活仪式感','老物件别扔，这样改还能用十年','小城周末路线，跟着走不踩雷','一分钟学会，家里人都夸实用'],
 '小红书':['低成本松弛感生活清单','一平米也能拥有的治愈角落','实测五种方法，终于找到答案','不费力通勤穿搭公式','新手入门先看这一篇'],
 '红果短剧':['重来一次，她先把自己放在第一位','所有人都不看好，他却做成了','身份揭晓的那一刻，全场沉默','误会解除后，他终于说出真相','看似偶然的相遇，原来早有安排'],
 'B站':['我用七天验证了这个热门方法','从零开始的完整实测记录','为什么这件事突然火了','十分钟讲清背后的运行逻辑','低预算复刻，效果到底怎么样']
};
function ipTrendRows(){
 const shift=ipTrendPlatforms.indexOf(IS.trendPlatform);return ipTrendType.words.map((word,i)=>({word,score:Math.max(54,98-(i%13)*3-((shift+i)%4)),count:560+((i*137+shift*53)%1820),change:8+((i*7+shift*3)%34)}));
}
function ipTrendCloud(rows,type){return `<div class="ip-trend-cloud" style="--trend:${type.color};--trend-soft:${type.soft}" aria-label="${type.label}词云">${rows.map((r,i)=>`<button data-r-action="ip-trend-word" data-id="${E(r.word)}" class="${IS.trendKeyword===r.word||(!IS.trendKeyword&&i===0)?'active':''}" style="--size:${15+Math.round(r.score/9)}px;--delay:${i*18}ms" aria-pressed="${IS.trendKeyword===r.word||(!IS.trendKeyword&&i===0)}">${E(r.word)}</button>`).join('')}</div>`;}
function ipTrendList(rows,type){return `<div class="ip-trend-table-wrap"><table class="ip-trend-table"><thead><tr><th>排名</th><th>${type.label}</th><th>内容量</th><th>趋势</th><th>热度指数</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${IS.trendKeyword===r.word||(!IS.trendKeyword&&i===0)?'active':''}"><td><b>${i+1}</b></td><td><button data-r-action="ip-trend-word" data-id="${E(r.word)}">${E(r.word)}</button></td><td>${r.count.toLocaleString()}</td><td class="${r.change>=0?'up':'down'}">${r.change>=0?'↑':'↓'} ${Math.abs(r.change)}%</td><td><span style="width:${r.score}%"></span>${r.score}</td></tr>`).join('')}</tbody></table></div>`;}
function ipTrendTopFive(rows){
 const word=IS.trendKeyword||rows[0].word,titles=ipTrendTitles[IS.trendPlatform]||ipTrendTitles['抖音'],references=ipAllReferences();
 const used=new Set();ipTrendSamples=titles.map((title,index)=>{const kind='video';let source=references.find(row=>!used.has(row.id)&&row.mediaType===kind&&row.platform===IS.trendPlatform)||references.find(row=>!used.has(row.id)&&row.mediaType===kind)||references.find(row=>!used.has(row.id))||references[index%references.length]||{};if(source.id)used.add(source.id);return {...source,id:`trend-${IS.trendPlatform}-${index}`,title,platform:IS.trendPlatform,mediaType:kind,category:'热点视频',summary:`围绕“${word}”的高热内容样本，通过具体场景、人物行动和结果变化完整呈现主题。`,demo:true,art:source.art||['commute','app','bottle','game','dashboard'][index],mediaId:source.mediaId,poster:source.poster,segments:source.segments||[],publishedAt:'2026/10/30',likes:8420-index*736,comments:512-index*47,favorites:1680-index*126,shares:730-index*58,insightTags:['热点',index%2?'剧情演绎':'生活方式',index%2?'兴趣用户':'泛内容用户',index%3?'轻松快乐':'好奇','共鸣']};});
 const samples=ipTrendSamples;
 return `<section class="ip-trend-top"><header><div><span>TOP 5 CONTENT</span><h2>“${E(word)}” 参考视频</h2><p>${E(IS.trendPlatform)} · ${E(IS.trendStart)} 至 ${E(IS.trendEnd)}</p></div><small>悬停查看灵感</small></header><div class="ip-trend-content-grid">${samples.map((sample,i)=>`<article class="ip-trend-card" data-clip="${E(sample.id)}"><div class="ip-trend-poster poster-${i+1}"><b>${i+1}</b><div class="ip-trend-source"><span>${E(sample.platform||IS.trendPlatform)}</span><span>视频</span></div><i class="ip-trend-play-mark">▶</i><div class="ip-hover"><div class="ip-card-actions"><button data-r-action="ip-open" data-id="${E(sample.id)}">${icon('eye')}查看灵感</button></div></div></div><div><h3>${E(sample.title)}</h3><p>#${E(word)} · 来源：${E(sample.platform||IS.trendPlatform)}</p>${ipCardMeta(sample)}</div></article>`).join('')}</div></section>`;
}
function renderTrendInsights(){
 const type=ipTrendType,rows=ipTrendRows();
  $('#view').innerHTML=`<div class="ip-page ip-trend-page"><div class="ip-heading"><div><div class="eyebrow">CONTENT INSIGHTS</div><h1>灵感库</h1><p>按平台发现正在走热的内容词，快速查看相关内容样本。</p></div><span class="ip-trend-demo">交互示例 · 实时数据服务未接入</span></div><div class="ip-view-tabs">${ipButton('ip-tab','videos','内容洞察',false)}${ipButton('ip-tab','trends','热点洞察',true)}</div><section class="ip-trend-controls"><div class="ip-trend-control-row"><b>来源平台</b><div class="ip-trend-platforms">${ipTrendPlatforms.map(p=>ipButton('ip-trend-platform',p,p,IS.trendPlatform===p)).join('')}</div></div><div class="ip-trend-control-row"><b>热点时间</b><div class="ip-trend-dates"><label>开始日期<input id="ip-trend-start" type="date" value="${E(IS.trendStart)}" max="${E(IS.trendEnd)}"></label><span>至</span><label>结束日期<input id="ip-trend-end" type="date" value="${E(IS.trendEnd)}" min="${E(IS.trendStart)}" max="2026-10-27"></label></div></div></section><section class="ip-trend-panel ip-trend-unified"><div class="ip-trend-main"><div class="ip-trend-main-head"><div class="ip-trend-summary"><div><span style="background:${type.soft};color:${type.color}">${type.label}</span><b>${E(IS.trendPlatform)}近期内容热词</b><small>${type.hint}</small></div><p>点击任意词语，下方同步显示对应 Top 视频。</p></div><div class="ip-trend-view" aria-label="呈现方式">${ipButton('ip-trend-view','cloud','◉ 词云图',IS.trendView==='cloud')}${ipButton('ip-trend-view','list','▦ 数据列表',IS.trendView==='list')}</div></div>${IS.trendView==='cloud'?ipTrendCloud(rows,type):ipTrendList(rows,type)}</div></section>${ipTrendTopFive(rows)}</div>`;
 const start=$('#ip-trend-start'),end=$('#ip-trend-end');
 start.onchange=e=>{IS.trendStart=e.target.value;if(IS.trendEnd<IS.trendStart)IS.trendEnd=IS.trendStart;render();};
 end.onchange=e=>{IS.trendEnd=e.target.value;if(IS.trendStart>IS.trendEnd)IS.trendStart=IS.trendEnd;render();};
}
function renderInspirationLibrary(){
  const mode=ipLibraryMode(),isAssets=mode!=='insights',generated=mode==='assets';
  if(mode!==ipLibraryActive){ipLibraryStates[ipLibraryActive]={...IS};Object.assign(IS,ipLibraryStates[mode]||ipLibraryDefaults);ipLibraryActive=mode;}
  if(isAssets){IS.collection='all';IS.tab='videos';}else IS.mediaKind='video';
  if(!isAssets&&IS.tab==='trends'){renderTrendInsights();return;}
  const title=generated?'AI 成片库':isAssets?'创意收藏':'内容洞察';
  const desc=generated?'集中管理 AI 生成的图片与视频，随时回看与继续创作。':isAssets?'从灵感库收藏的图片与视频，让好创意随时可用。':'发现值得借鉴的表达，把参考变成自己的创作。';
  $('#view').innerHTML=`<div class="ip-page"><div class="ip-heading"><div><div class="eyebrow">${isAssets?'MY ASSETS':'CREATIVE INSPIRATION'}</div><h1>${isAssets?title:'灵感库'}</h1><p>${desc}</p></div>${generated?'<button class="solid" data-r-action="wb-generate">＋ 去 Agent 创作</button>':isAssets?'<a class="soft" href="#insights">浏览内容洞察 →</a>':'<button class="solid" data-r-action="ip-import">＋ 添加素材</button>'}</div><div class="ip-view-tabs">${isAssets?`<a href="#assets" class="${generated?'active':''}">AI 成片库</a>`:`${ipButton('ip-tab','videos','内容洞察',true)}${ipButton('ip-tab','trends','热点洞察',false)}`}</div>${inspirationFilters()}${isAssets?`<div class="ip-media-tabs">${['video','image'].map(k=>ipButton('ip-kind',k,k==='video'?'视频':'图片',IS.mediaKind===k)).join('')}</div>`:''}<div class="ip-results-bar"><div><b>${title} <span id="ip-count"></span></b></div><div>${isAssets?'':'<button class="ip-continue-upload" data-r-action="ip-import-more">＋ 本地上传</button>'}<input id="ip-query" aria-label="搜索素材" placeholder="搜索标题、内容或关键词" value="${E(IS.query)}"><select id="ip-sort" aria-label="素材排序"><option value="newest">最近添加</option><option value="duration" ${IS.sort==='duration'?'selected':''}>时长从短到长</option></select>${isAssets?'':`<div class="ip-collection-tabs" aria-label="灵感收藏范围">${ipButton('ip-collection','all','全部灵感',IS.collection!=='saved')}${ipButton('ip-collection','saved','我的收藏',IS.collection==='saved')}</div>`}</div></div><div class="ip-grid" id="ip-grid"></div><nav id="ip-pagination" class="ip-pagination" aria-label="素材分页"></nav></div>`;
  inspirationCards();
  $('#ip-hot-date').onclick=ipOpenDatePicker;
  const taxonomyPicker=$('#ip-taxonomy-picker');if(taxonomyPicker)taxonomyPicker.ontoggle=()=>{IS.tagOpen=taxonomyPicker.open;};
  for(const [id,key] of [['query','query'],['sort','sort'],['overview','overviewQuery']]){const el=$('#ip-'+id);if(el)el[el.tagName==='INPUT'?'oninput':'onchange']=e=>{IS[key]=e.target.value;IS.page=1;inspirationCards();};}
  for(const key of ['platform']){const el=$('#ip-'+key);if(el)el.onchange=e=>{
    const value=e.target.value;
    IS[key]=value;IS.page=1;
    if(key==='first'){IS.second='';IS.third='';IS.overviewQuery='';}
    if(key==='second'){IS.third='';IS.overviewQuery='';}
    render();
  };}
}
R.views.insights=renderInspirationLibrary;
R.views.assets=renderInspirationLibrary;
R.views['asset-favorites']=renderInspirationLibrary;
pages['asset-favorites']=['star','创意收藏'];
const beforeInspirationRender=render;
render=function(){ipDatePicker.hidePopover();stopInlineVideo();if(!['insights','assets','asset-favorites'].includes(page)){if(ipLarge.open)ipLarge.close();if(ipDrawer.open)ipDrawer.close();}beforeInspirationRender();$('#app').classList.toggle('inspiration-page',['insights','assets','asset-favorites'].includes(page));};
R.invoke('ip-kind',b=>{IS.mediaKind=b.dataset.id;IS.page=1;render();});
R.invoke('ip-tab',b=>{IS.tab=b.dataset.id;IS.trendKeyword='';render();});
R.invoke('ip-trend-platform',b=>{IS.trendPlatform=b.dataset.id;IS.trendKeyword='';render();});
R.invoke('ip-trend-type',b=>{IS.trendType=b.dataset.id;IS.trendKeyword='';render();});
R.invoke('ip-trend-view',b=>{IS.trendView=b.dataset.id;render();});
R.invoke('ip-trend-word',b=>{IS.trendKeyword=b.dataset.id;render();});
R.invoke('ip-tag-level',b=>{const level=b.dataset.level,value=b.dataset.id;if(level==='first'){IS.first=value;IS.second='';IS.third='';IS.overviewQuery='';IS.tagOpen=true;}else if(level==='second'){IS.second=value;IS.third='';IS.overviewQuery='';IS.tagOpen=true;}else{IS.third=value;IS.tagOpen=false;}IS.page=1;render();});
R.invoke('ip-tag-clear',()=>{Object.assign(IS,{first:'',second:'',third:'',overviewQuery:'',tagOpen:true,page:1});render();});
R.invoke('ip-reset',()=>{Object.assign(IS,{platform:'',first:'',second:'',third:'',tagOpen:false,query:'',overviewQuery:'',hotDate:'',hotStart:'',hotEnd:'',collection:'all',page:1});render();});
R.invoke('ip-collection',button=>{IS.collection=button.dataset.id;IS.page=1;render();});
R.invoke('ip-page',b=>{IS.page=Number(b.dataset.id);inspirationCards();$('#ip-grid').scrollIntoView({block:'start',behavior:'smooth'});});
const oldProductionStep=R.actions['production-step'];R.invoke('production-step',b=>{if(b.dataset.id==='inspiration'){IS.tab='videos';location.hash='insights';}else oldProductionStep(b);});

// Media stays in this browser; no file is uploaded to an external service.
function inspirationDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('mkt-inspiration-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('videos');r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);});}
async function inspirationMedia(id,value){const db=await inspirationDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('videos',value?'readwrite':'readonly'),req=value?tx.objectStore('videos').put(value,id):tx.objectStore('videos').get(id);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('视频保存中断'));});}finally{db.close();}}
// Each player owns its object URL. Tokens prevent stale IndexedDB reads from restarting a closed player.
const inlineVideo={id:null,url:null,token:0,host:null};
function stopInlineVideo(){
  inlineVideo.token++;const host=inlineVideo.host;
  if(host){const video=host.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}host.innerHTML='';host.hidden=true;host.closest('.ip-cover')?.classList.remove('is-playing');}
  if(inlineVideo.url)URL.revokeObjectURL(inlineVideo.url);
  Object.assign(inlineVideo,{id:null,url:null,host:null});
}
function ipMissing(c){return `<div class="ip-missing"><b>尚未关联原视频</b><p>当前素材只有封面与脚本文本</p><button data-r-action="ip-import-reference" data-id="${E(c.id)}">添加原视频</button></div>`;}
R.invoke('ip-import-reference',b=>{const c=inspirationFind(b.dataset.id);stopInlineVideo();if(ipLarge.open)ipLarge.close();if(c)IS.platform=c.platform;R.actions['ip-import']();});
R.invoke('ip-play',async b=>{
  const c=inspirationFind(b.dataset.id),card=b.closest('.ip-card');if(!c||!card)return;
  stopInlineVideo();const token=inlineVideo.token,host=card.querySelector('.ip-inline-host');Object.assign(inlineVideo,{id:c.id,host});host.hidden=false;card.querySelector('.ip-cover').classList.add('is-playing');
  host.innerHTML=`<div class="ip-inline-tools"><button data-r-action="ip-expand" data-id="${E(c.id)}" aria-label="大窗播放">⛶</button><button data-r-action="ip-stop" aria-label="关闭小窗">×</button></div>${c.mediaId?'<video controls playsinline muted preload="metadata" aria-label="小窗视频播放器"></video><span class="ip-video-status" role="status">正在读取视频…</span>':ipMissing(c)}`;
  if(!c.mediaId)return;
  try{const file=await inspirationMedia(c.mediaId);if(token!==inlineVideo.token)return;if(!file)throw Error('未找到本地视频，请重新添加。');inlineVideo.url=URL.createObjectURL(file);const v=host.querySelector('video');v.src=inlineVideo.url;v.onloadeddata=()=>host.querySelector('.ip-video-status')?.remove();v.onerror=()=>{if(token===inlineVideo.token){let status=host.querySelector('.ip-video-status');if(!status){status=document.createElement('span');status.className='ip-video-status';host.append(status);}status.textContent='无法播放此视频，请尝试其他格式。';}};await v.play().catch(()=>{if(token===inlineVideo.token)host.querySelector('.ip-video-status')?.remove();});}catch(e){if(token===inlineVideo.token)host.querySelector('.ip-video-status').textContent=e.message;}
});
R.invoke('ip-stop',stopInlineVideo);
const ipLarge=document.createElement('dialog');ipLarge.id='inspiration-player';ipLarge.setAttribute('aria-label','视频大窗播放');document.body.append(ipLarge);
let largeURL=null,largeToken=0;
function stopLargeVideo(){largeToken++;const v=ipLarge.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load();}if(largeURL)URL.revokeObjectURL(largeURL);largeURL=null;}
ipLarge.addEventListener('close',()=>{stopLargeVideo();ipLarge.innerHTML='';});ipLarge.addEventListener('click',e=>{if(e.target===ipLarge)ipLarge.close();});
R.invoke('ip-player-close',()=>ipLarge.close());
R.invoke('ip-expand',async b=>{
  const c=inspirationFind(b.dataset.id);if(!c)return;if(c.mediaType==='image')return openInspirationImage(c);const seek=inlineVideo.host?.querySelector('video')?.currentTime||0;
  stopInlineVideo();stopLargeVideo();const token=largeToken;
  ipLarge.innerHTML=`<div class="ip-large-panel"><div class="ip-large-header"><div><small>视频播放</small><h2>${E(c.title)}</h2></div><button data-r-action="ip-player-close" aria-label="关闭大窗播放">×</button></div><div class="ip-large-stage">${c.mediaId?'<video id="ip-large-video" controls playsinline preload="metadata" aria-label="大窗视频播放器"></video><p id="ip-large-status" role="status">正在读取视频…</p>':ipMissing(c)}</div><div class="ip-large-caption">${c.demo?'内置创意参考 · 未关联原视频':'本地视频'}<span>Esc 关闭</span></div></div>`;
  ipLarge.showModal();if(!c.mediaId)return;
  try{const file=await inspirationMedia(c.mediaId);if(token!==largeToken||!ipLarge.open)return;if(!file)throw Error('当前浏览器未找到视频文件，请重新添加。');largeURL=URL.createObjectURL(file);const v=$('#ip-large-video');v.src=largeURL;v.onloadedmetadata=()=>{v.currentTime=Math.min(seek,v.duration);};v.onloadeddata=()=>{$('#ip-large-status').textContent='';};v.onerror=()=>{$('#ip-large-status').textContent='视频无法播放，请尝试其他格式。';};await v.play().catch(()=>{});}catch(e){if(token===largeToken&&ipLarge.open)$('#ip-large-status').textContent=e.message;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopInlineVideo();ipLarge.querySelector('video')?.pause();$('#ip-player')?.pause();}});

function releaseInspirationVideo(){const video=$('#ip-player');if(video){video.pause();video.removeAttribute('src');video.load();}if(IS.objectURL){URL.revokeObjectURL(IS.objectURL);IS.objectURL=null;}}
const ipDrawer=document.createElement('dialog');ipDrawer.id='inspiration-drawer';ipDrawer.setAttribute('aria-label','灵感分段拆解');document.body.append(ipDrawer);
ipDrawer.addEventListener('close',()=>{releaseInspirationVideo();IS.active=null;});ipDrawer.addEventListener('click',e=>{if(e.target===ipDrawer)ipDrawer.close();});
R.invoke('ip-open',b=>openInspiration(b.dataset.id));
R.invoke('ip-close',()=>ipDrawer.close());
async function openInspiration(id){
  const c=inspirationFind(id);if(!c)return;if(c.mediaType==='image')return openInspirationImage(c);stopInlineVideo();releaseInspirationVideo();IS.active=id;IS.editing=false;IS.detailTab='info';
  const meta=ipContentMeta(c),profile=ipProfile(c),tags=profile.tags.map(tag=>`<span>${E(tag)}</span>`).join('');
  ipDrawer.innerHTML=`<header class="ip-drawer-head"><div><small>CREATIVE BREAKDOWN</small><h2>查看灵感</h2></div><button data-r-action="ip-close" aria-label="关闭灵感详情">×</button></header><div class="ip-drawer-body"><div class="ip-detail-layout"><aside class="ip-detail-media"><div class="ip-detail-preview">${c.mediaId?'<video id="ip-player" controls playsinline preload="metadata"></video><p id="ip-media-status">读取本地视频…</p>':inspirationArt(c)}</div><div class="ip-detail-media-note"><b>${E(c.platform||'内容平台')}</b><span>${E(meta.publishedAt)} 发布</span></div></aside><section class="ip-detail-main"><div class="ip-detail-intro"><small>${E(c.platform||'内容平台')} · 视频</small><h2>${E(c.title)}</h2><p>${E(profile.body)}</p><div class="ip-insight-tags" id="ip-analysis-tags">${tags}</div><div class="ip-detail-actions"><button data-r-action="ip-remake-white" data-id="${E(c.id)}" data-tooltip="基于视频原脚本白模预演生成新视频" aria-label="复刻同款：基于视频原脚本白模预演生成新视频">${icon('spark')}复刻同款</button><button data-r-action="ip-remake-script" data-id="${E(c.id)}" data-tooltip="基于视频脚本，生成贴合tt语音的新脚本进行视频二创" aria-label="视频二创：基于视频脚本，生成贴合tt语音的新脚本进行视频二创">${icon('pen')}视频二创</button></div></div><nav class="ip-detail-tabs" aria-label="灵感详情"><button class="active" data-r-action="ip-detail-tab" data-id="info">内容信息</button><button data-r-action="ip-detail-tab" data-id="summary">内容概要</button><button data-r-action="ip-detail-tab" data-id="storyboard">脚本拆解</button></nav><div class="ip-detail-panels"><section data-ip-detail-panel="info"><div class="ip-info-grid"><div><span>平台来源</span><b>${E(c.platform||'未标注')}</b></div><div><span>发布时间</span><b>${E(meta.publishedAt)}</b></div><div><span>点赞数</span><b>${ipMetric(meta.likes)}</b></div><div><span>评论数</span><b>${ipMetric(meta.comments)}</b></div><div><span>收藏数</span><b>${ipMetric(meta.favorites)}</b></div><div><span>转发数</span><b>${ipMetric(meta.shares)}</b></div></div></section><section data-ip-detail-panel="summary" hidden><div class="ip-summary-panel"><h3>视频特点</h3><div class="ip-insight-tags">${tags}</div><h3>主要内容</h3><p id="ip-summary">${E(profile.body)}</p></div></section><section data-ip-detail-panel="storyboard" hidden><div class="ip-breakdown-heading"><h3>脚本拆解 <small>${c.segments.length} 个时间段</small></h3><p>从主角形象、画面风格和关键画面元素理解视频表达。</p></div><div id="ip-segments"></div></section></div></section></div></div>`;
  drawInspirationSegments(c);if(!ipDrawer.open)ipDrawer.showModal();
  if(c.mediaId){try{const file=await inspirationMedia(c.mediaId);if(IS.active!==id||!ipDrawer.open)return;if(!file)throw Error('当前浏览器未找到原视频，请重新添加。');IS.objectURL=URL.createObjectURL(file);$('#ip-player').src=IS.objectURL;$('#ip-media-status').textContent='本地视频 · 点击时间段可定位播放';}catch(e){if(IS.active===id)$('#ip-media-status').textContent=e.message;}}
}
R.invoke('ip-detail-tab',b=>{IS.detailTab=b.dataset.id;ipDrawer.querySelectorAll('.ip-detail-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.id===IS.detailTab));ipDrawer.querySelectorAll('[data-ip-detail-panel]').forEach(panel=>panel.hidden=panel.dataset.ipDetailPanel!==IS.detailTab);});
function drawInspirationSegments(c){$('#ip-segments').innerHTML=c.segments.length?`<div class="ip-segment-columns ip-storyboard"><span>时间段</span><span>分镜内容</span></div><div class="ip-segment-list">${c.segments.map((s,i)=>`<article class="ip-segment ip-storyboard"><div class="ip-segment-time"><span>${String(i+1).padStart(2,'0')}</span>${c.mediaId?`<button data-r-action="ip-seek" data-id="${s.start}">${IM.time(s.start)}–${IM.time(s.end)} ▷</button>`:`<b>${IM.time(s.start)}–${IM.time(s.end)}</b>`}</div><div class="ip-original"><small>分镜内容</small><p>${E(s.original)}</p></div></article>`).join('')}</div>`:`<div class="ip-empty"><h3>这条视频还没有分镜脚本</h3><p>当前仅展示已有的内容概要。</p></div>`;}
R.invoke('ip-seek',b=>{const v=$('#ip-player');if(v?.src){v.currentTime=Number(b.dataset.id);v.play().catch(()=>toast('请在视频播放器中点击播放'));}});
R.invoke('ip-edit-segments',()=>{
  const c=inspirationFind(IS.active);if(!c||c.demo)return;IS.editing=true;
  $('#ip-segments').innerHTML='<form id="ip-segment-form"><p class="ip-edit-note">时间单位为秒。填写原片里实际发生的内容，再单独说明可借鉴机制。</p><div id="ip-edit-rows"></div><button type="button" id="ip-add-segment">＋ 添加时间段</button><div class="ip-edit-actions"><button type="button" id="ip-cancel-edit">取消</button><button class="solid" type="submit">保存拆解</button></div><p id="ip-segment-error" role="alert"></p></form>';
  const add=s=>{const row=document.createElement('div');row.className='ip-segment-edit';row.innerHTML=`<div><label>开始（秒）<input name="start" type="number" min="0" step="0.1" required value="${s.start}"></label><label>结束（秒）<input name="end" type="number" min="0" step="0.1" required value="${s.end}"></label><button type="button" aria-label="移除此时间段">×</button></div><label>原片内容<textarea name="original" required maxlength="4000">${E(s.original)}</textarea></label><label>可借鉴机制<textarea name="mechanism" required maxlength="4000">${E(s.mechanism)}</textarea></label>`;row.querySelector('button').onclick=()=>row.remove();$('#ip-edit-rows').append(row);};
  (c.segments.length?c.segments:[{start:0,end:Math.min(5,c.duration),original:'',mechanism:''}]).forEach(add);
  $('#ip-add-segment').onclick=()=>{const last=$('#ip-edit-rows').lastElementChild;const start=last?Number(last.querySelector('[name=end]').value):0;add({start,end:Math.min(start+5,c.duration),original:'',mechanism:''});};
  $('#ip-cancel-edit').onclick=()=>{IS.editing=false;drawInspirationSegments(c);};
  $('#ip-segment-form').onsubmit=e=>{e.preventDefault();try{const segments=[...document.querySelectorAll('.ip-segment-edit')].map(row=>({start:Number(row.querySelector('[name=start]').value),end:Number(row.querySelector('[name=end]').value),original:row.querySelector('[name=original]').value.trim(),mechanism:row.querySelector('[name=mechanism]').value.trim()}));IM.validateSegments(segments,c.duration);workspace.projects.find(p=>p.id===(c.ownerId||state.id)).sources.find(s=>s.id===c.id).inspiration.segments=segments;persist();inspirationCards();openInspiration(c.id);}catch(error){$('#ip-segment-error').textContent=error.message;}};
});
R.invoke('ip-remake',b=>{
  const c=inspirationFind(b.dataset.id);if(!c)return;const selected=b.dataset.segment!==undefined?[c.segments[Number(b.dataset.segment)]]:c.segments;
  const reference={id:c.id,title:c.title,platform:c.platform,demo:!!c.demo,segments:selected};
  ipDrawer.close();if(ipLarge.open)ipLarge.close();draftForm();$('#modal-title').textContent='制作同款 · 原创改编';$('#modal-desc').textContent='参考结构与表达机制已带入。补充自己的产品事实，生成可编辑的脚本草稿。';
  $('#modal-fields [name=title]').value=c.title+' · 原创改编';$('#modal-fields [name=format]').value=c.mediaType==='image'?'图文文案':'短视频脚本';const channel=$('#modal-fields [name=channel]');if(![...channel.options].some(o=>o.value===c.platform))channel.add(new Option(c.platform,c.platform));channel.value=c.platform;
  $('#modal-fields').insertAdjacentHTML('afterbegin',`<div class="ip-remake-reference"><b>参考：${E(c.title)}</b><p>${selected.map(s=>`${IM.time(s.start)}–${IM.time(s.end)} · ${E(s.mechanism)}`).join('<br>')||'暂无拆解，可先记录自己的内容方向。'}</p><small>${c.demo?'来源为内置创意参考；':'来源为用户添加的素材；'}借鉴表达方式，请使用自己的画面与产品事实。</small></div>`);
  const save=saveHandler;saveHandler=v=>{save(v);const draft=state.drafts[state.drafts.length-1];draft.inspirationReference=reference;if(selected.length)draft.body+=`\n\n【参考结构 · 待原创改编】\n`+selected.map(s=>`${IM.time(s.start)}–${IM.time(s.end)}\n可借鉴机制：${s.mechanism}\n我的画面与表达：［结合已提供的产品事实补充］`).join('\n\n');};
});

const ipImport=document.createElement('dialog');ipImport.id='inspiration-import';ipImport.setAttribute('aria-label','添加素材');document.body.append(ipImport);
const ipPicker=document.createElement('dialog');ipPicker.id='ip-upload-picker';ipPicker.setAttribute('aria-label','上传素材');document.body.append(ipPicker);
const IU={kind:'video',platform:'',owner:null,rows:[],selected:[],busy:false};
const ipCloud='<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M17 43C-2 43-2 18 14 16C18-5 47-3 51 18C69 21 66 43 49 43H38V28h9L32 12 17 28h9v15Z" fill="currentColor"/></svg>';
function ipUploadGuidance(kind){return kind==='video'?'<p>单个视频不超过 100 MB</p><small>支持 MP4、WebM、MOV（需浏览器可解码）；建议视频码率 ≥1000 kbps、音频 ≥32 kbps</small>':'<p>建议文件大小不超过 400 KB</p><small>支持 JPG、PNG、WebP；本地上传单张上限 10 MB</small>';}
function ipUploadDraw(){
 const rows=IU.rows.filter(r=>r.kind===IU.kind&&r.owner===IU.owner),isVideo=IU.kind==='video';
 ipImport.innerHTML=`<div class="ip-import-heading"><div><small>MEDIA LIBRARY</small><h2>添加视频素材</h2></div><button type="button" data-r-action="ip-upload-close" aria-label="关闭添加视频素材">×</button></div><label class="ip-upload-platform"><span><i aria-hidden="true">*</i> 上传平台</span><select id="ip-upload-platform" required aria-required="true" ${IU.busy?'disabled':''}><option value="">请选择平台</option>${ipPlatforms().map(x=>`<option value="${E(x)}" ${IU.platform===x?'selected':''}>${E(x)}</option>`).join('')}</select><button type="button" data-r-action="ip-add-platform" ${IU.busy?'disabled':''}>＋ 新增平台</button></label><div class="ip-upload-zone"><button data-r-action="ip-upload-pick" ${IU.busy?'disabled':''}>${ipCloud}<b>＋ 上传${isVideo?'视频':'图片'}素材</b></button>${ipUploadGuidance(IU.kind)}</div><div class="ip-upload-wall" aria-label="已添加素材" ${rows.length?'':'hidden'}>${rows.map(r=>{const index=IU.rows.indexOf(r);return `<article class="ip-upload-tile ${r.stage}"><div>${r.stage==='done'?`<img src="${E(r.poster)}" alt="${E(r.file.name)}"><span class="ip-upload-ok">✓</span><button class="ip-upload-cross" data-r-action="ip-upload-delete" data-id="${E(r.id)}" aria-label="删除 ${E(r.file.name)}" ${IU.busy?'disabled':''}>×</button>`:r.stage==='error'?`<span class="ip-upload-failed">×</span><b>上传失败</b><button class="ip-upload-cross" data-r-action="ip-upload-remove" data-id="${index}" aria-label="移除 ${E(r.file.name)}" ${IU.busy?'disabled':''}>×</button>`:`<div class="ip-progress-ring ${r.stage==='reading'?'':'indeterminate'}" style="--progress:${r.progress||0}%" role="progressbar" aria-label="${E(r.file.name)}文件读取" ${r.stage==='reading'?`aria-valuenow="${r.progress||0}" aria-valuemin="0" aria-valuemax="100"`:''}><span>${r.stage==='reading'?(r.progress||0)+'%':'…'}</span></div><small>${{queued:'等待上传',reading:'上传中 · 读取文件',checking:'正在校验素材',saving:'正在保存素材'}[r.stage]||''}</small>`}</div><b title="${E(r.file.name)}">${E(r.file.name)}</b><small>${r.stage==='done'?'上传成功 · 待 AI 识别':r.stage==='error'?E(r.error):''}</small>${r.stage==='error'?`<div class="ip-upload-retry"><button data-r-action="ip-upload-retry" data-id="${index}" ${IU.busy?'disabled':''}>重试</button><button data-r-action="ip-upload-remove" data-id="${index}" ${IU.busy?'disabled':''}>移除</button></div>`:''}</article>`;}).join('')}<button class="ip-upload-add" data-r-action="ip-upload-pick" ${IU.busy?'disabled':''}><span>＋</span>本地上传</button></div><p class="ip-upload-note">热点时间自动记录为上传时间，内容标签后续由 AI 判别。</p><footer class="ip-upload-footer"><span id="ip-upload-status" role="status">${IU.busy?'素材处理中，可关闭窗口后继续':rows.length?'已处理 '+rows.length+' 个素材':''}</span><button class="solid" data-r-action="ip-upload-finish" ${IU.busy?'disabled':''}>完成</button></footer>`;
 $('#ip-upload-platform').onchange=e=>IU.platform=e.target.value;
}
R.invoke('ip-import',()=>{if(!IU.busy){IU.owner=state.id;IU.platform=IS.platform||IU.platform;IU.kind='video';}ipUploadDraw();ipImport.showModal();});
R.invoke('ip-import-more',()=>R.actions['ip-import']());
R.invoke('ip-upload-close',()=>ipImport.close());
R.invoke('ip-upload-kind',b=>{IU.kind=b.dataset.id;ipUploadDraw();});
R.invoke('ip-upload-finish',()=>{ipImport.close();IS.mediaKind='video';IS.collection='all';Object.assign(IS,{platform:'',hotDate:'',hotStart:'',hotEnd:'',query:'',first:'',second:'',third:'',overviewQuery:'',page:1});render();});
R.invoke('ip-upload-remove',b=>{if(IU.busy)return;IU.rows.splice(Number(b.dataset.id),1);ipUploadDraw();});
R.invoke('ip-upload-retry',async b=>{if(IU.busy)return;const r=IU.rows[Number(b.dataset.id)];if(r)await ipRunUploads([r]);});
function ipPickerSelection(){
 $('#ip-picker-files').innerHTML=IU.selected.map((f,i)=>`<div><span>${E(f.name)}<small>${(f.size/1024/1024).toFixed(2)} MB</small></span><button data-r-action="ip-picker-remove" data-id="${i}" aria-label="移除 ${E(f.name)}">×</button></div>`).join('');$('#ip-picker-submit').disabled=!IU.selected.length;
}
R.invoke('ip-picker-remove',b=>{IU.selected.splice(Number(b.dataset.id),1);ipPickerSelection();});
function ipSelectFiles(files){const incoming=Array.from(files);if(incoming.length+IU.selected.length>20){$('#ip-picker-error').textContent='每次最多上传 20 个文件。';return;}IU.selected.push(...incoming);$('#ip-picker-error').textContent='';ipPickerSelection();}
R.invoke('ip-upload-pick',()=>{
 if(IU.busy||!ipRequirePlatform())return;IU.selected=[];ipPicker.innerHTML=`<div class="ip-import-heading"><h2>上传${IU.kind==='video'?'视频':'图片'}素材</h2><button id="ip-picker-close" aria-label="关闭上传窗口">×</button></div><div id="ip-dropzone" tabindex="0" role="button" aria-label="拖拽文件或本地上传">${ipCloud}<p>将文件拖到此处，或 <button type="button" id="ip-local-upload">本地上传</button></p><small>支持批量选择，每次最多 20 个文件</small></div><input hidden type="file" id="ip-file" multiple accept="${IU.kind==='video'?'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov':'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'}"><div id="ip-picker-files"></div><p id="ip-picker-error" role="alert"></p><button class="solid" id="ip-picker-submit" disabled>开始上传</button>`;
 const zone=$('#ip-dropzone'),input=$('#ip-file');$('#ip-picker-close').onclick=()=>ipPicker.close();$('#ip-local-upload').onclick=()=>input.click();zone.onclick=e=>{if(!e.target.closest('button'))input.click();};zone.onkeydown=e=>{if(e.target===zone&&['Enter',' '].includes(e.key)){e.preventDefault();input.click();}};input.onchange=()=>{ipSelectFiles(input.files);input.value='';};
 zone.ondragover=e=>{e.preventDefault();zone.classList.add('dragging');};zone.ondragleave=()=>zone.classList.remove('dragging');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('dragging');ipSelectFiles(e.dataTransfer.files);};
 $('#ip-picker-submit').onclick=async()=>{if(!ipRequirePlatform())return;const rows=IU.selected.map(file=>({id:uid(),file,kind:IU.kind,platform:IU.platform,owner:IU.owner,stage:'queued',progress:0}));IU.rows.push(...rows);IU.selected=[];ipPicker.close();await ipRunUploads(rows);};ipPicker.showModal();
});
ipPicker.addEventListener('click',e=>{if(e.target===ipPicker)ipPicker.close();});
function ipReadFile(row){return new Promise((resolve,reject)=>{const reader=new FileReader();row.stage='reading';row.progress=0;ipUploadDraw();reader.onprogress=e=>{if(e.lengthComputable){row.progress=Math.floor(e.loaded/e.total*100);ipUploadDraw();}};reader.onerror=()=>reject(Error('文件读取失败，请重新选择。'));reader.onabort=()=>reject(Error('文件读取已中止。'));reader.onload=()=>{row.progress=100;resolve();};reader.readAsArrayBuffer(row.file);});}
function ipInspectImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();const timer=setTimeout(()=>finish(Error('图片读取超时。')),15000);function finish(error,value){clearTimeout(timer);img.onload=img.onerror=null;URL.revokeObjectURL(url);error?reject(error):resolve(value);}img.onload=()=>{try{if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>40000000)throw Error('图片像素过大，请使用 4000 万像素以内的图片。');const canvas=document.createElement('canvas'),scale=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);finish(null,{poster:canvas.toDataURL('image/jpeg',.85),width:img.naturalWidth,height:img.naturalHeight,ratio:img.naturalWidth/img.naturalHeight});}catch(e){finish(e);}};img.onerror=()=>finish(Error('图片损坏或格式不支持，请使用 JPG、PNG、WebP。'));img.src=url;});}
async function ipRemoveStoredMedia(id){const db=await inspirationDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction('videos','readwrite');tx.objectStore('videos').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
async function ipRunUploads(rows){
 IU.busy=true;
 for(const row of rows){try{
  row.error='';if(!row.platform?.trim()||!ipPlatforms().includes(row.platform))throw Error('请选择上传平台');const ext=row.file.name.split('.').pop().toLowerCase(),isVideo=row.kind==='video';if(!row.file.size)throw Error('文件为空，请重新选择。');
  if(!(isVideo?['mp4','webm','mov']:['jpg','jpeg','png','webp']).includes(ext)||row.file.type&&!(isVideo?row.file.type.startsWith('video/'):row.file.type.startsWith('image/')))throw Error(isVideo?'请在视频入口选择 MP4、WebM 或 MOV 文件。':'请在图片入口选择 JPG、PNG 或 WebP 文件。');
  if(row.file.size>(isVideo?100:10)*1024*1024)throw Error(isVideo?'视频不能超过 100 MB。':'图片不能超过 10 MB。');
  await ipReadFile(row);row.stage='checking';ipUploadDraw();const info=await (isVideo?inspectInspirationFile(row.file):ipInspectImage(row.file));row.poster=info.poster;row.stage='saving';ipUploadDraw();
  const owner=workspace.projects.find(p=>p.id===row.owner);if(!owner)throw Error('原项目已被删除，请重新打开上传窗口。');
  const stamp=Date.now(),ratio=Math.abs(info.ratio-1)<.03?'方形 1:1':Math.abs(info.ratio-16/9)<.04?'横屏 16:9':Math.abs(info.ratio-9/16)<.03?'竖屏 9:16':`${info.width} × ${info.height}`;
  const clip={id:row.id,mediaId:row.id,mediaType:row.kind,title:row.file.name,platform:row.platform,created:stamp,uploadedAt:stamp,hotDate:IM.dateKey(new Date(stamp)),width:info.width,height:info.height,ratio,duration:info.duration??null,poster:info.poster,summary:'',category:'',tags:[],tagIds:[],tagging:{status:'pending',reason:'service_not_connected',taxonomyVersion:IM.taxonomyVersion},demo:false,segments:[]};
  await inspirationMedia(row.id,row.file);
  const source={id:row.id,title:clip.title,kind:'竞品内容',content:'用户上传的'+(isVideo?'视频':'图片')+'，待 AI 识别内容标签。',url:'本地素材文件',time:new Date(stamp).toLocaleString('zh-CN'),inspiration:clip};
  owner.sources.push(source);try{workspace.activeId=state.id;localStorage.setItem(workspaceKey,JSON.stringify(workspace));}catch(e){owner.sources=owner.sources.filter(s=>s.id!==row.id);await ipRemoveStoredMedia(row.id);throw Error('浏览器存储空间不足，请释放空间后重试。');}persist();row.stage='done';
 }catch(e){row.stage='error';row.error=e.message;}ipUploadDraw();}
 IU.busy=false;ipUploadDraw();if(rows.some(r=>r.stage==='done'))ipNotify('上传成功');if(['insights','assets','asset-favorites'].includes(page)&&IS.tab==='videos')inspirationCards();
}

function inspectInspirationFile(file){return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),v=document.createElement('video');v.muted=true;v.preload='auto';
  const finish=(error,result)=>{clearTimeout(timer);v.onloadedmetadata=v.onseeked=v.onerror=null;v.removeAttribute('src');v.load();URL.revokeObjectURL(url);error?reject(error):resolve(result);};
  const timer=setTimeout(()=>finish(Error('读取视频超时，请换一个浏览器支持的视频文件。')),15000);
  v.onerror=()=>finish(Error('无法播放该视频，请尝试 MP4 或 WebM 文件。'));
  v.onloadedmetadata=()=>{if(!Number.isFinite(v.duration)||v.duration<=0)return finish(Error('无法读取有效的视频时长。'));v.currentTime=Math.min(.1,v.duration/2);};
  v.onseeked=()=>{try{const canvas=document.createElement('canvas');canvas.width=360;canvas.height=Math.round(360*v.videoHeight/v.videoWidth);canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);finish(null,{duration:v.duration,width:v.videoWidth,height:v.videoHeight,ratio:v.videoWidth/v.videoHeight,poster:canvas.toDataURL('image/jpeg',.75)});}catch(error){finish(error);}};
  v.src=url;
});}
async function openInspirationImage(c){
 stopInlineVideo();stopLargeVideo();const stamp=largeToken;
 ipLarge.innerHTML=`<div class="ip-large-panel"><div class="ip-large-header"><div><small>图片预览</small><h2>${E(c.title)}</h2></div><button data-r-action="ip-player-close" aria-label="关闭图片预览">×</button></div><div class="ip-large-stage ip-image-stage"><img id="ip-large-image" src="${E(c.poster)}" alt="${E(c.title)}"><p id="ip-large-status" role="status">读取原图…</p></div><div class="ip-large-caption"><span>${c.width} × ${c.height} · ${E(c.platform)} · ${E(c.hotDate)}${c.tagging?.status==='pending'?' · 待 AI 识别':''}</span><button data-r-action="ip-remake" data-id="${E(c.id)}">制作同款 →</button></div></div>`;
 ipLarge.showModal();try{const file=await inspirationMedia(c.mediaId);if(stamp!==largeToken||!ipLarge.open)return;if(!file)throw Error('原图文件未找到，当前显示缩略图。');largeURL=URL.createObjectURL(file);$('#ip-large-image').src=largeURL;$('#ip-large-status').textContent='';}catch(e){if(stamp===largeToken&&ipLarge.open)$('#ip-large-status').textContent=e.message;}
}
workspace.inspiration.platforms??=[];
function ipPlatforms(){return [...new Set(['抖音','小红书','B站',...workspace.inspiration.platforms,...workspace.generatedMedia.map(c=>c.platform),...workspace.projects.flatMap(p=>(p.sources||[]).map(s=>s.inspiration?.platform))].filter(x=>typeof x==='string'&&x.trim()))];}
const ipFeedback=document.createElement('div');ipFeedback.id='ip-feedback';ipFeedback.setAttribute('popover','manual');ipFeedback.setAttribute('role','status');ipFeedback.setAttribute('aria-live','polite');document.body.append(ipFeedback);
function ipNotify(message){clearTimeout(ipNotify.timer);ipFeedback.textContent=message;ipFeedback.showPopover();ipNotify.timer=setTimeout(()=>ipFeedback.hidePopover(),3000);}
const ipPlatformDialog=document.createElement('dialog');ipPlatformDialog.id='ip-platform-dialog';ipPlatformDialog.setAttribute('aria-label','新增平台');document.body.append(ipPlatformDialog);
R.invoke('ip-add-platform',()=>{if(IU.busy)return;ipPlatformDialog.innerHTML='<form id="ip-platform-form"><div class="ip-import-heading"><h2>新增平台</h2><button type="button" id="ip-platform-close" aria-label="关闭新增平台">×</button></div><label>平台名称<input id="ip-platform-name" required maxlength="30" placeholder="例如：视频号、快手"></label><p id="ip-platform-error" role="alert"></p><div class="ip-confirm-actions"><button type="button" id="ip-platform-cancel">取消</button><button class="solid" type="submit">添加并选择</button></div></form>';$('#ip-platform-close').onclick=$('#ip-platform-cancel').onclick=()=>ipPlatformDialog.close();$('#ip-platform-form').onsubmit=e=>{e.preventDefault();const name=$('#ip-platform-name').value.trim();if(!name){$('#ip-platform-error').textContent='请填写平台名称';return;}const duplicate=ipPlatforms().find(p=>p.toLocaleLowerCase()===name.toLocaleLowerCase());if(duplicate){IU.platform=duplicate;ipPlatformDialog.close();ipUploadDraw();return;}try{const platforms=[...workspace.inspiration.platforms,name];localStorage.setItem(workspaceKey,JSON.stringify({...workspace,inspiration:{...workspace.inspiration,platforms}}));workspace.inspiration.platforms=platforms;IU.platform=name;persist();ipPlatformDialog.close();ipUploadDraw();}catch{$('#ip-platform-error').textContent='平台保存失败，请释放浏览器存储空间后重试';}};ipPlatformDialog.showModal();$('#ip-platform-name').focus();});
function ipRequirePlatform(){if(IU.platform.trim()&&ipPlatforms().includes(IU.platform))return true;const select=$('#ip-upload-platform');select?.focus();select?.reportValidity();return false;}
const ipDeleteDialog=document.createElement('dialog');ipDeleteDialog.id='ip-delete-dialog';ipDeleteDialog.setAttribute('aria-label','删除素材');document.body.append(ipDeleteDialog);
function ipConfirmDelete(id,ownerId=state.id){
 if(IU.busy)return ipNotify('请等待当前上传完成');const owner=workspace.projects.find(p=>p.id===ownerId),source=owner?.sources.find(s=>s.id===id&&s.inspiration);if(!source)return;
 ipDeleteDialog.innerHTML=`<div class="ip-import-heading"><h2>删除素材</h2><button id="ip-delete-close" aria-label="关闭删除确认">×</button></div><p>确定删除「${E(source.title)}」吗？</p><small>将移除这条素材及其上传文件，已生成的内容草稿保留。</small><p id="ip-delete-error" role="alert"></p><div class="ip-confirm-actions"><button id="ip-delete-cancel">取消</button><button class="ip-confirm-danger" id="ip-delete-confirm">确认删除</button></div>`;
 $('#ip-delete-close').onclick=$('#ip-delete-cancel').onclick=()=>ipDeleteDialog.close();
 $('#ip-delete-confirm').onclick=async()=>{
  const button=$('#ip-delete-confirm');button.disabled=true;$('#ip-delete-cancel').disabled=$('#ip-delete-close').disabled=true;
  try{
   const sources=owner.sources.filter(s=>s.id!==id),mediaId=source.inspiration.mediaId;
   const saved=workspace.inspiration.saved.filter(s=>!(s.id===id&&s.ownerId===ownerId));
   const shared=workspace.projects.some(p=>p.sources.some(s=>s.inspiration?.mediaId===mediaId&&!(p.id===ownerId&&s.id===id)));
   const file=mediaId&&!shared?await inspirationMedia(mediaId):null;
   if(mediaId&&!shared)await ipRemoveStoredMedia(mediaId);
   try{localStorage.setItem(workspaceKey,JSON.stringify({...workspace,inspiration:{...workspace.inspiration,saved},projects:workspace.projects.map(p=>p.id===ownerId?{...p,sources}:p)}));}catch(e){if(file)await inspirationMedia(mediaId,file);throw e;}
   owner.sources=sources;workspace.inspiration.saved=saved;IU.rows=IU.rows.filter(r=>!(r.owner===ownerId&&r.id===id));persist();
   stopInlineVideo();if(IS.active===id)ipDrawer.close();if(ipLarge.open)ipLarge.close();ipDeleteDialog.close();
   if(ipImport.open)ipUploadDraw();if(['insights','assets','asset-favorites'].includes(page)&&IS.tab==='videos')inspirationCards();ipNotify('已删除');
  }catch(e){$('#ip-delete-error').textContent='删除未完成，请重试。'+(e.message||'');}finally{button.disabled=false;$('#ip-delete-cancel').disabled=$('#ip-delete-close').disabled=false;}
 };
 ipDeleteDialog.showModal();$('#ip-delete-cancel').focus();
}
R.invoke('ip-delete',b=>ipConfirmDelete(b.dataset.id,inspirationFind(b.dataset.id)?.ownerId||state.id));
R.invoke('ip-upload-delete',b=>{const row=IU.rows.find(r=>r.id===b.dataset.id);if(row)ipConfirmDelete(row.id,row.owner);});

// Draft dates are isolated until the user confirms the range.
const ipDatePicker=document.createElement('div');ipDatePicker.id='ip-date-picker';ipDatePicker.setAttribute('popover','auto');ipDatePicker.setAttribute('role','dialog');ipDatePicker.setAttribute('aria-label','热点时间范围');document.body.append(ipDatePicker);
const ipDates={start:'',end:'',startTime:'00:00:00',endTime:'23:59:59',next:'start',month:null};
function ipRangeLabel(){return IS.hotStart?`${IS.hotStart.replace('T',' ')} — ${IS.hotEnd.replace('T',' ')}`:'开始时间 — 结束时间';}
function ipDatePosition(){if(!ipDatePicker.matches(':popover-open'))return;const anchor=$('#ip-hot-date');if(!anchor)return;const r=anchor.getBoundingClientRect(),w=ipDatePicker.offsetWidth,h=ipDatePicker.offsetHeight;ipDatePicker.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';ipDatePicker.style.top=Math.max(8,Math.min(r.bottom+8,innerHeight-h-8))+'px';}
function ipCalendar(month,index){
 const first=new Date(month.getFullYear(),month.getMonth(),1),today=IM.hotDates()[0],allowed=IM.hotDates(),low=ipDates.start,high=ipDates.end;
 const cells=Array.from({length:42},(_,i)=>{const date=new Date(first.getFullYear(),first.getMonth(),i-first.getDay()+1),key=IM.dateKey(date),outside=date.getMonth()!==first.getMonth(),disabled=!allowed.includes(key)||outside,chosen=key===low||key===high,inRange=low&&high&&key>low&&key<high;return `<button type="button" data-ip-day="${key}" aria-label="${key}" aria-pressed="${chosen}" ${disabled?'disabled':''} class="${outside?'outside ':''}${chosen?'selected ':''}${inRange?'in-range ':''}${key===today?'today':''}">${date.getDate()}</button>`;}).join('');
 const previous=new Date(ipDates.month.getFullYear(),ipDates.month.getMonth(),0),next=new Date(ipDates.month.getFullYear(),ipDates.month.getMonth()+2,1);
 return `<section class="ip-calendar" aria-label="${first.getFullYear()} 年 ${first.getMonth()+1} 月"><header>${index===0?`<button type="button" data-ip-month="-1" aria-label="上个月" ${IM.dateKey(previous)<allowed.at(-1)?'disabled':''}>‹</button>`:'<span></span>'}<b>${first.getFullYear()} 年 ${first.getMonth()+1} 月</b>${index===1?`<button type="button" data-ip-month="1" aria-label="下个月" ${IM.dateKey(next)>today?'disabled':''}>›</button>`:'<span></span>'}</header><div class="ip-weekdays">${'日一二三四五六'.split('').map(x=>`<span>${x}</span>`).join('')}</div><div class="ip-days">${cells}</div></section>`;
}
function ipDrawCalendars(){
 $('#ip-calendars').innerHTML=ipCalendar(ipDates.month,0)+ipCalendar(new Date(ipDates.month.getFullYear(),ipDates.month.getMonth()+1,1),1);
 ipDatePicker.querySelectorAll('[data-ip-day]').forEach(button=>button.onclick=()=>{
  const day=button.dataset.ipDay;if(ipDates.next==='start'){ipDates.start=day;ipDates.end='';ipDates.next='end';}else{ipDates.end=day;if(ipDates.start&&ipDates.end<ipDates.start)[ipDates.start,ipDates.end]=[ipDates.end,ipDates.start];ipDates.next='start';}
  $('#ip-date-start').value=ipDates.start;$('#ip-date-end').value=ipDates.end;ipDateValidate();ipDrawCalendars();
 });
 ipDatePicker.querySelectorAll('[data-ip-month]').forEach(button=>button.onclick=()=>{ipDates.month=new Date(ipDates.month.getFullYear(),ipDates.month.getMonth()+Number(button.dataset.ipMonth),1);ipDrawCalendars();});
}
function ipDateValues(){const time=s=>s.length===5?s+':00':s;return {start:ipDates.start&&ipDates.startTime?ipDates.start+'T'+time(ipDates.startTime):'',end:ipDates.end&&ipDates.endTime?ipDates.end+'T'+time(ipDates.endTime):''};}
function ipDateValidate(){const {start,end}=ipDateValues();let error='';if(ipDates.start&&!IM.validHotDate(ipDates.start)||ipDates.end&&!IM.validHotDate(ipDates.end))error='只能选择当天及之前 30 天内的日期';else if(start&&end&&!IM.validHotRange(start,end))error='结束时间不能早于开始时间，请检查日期与时间';$('#ip-date-error').textContent=error;$('#ip-date-apply').disabled=!start||!end||!IM.validHotRange(start,end);return !error;}
function ipOpenDatePicker(){
 if(ipDatePicker.matches(':popover-open')){ipDatePicker.hidePopover();return;}
 const today=new Date(),dates=IM.hotDates();Object.assign(ipDates,{start:IS.hotStart.slice(0,10),end:IS.hotEnd.slice(0,10),startTime:IS.hotStart.slice(11)||'00:00:00',endTime:IS.hotEnd.slice(11)||'23:59:59',next:'start',month:new Date(today.getFullYear(),today.getMonth()-1,1)});
 ipDatePicker.innerHTML=`<div class="ip-date-inputs"><div><input id="ip-date-start" type="date" aria-label="开始日期" min="${dates.at(-1)}" max="${dates[0]}" value="${ipDates.start}"><input id="ip-time-start" type="time" aria-label="开始时间" step="1" value="${ipDates.startTime}"></div><span aria-hidden="true">›</span><div><input id="ip-date-end" type="date" aria-label="结束日期" min="${dates.at(-1)}" max="${dates[0]}" value="${ipDates.end}"><input id="ip-time-end" type="time" aria-label="结束时间" step="1" value="${ipDates.endTime}"></div></div><div id="ip-calendars"></div><p id="ip-date-error" role="alert"></p><footer><small>当天及之前 30 天 · 按上传时间筛选</small><button type="button" id="ip-date-clear">清空</button><button type="button" id="ip-date-apply" class="solid">确定</button></footer>`;
 for(const [id,key] of [['date-start','start'],['date-end','end'],['time-start','startTime'],['time-end','endTime']]){const input=$('#ip-'+id);input.oninput=()=>{ipDates[key]=input.value;ipDateValidate();ipDrawCalendars();};if(id.startsWith('date'))input.onfocus=()=>ipDates.next=key;}
 $('#ip-date-apply').onclick=()=>{const {start,end}=ipDateValues();if(!start||!end||!IM.validHotRange(start,end)){ipDateValidate();return;}Object.assign(IS,{hotStart:start,hotEnd:end,hotDate:'',page:1});ipDatePicker.hidePopover();render();$('#ip-hot-date').focus();};
 $('#ip-date-clear').onclick=()=>{Object.assign(IS,{hotStart:'',hotEnd:'',hotDate:'',page:1});ipDatePicker.hidePopover();render();$('#ip-hot-date').focus();};
 ipDrawCalendars();ipDateValidate();ipDatePicker.showPopover();ipDatePosition();$('#ip-date-start').focus();$('#ip-hot-date').setAttribute('aria-expanded','true');
}
ipDatePicker.addEventListener('toggle',()=>$('#ip-hot-date')?.setAttribute('aria-expanded',String(ipDatePicker.matches(':popover-open'))));
window.addEventListener('resize',ipDatePosition);window.addEventListener('scroll',ipDatePosition,true);

render();
