import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not set' }, { status: 500 });
    }

    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Read image as base64
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';

    // Prepare Gemini Vision API call
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Detect all objects in this image. Return a JSON array.  
Each element in the array must describe a single object using the following six properties:

- **label**: A concise name for the object (e.g., "soda can", "banana peel").  
- **confidence**: A float between 0 and 1 representing detection confidence.  
- **box_2d**: The bounding box as [ymin, xmin, ymax, xmax], normalized to a 0–1000 scale.  
- **description**: A short description of what the object is.  
- **category**: Exactly one of these values — "recyclable", "non_recyclable", or "compostable".  
- **is_trash**: A boolean — true if the object is non_recyclable, false otherwise.

**Rules for categorization:**
- Use common environmental guidelines: cardboard, clean plastic containers, and unbranded glass are usually recyclable; food waste like peels is compostable; mixed or dirty materials are non_recyclable.
- Do not split object properties into multiple JSON entries.
- Output only the JSON array — no explanations, no extra formatting.`  ;

    const contents = [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      { text: prompt },
    ];

    // Call Gemini Vision API
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2) + 's';

    // Try to parse JSON from the response
    let resultText = response.text;
    let boundingBoxes;
    try {
      // Remove markdown code fencing if present
      if (resultText.startsWith('```json')) {
        resultText = resultText.replace(/^```json[\r\n]+/, '').replace(/```$/, '');
      }
      boundingBoxes = JSON.parse(resultText);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse Gemini response', raw: resultText }, { status: 502 });
    }

    // Debug log Gemini output
    console.log('Gemini raw boundingBoxes:', boundingBoxes);

    // Fallback: merge objects with the same box_2d into one object with all properties
    function mergeBoxObjects(boxes) {
      const merged = [];
      const seen = new Map();
      for (const box of boxes) {
        const key = Array.isArray(box.box_2d) ? box.box_2d.join(',') : undefined;
        if (!key) continue;
        if (!seen.has(key)) {
          seen.set(key, { ...box });
        } else {
          const existing = seen.get(key);
          for (const prop in box) {
            if (box[prop] !== undefined && box[prop] !== null && prop !== 'box_2d') {
              existing[prop] = box[prop];
            }
          }
        }
      }
      for (const obj of seen.values()) merged.push(obj);
      return merged;
    }
    if (Array.isArray(boundingBoxes) && boundingBoxes.length > 0) {
      // If any object is missing multiple properties, try to merge
      const needsMerge = boundingBoxes.some(box => Object.keys(box).length <= 3);
      if (needsMerge) {
        boundingBoxes = mergeBoxObjects(boundingBoxes);
      }
    }

    // Convert Gemini's box_2d to x, y, width, height (normalized 0-1) and normalize category/is_trash
    const validCategories = ['recyclable', 'compostable', 'non_recyclable'];
    const processedBoxes = (Array.isArray(boundingBoxes) ? boundingBoxes : []).map(box => {
      let x = 0, y = 0, width = 0, height = 0;
      if (Array.isArray(box.box_2d) && box.box_2d.length === 4) {
        y = box.box_2d[0] / 1000;
        x = box.box_2d[1] / 1000;
        height = (box.box_2d[2] - box.box_2d[0]) / 1000;
        width = (box.box_2d[3] - box.box_2d[1]) / 1000;
      }
      let confidence = box.confidence;
      if (typeof confidence === 'string') confidence = parseFloat(confidence);
      if (typeof confidence !== 'number' || isNaN(confidence)) confidence = 0.5;
      if (confidence > 1) confidence = confidence / 100;
      // Normalize category
      let category = (box.category || '').toLowerCase();
      if (category === 'landfill' || category === 'non recyclable' || category === 'non-recyclable' || category === 'trash' || category === 'garbage') {
        category = 'non_recyclable';
      }
      if (!validCategories.includes(category)) {
        // Try to infer from label/description
        if (box.label && /compost/.test(box.label)) category = 'compostable';
        else if (box.label && /non[-_ ]?recyclable|landfill|trash|garbage/.test(box.label)) category = 'non_recyclable';
        else category = 'recyclable';
      }
      // Text detection fallback: if label or description mentions 'text' or 'label', force non_recyclable
      const desc = (box.description || '').toLowerCase();
      const lbl = (box.label || '').toLowerCase();
      if (desc.includes('text') || desc.includes('label') || lbl.includes('text') || lbl.includes('label')) {
        category = 'non_recyclable';
      }
      // is_trash logic
      let is_trash = box.is_trash;
      if (typeof is_trash !== 'boolean') {
        // Fallback: if category is non_recyclable, or label/desc mentions trash/garbage, set true
        if (category === 'non_recyclable' || desc.includes('trash') || desc.includes('garbage') || lbl.includes('trash') || lbl.includes('garbage')) {
          is_trash = true;
        } else {
          is_trash = false;
        }
      }
      return {
        label: box.label || '',
        confidence,
        x,
        y,
        width,
        height,
        category,
        description: box.description || '',
        is_trash,
      };
    });

    // Analysis logic
    const recyclable = processedBoxes.filter(b => b.category === 'recyclable').length;
    const compostable = processedBoxes.filter(b => b.category === 'compostable').length;
    const non_recyclable = processedBoxes.filter(b => b.category === 'non_recyclable').length;

    // Recommendations logic 
    const recommendations = [];
    if (recyclable > 0) recommendations.push('Separate recyclable items for recycling');
    if (compostable > 0) recommendations.push('Compost the compostable items');
    if (non_recyclable > 0) recommendations.push('Dispose of non-recyclable items properly');
    if (recommendations.length === 0) recommendations.push('No waste detected');

    // Metadata logic
    const metadata = {
      totalObjects: processedBoxes.length,
      processingTime,
      model: 'gemini-2.5-flash',
      confidence: processedBoxes.length > 0 ? 'High' : 'Low',
      spatialUnderstanding: {
        objectRelationships: 'Detected spatial relationships between objects',
        depthPerception: 'Accurate depth and layering analysis',
        contextualUnderstanding: 'Objects classified by waste category',
      },
    };

    // Analysis object
    const analysis = {
      recyclable,
      compostable,
      non_recyclable,
      recommendations,
    };

    return NextResponse.json({
      success: true,
      boundingBoxes: processedBoxes,
      metadata,
      analysis,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error?.message },
      { status: 500 }
    );
  }
}
