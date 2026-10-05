const origin='https://shyakacup.com';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const reply=(status:number)=>new Response(null,{status,headers:cors});
const sections=new Set(['home','teams','players','fixtures','livescores','matchcentre','results','standings','stats','knockout','sponsor','notifications','news','gallery','highlights']);
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return reply(204);
 if(req.method!=='POST')return reply(405);
 if(req.headers.get('origin')!==origin)return reply(403);
 try{
  if(Number(req.headers.get('content-length')||0)>256)return reply(413);
  const raw=await req.text();if(raw.length>256)return reply(413);
  const b=JSON.parse(raw);
  if(typeof b.device!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.device)||!sections.has(b.section))return reply(400);
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/record_visitor',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({p_device:b.device,p_section:b.section}),signal:AbortSignal.timeout(8000)});
  return reply(response.ok?204:503);
 }catch{return reply(400);}
});
