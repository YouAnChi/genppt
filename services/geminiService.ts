import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, SlideLayout, Presentation, PresentationOutline, SlideOutline } from "../types";

// Helper to create the AI instance
const createAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- STAGE 1: PLANNER (The Art Director & Strategist) ---
export const generatePresentationPlan = async (
  topic: string,
  onLog?: (msg: string) => void
): Promise<PresentationOutline> => {
  const ai = createAI();

  if (onLog) onLog(`Initializing Creative Director for topic: "${topic}"...`);

  const prompt = `
    Role: Senior Creative Director & Strategist.
    
    Your Goal: Design the narrative and VISUAL DIRECTION for a presentation on "${topic}".
    
    **Phase 1: Strategy**
    1. Define Audience, Goal, and Tone.
    2. Choose a sophisticated 'visualTheme' (e.g., "Swiss Minimalist", "Cyberpunk Data", "Editorial Fashion", "Corporate Clean", "Neo-Brutalism").
    3. Select a distinct 'accentColor' hex code that matches the theme.
    
    **Phase 2: The Outline (Art Direction)**
    Create 6-8 slides. For each slide, you provide the 'visualAdvice'.
    
    **CRITICAL - VISUAL ADVICE GUIDE**:
    Do NOT ask for standard layouts. Describe the scene like a movie director or magazine editor.
    Examples of 'visualAdvice':
    - "Split screen. Left side is deep black with massive white typography. Right side is the image."
    - "A floating glass card in the center containing data, over a blurred full-screen background."
    - "Typography driven. Huge letters filling the screen, accent color used sparingly for lines."
    - "Grid layout with 4 distinct quadrants, highly structured, thin borders."
    
    Output JSON.
  `;

  try {
    if (onLog) onLog("Director: Defining visual strategy and narrative arc...");
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            presentationGoal: { type: Type.STRING },
            tone: { type: Type.STRING },
            visualTheme: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            researchContext: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  visualAdvice: { type: Type.STRING, description: "Description of the composition, layout, and visual vibe for the designer." }
                },
                required: ["title", "purpose", "visualAdvice"]
              }
            }
          },
          required: ["topic", "title", "slides", "researchContext", "targetAudience", "presentationGoal", "tone", "visualTheme", "accentColor"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text response from Gemini Planner");
    
    const plan = JSON.parse(text) as PresentationOutline;
    
    if (onLog) {
        onLog(`Strategy Defined: ${plan.visualTheme}`);
        onLog(`Tone: ${plan.tone}`);
        onLog("Director: Visual briefs prepared for Designer.");
    }
    
    return plan;

  } catch (error) {
    console.error("Error in Planner stage:", error);
    if (onLog) onLog(`Error: ${error instanceof Error ? error.message : 'Unknown error in Planner'}`);
    throw error;
  }
};

// --- STAGE 2: DESIGNER (Streaming Mode - Single Slide) ---
export const generateSingleSlide = async (
    slideOutline: SlideOutline,
    index: number,
    metadata: { topic: string; theme: string; accentColor: string; tone: string },
    onLog?: (msg: string) => void
): Promise<Omit<SlideData, 'id' | 'layout'>> => {
    const ai = createAI();

    // if (onLog) onLog(`Designer: Coding slide ${index + 1}...`);

    const prompt = `
    Role: Expert Frontend Developer & UI Designer.
    
    **Project Context**: 
    Topic: "${metadata.topic}"
    Theme: "${metadata.theme}"
    Tone: "${metadata.tone}"
    Accent Color: "${metadata.accentColor}"
    
    **Current Task**: Design Slide #${index + 1}.
    
    **Slide Brief (from Art Director)**:
    Title: "${slideOutline.title}"
    Purpose: "${slideOutline.purpose}"
    Visual Direction: "${slideOutline.visualAdvice}"
    
    **HTML/CSS RULES**:
    1. **Container**: Root element MUST be \`<div class="w-[1280px] h-[720px] overflow-hidden relative ...">\`.
    2. **Styling**: Tailwind CSS only. Use specific pixel values or % for layout to fit 1280x720 exactly.
    3. **Images**: If the slide needs an image, use \`<img>\` with \`src="__SLIDE_IMAGE__"\` and \`class="object-cover ..."\`.
    4. **Typography**: Use 'font-sans' (Inter). Use bold, massive typography for impact.
    5. **Colors**: Use the accent color "${metadata.accentColor}" intelligently.
    
    Output JSON containing the content data and the 'htmlContent'.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 1024 }, // Lower budget for speed per slide
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        subtitle: { type: Type.STRING },
                        content: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        imagePrompt: { type: Type.STRING },
                        htmlContent: { type: Type.STRING, description: "The complete raw HTML string for this slide (1280x720 div)" },
                        designDirective: { type: Type.STRING },
                        stats: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    value: { type: Type.STRING },
                                    label: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ["title", "content", "imagePrompt", "htmlContent"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No text response from Gemini Designer");

        return JSON.parse(text) as Omit<SlideData, 'id' | 'layout'>;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error generating slide ${index}:`, error);
        if (onLog) onLog(`Designer: Error on slide ${index + 1}: ${errorMsg}`);
        throw error;
    }
};


export const generateSlideImage = async (
  imagePrompt: string,
  aspectRatio: "16:9" | "4:3" | "1:1" = "16:9",
  imageSize: "1K" | "2K" | "4K" = "1K"
): Promise<string> => {
  
  const win = window as any;
  if (win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
    }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let enhancedPrompt = imagePrompt;
  if (!imagePrompt.toLowerCase().includes('8k') && !imagePrompt.toLowerCase().includes('photorealistic')) {
     enhancedPrompt = `${imagePrompt}, 8k, photorealistic, cinematic lighting, highly detailed, trending on artstation`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image:", error);
    // Return a random gradient placeholder if image fails, better than picsum for presentations
    return `https://placehold.co/1280x720/1a1a1a/FFF?text=Visual+Generating...`;
  }
};

export const chatWithAgent = async (
  history: { role: string; text: string }[],
  message: string,
  currentContext: string
): Promise<string> => {
    const ai = createAI();
    
    const systemInstruction = `You are a helpful presentation assistant. 
    You have access to the current presentation content in JSON format: ${currentContext}.
    Help the user refine the content, answer questions about the topic, or suggest improvements.
    Keep answers concise and helpful.`;

    const chat = ai.chats.create({
        model: "gemini-3-pro-preview",
        config: {
            systemInstruction
        },
        history: history.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.text }]
        }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
};