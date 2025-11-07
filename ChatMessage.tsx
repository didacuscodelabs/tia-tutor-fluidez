import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Role } from '../types';

interface ChatMessageProps {
    role: Role;
    text: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, text }) => {
    const isTutor = role === Role.TUTOR;

    const containerClasses = isTutor 
        ? 'flex items-start justify-start' 
        : 'flex items-end justify-end';
    
    const bubbleClasses = isTutor 
        ? 'bg-gray-800 text-gray-200' 
        : 'bg-teal-600 text-white';

    return (
        <div className={containerClasses}>
            <div className={`p-4 rounded-lg max-w-sm md:max-w-md lg:max-w-3xl shadow-md ${bubbleClasses}`}>
                 <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-teal-300" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 text-teal-400" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-2 text-teal-400" {...props} />,
                    }}
                 >
                    {text}
                </ReactMarkdown>
            </div>
        </div>
    );
};
