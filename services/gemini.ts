/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Using gemini-3-pro-preview for advanced logic and SVG generation
const GEMINI_MODEL = 'gemini-3-pro-preview';
const QA_MODEL = 'gemini-2.5-flash';

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
    // Add visual class
    document.getElementById('stage').classList.add('simulating');
}

function stopSimulation() {
    isRunning = false;
    cancelAnimationFrame(simulationFrame);
    document.getElementById('stage').classList.remove('simulating');
    // Reset transforms if needed
    document.getElementById('source-image').style.transform = 'none';
}

function loop() {
    if (!isRunning) return;
    t += 0.05 * speed;
    
    // --- DYNAMIC LOGIC BASED ON IMAGE TYPE ---
    
    // TYPE A: BIOLOGICAL (Breathing)
    // const breath = Math.sin(t) * 0.02 * intensity;
    // document.getElementById('source-image').style.transform = \`scale(\${1 + breath}, \${1 - breath})\`;

    // TYPE B: MECHANICAL (Vibration)
    // const dx = (Math.random() - 0.5) * 2 * intensity;
    // const dy = (Math.random() - 0.5) * 2 * intensity;
    // document.getElementById('source-image').style.transform = \`translate(\${dx}px, \${dy}px)\`;

    // TYPE C: PARTICLES (Circuits)
    // updateParticles(); // You must implement this function if creating particles

    simulationFrame = requestAnimationFrame(loop);
}

// 3. UI CONTROLS
// Add event listeners to your generated sliders to update 'speed' and 'intensity' variables.
\`\`\`

---

### CRITICAL RULES
1.  **Do not use placeholders** like \`// code here\`. Write the actual working code.
2.  **Safety:** Wrap unsafe DOM access in \`try...catch\`.
3.  **Visuals:** Make the Control Panel look high-tech (semi-transparent black, monospace font).
4.  **Image:** Always preserve \`__IMAGE_PLACEHOLDER__\`.

### RESPONSE FORMAT
Return ONLY the raw HTML string (with embedded CSS/JS).
`;

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string): Promise<string> {
  const parts: any[] = [];
  
  const basePrompt = fileBase64 
    ? "Analyze this image. Determine if it is BIOLOGICAL, MECHANICAL, or SCHEMATIC. Generate a simulation HTML/JS that animates this specific object using the `loop()` function defined in the system instructions. Create sliders to control the physics parameters." 
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
      model: GEMINI_MODEL,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, 
      },
    });

    let text = response.text || "<!-- Failed to generate content -->";
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    // Inject the image directly into the HTML so it is guaranteed to display
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

// NEW: Refine Logic Function for Hot-Patching
export async function refineSimulation(currentHtml: string, instruction: string): Promise<string> {
    // Optimization: Remove the huge base64 string to save context window. We will put it back later.
    const imagePlaceholder = "__IMAGE_PLACEHOLDER__";
    // Regex to find the base64 src
    const imgRegex = /<img id="source-image" src="([^"]+)"/;
    let originalImageData = "";
    
    // Extract image data
    const match = currentHtml.match(imgRegex);
    if (match && match[1]) {
        originalImageData = match[1];
    }
    
    // Replace with placeholder for the prompt
    const strippedHtml = currentHtml.replace(imgRegex, `<img id="source-image" src="${imagePlaceholder}"`);

    const prompt = `
    You are a Senior Software Engineer performing a "Hot Patch" on a live simulation system.
    
    USER INSTRUCTION: "${instruction}"
    
    CURRENT HTML CODE:
    ${strippedHtml}
    
    *** SAFETY PROTOCOL - READ CAREFULLY ***
    1.  **PRESERVE UI STRUCTURE:** DO NOT remove the <div id="control-panel"> or <div id="stage">. These are critical system components.
    2.  **PRESERVE EVENT LISTENERS:** If the user asks to change one specific thing (e.g., "Make the fan faster"), DO NOT remove the event listeners for other buttons (e.g., "Power Switch"). Only modify what is requested.
    3.  **ROBUST JS:** Wrap new JavaScript logic in try...catch blocks to prevent breaking the whole app if a variable is missing.
    4.  **VISIBILITY:** Ensure the Control Panel remains visible (z-index: 100) and interactive.
    5.  **SIMULATION LOOP:** Ensure the 'loop()' function and 'message' event listener for 'toggleSimulation' are preserved or updated correctly if logic changes.
    
    TASK:
    1. Read the user instruction.
    2. Modify the JavaScript/CSS/HTML to fulfill the request.
    3. Return the FULL, VALID HTML string.
    
    OUTPUT:
    Return the raw HTML string only. No markdown.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: { parts: [{ text: prompt }] },
        });

        let newHtml = response.text || strippedHtml;
        newHtml = newHtml.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

        // Put the original image back
        if (originalImageData) {
            newHtml = newHtml.replace(imagePlaceholder, originalImageData);
        }

        return newHtml;

    } catch (error) {
        console.error("Refine Error:", error);
        throw error;
    }
}

export async function askQuestion(question: string, fileBase64?: string, mimeType?: string, croppedBase64?: string): Promise<string> {
  const parts: any[] = [];
  
  // Enhanced prompt for spatial awareness and micro-analysis
  const systemContext = `
  You are an expert technical analyst AI.
  
  YOUR TASKS:
  1. I will provide you with a MAIN image (Context) and optionally a ZOOMED/CROPPED image.
  2. If the user provided a ZOOMED image, IGNORE the main image for identification. Focus 100% on the ZOOMED image.
  3. Identify the specific object in the ZOOMED image.
  4. If it is a circuit board: Look for small text labels (silkscreen) like "D4", "C12", "R5" in the zoom.
  
  Keep the answer short and technical (under 3 sentences unless asked for more).
  `;
  
  parts.push({ text: systemContext });
  parts.push({ text: `User Question: "${question}"` });

  // 1. Full Image (Context)
  if (fileBase64 && mimeType) {
    parts.push({ text: "Image 1: FULL CONTEXT VIEW" });
    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType: mimeType,
      },
    });
  }

  // 2. Cropped Image (Target) - If provided, this is the priority
  if (croppedBase64) {
      parts.push({ text: "Image 2: ZOOMED TARGET VIEW (Focus on this)" });
      parts.push({
        inlineData: {
          data: croppedBase64,
          mimeType: 'image/jpeg', // Canvas toDataURL defaults to png/jpeg, usually standard mime types work
        },
      });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: QA_MODEL,
      contents: { parts: parts },
    });
    return response.text || "No answer generated.";
  } catch (error) {
    console.error("Gemini Q&A Error:", error);
    return "Error analyzing content.";
  }
}