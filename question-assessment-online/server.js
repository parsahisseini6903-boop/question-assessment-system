import express from 'express';
import multer from 'multer';
import cors from 'cors';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';
import {fileURLToPath} from 'url';

const app=express();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024}});
app.use(cors()); app.use(express.json({limit:'2mb'}));
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname,'public')));

async function extract(file){
  if(!file) return '';
  const ext=path.extname(file.originalname).toLowerCase();
  if(ext==='.pdf'){ const r=await pdf(file.buffer); return r.text; }
  if(ext==='.docx'){ const r=await mammoth.extractRawText({buffer:file.buffer}); return r.value; }
  if(ext==='.txt'||ext==='.md'||ext==='.csv') return file.buffer.toString('utf8');
  throw new Error('فرمت فایل پشتیبانی نمی‌شود. PDF، DOCX، TXT، MD یا CSV ارسال کنید.');
}
function splitQuestions(text){
  const t=(text||'').replace(/\r/g,'').trim();
  if(!t) return [];
  const re=/(?:^|\n)\s*(?:سؤال|سوال|Question|Q)?\s*(\d{1,3})[\)\.\-:]/gi;
  const hits=[]; let m; while((m=re.exec(t))) hits.push({n:Number(m[1]),i:m.index,j:re.lastIndex});
  if(hits.length<2) return [{number:1,text:t}];
  return hits.map((h,k)=>({number:h.n,text:t.slice(h.j,k+1<hits.length?hits[k+1].i:t.length).trim()})).filter(x=>x.text);
}
function cleanJson(s){ const a=s.indexOf('{'), b=s.lastIndexOf('}'); if(a>=0&&b>a) return s.slice(a,b+1); throw new Error('پاسخ ساختاریافته از مدل دریافت نشد.'); }

app.post('/api/analyze',upload.fields([
  {name:'exam',maxCount:1},{name:'lessonPlanFile',maxCount:1},{name:'samplesFile',maxCount:1}
]),async(req,res)=>{
  try{
    if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:'OPENAI_API_KEY در تنظیمات سرور ثبت نشده است.'});
    const examText=await extract(req.files?.exam?.[0]);
    const lessonText=(req.body.lessonPlan||'')+'\n'+await extract(req.files?.lessonPlanFile?.[0]);
    const sampleText=(req.body.samples||'')+'\n'+await extract(req.files?.samplesFile?.[0]);
    const coreText=req.body.core||'';
    const criteria=JSON.parse(req.body.criteria||'[]');
    const levels=JSON.parse(req.body.levels||'[]');
    const qs=splitQuestions(examText);
    if(!qs.length) return res.status(400).json({error:'هیچ سؤال قابل تشخیصی از فایل استخراج نشد.'});
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const out=[];
    for(let i=0;i<qs.length;i+=4){
      const batch=qs.slice(i,i+4);
      const prompt=`تو یک سامانه استاندارد ارزیابی سؤالات آزمون پزشکی هستی. فقط بر اساس اطلاعات داده‌شده قضاوت کن و چیزی را حدس نزن.\n\nدرس/اهداف:\n${lessonText.slice(0,30000)}\n\nنمونه سؤالات:\n${sampleText.slice(0,30000)}\n\nCore/Non-core:\n${coreText.slice(0,10000)}\n\nسطوح مجاز شناختی:\n${levels.join(', ')}\n\nمعیارهای سفارشی:\n${criteria.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nسؤالات:\n${batch.map(q=>`QUESTION ${q.number}:\n${q.text}`).join('\n\n')}\n\nبرای هر سؤال این فیلدها را برگردان: number, topic, lesson_alignment (yes/no/unclear), lesson_evidence, sample_similarity (yes/no/unclear), sample_evidence, core_status (Core/Non-core/Unclear), cognitive_level, cognitive_reason, criteria (آرایه‌ای از {name,passed,reason}), result (استاندارد/نیازمند بازبینی/غیراستاندارد), reason, revision. اگر متن سؤال ناقص یا ناخواناست صریحاً بگو. خروجی فقط JSON با ساختار {"results":[...]}.`;
      const r=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-6-luna',input:prompt});
      const data=JSON.parse(cleanJson(r.output_text||'')); out.push(...(data.results||[]));
    }
    res.json({results:out,totalQuestions:qs.length});
  }catch(e){res.status(500).json({error:e.message||'خطای ناشناخته'});}
});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=process.env.PORT||3000; app.listen(port,()=>console.log(`running on ${port}`));
