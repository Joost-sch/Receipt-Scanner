import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { availableGroceries, servings } = req.body;

        if (!availableGroceries || !Array.isArray(availableGroceries) || !servings) {
            return res.status(400).json({ error: 'Missing required payload: availableGroceries (array) and servings (number).' });
        }

        // Define the exact JSON schema requested
        const recipeSchema = {
            type: SchemaType.OBJECT,
            properties: {
                recipeName: { type: SchemaType.STRING },
                servings: { type: SchemaType.INTEGER },
                usedIngredients: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                missingIngredientsToBuy: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                instructions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["recipeName", "servings", "usedIngredients", "missingIngredientsToBuy", "instructions"]
        };

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema,
            }
        });

        const prompt = `
            You are an expert chef. I have the following ingredients available in my pantry: ${availableGroceries.join(', ')}.
            Create a delicious recipe that serves ${servings} people. 
            Prioritize using the ingredients I already have, but you can include essential missing ingredients to buy if necessary.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const recipeData = JSON.parse(responseText);

        return res.status(200).json(recipeData);

    } catch (error) {
        console.error("Error generating recipe:", error);
        return res.status(500).json({ error: 'Failed to generate recipe.' });
    }
}