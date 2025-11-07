import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// ==== New Setup __dirname for ESH (Import Style) ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({ apiKey : process.env.GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-2.5-flash';

const corsOptions = {
  origin: 'http://localhost:3000', // Or an array of allowed origins
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());

// ==== Additional Middleware to Serve Static Files ====
// Serve all files in public_solution (HTML, CSS, JS) at root path
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on port ${PORT}`));

app.post('/api/chat', async (req, res) => {
    // 1. Expect `messages` from the request body, not `conversation`.
    const { messages } = req.body;

    try {
        // 2. Validate the `messages` array.
        if(!Array.isArray(messages)) throw new Error('Messages should be an array!');

        // 3. Map over `messages` and use `content` instead of `text`.
        const contents = messages.map(({ role, content }) => ({
            role,
            parts: [{ text: content }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents
        });

        // The response from the Google GenAI SDK is nested.
        const text = response.candidates[0].content.parts[0].text;

        res.status(200).json({ result: text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }  
});