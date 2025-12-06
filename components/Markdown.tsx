import React from 'react';

// A simple display component for text that preserves whitespace and basic formatting.
// In a real production app, use 'react-markdown'. Here we strictly format paragraphs.
interface MarkdownProps {
  content: string;
  className?: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Simple parser to handle code blocks and paragraphs roughly
  const parts = content.split('\n');

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
        {parts.map((line, idx) => {
            // Very basic header detection
            if (line.startsWith('### ')) {
                return <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-gray-100">{line.replace('### ', '')}</h3>
            }
             if (line.startsWith('## ')) {
                return <h2 key={idx} className="text-xl font-bold mt-5 mb-3 text-white">{line.replace('## ', '')}</h2>
            }
             if (line.startsWith('**') && line.endsWith('**')) {
                 return <p key={idx} className="font-bold my-2">{line.replace(/\*\*/g, '')}</p>
             }
             // Bullet points
             if (line.trim().startsWith('- ')) {
                 return <li key={idx} className="ml-4 list-disc">{line.replace('- ', '')}</li>
             }
            if (line.trim() === '') {
                return <div key={idx} className="h-2" />
            }
            return <p key={idx} className="leading-relaxed text-gray-300">{line}</p>
        })}
    </div>
  );
};

export default Markdown;