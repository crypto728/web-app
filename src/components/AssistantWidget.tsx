import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Bot, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useTasks, useGoals } from '../useData';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export function AssistantWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hi! I can help you add tasks, set goals, or figure out what to do next. Try saying "Remind me to pay bills tomorrow at 5pm".' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const { addTask, updateTask, tasks } = useTasks();
  const { addGoal } = useGoals();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleVoice = async () => {
    if (isListening) {
      wsRef.current?.close();
      inputAudioCtxRef.current?.close();
      outputAudioCtxRef.current?.close();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '*Listening to your voice... Speak to add tasks.*' }]);
    
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/live`);
      wsRef.current = ws;
      
      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        const pcmToBase64 = (buffer: Float32Array) => {
          const pcm16 = new Int16Array(buffer.length);
          for (let i = 0; i < buffer.length; i++) {
            let s = Math.max(-1, Math.min(1, buffer[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          let binary = '';
          const bytes = new Uint8Array(pcm16.buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio: pcmToBase64(e.inputBuffer.getChannelData(0)) }));
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio && outputAudioCtxRef.current) {
          const binaryString = atob(msg.audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const int16Array = new Int16Array(bytes.buffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
          }
          
          const audioBuffer = outputAudioCtxRef.current.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);
          
          const sourceNode = outputAudioCtxRef.current.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(outputAudioCtxRef.current.destination);
          
          const currentTime = outputAudioCtxRef.current.currentTime;
          if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime + 0.1;
          }
          sourceNode.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
        }
        
        if (msg.interrupted) {
          // Reset queue
          nextStartTimeRef.current = outputAudioCtxRef.current?.currentTime || 0;
        }

        if (msg.functionCall) {
          if (msg.functionCall.name === "addTask") {
            const { title, description } = msg.functionCall.args;
            addTask({
              title,
              description: description || '',
              status: 'pending',
              priority: 'medium',
              context: '',
              snoozeCount: 0
            });
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Task added via voice: **${title}**` }]);
          }
        }
      };
      
      ws.onclose = () => {
        setIsListening(false);
      };
    } catch (e: any) {
      console.error("Voice Error", e);
      setIsListening(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `**Microphone error**: ${e.message || 'Permission denied. Please ensure your browser has given microphone access.'}` }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const pendingTasks = tasks.filter(t => t.status !== 'completed').map(t => ({ id: t.id, title: t.title }));
      
      const res = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: userMsg, 
          currentTime: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tasks: pendingTasks
        })
      });
      const data = await res.json();
      
      let reply = '';
      
      if (data.action === 'CREATE_TASK') {
        const deadlineDate = data.deadline ? new Date(data.deadline).getTime() : null;
        await addTask({
          title: data.title,
          description: data.description || '',
          deadline: deadlineDate,
          priority: data.priority || 'medium',
          status: 'pending',
          context: data.context || '',
          contextTrigger: data.contextTrigger || '',
          snoozeCount: 0
        });
        reply = `Got it! I added **${data.title}** to your tasks.`;
      } else if (data.action === 'CREATE_GOAL') {
        const targetDate = data.targetDate ? new Date(data.targetDate).getTime() : null;
        await addGoal({
          title: data.title,
          description: data.description || '',
          targetDate: targetDate,
          status: 'active',
          progress: 0,
          type: data.type || 'general'
        });
        reply = `Awesome! Goal **${data.title}** is set. Let's make it happen.`;
      } else if (data.action === 'SMART_SNOOZE') {
        const taskToUpdate = tasks.find(t => t.id === data.taskId);
        if (taskToUpdate) {
          if (taskToUpdate.locked) {
            reply = `I cannot snooze **${taskToUpdate.title}** because it has been locked by your AI Habit Coach to help you stay on track!`;
          } else {
            const suggestedTime = data.suggestedTime ? new Date(data.suggestedTime).getTime() : null;
            await updateTask(data.taskId, { 
              deadline: suggestedTime,
              snoozeCount: (taskToUpdate.snoozeCount || 0) + 1
            });
            reply = `I've rescheduled **${taskToUpdate.title}** to ${data.suggestedTime ? new Date(data.suggestedTime).toLocaleString() : 'later'}. Reason: ${data.reason}`;
          }
        } else {
          reply = "I couldn't find that task to snooze.";
        }
      } else if (data.action === 'ASK_QUESTION') {
        reply = data.response;
      } else {
        reply = "I'm not sure how to help with that right now. Try asking me to add a task.";
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Sorry, I had trouble processing that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "w-80 bg-[#0c101b]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl shadow-cyan-900/20 flex flex-col overflow-hidden fixed bottom-6 right-6 z-50 transition-all duration-300",
      isMinimized ? "h-[60px]" : "h-[500px]"
    )}>
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2 text-cyan-400">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold text-sm tracking-widest uppercase">Remr AI</h3>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          {isMinimized ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {messages.map(msg => (
          <div key={msg.id} className={cn(
            "flex gap-3 max-w-[85%]",
            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn(
              "px-3 py-2 rounded-xl border",
              msg.role === 'user' ? "bg-cyan-500 text-slate-950 border-cyan-400 font-medium" : "bg-white/5 border-white/10 text-white"
            )}>
              <div className="markdown-body text-xs sm:text-sm">
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-3 border-t border-white/10 bg-white/5">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={toggleVoice}
            className={cn(
              "p-2 rounded-lg transition-colors flex-shrink-0 border",
              isListening 
                ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse" 
                : "text-cyan-400 hover:bg-white/10 border-transparent"
            )}
            title={isListening ? "Stop listening" : "Start voice conversation"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what to do..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-400 outline-none text-white placeholder-slate-500 transition-colors"
          />
          <button type="submit" disabled={!input.trim() || loading} className="p-2 text-cyan-400 hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
