import { useState } from 'react';
import { Send, Settings, Code, FileText, CheckCircle, Loader2 } from 'lucide-react';

const PREDEFINED_SOURCES = [
  { id: 'techcrunch', name: 'TechCrunch News', url: 'https://techcrunch.com' },
  { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com' },
  { id: 'marketing-dive', name: 'Marketing Dive', url: 'https://www.marketingdive.com' },
];

const MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Fast)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Complex Reasoning)' },
];

export default function App() {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
  const [dataExtension, setDataExtension] = useState<string>('Test_Subscribers_DE');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSourceToggle = (url: string) => {
    setSelectedSources(prev => 
      prev.includes(url) ? prev.filter(s => s !== url) : [...prev, url]
    );
  };

  const handleGenerate = async () => {
    if (selectedSources.length === 0) {
      setError('Please select at least one source.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setSendSuccess(null);
    setGeneratedHtml(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: selectedSources,
          model: selectedModel
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate content');
      
      setGeneratedHtml(data.html);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToSFMC = async () => {
    if (!generatedHtml) return;
    if (!dataExtension.trim()) {
      setError('Please provide a target Data Extension name.');
      return;
    }

    setIsSending(true);
    setError(null);
    setSendSuccess(null);

    try {
      const res = await fetch('/api/sfmc/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: generatedHtml,
          dataExtension: dataExtension
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send to SFMC');
      
      setSendSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center space-x-3 pb-6 border-b border-slate-200">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Send size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SFMC Campaign Generator</h1>
            <p className="text-sm text-slate-500">Curate content, generate AI email templates, and send tests to Marketing Cloud.</p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {sendSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
            <CheckCircle size={18} />
            <span className="block sm:inline font-medium">{sendSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Configuration Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <Settings size={18} className="text-slate-400" />
                <span>Configuration</span>
              </h2>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">1. Select Data Sources</label>
                <div className="space-y-2">
                  {PREDEFINED_SOURCES.map(source => (
                    <label key={source.id} className="flex items-center space-x-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        checked={selectedSources.includes(source.url)}
                        onChange={() => handleSourceToggle(source.url)}
                      />
                      <span className="text-sm font-medium">{source.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-sm font-medium text-slate-700">2. Select LLM Model</label>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedSources.length === 0}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={18} className="mr-2" />
                    Generate Content
                  </>
                )}
              </button>
            </div>

            {/* SFMC Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <Send size={18} className="text-slate-400" />
                <span>Salesforce Marketing Cloud</span>
              </h2>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Target Data Extension</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dataExtension}
                  onChange={(e) => setDataExtension(e.target.value)}
                  placeholder="e.g. Test_Subscribers_DE"
                />
              </div>

              <button
                onClick={handleSendToSFMC}
                disabled={!generatedHtml || isSending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Sending to SFMC...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Send SFMC Test
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                This will create an HTML Asset in Content Builder and trigger a test send to the specified DE.
              </p>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center space-x-2 text-slate-700">
                <Code size={16} />
                <span>HTML Preview</span>
              </h2>
              {generatedHtml && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Generated Successfully
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-100/50 p-6 relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-sm font-medium">Scraping sources and generating content...</p>
                </div>
              ) : generatedHtml ? (
                <div className="bg-white mx-auto shadow-sm border border-slate-200 max-w-2xl min-h-full rounded-md overflow-hidden">
                  <iframe 
                    title="Generated HTML Preview"
                    srcDoc={generatedHtml}
                    className="w-full h-full min-h-[600px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">No content generated yet.</p>
                  <p className="text-xs mt-1 text-slate-500">Select sources and click Generate to see the preview.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
