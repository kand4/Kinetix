/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, SchemaType } from "@google/genai";

// Default fallback if nothing passed
const DEFAULT_MODEL = 'gemini-2.5-flash-latest';

export const AVAILABLE_MODELS = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Max Intelligence)', description: 'Best for complex logic & schematics.' },
    { id: 'gemini-2.5-flash-latest', name: 'Gemini 2.5 Flash (High Speed)', description: 'Fastest response, unlimited quota.' }
];

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

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string, modelId: string = DEFAULT_MODEL): Promise<string> {
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
      model: modelId,
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
export async function refineSimulation(currentHtml: string, instruction: string, modelId: string = DEFAULT_MODEL): Promise<string> {
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
            model: modelId,
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

export async function askQuestion(question: string, fileBase64?: string, mimeType?: string, croppedBase64?: string, modelId: string = DEFAULT_MODEL): Promise<string> {
  const parts: any[] = [];
  
  // Enhanced prompt for spatial awareness and micro-analysis
  const systemContext = `
  You are an expert technical analyst AI using ${modelId}.
  
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
      model: modelId,
      contents: { parts: parts },
    });
    return response.text || "No answer generated.";
  } catch (error) {
    console.error("Gemini Q&A Error:", error);
    return "Error analyzing content.";
  }
}

// --- NEW FEATURES FOR KINETIX 2.0 ---

// 1. AUTO-PILOT PROBE: Locates an object and returns coordinates
export async function locateObject(query: string, fileBase64: string, mimeType: string, modelId: string = DEFAULT_MODEL): Promise<{found: boolean, x: number, y: number, label: string}> {
    const prompt = `
    Analyze the image. Locate the object described as: "${query}".
    Return the coordinates of the CENTER of this object as percentages (0-100) relative to the image width and height.
    
    Response format (JSON ONLY):
    {
        "found": true/false,
        "x": number (percentage 0-100),
        "y": number (percentage 0-100),
        "label": "short name of object found"
    }
    If not found, set "found": false.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { data: fileBase64, mimeType: mimeType } }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text;
        if (!text) return { found: false, x: 50, y: 50, label: "Not found" };
        
        return JSON.parse(text);
    } catch (e) {
        console.error("Locate Object Error", e);
        return { found: false, x: 50, y: 50, label: "Error" };
    }
}

// 2. X-RAY LAYER: Generates a schematic SVG overlay
export async function generateSchematicOverlay(fileBase64: string, mimeType: string, modelId: string = DEFAULT_MODEL): Promise<string> {
    const prompt = `
    Generate an SVG Overlay (X-Ray View) for this image.
    1. Detect the edges of main components (walls, circuits, parts).
    2. Create an SVG string with viewBox="0 0 100 100" (preserveAspectRatio="none").
    3. Use <path>, <rect>, or <circle> elements.
    4. Style: stroke="cyan" stroke-width="0.5" fill="none" opacity="0.8".
    5. Do NOT include <svg> tag wrapper, just the inner elements (groups/paths).
    6. Keep it abstract and high-tech (HUD style).
    
    Output: ONLY the SVG inner XML string.
    `;

    try {
         const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { data: fileBase64, mimeType: mimeType } }
                ]
            }
        });

        let svg = response.text || "";
        svg = svg.replace(/```xml/g, '').replace(/```/g, '').trim();
        return svg;
    } catch (e) {
        console.error("X-Ray Gen Error", e);
        return "";
    }
}

// 3. BIO-SCANNER: Deep taxonomy and safety analysis
export interface BioData {
    isBiological: boolean;
    commonName: string;
    scientificName: string; // Genus Species
    anatomicalFeature?: string; // NEW: Specific body part identified in the crop
    family: string;
    description: string;
    confidence: number; // 0-100
    isDangerous: boolean;
    safetyNote: string; // e.g., "Venomous sting" or "Harmless"
    links: { title: string, url: string }[];
    photographyTips?: string; // Only if confidence < 60
}

export async function analyzeBiologicalEntity(targetBase64: string, contextBase64?: string, modelId: string = DEFAULT_MODEL): Promise<BioData> {
    const parts: any[] = [];

    // Construct a context-aware prompt
    const prompt = `
    Analyze this biological subject for Field Study / Biological Research.
    
    I have provided TWO images (if available).
    1. **TARGET IMAGE (Crop/Focus)**: This is exactly where the probe is pointing.
    2. **CONTEXT IMAGE (Full View)**: This shows the whole creature.

    **CRITICAL INSTRUCTIONS:**
    1. Use the CONTEXT image to identify the species (e.g. Mosquito, Centipede).
    2. Use the TARGET image to identify the **SPECIFIC ANATOMICAL PART** being scanned (e.g. Proboscis, Antenna, Compound Eye, Tarsus, Mandibles).
    3. If the TARGET is just the general body, leave 'anatomicalFeature' empty or put "Torso/Body".
    
    **STRICT LINK GENERATION RULES (NO 404s):**
    Do NOT guess specific article URLs (like cdc.gov/insects/mosquito.html) as they often change and break (404).
    Instead, construct **DYNAMIC SEARCH URLs** to high-authority databases using the Scientific Name.
    
    Use these formats for 'links':
    - PubMed: "https://pubmed.ncbi.nlm.nih.gov/?term=" + Scientific Name
    - Google Scholar: "https://scholar.google.com/scholar?q=" + Scientific Name
    - GBIF: "https://www.gbif.org/species/search?q=" + Scientific Name
    
    Return strict JSON format:
    {
        "isBiological": boolean, 
        "commonName": "string", 
        "scientificName": "Genus species",
        "anatomicalFeature": "string",
        "family": "string",
        "description": "Short biological summary of the SPECIES and the PART (2 sentences).",
        "confidence": number, // 0-100
        "isDangerous": boolean, 
        "safetyNote": "string",
        "links": [
             { "title": "PubMed Research", "url": "..." },
             { "title": "Google Scholar", "url": "..." }
        ],
        "photographyTips": "string" 
    }
    
    If it is NOT biological, set "isBiological": false.
    `;
    
    parts.push({ text: prompt });
    
    // Image 1: Target (Focus)
    parts.push({ text: "IMAGE 1: TARGET (ANATOMICAL CROP)" });
    parts.push({ inlineData: { data: targetBase64, mimeType: "image/jpeg" } });

    // Image 2: Context (Optional Full View)
    if (contextBase64) {
        parts.push({ text: "IMAGE 2: CONTEXT (FULL VIEW)" });
        parts.push({ inlineData: { data: contextBase64, mimeType: "image/jpeg" } });
    }

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: parts
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text);
    } catch (e) {
        console.error("Bio Scan Error", e);
        return {
            isBiological: false,
            commonName: "Unknown",
            scientificName: "",
            family: "",
            description: "Scan failed.",
            confidence: 0,
            isDangerous: false,
            safetyNote: "",
            links: []
        };
    }
}

// 4. TECH-SCANNER: Engineering analysis for machines/circuits
export interface TechData {
    isTechnical: boolean;
    componentName: string; // e.g. "Rocket Nozzle", "Microcontroller"
    parentSystem: string; // e.g. "Saturn V Rocket", "Arduino Board"
    function: string; // Explanation of what the part does
    material?: string; // e.g. "Titanium Alloy", "Silicon"
    isScaleModel: boolean; // Detect if it's a toy/model
    complexity: string; // Low, Medium, High
}

export async function analyzeTechnicalComponent(targetBase64: string, contextBase64?: string, modelId: string = DEFAULT_MODEL): Promise<TechData> {
    const parts: any[] = [];

    const prompt = `
    Analyze this mechanical/technical subject as a Senior Engineer.
    
    I have provided TWO images (if available).
    1. **TARGET IMAGE (Crop/Focus)**: This is exactly where the probe is pointing.
    2. **CONTEXT IMAGE (Full View)**: This shows the whole machine/object.
    
    **CRITICAL INSTRUCTIONS:**
    1. Identify the **SPECIFIC COMPONENT** in the TARGET image (e.g. Fuel Injector, Wheel Flange, Capacitor).
    2. Identify the **PARENT SYSTEM** from the CONTEXT (e.g. Steam Locomotive, Motherboard).
    3. Explain the **FUNCTION** of the component (physics/engineering purpose).
    4. Detect if this is a real machine or a **Scale Model / Toy**. If it is a model, analyze it as if it were the real thing, but set isScaleModel: true.
    
    Return strict JSON format:
    {
        "isTechnical": boolean, // true for machines, electronics, blueprints, vehicles
        "componentName": "string",
        "parentSystem": "string",
        "function": "string", // Concise engineering explanation (2 sentences)
        "material": "string", // Best guess (e.g. Steel, Plastic, Gold)
        "isScaleModel": boolean,
        "complexity": "string" // "Low", "Medium", "High", "Extreme"
    }
    
    If it is NOT technical/mechanical, set "isTechnical": false.
    `;
    
    parts.push({ text: prompt });
    parts.push({ text: "IMAGE 1: TARGET (COMPONENT CROP)" });
    parts.push({ inlineData: { data: targetBase64, mimeType: "image/jpeg" } });

    if (contextBase64) {
        parts.push({ text: "IMAGE 2: CONTEXT (FULL SYSTEM)" });
        parts.push({ inlineData: { data: contextBase64, mimeType: "image/jpeg" } });
    }

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: parts },
            config: { responseMimeType: "application/json" }
        });
        
        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text);
    } catch (e) {
        console.error("Tech Scan Error", e);
        return {
            isTechnical: false,
            componentName: "Unknown",
            parentSystem: "",
            function: "",
            isScaleModel: false,
            complexity: "Low"
        };
    }
}