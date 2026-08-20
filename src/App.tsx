import { useState, type FormEvent, type MouseEvent } from 'react';
import { Send, Settings, Code, FileText, CheckCircle, Loader2, Plus, X, History, Trash2, ArrowRight, Copy, Check } from 'lucide-react';

const PREDEFINED_SOURCES = [
  { id: 'technewsme', name: 'TechNewsME (Regional)', url: 'https://technewsme.com/' },
  { id: 'techcrunch', name: 'TechCrunch News', url: 'https://techcrunch.com' },
  { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com' },
  { id: 'marketing-dive', name: 'Marketing Dive', url: 'https://www.marketingdive.com' },
];

const MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Fast & Recommended)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Complex Reasoning)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (Lightweight)' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)' },
];

interface GenerationHistoryItem {
  id: string;
  timestamp: Date;
  model: string;
  sources: string[];
  html: string;
}

export default function App() {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.7-flash');
  const [dataExtension, setDataExtension] = useState<string>('Test_Subscribers_DE');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSourceToggle = (url: string) => {
    setSelectedSources(prev => 
      prev.includes(url) ? prev.filter(s => s !== url) : [...prev, url]
    );
  };

  const handleAddCustomSource = (e: FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    
    let urlToAdd = customUrl.trim();
    if (!/^https?:\/\//i.test(urlToAdd)) {
      urlToAdd = 'https://' + urlToAdd;
    }

    if (!selectedSources.includes(urlToAdd)) {
      setSelectedSources(prev => [...prev, urlToAdd]);
    }
    setCustomUrl('');
  };

  const removeSource = (url: string) => {
    setSelectedSources(prev => prev.filter(s => s !== url));
  };

  const handleGenerate = async () => {
    if (selectedSources.length === 0) {
      setError('Please select at least one source.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setSendSuccess(null);

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
      
      const newHistoryItem: GenerationHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        model: selectedModel,
        sources: [...selectedSources],
        html: data.html,
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
      setGeneratedHtml(data.html);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectHistoryDraft = (item: GenerationHistoryItem) => {
    setActiveHistoryId(item.id);
    setGeneratedHtml(item.html);
    setSendSuccess(null);
  };

  const deleteHistoryDraft = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeHistoryId === id) {
      const remaining = history.filter(item => item.id !== id);
      if (remaining.length > 0) {
        setActiveHistoryId(remaining[0].id);
        setGeneratedHtml(remaining[0].html);
      } else {
        setActiveHistoryId(null);
        setGeneratedHtml(null);
      }
    }
  };

  const handleCopyHtml = async () => {
    if (!generatedHtml) return;
    try {
      await navigator.clipboard.writeText(generatedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
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
                
                <form onSubmit={handleAddCustomSource} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add custom URL (e.g. example.com)"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!customUrl.trim()}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Plus size={18} />
                  </button>
                </form>

                {selectedSources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSources.map(url => {
                      const predefined = PREDEFINED_SOURCES.find(p => p.url === url);
                      const displayName = predefined ? predefined.name : url.replace(/^https?:\/\//, '').substring(0, 30) + (url.length > 30 ? '...' : '');
                      
                      return (
                        <div key={url} className="flex items-center space-x-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-full text-xs font-medium">
                          <span className="max-w-[150px] truncate" title={url}>{displayName}</span>
                          <button 
                            onClick={() => removeSource(url)}
                            className="hover:bg-blue-100 p-0.5 rounded-full text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Predefined Sources</p>
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

            {/* History Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center space-x-2">
                  <History size={18} className="text-slate-400" />
                  <span>Generated History</span>
                </h2>
                {history.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {history.length} {history.length === 1 ? 'draft' : 'drafts'}
                  </span>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <History size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No previous drafts generated yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {history.map((item) => {
                    const isActive = activeHistoryId === item.id;
                    const modelObj = MODELS.find(m => m.id === item.model);
                    const modelLabel = modelObj ? modelObj.name.split(' ')[0] : item.model;

                    return (
                      <div
                        key={item.id}
                        onClick={() => selectHistoryDraft(item)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                          isActive 
                            ? 'bg-blue-50/70 border-blue-200 shadow-xs' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-800">
                              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {modelLabel}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {item.sources.length} {item.sources.length === 1 ? 'source' : 'sources'}: {item.sources.map(s => s.replace(/^https?:\/\//, '')).join(', ')}
                          </p>
                        </div>

                        <button
                          onClick={(e) => deleteHistoryDraft(item.id, e)}
                          title="Delete draft"
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center space-x-2 text-slate-700">
                <Code size={16} />
                <span>HTML Preview</span>
              </h2>
              <div className="flex items-center space-x-3">
                {generatedHtml && (
                  <>
                    <button
                      id="copy-html-btn"
                      onClick={handleCopyHtml}
                      className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition-colors shadow-xs"
                      title="Copy raw HTML to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-slate-500" />
                          <span>Copy HTML</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Generated Successfully
                    </span>
                  </>
                )}
              </div>
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
