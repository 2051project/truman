import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

const is503 = (err) =>
    err?.message?.includes('503') ||
    err?.status === 503 ||
    err?.message?.includes('Service Unavailable');

/**
 * Retries an async function with exponential backoff — but NOT on 503.
 * 503 = model overloaded → caller should try a different model instead.
 */
async function withRetry(fn, maxRetries = 2, baseDelayMs = 1000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (is503(err)) throw err; // don't retry 503, let caller switch models
            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                console.warn(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw err;
            }
        }
    }
}

/**
 * Generates a social media style comment for Truman based on his state,
 * and creates an image using Gemini 3.1 Flash Image Preview (Nano Banana 2).
 *
 * @param {string} apiKey - Google Gemini API Key
 * @param {object} profile - Truman's current profile/state
 * @param {function} onStatusUpdate - Optional callback to receive status updates
 *                                    e.g. (status: string) => void
 */
export async function generateSocialMediaContent(apiKey, profile, onStatusUpdate) {
    const notify = (msg) => onStatusUpdate?.(msg);

    if (!apiKey) {
        return {
            text: "Forgot my API key, but having a great time anyway! 😅",
            imageUrl: `https://image.pollinations.ai/prompt/A%20beautiful%20sunny%20day%20in%20Seoul?width=512&height=512&nologo=true&model=flux&seed=${Date.now()}`
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Fallback model order if primary is unavailable
        const TEXT_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

        const generateWithFallback = async (prompt) => {
            for (const modelName of TEXT_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    return await withRetry(() => model.generateContent(prompt), 2, 1000);
                } catch (err) {
                    const overloaded = is503(err);
                    console.warn(`Model ${modelName} failed (${overloaded ? 'overloaded → skipping' : err.message})`);
                    if (modelName === TEXT_MODELS[TEXT_MODELS.length - 1]) throw err;
                    // 503: immediately try next model; other errors: also try next
                }
            }
        };

        // ── Step 1: Generate social media post text ──────────────────────────
        notify("✍️ Writing post...");

        const textPrompt = `You are Truman, a ${profile.age}-year-old ${profile.gender}. 
Your current location is ${profile.currentName}. 
${profile.status === 'move' ? `You are heading to ${profile.targetName} by ${profile.transportation}.` : ''}
You are feeling ${profile.mood} and you are with ${profile.with}. 
It is currently ${profile.currentTime.toLocaleString('en-US')}. 
Write a very short (1-2 sentences), engaging social media post about what you are doing right now. 
Include emojis. Do not use hashtags. Do not include a selfie or mention sharing a photo.`;

        const textResult = await generateWithFallback(textPrompt);
        const postText = textResult.response.text().trim();

        // ── Step 2: Generate image prompt ────────────────────────────────────
        notify("🎨 Crafting image prompt...");

        const imagePromptPrompt = `Based on this social media post: "${postText}", write a pure image generation prompt (max 30 words) describing the scene AT their current location (${profile.currentName}). Even if they are heading elsewhere, the image MUST depict their current location (${profile.currentName}) and what they are looking at right now. They are feeling ${profile.mood} with ${profile.with}. Do not include the person's face. Focus on the environment and atmosphere. No text in the image.`;

        const imagePromptResult = await generateWithFallback(imagePromptPrompt);
        const generatedImagePrompt = imagePromptResult.response.text().trim();

        // ── Step 3: Generate image via Gemini 3 Pro Image Preview ──────────────
        notify("🖼️ Generating image...");

        let imageUrl = null;

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });

            const imageResponse = await withRetry(() =>
                ai.models.generateContent({
                    model: "gemini-3.1-flash-image-preview",
                    contents: generatedImagePrompt + ", minimalist style, no people, no faces",
                    config: {
                        responseModalities: ["IMAGE"],
                        imageConfig: {
                            aspectRatio: "1:1"
                        }
                    }
                })
                , 2, 2000);

            if (imageResponse.candidates && imageResponse.candidates.length > 0) {
                for (const part of imageResponse.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
                    }
                }
            }
        } catch (imgErr) {
            console.warn("Gemini image generation failed, using Pollinations fallback:", imgErr);
        }
        // Pollinations fallback if Gemini image failed
        if (!imageUrl) {
            const encodedPrompt = encodeURIComponent(generatedImagePrompt + ", minimalist style");
            imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux&seed=${Date.now()}`;
        }

        notify("✅ Done!");
        return { text: postText, imageUrl };

    } catch (err) {
        console.error("Gemini API Error:", err);
        notify("❌ Failed");
        return {
            text: "Experiencing technical difficulties, but staying positive! 🌟",
            imageUrl: `https://image.pollinations.ai/prompt/technical%20difficulties%20funny%20illustration?width=512&height=512&nologo=true&model=flux&seed=${Date.now()}`
        };
    }
}