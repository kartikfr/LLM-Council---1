import React, { useState, useEffect, useRef } from 'react';
import { Stage, CouncilState, Review } from './types';
import { COUNCIL_MEMBERS, CHAIRMAN } from './constants';
import * as LLMService from './services/geminiService';
import CouncilCard from './components/CouncilCard';
import Markdown from './components/Markdown';

const App: React.FC = () => {
  const [state, setState] = useState<CouncilState>({
    stage: Stage.IDLE,
    query: '',
    opinions: {},
    reviews: {},
    finalVerdict: null,
    error: null,
  });

  const [activeTab, setActiveTab] = useState<string>(COUNCIL_MEMBERS[0].id);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value.trim()) return;

    const query = inputRef.current.value;
    
    // Reset state for new query
    setState({
      stage: Stage.OPINIONS,
      query,
      opinions: {},
      reviews: {},
      finalVerdict: null,
      error: null,
    });

    try {
      // --- Stage 1: Opinions ---
      const opinionsList = await LLMService.fetchInitialOpinions(query);
      
      const newOpinions: Record<string, string> = {};
      opinionsList.forEach(op => {
        newOpinions[op.personaId] = op.content;
      });

      setState(prev => ({
        ...prev,
        opinions: newOpinions,
        stage: Stage.REVIEWS
      }));

      // --- Stage 2: Reviews ---
      const reviewsList = await LLMService.fetchReviews(query, opinionsList);
      
      const newReviews: Record<string, Review[]> = {};
      reviewsList.forEach(rev => {
        if (!newReviews[rev.targetId]) newReviews[rev.targetId] = [];
        newReviews[rev.targetId].push(rev);
      });

      setState(prev => ({
        ...prev,
        reviews: newReviews,
        stage: Stage.CHAIRMAN
      }));

      // --- Stage 3: Chairman ---
      const verdict = await LLMService.fetchChairmanVerdict(query, opinionsList, reviewsList);

      setState(prev => ({
        ...prev,
        finalVerdict: verdict,
        stage: Stage.COMPLETE
      }));

    } catch (err) {
      console.error(err);
      setState(prev => ({
        ...prev,
        stage: Stage.ERROR,
        error: (err as Error).message || "An unexpected error occurred."
      }));
    }
  };

  // Auto-scroll to bottom when verdict arrives
  useEffect(() => {
    if (state.stage === Stage.COMPLETE) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.stage]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-purple-900 selection:text-white pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/50">
                 C
               </div>
               <span className="text-xl font-bold tracking-tight text-white">LLM Council</span>
            </div>
            <div className="text-xs font-mono text-gray-500 hidden sm:block">
              OpenRouter Enabled • GPT-5 • Claude 4.5 • Gemini 3 • Grok 4
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        
        {/* Error Banner */}
        {state.stage === Stage.ERROR && (
           <div className="mb-8 p-6 bg-red-950/30 border border-red-500/30 rounded-xl flex items-start gap-4 animate-fade-in shadow-lg shadow-red-900/10">
              <div className="p-3 bg-red-900/20 rounded-full shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
              </div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-200 mb-1">Council Session Interrupted</h3>
                  <p className="text-red-300/80 leading-relaxed">{state.error}</p>
                  <div className="mt-4">
                     <button 
                        onClick={() => setState(prev => ({...prev, stage: Stage.IDLE, error: null}))}
                        className="text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Reset & Try Again
                     </button>
                  </div>
              </div>
           </div>
        )}

        {/* Welcome / Empty State */}
        {state.stage === Stage.IDLE && !state.error && (
          <div className="text-center py-20 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-6 drop-shadow-sm">
              Assemble the Council
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Don't settle for one AI opinion. Harness the power of <span className="text-white font-semibold">GPT</span>, <span className="text-white font-semibold">Claude</span>, <span className="text-white font-semibold">Gemini</span>, and <span className="text-white font-semibold">Grok</span> debating your query in real-time.
            </p>
          </div>
        )}

        {/* Progress Bar (Visible when active and no error) */}
        {state.stage !== Stage.IDLE && state.stage !== Stage.ERROR && (
          <div className="mb-8">
             <div className="flex justify-between items-center text-xs uppercase tracking-widest text-gray-500 mb-2 font-mono">
               <span className="text-blue-400">1. Opinions</span>
               <span className={state.stage === Stage.REVIEWS || state.stage === Stage.CHAIRMAN || state.stage === Stage.COMPLETE ? 'text-purple-400' : ''}>2. Reviews</span>
               <span className={state.stage === Stage.CHAIRMAN || state.stage === Stage.COMPLETE ? 'text-yellow-400' : ''}>3. Verdict</span>
             </div>
             <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500`}
                 style={{ 
                   width: state.stage === Stage.OPINIONS ? '33%' 
                        : state.stage === Stage.REVIEWS ? '66%' 
                        : state.stage === Stage.CHAIRMAN ? '90%'
                        : state.stage === Stage.COMPLETE ? '100%' 
                        : '0%' 
                 }}
               ></div>
             </div>
          </div>
        )}

        {/* Council Grid */}
        {state.stage !== Stage.IDLE && state.stage !== Stage.ERROR && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
            {COUNCIL_MEMBERS.map((member) => (
              <CouncilCard
                key={member.id}
                persona={member}
                content={state.opinions[member.id]}
                reviews={state.reviews[member.id] || []}
                isActive={activeTab === member.id}
                onClick={() => setActiveTab(member.id)}
                isLoading={!state.opinions[member.id]}
              />
            ))}
          </div>
        )}

        {/* Chairman's Verdict */}
        {(state.stage === Stage.CHAIRMAN || state.stage === Stage.COMPLETE) && (
          <div className="animate-fade-in-up">
            <div className="relative border border-purple-500/30 bg-gray-900/80 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/10">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-500"></div>
              
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-16 h-16 rounded-full border-2 border-purple-500 overflow-hidden shadow-lg shadow-purple-500/20 bg-gray-800">
                     <img src={CHAIRMAN.avatar} className="w-full h-full object-cover" alt="Chairman" />
                   </div>
                   <div>
                     <h2 className="text-3xl font-bold text-white">The Chairman's Verdict</h2>
                     <p className="text-purple-400/80 font-mono text-sm uppercase tracking-widest">Final Synthesis</p>
                   </div>
                </div>

                <div className="prose prose-lg prose-invert max-w-none text-gray-300">
                  {state.finalVerdict ? (
                     <Markdown content={state.finalVerdict} />
                  ) : (
                    <div className="flex items-center gap-3 text-purple-500/50 animate-pulse">
                      <span className="text-2xl">⚡</span>
                      <span>The Chairman is reviewing the council's arguments...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Sticky Input Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 p-4 z-50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <input
              ref={inputRef}
              type="text"
              // Only disable if we are mid-process, but ALLOW input if there is an error so they can retry
              disabled={state.stage !== Stage.IDLE && state.stage !== Stage.COMPLETE && state.stage !== Stage.ERROR}
              placeholder={state.stage !== Stage.IDLE && state.stage !== Stage.COMPLETE && state.stage !== Stage.ERROR ? "Council is deliberating..." : "Ask the Council..."}
              className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-700 rounded-2xl py-4 pl-6 pr-16 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            />
            <button
              type="submit"
              disabled={state.stage !== Stage.IDLE && state.stage !== Stage.COMPLETE && state.stage !== Stage.ERROR}
              className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-0 shadow-lg shadow-purple-900/50"
            >
              Summon
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default App;