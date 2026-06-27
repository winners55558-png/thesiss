import os
import json
import google.generativeai as genai
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RAW_API_KEY = os.getenv("GEMINI_API_KEY", "")
CLEAN_API_KEY = "".join(RAW_API_KEY.split())
genai.configure(api_key=CLEAN_API_KEY, transport="rest")
model = genai.GenerativeModel('gemini-2.5-flash-lite')

class ResumeData(BaseModel):
    content: str
    section: str       

class MatchData(BaseModel):
    job_title: str
    job_desc: str
    req_skills: str
    education_history: str
    experience_and_activities: str
    skills_and_custom_skills: str
    inspiration_message: str

class MatchAnalysisData(BaseModel):
    job_title: str
    company_name: str
    match_score: int
    reasons: list[str]

@app.post("/api/ai/coach")
async def ai_coach(data: ResumeData):
    try:
        if not CLEAN_API_KEY: return {"suggestion": "⚠️ ไม่พบ API Key"}
        if not data.content: return {"suggestion": "กรุณาพิมพ์ข้อมูลก่อน"}

        prompt = f"""คุณคือนักเขียนเรซูเม่มืออาชีพ หน้าที่ของคุณคือการนำข้อความดิบที่ผู้ใช้พิมพ์ มาเกลาใหม่ให้ดูเป็นมืออาชีพ เป็นทางการ และดึงดูดนายจ้าง 
        กฎเหล็ก: ห้ามพิมพ์คำทักทาย ห้ามพิมพ์คำอธิบาย ห้ามใส่เครื่องหมายคำพูด (") ให้ตอบกลับเฉพาะ 'เนื้อหาที่เกลาเสร็จแล้ว' เท่านั้น
        ข้อความต้นฉบับ (หมวด {data.section}): "{data.content}"
        """
        response = model.generate_content(prompt)
        return {"suggestion": response.text.strip()}
    except Exception as e:
        return {"suggestion": data.content}

@app.post("/api/ai/match")
async def ai_match_job(data: MatchData):
    try:
        prompt = f"""คุณคือ HR Assistant ผู้เชี่ยวชาญด้านการประเมินและแนะนำงานสำหรับผู้พิการ

ข้อมูลตำแหน่งงาน:
- ชื่อตำแหน่ง: {data.job_title}
- รายละเอียดงาน: {data.job_desc}
- ทักษะที่ต้องการ: {data.req_skills}

ข้อมูลผู้สมัคร:
- วุฒิการศึกษา: {data.education_history}
- ประสบการณ์และกิจกรรม: {data.experience_and_activities}
- ทักษะ: {data.skills_and_custom_skills}
- แรงบันดาลใจ/สรุปตัวเอง: {data.inspiration_message}

หน้าที่ของคุณ:
พิจารณาความสอดคล้องระหว่างข้อมูลผู้สมัครและตำแหน่งงาน แล้วเขียนสรุปจุดเด่น 2-3 ประโยคสั้นๆ เพื่อบอกว่าทำไมผู้สมัครคนนี้น่าสนใจสำหรับงานนี้ โดยเน้นดึงทักษะหรือประสบการณ์ที่ตรงกันมาระบุ

เงื่อนไข:
- ห้ามคำนวณหรือให้คะแนนใดๆ (ระบบ Algorithm จัดการคะแนนแล้ว)
- ใช้ภาษาไทยที่สุภาพ ให้กำลังใจ และอ่านเข้าใจง่าย
- ตอบเป็นภาษาไทยเท่านั้น

ส่งคำตอบในรูปแบบ JSON ดังนี้เท่านั้น:
{{
  "match_reasons": [
    "เหตุผลข้อที่ 1...",
    "เหตุผลข้อที่ 2...",
    "เหตุผลข้อที่ 3..."
  ]
}}
"""
        response = model.generate_content(prompt, generation_config=genai.types.GenerationConfig(response_mime_type="application/json"))
        return json.loads(response.text)
    except Exception as e:
        print(f"🔥 AI Match Error: {e}")
        return {"match_reasons": []}

@app.post("/api/ai/analyze-match")
async def ai_analyze_match(data: MatchAnalysisData):
    try:
        if not CLEAN_API_KEY:
            print("🔥 No API Key")
            return {"narrative": ""}

        # กรองเฉพาะข้อความที่เข้าใจง่าย (ตัด emoji และวงเล็บคะแนนออก)
        def clean_reason(r):
            import re
            r = re.sub(r'\([+-]?\d+\)', '', r)  # ลบ (+20) (-5) ออก
            r = re.sub(r'[\U00010000-\U0010ffff]', '', r)  # ลบ emoji
            r = re.sub(r'[✔️⚠️💡💼🎓🏢📍]', '', r)
            return r.strip(' -')

        reasons_clean = [clean_reason(r) for r in data.reasons if clean_reason(r)]
        reasons_text = "\n".join(f"- {r}" for r in reasons_clean)
        level = "ดีมาก" if data.match_score >= 75 else "ผ่านเกณฑ์" if data.match_score >= 50 else "ยังไม่ถึงเกณฑ์"

        prompt = (
            f'คุณคือที่ปรึกษาด้านการจัดหางาน '
            f'ผู้หางานกำลังดูตำแหน่ง {data.job_title} ที่ {data.company_name} '
            f'ระดับความเหมาะสมโดยรวม: {level} '
            f'ผลวิเคราะห์จากระบบ: {reasons_text} '
            f'เขียนบทสรุปความเหมาะสม 2-3 ประโยค ภาษาไทย ให้กำลังใจ '
            f'ไม่ต้องพูดถึงตัวเลข ตอบเป็นข้อความธรรมดาเท่านั้น'
        )

        print(f"📤 Calling Gemini for {data.job_title}...")
        response = model.generate_content(prompt)
        print(f"📥 Gemini response candidates: {len(response.candidates) if response.candidates else 0}")

        # ดึง text จาก candidates โดยตรง (ป้องกัน safety block)
        narrative = ""
        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                narrative = candidate.content.parts[0].text.strip()

        print(f"✅ Narrative length: {len(narrative)}")
        return {"narrative": narrative}

    except Exception as e:
        print(f"🔥 AI Analyze Match Error: {type(e).__name__}: {e}")
        return {"narrative": ""}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)