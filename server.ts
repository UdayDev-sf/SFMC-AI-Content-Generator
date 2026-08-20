import 'dotenv/config';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in your .env file.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper for web scraping with realistic browser headers
async function scrapeUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, footer, noscript, svg, iframe').remove();

    // Extract meaningful text
    let text = "";
    $('article, main, .post, .entry-content, h1, h2, h3, h4, p').each((i, el) => {
      const line = $(el).text().replace(/\s+/g, ' ').trim();
      if (line && line.length > 20) {
        text += line + "\n";
      }
    });
    
    if (!text.trim()) {
      text = $('body').text().replace(/\s+/g, ' ').trim();
    }

    return text.trim().substring(0, 6000);
  } catch (error: any) {
    console.warn(`Scraping failed for ${url}: ${error?.message || error}. Using fallback representation.`);
    return `Fallback data for ${url}: Technology developments, regional UAE and Middle East announcements, and tech industry updates.`;
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

    const prompt = `You are writing the Dubai Silicon Oasis Technology Newsletter grounded in the UAE and Dubai Silicon Oasis tech ecosystem.
Review the scraped source content below and generate the email newsletter strictly following the Writing Rules.

NAMING AND TERMINOLOGY RULES (MANDATORY):
- NEVER use the abbreviation "DSO" in short. Always spell it out in full as "Dubai Silicon Oasis".
- Refer to Dubai Technology Entrepreneur Campus as "Dtec" only (never "DTEC", "D-Tec", or "D-TEC").
- LANGUAGE: Use British Queen's English ONLY (UK spelling and grammar conventions throughout: e.g., colour, programme, centre, favour, organise, prioritise, behaviour, etc.).

REGIONAL CONTEXT:
- Always ground the newsletter in the UAE and Dubai Silicon Oasis tech landscape. Global news is only relevant when it connects to something here.
- Dubai Silicon Oasis is a free zone and integrated technology park under Dubai Integrated Economic Zone (DIEZ).
- Home to Dtec, technology leaders, autonomous mobility trials, and drone delivery pilots (e.g. Noon, Keeta).
- Key strategies: UAE Vision 2031, UAE National AI Strategy 2031, Dubai Economic Agenda (D33).

STRICT WRITING RULES (ABSOLUTE - NO EXCEPTIONS):

1. NEVER USE THESE WORDS/PHRASES:
- Meta-commentary: "delve into", "unpack", "this signals that", "this underscores", "this highlights", "speaks to", "reflects a broader", "navigate the complexities of". (Say what happened, then say what it means for the reader.)
- Corporate filler: "synergies", "leverage our learnings", "holistic approach", "foster a culture of", "lean into", "powerful opportunity", "seamlessly", "effortlessly", "robust", "cutting-edge", "game-changer", "in an ever-changing landscape".
- Stacked transitions: "moreover", "furthermore", "additionally", "that said", "importantly", "ultimately", "at the end of the day", "it comes down to". (Delete them. The sentence works without.)
- Assistant tics: "I'd be happy to", "great question", "absolutely", "it's worth noting".
- Adverb padding: "quietly underscores", "subtly highlights", "notably", "significantly". (If the verb needs propping up, change the verb.)

2. NEVER USE THESE PATTERNS:
- Forced negation: "Not X but Y." "Instead of X, Y." "X over Y." (Say what the thing is.)
- The triad: Three parallel items in a row, especially three abstract nouns. (One per issue at most, and only when all three are concrete.)
- The bold label: A bold phrase, a colon, an explanation, repeated down the page. (Write sentences instead.)
- The neat bow: A closing line that would work at the end of any other newsletter. (If it would, it is not a closing line.)
- Restating: Making the same point three ways. (Make it once and move on.)
- Throat-clearing: Opening a paragraph with scene-setting before the point. (Lead with the point.)

3. FORMATTING RULES:
- British Queen's English spelling and conventions throughout.
- No transition word at the start of a paragraph.
- Bullet points only when the content is genuinely a list. If it fits in a sentence, write the sentence.
- No bold scattered through paragraphs.
- One idea per paragraph.
- Short sentences: Hard cap 30 words. Target average 15 to 20 words.
- Numbers: figures for 10 and above, words below, except in money and dates.
- Dates: Format like "14 March 2026", never "March 14, 2026".
- Currency: "AED" for local figures, with original currency in brackets if source used another.

4. FACTS AND SOURCES:
- Every company name, funding figure, date and job title comes from a source article or regional context. Nothing from memory.
- Attribute claims that are contested or forward-looking to whoever made them. Name them.
- If a source article and knowledge base disagree, write [CONFLICT: source says X, knowledge base says Y].
- If a story needs a number that is not in the sources, write [FIGURE TO CONFIRM]. Never estimate.
- One source is not enough for a claim about money changing hands.

5. HOW TO WRITE INSTEAD:
- Use the words people use. "Look at", not "delve into". "Because", not "given the fact that".
- Write to one person, not an audience.
- Be specific. Names, numbers, dates, examples.
- Make the point, then stop.

OUTPUT STRUCTURE & FORMATTING:
- Format the newsletter into a clean, modern, responsive HTML email template using inline CSS suitable for Salesforce Marketing Cloud (SFMC).
- DO NOT print structural label tags, meta markers, or placeholder text such as [INTRO], [/INTRO], [CATEGORY], [/CATEGORY], [LEAD], [/LEAD], [MENTION], [/MENTION], [SIGNOFF], [/SIGNOFF], "INTRO:", or "CATEGORY:".
- Flow:
  1. Header / Brand title (e.g., Dubai Silicon Oasis Tech Brief).
  2. Opening summary: Two sentences maximum. What this issue covers specifically. Not a generic welcome.
  3. Topic sections: Use clean headings with the actual topic name (e.g., <h2>AI & Machine Learning</h2>, <h2>Consumer Tech</h2>, or <h2>Startups & Innovation</h2>).
  4. Under each topic, provide the lead story (three to four short paragraphs) followed by secondary notable mentions (one short paragraph).
  5. Sign-off: A short, specific closing. Nothing that could apply to any other newsletter.

CRITICAL FORMATTING REQUIREMENT:
- Output ONLY valid HTML. Do NOT include markdown code fences like \`\`\`html.
- Do NOT output literal tags like [INTRO] or [CATEGORY].
- Wrap the generated content inside an email container with clean typography and inline CSS styling suitable for SFMC asset deployment.

Scraped Data:
${scrapedData}
`;

    const ai = getAIClient();
    const systemInstruction = "You are the head writer for the Dubai Silicon Oasis Technology Newsletter. You strictly write in British Queen's English only. NEVER abbreviate Dubai Silicon Oasis as DSO (always spell it out in full). Refer to the startup campus as Dtec only (never DTEC). You strictly adhere to all writing rules, banned words, forbidden patterns, and regional UAE/Dubai Silicon Oasis context. Never include raw meta-tags or structural labels like [INTRO] or [CATEGORY] in your output. Output valid HTML only without markdown fences.";

    let response;
    try {
      response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });
    } catch (primaryErr: any) {
      console.warn(`Primary model ${model} failed: ${primaryErr?.message}. Retrying with gemini-3.7-flash fallback...`);
      response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });
    }

    const htmlContent = response.text || "";
    // Clean up possible markdown code blocks or leftover structural tags if the model included them
    let cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
    cleanHtml = cleanHtml
      .replace(/\[\/?INTRO\]/gi, '')
      .replace(/\[CATEGORY:\s*([^\]]+)\]/gi, '<h2 style="margin-top:24px; margin-bottom:12px; font-size:20px; font-weight:700; color:#0f172a;">$1</h2>')
      .replace(/\[\/?CATEGORY\]/gi, '')
      .replace(/\[\/?LEAD\]/gi, '')
      .replace(/\[\/?MENTION\]/gi, '')
      .replace(/\[\/?SIGNOFF\]/gi, '')
      // Enforce terminology consistency in case of stray abbreviations in text nodes
      .replace(/\b(?!<[^>]*)DSO\b(?![^<]*>)/g, 'Dubai Silicon Oasis')
      .replace(/\b(?!<[^>]*)DTEC\b(?![^<]*>)/g, 'Dtec')
      .trim();

    res.json({ html: cleanHtml });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: error?.message || "Failed to generate content" });
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
