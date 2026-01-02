/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Default fallback if nothing passed
const DEFAULT_MODEL = 'gemini-3-flash-preview';

export const AVAILABLE_MODELS = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Max Intelligence)', description: 'Best for complex logic & schematics.' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (High Speed)', description: 'Fastest response, high efficiency.' }
];

// Inisialisasi Google GenAI dengan API Key dari environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert Simulation Architect and Physics Engine Developer.
Your goal is to turn a static image into a DYNAMIC, MOVING, INTERACTIVE HTML5 experience.

### CORE OBJECTIVE: "LEVEL 4 SIMULATION"
You must implement a \`requestAnimationFrame\` loop that brings the image to life based on its content.

### STEP 1: CLASSIFY & ANIMATE
Analyze the image content and choose the correct Physics Model:

1.  **BIOLOGICAL / ORGANIC (Animals, Humans, Cells)**
    *   **Effect:** "Breathing & Life".
    *   **Implementation:** Apply a CSS \`transform: scale(1.02, 0.98)\` sine-wave animation to the container or specific overlays to simulate breathing.
    *   **Controls:** "Heart Rate" slider (controls animation speed).

2.  **MECHANICAL / MACHINES (Engines, Robots, Cars)**
    *   **Effect:** "Vibration & Rumble".
    *   **Implementation:** Rapid X/Y CSS offsets (shake) + Rotation of circular parts (wheels/fans).
    *   **Controls:** "RPM / Power" slider.

3.  **SCHEMATIC / FLUIDS / CIRCUITS (Blueprints, Maps)**
    *   **Effect:** "Flow & Particles".
    *   **Implementation:** Generate specific <div> particles that move along a path (SVG path or simple coordinates) to simulate electricity or water flow.
    *   **Controls:** "Flow Rate" slider.

---

### STEP 2: MANDATORY HTML STRUCTURE

1.  **Stage:**
    \`<div id="stage" class="simulation-container" style="...">\`
2.  **Image:**
    \`<img id="source-image" src="__IMAGE_PLACEHOLDER__" style="...">\`
3.  **Effects Layer:** (For particles/overlays)
    \`<div id="effects-layer" style="position:absolute; inset:0; pointer-events:none; overflow:hidden;"></div>\`
4.  **Control Panel:**
    \`<div id="control-panel" style="..."> [SLIDERS HERE] </div>\`

---

### STEP 3: JAVASCRIPT LOGIC (THE PHYSICS LOOP)

You MUST generate a script that handles the "Simulate" button signal.

\`\`\`javascript
// Global State
let isRunning = false;
let simulationFrame;
let t = 0; // Time

// Parameters (Link these to your sliders!)
let speed = 1;
let intensity = 1;

// 1. LISTEN FOR MESSAGES FROM REACT APP
window.addEventListener('message', (event) => {
    if (event.data.type === 'toggleSimulation') {
        if (event.data.isPlaying) {
            startSimulation();
        } else {
            stopSimulation();
        }
    }
});

// 2. THE PHYSICS LOOP
function startSimulation() {
    isRunning = true;
    loop();
    document.getElementById('stage').classList.add('simulating');
}

function stopSimulation() {
    isRunning = false;
    cancelAnimationFrame(simulationFrame);
    document.getElementById('stage').classList.remove('simulating');
    document.getElementById('source-image').style.transform = 'none';
}

function loop() {
    if (!isRunning) return;
    t += 0.05 * speed;
    
    // Dynamic logic implementation here...
    simulationFrame = requestAnimationFrame(loop);
}
\`\`\`

---

### CRITICAL RULES
1.  **Do not use placeholders**. Write actual working code.
2.  **Safety:** Wrap DOM access in try...catch.
3.  **Image:** Always preserve \`__IMAGE_PLACEHOLDER__\`.

### RESPONSE FORMAT
Return ONLY the raw HTML string.
`;

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string, modelId: string = DEFAULT_MODEL): Promise<string> {
  const parts: any[] = [];
  const basePrompt = fileBase64 
    ? "Analyze this image. Determine if it is BIOLOGICAL, MECHANICAL, or SCHEMATIC. Generate a simulation HTML/JS that animates this specific object using the loop() function." 
    : prompt || "Create an interactive educational simulation.";

  parts.push({ text: basePrompt });

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType: mimeType,
      },
    });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: { parts: parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, 
      },
    });

    let text = response.text || "<!-- Failed to generate content -->";
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    if (fileBase64 && mimeType) {
        const dataUri = `data:${mimeType};base64,${fileBase64}`;
        text = text.replace(/__IMAGE_PLACEHOLDER__/g, dataUri);
    }

    return text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}

export async function refineSimulation(currentHtml: string, instruction: string, modelId: string = DEFAULT_MODEL): Promise<string> {
    const imagePlaceholder = "__IMAGE_PLACEHOLDER__";
    const imgRegex = /<img id="source-image" src="([^"]+)"/;
    let originalImageData = "";
    
    const match = currentHtml.match(imgRegex);
    if (match && match[1]) originalImageData = match[1];
    
    const strippedHtml = currentHtml.replace(imgRegex, `<img id="source-image" src="${imagePlaceholder}"`);

    const prompt = `Perform a hot-patch on this simulation. User request: "${instruction}"\n\nCode:\n${strippedHtml}`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
        });

        let newHtml = response.text || strippedHtml;
        newHtml = newHtml.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

        if (originalImageData) {
            newHtml = newHtml.replace(imagePlaceholder, originalImageData);
        }

        return newHtml;
    } catch (error) {
        return currentHtml;
    }
}

export async function askQuestion(question: string, fileBase64?: string, mimeType?: string, croppedBase64?: string, modelId: string = DEFAULT_MODEL): Promise<string> {
  const parts: any[] = [];
  parts.push({ text: `Analyze the provided visual data and answer: ${question}` });

  if (fileBase64 && mimeType) {
    parts.push({ inlineData: { data: fileBase64, mimeType: mimeType } });
  }

  if (croppedBase64) {
      parts.push({ inlineData: { data: croppedBase64.split(',')[1], mimeType: 'image/jpeg' } });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: { parts: parts },
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    return "Error analyzing content.";
  }
}

export async function locateObject(query: string, fileBase64: string, mimeType: string, modelId: string = DEFAULT_MODEL): Promise<{found: boolean, x: number, y: number, label: string}> {
    const prompt = `Locate "${query}" in percentages (0-100). Return JSON: {found: boolean, x: number, y: number, label: string}`;
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: prompt }, { inlineData: { data: fileBase64, mimeType: mimeType } }]
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '{"found": false}');
    } catch (e) {
        return { found: false, x: 50, y: 50, label: "Error" };
    }
}

export async function generateSchematicOverlay(fileBase64: string, mimeType: string, modelId: string = DEFAULT_MODEL): Promise<string> {
    const prompt = `Generate SVG paths (inner XML) for main components. Style: stroke="cyan" stroke-width="0.5" fill="none".`;
    try {
         const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: prompt }, { inlineData: { data: fileBase64, mimeType: mimeType } }]
            }
        });
        return (response.text || "").replace(/```xml/g, '').replace(/```/g, '').trim();
    } catch (e) { return ""; }
}

export interface BioData {
    isBiological: boolean;
    commonName: string;
    scientificName: string;
    anatomicalFeature?: string;
    family: string;
    description: string;
    confidence: number;
    isDangerous: boolean;
    safetyNote: string;
    links: { title: string, url: string }[];
    photographyTips?: string;
}

export async function analyzeBiologicalEntity(targetBase64: string, contextBase64?: string, modelId: string = DEFAULT_MODEL): Promise<BioData> {
    const prompt = `Identify biological subject. Return JSON according to application schema.`;
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: prompt }, { inlineData: { data: targetBase64, mimeType: "image/jpeg" } }]
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { isBiological: false, commonName: "Unknown", scientificName: "", family: "", description: "", confidence: 0, isDangerous: false, safetyNote: "", links: [] };
    }
}

export interface TechData {
    isTechnical: boolean;
    componentName: string;
    parentSystem: string;
    function: string;
    material?: string;
    isScaleModel: boolean;
    complexity: string;
    confidence: number;
}

export async function analyzeTechnicalComponent(targetBase64: string, contextBase64?: string, modelId: string = DEFAULT_MODEL): Promise<TechData> {
    const prompt = `Identify technical component. Return JSON according to application schema.`;
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: prompt }, { inlineData: { data: targetBase64, mimeType: "image/jpeg" } }]
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { isTechnical: false, componentName: "Unknown", parentSystem: "", function: "", isScaleModel: false, complexity: "Low", confidence: 0 };
    }
}