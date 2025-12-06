import React from 'react';
import { Persona, Review } from '../types';
import Markdown from './Markdown';
import { COUNCIL_MEMBERS } from '../constants';

interface CouncilCardProps {
  persona: Persona;
  content: string;
  reviews: Review[]; // Reviews targeted AT this persona
  isActive: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

const CouncilCard: React.FC<CouncilCardProps> = ({ 
  persona, 
  content, 
  reviews, 
  isActive, 
  onClick,
  isLoading 
}) => {
  return (
    <div 
      className={`
        border rounded-xl transition-all duration-300 cursor-pointer overflow-hidden
        ${isActive 
          ? `border-${persona.color.split('-')[1]}-500 bg-gray-900 shadow-lg shadow-${persona.color.split('-')[1]}-900/20` 
          : 'border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-gray-700'
        }
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 flex items-center space-x-3 border-b border-gray-800">
        <div className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 overflow-hidden`}>
            <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover opacity-80" />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${persona.color}`}>{persona.name}</h3>
          <p className="text-xs text-gray-500">{persona.role}</p>
        </div>
        {isLoading && (
           <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-white rounded-full"></div>
        )}
      </div>

      {/* Content Preview (if not active) or Full Content (if active) */}
      <div className={`p-5 ${isActive ? 'block' : 'hidden md:block'}`}>
        {isLoading ? (
            <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            </div>
        ) : (
            <>
                <div className={`${!isActive && 'line-clamp-3 text-sm text-gray-400'}`}>
                    <Markdown content={content} />
                </div>
                
                {isActive && reviews.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-800">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Peer Reviews</h4>
                        <div className="grid grid-cols-1 gap-4">
                            {reviews.map((rev, idx) => {
                                const reviewer = COUNCIL_MEMBERS.find(m => m.id === rev.reviewerId);
                                if (!reviewer) return null;
                                return (
                                    <div key={idx} className="bg-gray-950/50 p-3 rounded-lg border border-gray-800 text-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-bold ${reviewer.color}`}>{reviewer.name} says:</span>
                                        </div>
                                        <p className="text-gray-400 italic">"{rev.content}"</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default CouncilCard;