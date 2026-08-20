# SFMC Campaign Generator

An application that scrapes content from selected sources, generates responsive HTML email assets using Gemini LLMs, and sends test emails to Salesforce Marketing Cloud (SFMC) Data Extensions.

## Local Architecture Overview

This project is built on a full-stack, locally executable architecture:
- **Backend**: Express server (`server.ts`) with Vite dev middleware for development and static file serving for production. Handles API routes (`/api/generate`, `/api/sfmc/test`), website scraping via `axios` and `cheerio`, and secure server-side calls to Google Gemini via `@google/genai`.
- **Frontend**: React + Vite SPA styled with Tailwind CSS, utilizing `lucide-react` icons and a responsive split-view preview layout with a local draft history state.

---

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

---

## Local Setup Instructions

1. **Clone or Download the Project**:
   Ensure all files are in your project folder.

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your keys:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   SFMC_CLIENT_ID="your_sfmc_client_id"
   SFMC_CLIENT_SECRET="your_sfmc_client_secret"
   SFMC_SUBDOMAIN="your_sfmc_subdomain"
   PORT=3000
   ```

---

## Running Locally

### 1. Development Mode (with Hot Reloading)
To start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 2. Production Build & Execution
To test the production build locally:
```bash
# Build the client bundle and bundle the Express server to dist/server.cjs
npm run build

# Start the compiled production server
npm start
```
The application will run on `http://localhost:3000`.

---

## Features

- **Custom & Predefined Sources**: Scrape TechCrunch, The Verge, Marketing Dive, or enter any custom URL.
- **LLM Selection**: Switch between Gemini 3.6 Flash and Gemini 3.1 Pro models.
- **HTML Email Preview**: Real-time iframe rendering of generated email markup.
- **Generated History**: Draft panel to switch between or revert to previously generated drafts in local state.
- **SFMC Integration**: Send test emails directly to a specified Data Extension name.
