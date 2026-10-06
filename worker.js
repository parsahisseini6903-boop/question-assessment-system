const HTML = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>سامانه جامع ارزیابی و تحلیل سؤالات آزمون</title><style>body{font-family:Tahoma,Arial;background:#f5f7fb;margin:0;color:#18212f}.wrap{max-width:1100px;margin:30px auto;padding:0 18px}.hero{background:linear-gradient(135deg,#173b72,#2864b8);color:#fff;border-radius:24px;padding:28px;box-shadow:0 12px 30px #0001}h1{margin:0 0 8px}.card{background:#fff;border-radius:18px;padding:22px;margin-top:18px;box-shadow:0 5px 20px #0000000d}label{font-weight:700;display:block;margin:12px 0 6px}input,textarea,select{width:100%;box-sizing:border-box;border:1px solid #d8dee9;border-radius:10px;padding:10px;font:inherit}textarea{min-height:110px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:700px){.grid{grid-template-columns:1fr}}button{border:0;border-radius:10px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer;background:#1f62c4;color:white;margin:6px 4px 0 0}.secondary{background:#eef3fa;color:#17467f}.status{margin-top:14px;padding:12px;border-radius:10px;background:#f0f4fa}.table{overflow:auto;margin-top:15px}table{border-collapse:collapse;width:100%;min-width:1000px}th,td{border:1px solid #ddd;padding:8px;text-align:right;vertical-align:top}th{background:#edf3fb}.tag{display:inline-block;background:#eef4ff;border-radius:999px;padding:4px 8px;margin:2px;font-size:12px}</style></head><body><div class="wrap"><section class="hero"><h1>سامانه جامع ارزیابی و تحلیل سؤالات آزمون</h1><div>نسخه آنلاین عمومی برای ارزیابی خودکار سؤالات بر اساس طرح درس، نمونه‌سؤالات، Core/Non-core، سطح شناختی و معیارهای دلخواه.</div></section><section class="card"><div class="grid"><div><label>نام درس / آزمون</label><input id="examName" placeholder="مثلاً فیزیولوژی – آزمون پایان‌ترم"></div><div><label>فایل کامل آزمون</label><input id="exam" type="file" accept=".pdf,.docx,.txt,.md,.csv"></div></div><label>طرح درس / اهداف یادگیری</label><textarea id="lesson" placeholder="متن طرح درس یا اهداف یادگیری را وارد کنید..."></textarea><input id="lessonFile" type="file" accept=".pdf,.docx,.txt,.md,.csv"><label>نمونه‌سؤالات</label><textarea id="samples" placeholder="نمونه‌سؤالات منتخب را وارد کنید..."></textarea><input id="samplesFile" type="file" accept=".pdf,.docx,.txt,.md,.csv"><label>Core / Non-core</label><textarea id="core" placeholder="مثلاً: مباحث Core: ..."></textarea><label>معیارهای ارزیابی</label><textarea id="criteria">تطابق مستقیم با طرح درس
تطابق با نمونه‌سؤالات
وضوح و قابل فهم بودن سؤال</textarea><label>سطوح شناختی مجاز</label><select id="levels" multiple><option selected>Recall</option><option selected>Understand</option><option selected>Application</option><option selected>Analysis</option></select><br><button id="go">شروع تحلیل</button><button class="secondary" id="demo">نمایش نمونه</button><div id="status" class="status">آماده دریافت آزمون.</div></section><section class="card" id="result" style="display:none"><h2>نتایج</h2><div id="summary"></div><div class="table"><table><thead><tr><th>شماره</th><th>مبحث</th><th>طرح درس</th><th>نمونه سؤال</th><th>Core</th><th>سطح شناختی</th><th>معیارها</th><th>نتیجه</th><th>دلیل</th><th>پیشنهاد اصلاح</th></tr></thead><tbody id="tbody"></tbody></table></div><button class="secondary" id="csv">خروجی CSV</button></section></div><script>
const $=id=>document.getElementById(id); function setStatus(x){$('status').textContent=x} function vals(){return [...$('levels').selectedOptions].map(x=>x.value)}
function parseCriteria(){return $('criteria').value.split(/\n+/).map(x=>x.trim()).filter(Boolean)}
async function extractFile(file){
  if(!file) return '';
  const ext=file.name.toLowerCase().split('.').pop();
  if(['txt','md','csv'].includes(ext)) return await file.text();
  if(ext==='docx'){
    const ab=await file.arrayBuffer();
    if(!window.mammoth) throw Error('کتابخانه DOCX بارگذاری نشده است. صفحه را دوباره باز کنید.');
    const r=await mammoth.extractRawText({arrayBuffer:ab}); return r.value;
  }
  if(ext==='pdf'){
    const ab=await file.arrayBuffer();
    if(!window.pdfjsLib) throw Error('کتابخانه PDF بارگذاری نشده است. صفحه را دوباره باز کنید.');
    const pdf=await pdfjsLib.getDocument({data:ab}).promise; let out='';
    for(let i=1;i<=pdf.numPages;i++){ const page=await pdf.getPage(i); const c=await page.getTextContent(); out+=c.items.map(x=>x.str).join(' ')+'\n'; }
    return out;
  }
  throw Error('فرمت فایل پشتیبانی نمی‌شود. PDF، DOCX، TXT، MD یا CSV انتخاب کنید.');
}
$('go').onclick=async()=>{const f=$('exam').files[0];if(!f){setStatus('ابتدا فایل کامل آزمون را انتخاب کنید.');return}setStatus('در حال استخراج و تحلیل سؤالات...');try{const examText=await extractFile(f);const lessonFile=$('lessonFile').files[0];const samplesFile=$('samplesFile').files[0];const lessonFileText=lessonFile?await extractFile(lessonFile):'';const samplesFileText=samplesFile?await extractFile(samplesFile):'';const payload={examText,lessonPlan:$('lesson').value+'\n'+lessonFileText,samples:$('samples').value+'\n'+samplesFileText,core:$('core').value,criteria:parseCriteria(),levels:vals()};const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error||'خطا');render(d.results||[]);setStatus(\`تحلیل \${d.totalQuestions||d.results.length} سؤال انجام شد.\`)}catch(e){setStatus('خطا: '+e.message)}};
function render(rows){$('result').style.display='block';$('summary').innerHTML=\`<span class="tag">تعداد: \${rows.length}</span> <span class="tag">استاندارد: \${rows.filter(x=>x.result==='استاندارد').length}</span> <span class="tag">نیازمند بازبینی: \${rows.filter(x=>x.result==='نیازمند بازبینی').length}</span>\`;$('tbody').innerHTML=rows.map(x=>\`<tr><td>\${x.number??''}</td><td>\${x.topic??''}</td><td>\${x.lesson_alignment??''}<br>\${x.lesson_evidence??''}</td><td>\${x.sample_similarity??''}<br>\${x.sample_evidence??''}</td><td>\${x.core_status??''}</td><td>\${x.cognitive_level??''}<br>\${x.cognitive_reason??''}</td><td>\${(x.criteria||[]).map(c=>\`<b>\${c.name}</b>: \${c.passed?'✓':'✗'} \${c.reason||''}\`).join('<hr>')}</td><td>\${x.result??''}</td><td>\${x.reason??''}</td><td>\${x.revision??''}</td></tr>\`).join('')}
$('csv').onclick=()=>{const rows=[...$('tbody').querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.innerText.replaceAll('\n',' ')));const csv=rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='question-analysis.csv';a.click()};
$('demo').onclick=()=>{render([{number:1,topic:'نمونه',lesson_alignment:'yes',lesson_evidence:'در طرح درس آمده است.',sample_similarity:'yes',sample_evidence:'ساختار مشابه.',core_status:'Core',cognitive_level:'Understand',cognitive_reason:'نیاز به توضیح مفهوم دارد.',criteria:[{name:'وضوح و قابل فهم بودن سؤال',passed:true,reason:'تنه روشن است.'}],result:'استاندارد',reason:'نمونه نمایشی',revision:'بدون اصلاح'}]);setStatus('این بخش فقط نمونه نمایشی است و تحلیل واقعی انجام نداده است.')};
</script><script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs" type="module"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"></script><script>import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs").then(m=>{window.pdfjsLib=m;window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs"})</script></body></html>
`;

function splitQuestions(text) {
  const t = (text || '').replace(/\r/g, '').trim();
  if (!t) return [];
  const re = /(?:^|\n)\s*(?:سؤال|سوال|Question|Q)?\s*(\d{1,3})[\)\.\-:]/gi;
  const hits = []; let m;
  while ((m = re.exec(t))) hits.push({ n: Number(m[1]), i: m.index, j: re.lastIndex });
  if (hits.length < 2) return [{ number: 1, text: t }];
  return hits.map((h,k)=>({number:h.n,text:t.slice(h.j,k+1<hits.length?hits[k+1].i:t.length).trim()})).filter(x=>x.text);
}
function cleanJson(s){ const a=s.indexOf('{'), b=s.lastIndexOf('}'); if(a>=0&&b>a)return s.slice(a,b+1); throw new Error('پاسخ ساختاریافته از مدل دریافت نشد.'); }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') return new Response(HTML,{headers:{'content-type':'text/html;charset=UTF-8'}});
    if (request.method === 'POST' && url.pathname === '/api/analyze') {
      try {
        if (!env.OPENAI_API_KEY) return Response.json({error:'کلید OPENAI_API_KEY در Cloudflare ثبت نشده است.'},{status:500});
        const body = await request.json();
        const examText = body.examText || '';
        const lessonText = body.lessonPlan || '';
        const sampleText = body.samples || '';
        const coreText = body.core || '';
        const criteria = Array.isArray(body.criteria) ? body.criteria : [];
        const levels = Array.isArray(body.levels) ? body.levels : [];
        const qs = splitQuestions(examText);
        if (!qs.length) return Response.json({error:'هیچ سؤال قابل تشخیصی استخراج نشد.'},{status:400});
        const out=[];
        for(let i=0;i<qs.length;i+=4){
          const batch=qs.slice(i,i+4);
          const prompt=`تو یک سامانه استاندارد ارزیابی سؤالات آزمون پزشکی هستی. فقط بر اساس اطلاعات داده‌شده قضاوت کن و چیزی را حدس نزن.\n\nدرس/اهداف:\n${lessonText.slice(0,30000)}\n\nنمونه سؤالات:\n${sampleText.slice(0,30000)}\n\nCore/Non-core:\n${coreText.slice(0,10000)}\n\nسطوح مجاز شناختی:\n${levels.join(', ')}\n\nمعیارهای سفارشی:\n${criteria.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nسؤالات:\n${batch.map(q=>`QUESTION ${q.number}:\n${q.text}`).join('\n\n')}\n\nبرای هر سؤال این فیلدها را برگردان: number, topic, lesson_alignment (yes/no/unclear), lesson_evidence, sample_similarity (yes/no/unclear), sample_evidence, core_status (Core/Non-core/Unclear), cognitive_level, cognitive_reason, criteria (آرایه‌ای از {name,passed,reason}), result (استاندارد/نیازمند بازبینی/غیراستاندارد), reason, revision. اگر متن سؤال ناقص یا ناخواناست صریحاً بگو. خروجی فقط JSON با ساختار {"results":[...]}.`;
          const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt})});
          const j=await r.json();
          if(!r.ok) throw new Error(j.error?.message || 'خطا در ارتباط با OpenAI');
          const text=j.output_text || '';
          const data=JSON.parse(cleanJson(text));
          out.push(...(data.results||[]));
        }
        return Response.json({results:out,totalQuestions:qs.length});
      } catch(e) { return Response.json({error:e.message||'خطای ناشناخته'},{status:500}); }
    }
    return new Response('Not found',{status:404});
  }
};
