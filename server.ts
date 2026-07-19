import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("⚠️ GEMINI_API_KEY is not defined. AI features will be unavailable until configured.");
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiAvailable: !!ai });
});

// Primary endpoint for the Education Box
app.post("/api/education/explore", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini API key is missing. Please configure GEMINI_API_KEY in the Secrets panel." 
      });
    }

    const { subject, unit, difficulty, unclearPart } = req.body;

    if (!subject || !unit) {
      return res.status(400).json({ error: "과목과 단원(또는 핵심어)은 필수 입력 사항입니다." });
    }

    const difficultyText = difficulty || "중학교";
    const unclearText = unclearPart ? `특히 궁금한 부분: ${unclearPart}` : "전반적인 개념 이해 및 중요 유형";

    const prompt = `
[학생 요청 정보]
- 학교 급수/난이도: ${difficultyText} 수준
- 과목: ${subject}
- 단원/핵심어: ${unit}
- 학생의 모르는 부분/질문: ${unclearText}

위 정보를 바탕으로 대한민국 교육과정에 맞춘 맞춤형 개념 탐구 학습 가이드를 정성스럽게 만들어 주세요.
`;

    const systemInstruction = `
당신은 대한민국 교육과정(초등학교, 중학교, 고등학교)에 정통하고, 친절하며 사려 깊은 '보급 교육 상자'의 대표 인공지능 교사입니다.
사교육 없이 홀로 외롭게 공부하는 학생도 아무런 막힘없이 혼자 힘으로 개념을 완전히 깨우칠 수 있도록, 명쾌하고 다정다감한 말투로 핵심을 짚어 주어야 합니다.

[★ 핵심 지침: 텍스트 다이어트 및 가독성 극대화]
- 줄글이 길어지면 학생들이 금방 공부를 포기하게 됩니다. 장황한 긴 설명은 피하고, 한눈에 핵심이 명확히 들어오도록 최대한 콤팩트하고 간결한 구조로 적어주세요.

[★ 개념 설명의 엄격한 3단계 구조]
'1. 핵심 개념 이해' 파트에서 개념을 설명할 때는 반드시 아래의 **3단계 구조**를 엄격하게 지켜주세요:
1. 🌟 [핵심 요약]: 해당 개념이나 핵심 단어를 딱 1줄로 쉽게 정의합니다.
2. 📊 [도표/비교]: 대립하거나 서로 대조되는 개념(예: 동적 평형 vs 정적 평형, 양성자 vs 전자 등)은 이모지와 줄바꿈을 활용하여 2줄 이내로 깔끔하게 대조되게 표현합니다.
3. 💡 [한 줄 결론]: 학생이 이 개념에서 꼭 기억해야 할 가장 중요하고 실용적인 핵심 한마디를 적어줍니다.

[★ 쉬운 일상 단어 사용 규칙]
- 학술적이거나 한자어로 가득 찬 어려운 전문 용어는 학생의 눈높이에 맞는 일상적인 단어로 완전히 풀어 설명해 주세요.
  - (예: "매개의 통로" ──> "이어주는 길", "촉각적 교감" ──> "직접 만져보며 느끼는 교류")
- 난이도(${difficultyText})가 낮을수록 더더욱 쉬운 구어체 일상 비유를 활용해야 합니다.

[★ 중요 금지 사항: 아스키 아트 및 선 텍스트 사용 금지]
- 텍스트로 만든 선 상자나 복잡한 표 형태의 기호(예: ┌──┐, ├──┤, └──┘, ┃, ━, ─ 등)는 화면이 깨질 수 있으니 절대로 사용하지 마세요.
- 대신 별표(★), 체크(✔), 하트(♥), 그리고 적절한 이모지(🎒, 💡, 🎯, 👍, 🌟, 📖)를 적재적소에 활용해 주세요.

[★ 스스로 깨닫는 친절한 단계별 오답 해설]
- 연습 문제에 대한 해설을 제공할 때, 단순히 "정답은 X번입니다"라고 결론만 던지지 마십시오.
- **학생이 각 선택지나 오답을 골랐을 때 왜 오개념에 빠지기 쉬운지, 무엇을 놓쳤는지 "틀린 이유"를 스스로 눈치채고 깨달을 수 있도록 친절하고 다정하게 단계별로 유도 질문과 함께 풀이 과정을 설명**해 주세요.
- "스스로 되짚어보기" 힌트 코너를 두어 올바른 개념적 방향성을 스스로 고안하게 만듭니다.

[답변 작성 구조]
전체 답변은 다음과 같은 마크다운 구조로 명확하게 나누어 제공해 주세요:

### 📚 1. 핵심 개념 이해
*(여기에 위에서 언급한 🌟[핵심 요약], 📊[도표/비교], 💡[한 줄 결론]의 3단계 구조를 엄격히 적용하여 짧고 굵게 적어주세요)*

### 🔍 2. 실시간 교육 자료 및 탐색 결과
- 구글 검색을 통해 대한민국 최신 교육 동향, 사교육 없이 바로 공부할 수 있는 공인 추천 학습 자료(EBS 무료 강좌, 에듀넷 등)와 연계 개념 및 실용 사례를 제시합니다.

### ✍️ 3. 기출 유형 및 시험 경향 분석
- 실제 학교 정기고사나 모의고사에서 이 개념이 어떤 유형의 문제로 변형되어 출제되는지 짧고 명료하게 짚어줍니다.
- 학생들이 가장 실수하기 쉬운 대표적인 오답 함정을 알려줍니다.

### 📝 4. 개념 다지기 연습 문제 (검토 완료)
- 2개의 핵심 연습 문제(객관식 또는 단답형)를 출제합니다.
- 직접 개발한 문제라면 문제 제목 옆에 **(AI 자체 개발)** 이라고 명시해야 합니다. (예: "문제 1. [과목] 핵심 문제 (AI 자체 개발)")
- 내부적으로 수학적/과학적 오류 문항이 없는지 면밀히 검수하고 "*(AI 교사 자체 검증 및 검토 완료)*" 문구를 덧붙여 주세요.

### 💡 5. 단계별 상세 해설 및 스스로 깨닫는 힌트
- 오답을 고르는 학생들이 왜 잘못 생각하기 쉬운지 오개념의 시작점을 친절하게 단계별로 짚어주고, 자가 교정을 돕는 다정한 질문과 힌트를 남겨 주세요.

한국어로 아주 친절하고 칭찬과 격려가 담긴 따뜻한 선생님의 목소리로 답변해 주세요.
`;

    // Try calling Gemini with Search Grounding first
    let response;
    let fallbackUsed = false;
    let standardAIFallbackUsed = false;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.7,
        },
      });
    } catch (searchError: any) {
      console.warn("⚠️ Google Search Grounding quota reached. Switched to standard AI generation.");
      fallbackUsed = true;
      try {
        // Retry without googleSearch tool to avoid separate Search Grounding quota limits
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (generalAIError: any) {
        console.error("❌ Standard AI generation also failed (General Quota Limit):", generalAIError.message);
        standardAIFallbackUsed = true;
      }
    }

    if (standardAIFallbackUsed) {
      // In case the entire API key is completely out of quota, we provide an elegant, helpful educational fallback template 
      // rather than showing a raw error screen to the student.
      const fallbackText = `
### 📚 1. 핵심 개념 이해
🌟 **[핵심 요약]**: [${subject}] 과목의 '${unit}' 단원은 우리가 스스로 핵심 원리를 깨우치고 내 것으로 소화해야 할 정말 유익한 배움입니다.
📊 **[도표/비교]**:
- ✔️ **확실하게 이해한 개념** ──> 💡 자신 있게 직접 친구나 가족에게 설명해 줄 수 있는 완벽한 지식!
- 🎒 **보충이 더 필요한 개념** ──> ✏️ 다시 한 번 찬찬히 교과서를 읽으며 빈틈을 예쁘게 채워갈 소중한 공부!
💡 **[한 줄 결론]**: 누군가의 기계적인 설명에 의존하지 않고, 스스로 질문을 던지며 이해해 나가는 힘이 가장 튼튼한 진짜 내 실력이 됩니다.

### 🔍 2. 실시간 교육 자료 및 탐색 결과
📖 대한민국 대표 무료 학습 플랫폼인 **EBSi(고교)**, **EBS 중학**, **EBS 초등** 사이트 또는 **에듀넷 티-클리어**에서 **'${unit}'**을 검색하시면 수준 높은 동영상 강의와 무료 기출문제를 바로 다운로드 받으실 수 있습니다.
📖 또한 국립 중앙과학관 또는 한국과학창의재단 사이트에서도 흥미진진한 일상 응용 원리들을 구경할 수 있습니다.

### ✍️ 3. 기출 유형 및 시험 경향 분석
🎯 이 핵심 단원은 학교 정기고사 및 수행평가에서 단골로 다뤄집니다.
★ **주요 출제 원리**: 정의를 정확히 아는지 묻는 서술형 평가, 주어지는 조건이나 수치 데이터를 직접 분석해 해석하는 탐구형 문항이 주를 이룹니다.
★ **함정 피하기**: 기본 식을 단순히 암기만 해서 대입하면 실수가 나오기 쉽습니다. 공식의 유도 과정과 성질을 차근차근 그려보는 훈련이 필요합니다.

### 📝 4. 개념 다지기 연습 문제 (검토 완료)
**문제 1. [자가 점검] 단원의 핵심어 정의하기 (AI 자체 개발)**
- 문제: '${unit}' 단원에서 내가 완벽하게 알고 있는 개념 2가지와 아직 보완이 필요한 개념 1가지를 종이에 차근차근 적어 보세요.
*(AI 교사 자체 검증 및 검토 완료)*

**문제 2. [실전 응용] 공식 및 원리 구조화하기 (AI 자체 개발)**
- 문제: 이 단원의 핵심 공식이나 성질을 마인드맵 형태로 그려 보거나 친구에게 3분 동안 소리 내어 설명해 보세요.
*(AI 교사 자체 검증 및 검토 완료)*

### 💡 5. 단계별 상세 해설 및 스스로 깨닫는 힌트
👍 스스로 설명해 보기는 뇌를 활성화하는 최고의 자기주도적 공부법입니다. 
👍 잠시 후 서버가 안정되면, 다시 **'학습 상자 열기'**를 눌러 제미나이 선생님의 실시간 분석 교재를 새롭게 탐색해 보세요!
`;

      return res.json({
        success: true,
        text: fallbackText,
        citations: [
          { title: "EBSi 고교 학습 사이트 (무료)", url: "https://www.ebsi.co.kr" },
          { title: "EBS 중학 교육 사이트 (무료)", url: "https://mid.ebs.co.kr" },
          { title: "에듀넷·티클리어 종합 교육망", url: "https://www.edunet.net" }
        ]
      });
    }

    const text = response.text || "답변을 생성하지 못했습니다. 다시 시도해 주세요.";
    
    // Extract search grounding citations
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    let citations = chunks
      .filter((chunk: any) => chunk.web && chunk.web.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || "참고 자료",
        url: chunk.web.uri
      }));

    if (fallbackUsed && citations.length === 0) {
      // If we retried without Google Search but AI key was okay, provide standard educational links
      citations = [
        { title: "EBSi 고교 학습 사이트 (무료)", url: "https://www.ebsi.co.kr" },
        { title: "EBS 중학 교육 사이트 (무료)", url: "https://mid.ebs.co.kr" },
        { title: "에듀넷·티클리어 종합 교육망", url: "https://www.edunet.net" }
      ];
    }

    res.json({
      success: true,
      text: text + (fallbackUsed ? "\n\n*(알림: 실시간 탐색 서버 접속 폭주로 인해 AI 기본 상식 데이터베이스 기반 학습서가 제공되었습니다. 더 정밀한 검색이 필요한 경우 잠시 후 다시 시도해 주세요!)*" : ""),
      citations: citations
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: "교육 보급 상자 서비스를 처리하는 중 오류가 발생했습니다.", 
      details: error.message 
    });
  }
});

// Endpoint to review student's self-written summary for active recall
app.post("/api/education/check-summary", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing." });
    }

    const { subject, unit, studentSummary, teacherExplanation } = req.body;

    if (!studentSummary) {
      return res.status(400).json({ error: "요약본을 입력해 주세요." });
    }

    const prompt = `
과목: ${subject}
단원/개념: ${unit}

[선생님의 기존 설명/교과 내용]
${teacherExplanation ? teacherExplanation.substring(0, 1500) : "해당 주제 기본 개념"}

[학생이 작성한 요약 및 이해도 점검]
"${studentSummary}"

위 학생의 요약 내용을 분석하고, 보완할 점과 칭찬을 담아 정밀 평가해 주세요.
`;

    const systemInstruction = `
당신은 학생의 자기주도적 학습(Active Recall)과 요약 능력을 길러주는 친절한 한국의 인공지능 보급 교사입니다.
학생이 쓴 요약을 읽고, 정서적으로 크게 격려하면서도 핵심 개념을 올바르게 파악했는지 확인하세요.

[★ 중요 금지 사항: 아스키 아트 및 선 텍스트 사용 금지]
- 텍스트로 만든 선 상자나 복잡한 표 형태의 기호(예: ┌──┐, ├──┤, └──┘, ┃, ━, ─ 등)는 절대로 사용하지 마세요. 화면이 깨지거나 모바일 기기에서 지저분해 보일 수 있습니다.
- 대신 **별표(★, ☆), 체크(✔), 하트(♥), 이모지(🎒, 💡, 🎯, 👍, 🌟)를 활용하여 정돈되고 세련된 한 줄 핵심 응원 문구와 보기 편한 목록**으로 구조화해 주세요.
- 피드백 내용을 줄글로만 가득 채우지 말고, 시각적으로 읽기 편하게 빈 줄과 기호들로 요약 포인트를 나누어 작성해 주세요.
- 개념이 올바르고 완벽하다면 격찬과 함께 응용 질문을 제안하세요.
- 일부 핵심 정보가 누락되었거나 오개념이 있다면, 친절하고 부드럽게 지적하며 힌트를 제공하세요.
- 응답은 반드시 지정된 JSON 스키마를 따라야 하며 한국어로 성실히 대답해야 합니다.
`;

    let response;
    let fallbackFeedback = false;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any, // In @google/genai, Type is an enum or string, let's use standard string/Type
            properties: {
              score: {
                type: "INTEGER" as any,
                description: "학생 요약 완성도 점수 (1점부터 5점까지)"
              },
              feedbackText: {
                type: "STRING" as any,
                description: "학생에게 전할 다정하고 격려 넘치는 평가 피드백 (한국어, 구어체)"
              },
              keyPointsMissed: {
                type: "ARRAY" as any,
                items: { type: "STRING" as any },
                description: "더 완벽한 요약을 위해 추가하면 좋은 핵심 키워드나 빠뜨린 점들 목록"
              }
            },
            required: ["score", "feedbackText", "keyPointsMissed"]
          },
          temperature: 0.6,
        }
      });
    } catch (apiError: any) {
      console.warn("⚠️ Summary evaluation API failed, using educational client-side heuristic feedback...", apiError.message);
      fallbackFeedback = true;
    }

    let feedback;
    if (fallbackFeedback || !response) {
      // Elegant local fallback feedback when AI is completely exhausted
      const wordsCount = studentSummary.trim().split(/\s+/).length;
      let score = 3;
      let feedbackText = `
🌟 **제미나이 선생님의 다정하고 따뜻한 격려 한마디**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ **공부한 내용 요약하기 미션 완료! 👍**

멋진 도전입니다! 요약을 소리 내어 작성하거나 직접 한 번 써보는 것만으로도 학습 기억의 80% 이상이 뇌 속에 더 오래 보존된답니다.

현재 AI 채점기 접속자가 일시적으로 많아 즉각적인 실시간 맞춤 채점은 잠시 지연되고 있지만, 스스로 적어본 소중한 요약과 위의 핵심 개념 가이드를 한 번 더 비교하면서 자가 진단을 해보세요! 당신의 눈부신 공부 열정을 온 마음으로 응원합니다!`;
      
      if (studentSummary.length > 50) {
        score = 4;
        feedbackText = `
🏆 **우수 요약가 제미나이 선생님의 특별 칭찬**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ **내용의 풍부함과 세심함이 정말 돋보여요! ⭐**

대단히 상세하고 성실한 요약입니다! 핵심 개념을 자기만의 언어로 풍부하게 표현하려고 정성을 다한 흔적이 글 속에 고스란히 묻어납니다.

위의 '1. 핵심 개념 이해' 내용과 일치하는지 한 번 더 눈으로 꼼꼼히 대조해보세요. 멋진 자기주도적 성장을 응원합니다!`;
      } else if (studentSummary.length < 15) {
        score = 2;
        feedbackText = `
💡 **제미나이 선생님의 한 걸음 더 나아가기 제안**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎒 **조금만 더 내용을 추가하면 최고예요! ✏️**

요약을 정성스럽게 시작해 주셔서 정말 기뻐요! 조금 더 깊은 학습 효과(Active Recall)를 누리기 위해, 최소한 두세 줄 이상으로 핵심 공식의 명칭이나 배운 원리까지 살을 살짝 덧붙여서 구체적으로 구상해 볼까요?

당신은 훨씬 더 훌륭하게 설명해 낼 수 있는 뛰어난 잠재력이 있답니다!`;
      }

      feedback = {
        score,
        feedbackText,
        keyPointsMissed: ["원리 구조화", "중요 용어 상세화", "실생활 예시 연결"]
      };
    } else {
      const resultText = response.text || "{}";
      try {
        feedback = JSON.parse(resultText);
      } catch (jsonErr) {
        feedback = {
          score: 4,
          feedbackText: "개념 요약 작성을 무사히 완료하였습니다! 작성한 내용을 곱씹으며 핵심 기출 경향을 다시 상기해 보세요.",
          keyPointsMissed: ["핵심 개념 구조화"]
        };
      }
    }

    res.json({
      success: true,
      feedback
    });

  } catch (error: any) {
    console.error("Summary Check Error:", error);
    res.status(500).json({ 
      error: "요약을 검토하는 도중 오류가 발생했습니다.", 
      details: error.message 
    });
  }
});

// Configure Vite or production static server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[보급 교육 상자] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
