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
model = genai.GenerativeModel('gemini-2.5-flash')

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

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)