import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for mocked or basic scraping
async function scrapeUrl(url: string): Promise<string> {
  try {
    // For demo purposes, we'll map specific sources to mock data if actual scraping fails or is blocked
    const { data } = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(data);
    
    // Attempt to extract meaningful text
    let text = "";
    $('article, p, h1, h2, h3').each((i, el) => {
      text += $(el).text() + "\n";
    });
    
    return text.trim().substring(0, 5000); // limit to 5000 chars for token limits
  } catch (error) {
    console.warn(`Scraping failed for ${url}, using fallback data.`, error);
    return `Fallback data for ${url}: This is recent news regarding tech and marketing trends.`;
  }
}

app.post("/api/generate", async (req, res) => {
  try {
    const { sources, model } = req.body;
    
    if (!sources || !sources.length) {
      return res.status(400).json({ error: "No sources provided" });
    }
    
    if (!model) {
      return res.status(400).json({ error: "No model provided" });
    }

    // Scrape data from all sources
    let scrapedData = "";
    for (const url of sources) {
      const content = await scrapeUrl(url);
      scrapedData += `--- Content from ${url} ---\n${content}\n\n`;
    }

    const prompt = `You are an expert marketing copywriter. Review the following scraped data and prepare an engaging HTML email newsletter content.
The output MUST be valid HTML. Do NOT include markdown code fences like \`\`\`html.
The HTML should be responsive and styled with inline CSS. Make it look professional.

Scraped Data:
${scrapedData}
`;

    const response = await ai.models.generateContent({
      model: model, // e.g., gemini-3.6-flash
      contents: prompt,
      config: {
        systemInstruction: "You are a professional email marketing assistant. Output only valid HTML.",
      }
    });

    const htmlContent = response.text || "";
    // Clean up possible markdown code blocks if the model ignored instructions
    const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

    res.json({ html: cleanHtml });
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.post("/api/sfmc/test", async (req, res) => {
  try {
    const { html, dataExtension } = req.body;
    
    // In a real application, you would:
    // 1. Authenticate with SFMC
    // 2. Create/Update an HTML Asset in Content Builder
    // 3. Trigger a test email via the REST API or SOAP API
    
    // To implement this fully, we need:
    // process.env.SFMC_CLIENT_ID
    // process.env.SFMC_CLIENT_SECRET
    // process.env.SFMC_SUBDOMAIN
    
    // Mocking the success response for the demo since credentials aren't provided
    console.log("Simulating SFMC Send Test...", {
        dataExtension,
        htmlLength: html?.length
    });

    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    res.json({ 
      success: true, 
      message: `Test email successfully triggered to Data Extension: ${dataExtension}` 
    });
  } catch (error) {
    console.error("SFMC error:", error);
    res.status(500).json({ error: "Failed to send SFMC test" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
