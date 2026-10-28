'use strict';
// GitHub Pages compatibility: keep the prototype fully static while preserving local-launcher APIs.
(()=>{
 const staticMode=location.hostname.endsWith('github.io')||new URLSearchParams(location.search).has('static');
 if(!staticMode)return;
 window.__STATIC_DEMO__=true;
 const nativeFetch=window.fetch.bind(window),base=new URL('./',document.currentScript.src);
 const json=(value,status=200)=>Promise.resolve(new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8'}}));
 const readBody=init=>{try{return JSON.parse(init?.body||'{}');}catch{return {};}};
 window.fetch=(input,init={})=>{
  const raw=typeof input==='string'?input:input.url,url=new URL(raw,location.href),path=url.pathname;
  if(path==='/api/bootstrap')return json({token:'github-pages-demo',platforms:[],demo_steps:[],real_available:false,offline:true,static:true});
  if(path==='/api/release/catalog')return nativeFetch(new URL('assets/release-catalog.json',base),init);
  if(path==='/api/release/skill')return nativeFetch(new URL('assets/skill-sources.json',base)).then(response=>response.json()).then(all=>{const value=all[url.searchParams.get('id')];return new Response(JSON.stringify(value||{error:'技能不存在'}),{status:value?200:404,headers:{'Content-Type':'application/json; charset=utf-8'}});});
  if(path==='/api/projects/create'){const body=readBody(init),name=String(body.name||'').trim();return json({id:body.id,name,folderName:name,nameLocked:true,static:true});}
  if(path==='/api/projects/open-folder')return json({error:'在线演示版不创建本地文件夹'},400);
  if(path==='/api/video-workflow/capabilities')return json({available:false,mode:'static-demo',message:'在线演示版使用本地示例视频展示流程。'});
  if(path.startsWith('/api/video-workflow/'))return json({error:'在线演示版不执行真实视频生成，请使用演示素材流程。'},503);
  if(path.startsWith('/api/'))return json({error:'此操作需要本地或业务服务；在线演示版保留页面交互。'},503);
  if(path==='/demo-generated-video.mp4')return nativeFetch(new URL('demo-generated-video.mp4',base),init);
  return nativeFetch(input,init);
 };
})();
