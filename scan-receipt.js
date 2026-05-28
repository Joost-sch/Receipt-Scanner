import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini SDK with the environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image data provided.' });
        }

        // Extract mime type and base64 data from the data URL sent by the frontend
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid image format. Expected base64 data URL.' });
        }

        const mimeType = match[1];
        const base64Data = match[2];

        // Use Gemini 1.5 Flash - fast and cost-effective for multimodal tasks
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            // Force strict JSON output
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Analyze this receipt image. Extract only the raw grocery item names. 
            Ignore store details, dates, credit card info, prices, totals, weights, and garbage artifacts. 
            Automatically normalize abbreviations (e.g., 'Mlk' -> 'Milk', 'Brcl' -> 'Broccoli'). 
            Translate items to English if they are in another language, unless it's a specific brand.
            Return ONLY a valid JSON array of strings representing the grocery items.
        `;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // Parse the strict JSON string returned by Gemini
        const groceries = JSON.parse(responseText);

        return res.status(200).json({ groceries });

    } catch (error) {
        console.error("Error scanning receipt:", error);
        return res.status(500).json({ error: 'Failed to process receipt image.' });
    }
}