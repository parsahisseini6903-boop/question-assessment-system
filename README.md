# سامانه جامع ارزیابی و تحلیل سؤالات آزمون
Cloudflare Worker + OpenAI Responses API.

Secret required in Cloudflare: `OPENAI_API_KEY`

The browser extracts text from PDF/DOCX and sends only text to the Worker. The Worker keeps the OpenAI key server-side.
