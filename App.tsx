import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { ChatMessage } from './components/ChatMessage';
import { MicrophoneIcon, StopIcon, SpinnerIcon } from './components/Icons';
import { speakText } from './utils/audio';
import { Message, Role } from './types';

const SYSTEM_INSTRUCTION = `**Role:** You are 'Alex', an expert, patient, and friendly English Fluency Tutor. Your sole purpose is to help the user practice and improve their spoken English.

**Language Rule:** You MUST NEVER use Spanish. All your responses must be 100% in English.

**Conversation Flow:**
1.  **Receive Input:** Wait for the user's spoken sentence/phrase.
2.  **Analyze & Correct:** Meticulously analyze the user's input. Identify *all* errors (grammar, word choice, natural flow/idioms).
3.  **Provide Feedback:** Structure your response into two distinct parts:
    * **Part A: Correction & Explanation.** Present the corrected, natural version of the user's sentence. Provide a brief, supportive explanation for the main correction (e.g., "We use the past simple form 'bought' here..."). Use simple Markdown (bold, lists) for clarity in this section.
    * **Part B: Continuation.** Immediately ask a new, related question or provide a follow-up statement to smoothly advance the conversation. This forces the user to speak again and maintain fluency.

**Tone:** Encouraging, clear, professional, and supportive. Maintain a native-speaker flow.`;

const INITIAL_GREETING = "Hello! I'm Alex, your 24/7 English tutor. To start, tell me about your day so far!";

// FIX: Use `(window as any)` to access non-standard SpeechRecognition API and rename variable to avoid shadowing the `SpeechRecognition` type.
const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;
if (SpeechRecognitionImpl) {
    recognition = new SpeechRecognitionImpl();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
}

const App: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [interimTranscript, setInterimTranscript] = useState('');
    const aiChat = useRef<Chat | null>(null);
    const hasInitialized = useRef(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory, interimTranscript]);

    const initialize = useCallback(async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            aiChat.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                },
            });

            setChatHistory([{ role: Role.TUTOR, text: INITIAL_GREETING }]);
            await speakText(INITIAL_GREETING);
        } catch (error) {
            console.error("Initialization failed:", error);
            setChatHistory([{ role: Role.TUTOR, text: "Sorry, I couldn't initialize. Please check your API key and refresh." }]);
        }
    }, []);

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            initialize();
        }

        if (!recognition) {
            // Handle browsers that don't support SpeechRecognition
             setChatHistory(prev => [...prev, { role: Role.TUTOR, text: "Sorry, your browser doesn't support voice recognition." }]);
            return;
        }

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            setInterimTranscript(interim);
            if (final) {
                handleUserSpeech(final.trim());
            }
        };

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };
        
        return () => {
            if(recognition) {
                recognition.onresult = null;
                recognition.onstart = null;
                recognition.onend = null;
                recognition.onerror = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserSpeech = async (transcript: string) => {
        if (!transcript || isProcessing) return;

        setChatHistory(prev => [...prev, { role: Role.USER, text: transcript }]);
        setInterimTranscript('');
        setIsProcessing(true);

        try {
            if (aiChat.current) {
                const response = await aiChat.current.sendMessage({ message: transcript });
                const tutorResponse = response.text;
                
                setChatHistory(prev => [...prev, { role: Role.TUTOR, text: tutorResponse }]);
                await speakText(tutorResponse);
            }
        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage = "I'm having a little trouble responding right now. Let's try that again.";
            setChatHistory(prev => [...prev, { role: Role.TUTOR, text: errorMessage }]);
            await speakText(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMicClick = () => {
        if (isProcessing) return;
        if (isListening) {
            recognition?.stop();
        } else {
            recognition?.start();
        }
    };

    const getButtonState = () => {
        if (isProcessing) return 'processing';
        if (isListening) return 'listening';
        return 'idle';
    }

    const buttonState = getButtonState();

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
            <header className="bg-gray-800/50 backdrop-blur-sm p-4 text-center border-b border-gray-700">
                <h1 className="text-2xl font-bold text-teal-400">English Fluency Tutor</h1>
                <p className="text-sm text-gray-400">with Alex</p>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {chatHistory.map((msg, index) => (
                    <ChatMessage key={index} role={msg.role} text={msg.text} />
                ))}
                {interimTranscript && (
                     <div className="flex items-end justify-end">
                        <p className="bg-gray-700 text-gray-300 italic p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-2xl animate-pulse">
                            {interimTranscript}
                        </p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </main>

            <footer className="bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700 flex flex-col items-center justify-center sticky bottom-0">
                <button
                    onClick={handleMicClick}
                    disabled={!recognition}
                    className={`rounded-full p-5 transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900
                        ${
                            buttonState === 'idle' ? 'bg-teal-500 hover:bg-teal-400 focus:ring-teal-500' : 
                            buttonState === 'listening' ? 'bg-red-500 hover:bg-red-400 focus:ring-red-500 animate-pulse' :
                            'bg-gray-600 cursor-not-allowed'
                        }`}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        {buttonState === 'idle' && <MicrophoneIcon />}
                        {buttonState === 'listening' && <StopIcon />}
                        {buttonState === 'processing' && <SpinnerIcon />}
                    </div>
                </button>
                 <p className="text-xs text-gray-500 mt-3 h-4">
                    {
                        !recognition ? "Voice input not supported" :
                        buttonState === 'listening' ? "Listening..." :
                        buttonState === 'processing' ? "Alex is thinking..." :
                        "Tap to speak"
                    }
                </p>
            </footer>
        </div>
    );
};

export default App;
