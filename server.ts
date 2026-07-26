import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI lazily
  let aiClient: GoogleGenAI | null = null;
  function getAI() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Gemini API for generating personalized birthday wishes, toasts, poems & speeches
  app.post('/api/gemini/wish', async (req, res) => {
    try {
      const { friendName = 'Elena', age = '21', relationship = 'Best Friend', tone = 'Heartfelt & Touchingly Emotional', memories = '' } = req.body;

      const ai = getAI();
      const prompt = `You are writing a personalized, ultra-touching advance birthday message, toast, or poem for my best friend named ${friendName}.
Details:
- Best Friend's Name: ${friendName}
- Relationship context: Best Friend / Bestie
- Advance Birthday Date: 10/01/2027 (1st October 2027)
- Selected Tone: ${tone}
- Special Notes / Memories: ${memories || 'We have shared countless late-night talks, road trips, coffee runs, inside jokes, and unwavering support.'}

Write an engaging, unforgettable advance birthday message (2-4 paragraphs or poetic stanzas depending on tone). Format with clean typography and line breaks. Make it feel authentic, warm, deeply personal, and celebratory! Include fitting emojis where appropriate.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const wish = response.text || `Advance Happy Birthday to my absolute best friend Elena! 💖 Counting down to October 1, 2027! Thank you for being the most incredible bestie ever!`;
      res.json({ success: true, wish });
    } catch (error: any) {
      console.error('Error generating wish with Gemini:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate custom birthday wish.',
        fallbackWish: `Advance Happy Birthday to my best friend Elena! 💖 Counting down to October 1, 2027! You are truly one of a kind and I am so grateful to have you in my life!`
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
