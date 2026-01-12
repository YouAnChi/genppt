import React, { useState } from 'react';
import ChatPanel from './components/ChatPanel';
import PresentationPanel from './components/PresentationPanel';
import { AgentProgress, AgentStatus, ChatMessage, Presentation, SlideData, SlideLayout } from './types';
import { generatePresentationPlan, generateSingleSlide, generateSlideImage, chatWithAgent } from './services/geminiService';
import { INITIAL_SUGGESTIONS } from './constants';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [agentProgress, setAgentProgress] = useState<AgentProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");

  const addMessage = (role: 'user' | 'model', text: string, isAgentStatus = false) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      text,
      timestamp: Date.now(),
      isAgentStatus
    }]);
  };

  // Helper to add logs to the progress card
  const addAgentLog = (log: string) => {
    setAgentProgress(prev => {
        if (!prev) return null;
        return {
            ...prev,
            logs: [...prev.logs, log]
        };
    });
  };

  const handleCreatePresentation = async (topic: string) => {
    setIsLoading(true);
    // 1. User Message
    addMessage('user', `Create a presentation about ${topic}`);
    
    // 2. Initial Agent Response & Status
    setAgentProgress({
      status: AgentStatus.PLANNING,
      steps: [
        { label: 'Initializing project', completed: false, current: true },
        { label: 'Director: Visual Strategy & Brief', completed: false, current: false },
        { label: 'Designer: Streaming Slides', completed: false, current: false },
        { label: 'Artist: Rendering Visuals', completed: false, current: false },
        { label: 'Finalizing presentation', completed: false, current: false },
      ],
      logs: [`System: Starting new project "${topic}"...`]
    });
    
    addMessage('model', `I'll create a unique presentation about "${topic}". My Creative Director is defining the visual strategy now.`, true);

    try {
      // --- STAGE 1: PLANNER ---
      updateAgentStep(1); // Visual Strategy
      const plan = await generatePresentationPlan(topic, addAgentLog);
      
      // --- INITIALIZE UI IMMEDIATELY ---
      // We set the presentation with the Title/Theme but NO slides yet.
      // The user sees the shell immediately.
      setPresentation({
          title: plan.title,
          topic: plan.topic,
          slides: []
      });

      addAgentLog(`System: Presentation shell created. Theme: "${plan.visualTheme}"`);
      updateAgentStep(2); // Designer Streaming
      
      // --- STAGE 2 & 3: DESIGNER + ARTIST LOOP ---
      // We iterate and update state incrementally
      
      const themeContext = {
          topic: plan.topic,
          theme: plan.visualTheme,
          accentColor: plan.accentColor,
          tone: plan.tone
      };

      for (let i = 0; i < plan.slides.length; i++) {
          const slideOutline = plan.slides[i];
          addAgentLog(`Designer: Creating Slide ${i+1}/${plan.slides.length}: "${slideOutline.title}"...`);
          
          // Retry logic for slide generation
          let retryCount = 0;
          const maxRetries = 3;
          let slideContent = null;
          
          while (retryCount < maxRetries && !slideContent) {
              try {
                  // 1. Generate Content & HTML with timeout
                  const timeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Timeout')), 30000) // 30s timeout
                  );
                  
                  slideContent = await Promise.race([
                      generateSingleSlide(slideOutline, i, themeContext),
                      timeoutPromise
                  ]) as Omit<SlideData, 'id' | 'layout'>;
                  
                  addAgentLog(`Designer: ✓ Slide ${i+1} content generated`);
                  
              } catch (e) {
                  retryCount++;
                  console.error(`Failed to generate slide ${i}, attempt ${retryCount}`, e);
                  
                  if (retryCount < maxRetries) {
                      addAgentLog(`Designer: Retrying slide ${i+1} (attempt ${retryCount + 1}/${maxRetries})...`);
                      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                  } else {
                      addAgentLog(`System: ⚠ Skipped slide ${i+1} after ${maxRetries} attempts`);
                      break;
                  }
              }
          }
          
          // If we got content, add it to presentation
          if (slideContent) {
              const newSlide: SlideData = {
                  ...slideContent,
                  id: `slide-${i}-${Date.now()}`,
                  layout: SlideLayout.GENERATIVE,
                  accentColor: plan.accentColor,
                  imageUrl: undefined 
              };

              // 2. Push to State (UI updates immediately)
              setPresentation(prev => {
                  if (!prev) return null;
                  return { ...prev, slides: [...prev.slides, newSlide] };
              });

              // 3. Trigger Image Generation in Background (Fire and Forget)
              addAgentLog(`Artist: Generating visual for Slide ${i+1}...`);
              generateSlideImage(newSlide.imagePrompt, "16:9", imageSize).then(url => {
                   setPresentation(prev => {
                       if (!prev) return null;
                       return {
                           ...prev,
                           slides: prev.slides.map(s => {
                               if (s.id === newSlide.id) {
                                   const updatedHtml = s.htmlContent.replace(/__SLIDE_IMAGE__/g, url);
                                   return { ...s, imageUrl: url, htmlContent: updatedHtml };
                               }
                               return s;
                           })
                       };
                   });
                   addAgentLog(`Artist: ✓ Visual rendered for Slide ${i+1}`);
              }).catch(err => {
                  console.error("Image gen failed", err);
                  addAgentLog(`Artist: ⚠ Visual failed for Slide ${i+1} - using placeholder`);
              });
          }
      }
      
      // Finish
      setAgentProgress(prev => prev ? ({ ...prev, status: AgentStatus.COMPLETED }) : null);
      addAgentLog("System: All tasks completed.");
      updateAgentStep(4); // All done
      
      addMessage('model', `Presentation ready! I've designed a custom visual theme: "${plan.visualTheme}". Review the slides below.`);

    } catch (error) {
      console.error(error);
      addAgentLog(`Error: Process failed - ${error instanceof Error ? error.message : 'Unknown'}`);
      addMessage('model', 'Sorry, I encountered an error while creating the presentation. Please try again.');
      setAgentProgress(prev => prev ? ({ ...prev, status: AgentStatus.ERROR }) : null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAgentStep = (stepIndex: number) => {
    setAgentProgress(prev => {
        if (!prev) return null;
        const newSteps = [...prev.steps];
        // Mark previous as completed
        for(let i=0; i<stepIndex; i++) {
            newSteps[i].completed = true;
            newSteps[i].current = false;
        }
        // Mark current
        if (newSteps[stepIndex]) {
            newSteps[stepIndex].current = true;
        }
        
        let status = prev.status;
        if (stepIndex === 1) status = AgentStatus.PLANNING; 
        if (stepIndex === 2) status = AgentStatus.GENERATING_CONTENT; 
        if (stepIndex === 3) status = AgentStatus.GENERATING_IMAGES; // We might skip this state visibly in streaming mode
        if (stepIndex >= 4) status = AgentStatus.COMPLETED;

        return { ...prev, steps: newSteps, status };
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');

    // If no presentation exists, treat as creation request
    if (!presentation && messages.length === 0) {
        handleCreatePresentation(userText);
        return;
    }

    // Normal chat mode
    addMessage('user', userText);
    setIsLoading(true);

    try {
        const response = await chatWithAgent(
            messages.map(m => ({ role: m.role, text: m.text })),
            userText,
            JSON.stringify(presentation)
        );
        addMessage('model', response);
    } catch (error) {
        addMessage('model', "I'm having trouble connecting right now.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white">
      <ChatPanel 
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSendMessage}
        isLoading={isLoading}
        agentProgress={agentProgress}
        onSuggestionClick={(text) => handleCreatePresentation(text)}
        suggestions={INITIAL_SUGGESTIONS}
        imageSize={imageSize}
        setImageSize={setImageSize}
      />
      <PresentationPanel 
        presentation={presentation}
        isGenerating={agentProgress?.status !== AgentStatus.COMPLETED && agentProgress?.status !== AgentStatus.ERROR && agentProgress !== null}
      />
    </div>
  );
}

export default App;