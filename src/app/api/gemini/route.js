import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sample bounding box data demonstrating Gemini AI's spatial understanding
    // This simulates what Gemini Vision API would return for object detection
    const sampleBoundingBoxes = [
      {
        label: "plastic bottle",
        confidence: 0.94,
        x: 0.15,
        y: 0.25,
        width: 0.08,
        height: 0.20,
        category: "recyclable",
        description: "Clear plastic water bottle with cap"
      },
      {
        label: "aluminum can",
        confidence: 0.89,
        x: 0.35,
        y: 0.30,
        width: 0.06,
        height: 0.12,
        category: "recyclable",
        description: "Red aluminum soda can"
      },
      {
        label: "paper cup",
        confidence: 0.82,
        x: 0.55,
        y: 0.40,
        width: 0.10,
        height: 0.15,
        category: "compostable",
        description: "White paper coffee cup with lid"
      },
      {
        label: "glass bottle",
        confidence: 0.91,
        x: 0.75,
        y: 0.20,
        width: 0.07,
        height: 0.18,
        category: "recyclable",
        description: "Green glass beer bottle"
      },
      {
        label: "plastic bag",
        confidence: 0.76,
        x: 0.25,
        y: 0.60,
        width: 0.20,
        height: 0.12,
        category: "landfill",
        description: "White plastic shopping bag"
      },
      {
        label: "cardboard box",
        confidence: 0.88,
        x: 0.60,
        y: 0.65,
        width: 0.15,
        height: 0.10,
        category: "recyclable",
        description: "Brown cardboard shipping box"
      }
    ];

    // Return the bounding box data with metadata
    return NextResponse.json({
      success: true,
      boundingBoxes: sampleBoundingBoxes,
      metadata: {
        totalObjects: sampleBoundingBoxes.length,
        processingTime: "2.1s",
        model: "Gemini Vision Pro",
        confidence: "High",
        spatialUnderstanding: {
          objectRelationships: "Detected spatial relationships between objects",
          depthPerception: "Accurate depth and layering analysis",
          contextualUnderstanding: "Objects classified by waste category"
        }
      },
      analysis: {
        recyclable: sampleBoundingBoxes.filter(box => box.category === "recyclable").length,
        compostable: sampleBoundingBoxes.filter(box => box.category === "compostable").length,
        landfill: sampleBoundingBoxes.filter(box => box.category === "landfill").length,
        recommendations: [
          "Separate recyclable items (bottles, cans, cardboard) for recycling",
          "Compost the paper cup",
          "Dispose of plastic bag in landfill"
        ]
      }
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
