import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
    try {
        const response = await geminiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{role: "user", parts: [{text: "hello"}]}]
        });
        console.log(response.text);
    } catch (e) {
        console.error(e.message);
    }
}
test();
