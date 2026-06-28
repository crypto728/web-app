import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import { WebSocketServer } from "ws";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/firebase-applet-config.json", (req, res) => {
    res.sendFile(path.join(process.cwd(), "firebase-applet-config.json"));
  });

  app.post("/api/ai/analyze-tasks", async (req, res) => {
    try {
      const { tasks, goals } = req.body;
      
      const prompt = `
        You are an AI productivity companion. Analyze the following tasks and goals.
        Provide a JSON response with:
        1. 'recommendations': A list of personalized productivity recommendations to help the user complete tasks effectively.
        2. 'prioritizedTaskIds': An ordered list of task IDs, from highest to lowest priority, based on deadlines, status, and associated goals.
        3. 'dailyPlan': A short summary string of the suggested plan for today.

        Tasks:
        ${JSON.stringify(tasks)}

        Goals:
        ${JSON.stringify(goals)}

        Return ONLY a JSON object with this exact structure:
        {
          "recommendations": ["...", "..."],
          "prioritizedTaskIds": ["id1", "id2"],
          "dailyPlan": "..."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      let text = response.text || "{}";
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Error analyzing tasks:", error);
      res.status(500).json({ error: "Failed to analyze tasks" });
    }
  });

  app.post("/api/ai/habit-coach", async (req, res) => {
    try {
      const { tasks } = req.body;
      const prompt = `
        Analyze the following tasks carefully. Pay attention to the 'snoozeCount' and 'priority' fields.
        According to high and complex thinking, if the user usually skips (snoozes) a task but it's important, they should not be allowed to skip it anymore.
        Determine which task IDs should be marked as "locked" (cannot be snoozed anymore).
        Tasks: ${JSON.stringify(tasks)}
        
        Return ONLY a JSON object with an array of task IDs to lock, like: { "lockedTaskIds": ["id1", "id2"] }
      `;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: "HIGH" },
            responseMimeType: "application/json"
          }
        });
      } catch (err: any) {
        console.log("Quota exceeded with gemini-3.1-pro-preview, falling back to 3.5-flash");
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
      }

      let text = response.text || "{}";
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Error in habit coach:", error);
      res.status(500).json({ error: "Failed to analyze habits" });
    }
  });

  app.post("/api/ai/parse-intent", async (req, res) => {
    try {
      const { input, currentTime, timeZone, tasks } = req.body;
      
      const prompt = `
        You are an AI productivity assistant. A user has given you a natural language command.
        Current time context (ISO string): ${currentTime}
        User's timezone: ${timeZone}
        Existing Pending Tasks (for context or snoozing): ${JSON.stringify(tasks)}

        Parse the command and return a JSON object representing the action to take.
        IMPORTANT: Calculate any dates/times RELATIVE to the given current time and timezone. Output the final deadline/targetDate strictly in ISO 8601 UTC format.
        
        Actions can be:
        - CREATE_TASK: { action: "CREATE_TASK", title: "...", description: "...", deadline: "ISO date or null", priority: "high|medium|low", context: "...", contextTrigger: "e.g., when at work, when grocery shopping, etc." }
        - CREATE_GOAL: { action: "CREATE_GOAL", title: "...", description: "...", targetDate: "ISO date or null", type: "..." }
        - ASK_QUESTION: { action: "ASK_QUESTION", response: "..." }
        - SMART_SNOOZE: { action: "SMART_SNOOZE", taskId: "...", suggestedTime: "ISO date", reason: "..." }
        
        Command: "${input}"

        Return ONLY a JSON object.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      let text = response.text || "{}";
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Error parsing intent:", error);
      res.status(500).json({ error: "Failed to parse intent" });
    }
  });

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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful voice assistant for a task app. Ask the user what task they want to add. When they give you a task, call the addTask tool to add it.",
          tools: [{
            functionDeclarations: [{
              name: "addTask",
              description: "Add a task to the user's list",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Title of the task" },
                  description: { type: Type.STRING, description: "Description or context" }
                },
                required: ["title"]
              }
            }]
          }]
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }

            const toolCall = message.toolCall;
            if (toolCall && toolCall.functionCalls) {
              for (const call of toolCall.functionCalls) {
                if (call.name === "addTask") {
                  clientWs.send(JSON.stringify({ functionCall: { name: call.name, args: call.args } }));
                }
              }
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      });

      clientWs.on("close", () => {
        session.close();
      });
    } catch (e) {
      console.error("Live API Error:", e);
    }
  });
}

startServer();

