import "dotenv/config";
import { OpenAI } from "openai";

const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function test() {
    try {
        const response = await client.chat.completions.create({
            model: "gemini-1.5-flash",
            messages: [{ role: "user", content: "Return { \"a\": 1 }. You must return JSON." }],
        });
        console.log(response.choices[0].message.content);
    } catch(e) {
        console.error(e.message);
    }
}
test();
