import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, FunctionDeclaration, Type, GenerateContentResponse } from '@google/genai';
import { ConversationStatus, Message, SessionRecord, Buddy } from './types';
import { encode, decode, decodeAudioData, createBlob } from './utils/audio';
import { 
    MicrophoneIcon, StopIcon, LoadingSpinner, ThumbsUpIcon, ThumbsDownIcon, ArrowLeftIcon, CameraIcon,
    FireIcon, SettingsIcon, TextLearningIcon, HomeworkHelperIcon, LearningGamesIcon, ReadLearnIcon, VoiceTutorIcon, BrainChallengesIcon, CreativeStudioIcon, ChallengeMedalIcon, StarIcon 
} from './components/Icons';
import { Mascot } from './components/Mascot';

export type AppMode = 'homework' | 'free-chat' | 'learning' | 'voice-to-story' | 'read-and-learn';
const HISTORY_KEY = 'askie-kids-history';
const SETTINGS_KEY = 'askie-kids-settings';

const BUDDIES: Buddy[] = [
    { id: 'navi', name: 'Navi', voice: 'Zephyr', icon: '☁️' },
    { id: 'buddy', name: 'Buddy', voice: 'Puck', icon: '🐶' },
    { id: 'sparkle', name: 'Sparkle', voice: 'Kore', icon: '✨' },
];

const generateImageForResponse = async (ai: GoogleGenAI, prompt: string, style: string = 'cartoon'): Promise<string | null> => {
    if (!ai || !prompt) return null;
    try {
        const imagePrompt = `A simple, friendly, cute ${style} illustration for a child about: ${prompt}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imagePrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error('Image generation error:', e);
        return null;
    }
};

// =================================================================
// SETTINGS COMPONENT
// =================================================================
interface SettingsProps {
    buddies: Buddy[];
    selectedBuddyId: string;
    onSelectBuddy: (id: string) => void;
    onExit: () => void;
    onSelectParentDashboard: () => void;
}

const Settings: React.FC<SettingsProps> = ({ buddies, selectedBuddyId, onSelectBuddy, onExit, onSelectParentDashboard }) => {
    return (
        <div className="flex flex-col h-full bg-[#FFFBF5]">
            <header className="flex items-center p-4 border-b border-slate-200">
                <button onClick={onExit} className="p-2 mr-2 transition-colors rounded-full hover:bg-slate-100" aria-label="Back to main menu">
                    <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            </header>
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    <h2 className="mb-4 text-lg font-semibold text-slate-600">Choose Your Buddy</h2>
                    <div className="space-y-4">
                        {buddies.map(buddy => (
                            <button
                                key={buddy.id}
                                onClick={() => onSelectBuddy(buddy.id)}
                                className={`w-full p-4 text-left transition-all duration-200 border-2 rounded-xl flex items-center ${
                                    selectedBuddyId === buddy.id
                                        ? 'border-purple-500 bg-purple-50 scale-105 shadow-lg'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                <span className="mr-4 text-4xl">{buddy.icon}</span>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{buddy.name}</h3>
                                    <p className="text-slate-500">A friendly, cheerful voice.</p>
                                </div>
                                {selectedBuddyId === buddy.id && (
                                    <div className="ml-auto">
                                        <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    <h2 className="mt-8 mb-4 text-lg font-semibold text-slate-600">Parental Controls</h2>
                    <button
                        onClick={onSelectParentDashboard}
                        className="w-full p-4 text-left transition-all duration-200 border-2 rounded-xl flex items-center bg-white hover:bg-slate-50 hover:border-slate-300"
                    >
                        <span className="mr-4 text-2xl">👨‍👩‍👧</span>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Parent Dashboard</h3>
                            <p className="text-slate-500">View conversation history.</p>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
};


// =================================================================
// PARENT DASHBOARD COMPONENT
// =================================================================
interface ParentDashboardProps {
    history: SessionRecord[];
    onExit: () => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ history, onExit }) => {
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSession = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getModeTitle = (mode: AppMode) => {
        switch (mode) {
            case 'homework': return 'Homework Helper';
            case 'learning': return 'General Learning';
            case 'free-chat': return 'Free Chat';
            case 'voice-to-story': return 'Voice-to-Story';
            case 'read-and-learn': return 'Read & Learn';
            default: return 'Session';
        }
    };

    const filteredHistory = history.filter(session => {
        if (!searchQuery) return true;
        return session.messages.some(message =>
            message.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="flex flex-col h-full bg-[#FFFBF5]">
            <header className="flex items-center p-4 border-b border-slate-200">
                <button onClick={onExit} className="p-2 mr-2 transition-colors rounded-full hover:bg-slate-100" aria-label="Back to main menu">
                    <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Parent Dashboard</h1>
            </header>
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-4">
                        <div className="relative">
                             <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <h2 className="mb-4 text-lg font-semibold text-slate-600">Recent Activity</h2>
                    {history.length === 0 ? (
                        <p className="py-8 text-center text-slate-500">No conversation history has been saved yet.</p>
                    ) : filteredHistory.length === 0 ? (
                        <p className="py-8 text-center text-slate-500">No matching conversations found for "{searchQuery}".</p>
                    ) : (
                        <div className="space-y-4">
                            {filteredHistory.map((session) => (
                                <div key={session.id} className="overflow-hidden bg-white border border-slate-200 rounded-xl">
                                    <button onClick={() => toggleSession(session.id)} className="flex items-center justify-between w-full p-4 text-left">
                                        <div>
                                            <span className="font-bold text-slate-800">{getModeTitle(session.mode)}</span>
                                            <span className="block text-sm text-slate-500">{new Date(session.timestamp).toLocaleString()}</span>
                                        </div>
                                        <svg className={`w-5 h-5 text-slate-500 transition-transform ${expandedId === session.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {expandedId === session.id && (
                                        <div className="p-4 border-t border-slate-200 bg-slate-50">
                                            <div className="max-h-96 overflow-y-auto pr-2">
                                                {session.messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};


// =================================================================
// DASHBOARD COMPONENT
// =================================================================
interface DashboardProps {
    onSelectMode: (mode: AppMode) => void;
    onSelectSettings: () => void;
}

const ActivityCard: React.FC<{ title: string; description: string; icon: React.ReactNode; color: string; onClick: () => void; }> = ({ title, description, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className={`p-4 rounded-2xl text-left flex flex-col justify-between transition-transform transform hover:scale-105 ${color}`}
    >
        <div>
            <div className="w-12 h-12 mb-4 bg-white rounded-full flex items-center justify-center">{icon}</div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
        </div>
    </button>
);

const Dashboard: React.FC<DashboardProps> = ({ onSelectMode, onSelectSettings }) => {
    const [learningMode, setLearningMode] = useState('voice');
    
    return (
        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
            <header className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Hello Champion!</h1>
                        <p className="text-slate-500">Ready to learn today?</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="flex items-center px-3 py-2 space-x-2 bg-white rounded-full shadow-sm">
                        <FireIcon className="w-5 h-5 text-orange-500"/>
                        <span className="font-semibold text-orange-500">12 days</span>
                    </button>
                    <button onClick={onSelectSettings} className="p-3 bg-white rounded-full shadow-sm">
                        <SettingsIcon className="w-6 h-6 text-slate-600"/>
                    </button>
                </div>
            </header>

            <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-500">XP Progress</p>
                <div className="relative pt-1">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">
                                250 / 400 XP
                            </span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-yellow-200">
                        <div style={{ width: '62.5%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center p-1 bg-white rounded-full shadow-sm">
                <button
                    onClick={() => setLearningMode('text')}
                    className={`px-6 py-2 rounded-full font-semibold transition-colors flex items-center space-x-2 ${learningMode === 'text' ? 'bg-[#E5E7EB] text-slate-800' : 'text-slate-500'}`}
                >
                    <TextLearningIcon className="w-5 h-5" />
                    <span>Text Learning</span>
                </button>
                <button
                    onClick={() => setLearningMode('voice')}
                    className={`px-6 py-2 rounded-full font-semibold transition-colors flex items-center space-x-2 ${learningMode === 'voice' ? 'bg-[#E5E7EB] text-slate-800' : 'text-slate-500'}`}
                >
                    <MicrophoneIcon className="w-5 h-5"/>
                    <span>Voice Learning</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <ActivityCard title="Homework Helper" description="Get help with tasks" icon={<HomeworkHelperIcon className="w-6 h-6 text-[#29B6F6]" />} color="bg-[#E1F5FE]" onClick={() => onSelectMode('homework')} />
                <ActivityCard title="Learning Games" description="Fun educational games" icon={<LearningGamesIcon className="w-6 h-6 text-[#FF7043]" />} color="bg-[#FBE9E7]" onClick={() => onSelectMode('learning')} />
                <ActivityCard title="Read & Learn" description="Explore new stories" icon={<ReadLearnIcon className="w-6 h-6 text-[#7E57C2]" />} color="bg-[#EDE7F6]" onClick={() => onSelectMode('read-and-learn')} />
                <ActivityCard title="Voice Tutor" description="Talk to an AI tutor" icon={<VoiceTutorIcon className="w-6 h-6 text-[#FFCA28]" />} color="bg-[#FFF8E1]" onClick={() => onSelectMode('learning')} />
                <ActivityCard title="Brain Challenges" description="Test your knowledge" icon={<BrainChallengesIcon className="w-6 h-6 text-[#FFEE58]" />} color="bg-[#FFFDE7]" onClick={() => onSelectMode('learning')} />
                <ActivityCard title="Creative Studio" description="Draw & create stories" icon={<CreativeStudioIcon className="w-6 h-6 text-[#EC407A]" />} color="bg-[#FCE4EC]" onClick={() => onSelectMode('voice-to-story')} />
            </div>

            <div className="p-6 bg-orange-400 rounded-2xl text-white text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                    <ChallengeMedalIcon className="w-8 h-8"/>
                    <h3 className="text-xl font-bold">Today's Challenge!</h3>
                </div>
                <p>Read a story for 10 minutes</p>
                <div className="flex items-center justify-center pt-2 space-x-1">
                    <p className="font-semibold">You're doing amazing!</p>
                    <StarIcon className="w-5 h-5 text-yellow-300"/>
                </div>
            </div>
        </div>
    );
};


// =================================================================
// CHAT VIEW COMPONENT
// =================================================================
interface ChatViewProps {
    mode: AppMode;
    buddy: Buddy;
    onExit: () => void;
}

const generateImageFunctionDeclaration: FunctionDeclaration = {
    name: 'generateImage',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates an image based on a user\'s description. Call this only when the user explicitly asks for a picture, drawing, or image.',
        properties: {
            prompt: {
                type: Type.STRING,
                description: 'A detailed description of the image the user wants to see.',
            },
            style: {
                type: Type.STRING,
                description: "The artistic style of the image. For example: 'cartoon', 'photorealistic', 'sketch'. Defaults to 'cartoon' if not specified by the user.",
            },
        },
        required: ['prompt'],
    },
};

const ChatBubble: React.FC<{ message: Message; onFeedback?: (id: number, feedback: 'up' | 'down') => void; }> = ({ message, onFeedback }) => {
    const isUser = message.speaker === 'user';
    const isAi = message.speaker === 'ai';

    return (
        <div className={`flex items-end gap-2 my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${isUser ? 'bg-purple-500 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg shadow-md'}`}>
                <p className="text-sm">{message.text}</p>
                {message.imageUrl && (
                    <img src={message.imageUrl} alt={isUser ? "User upload" : "AI generated visual aid"} className="mt-2 rounded-lg" />
                )}
                {message.isGeneratingImage && (
                    <div className="mt-2 flex items-center text-xs text-gray-400">
                        <LoadingSpinner className="w-4 h-4 mr-2" />
                        <span>Generating an image...</span>
                    </div>
                )}
                {isAi && !message.isGeneratingImage && message.text && onFeedback && (
                    <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-gray-200/80">
                        <button
                            onClick={() => onFeedback(message.id, 'up')}
                            className={`transition-colors duration-200 ${message.feedback === 'up' ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'}`}
                            aria-label="Good response"
                            title="Good response"
                        >
                            <ThumbsUpIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onFeedback(message.id, 'down')}
                            className={`transition-colors duration-200 ${message.feedback === 'down' ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                            aria-label="Bad response"
                            title="Bad response"
                        >
                            <ThumbsDownIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AudioVisualizer: React.FC<{ volume: number }> = ({ volume }) => {
    const scale = 1 + volume * 1.5;
    return (
        <div className="absolute inset-0 flex items-center justify-center -z-10 overflow-hidden" aria-hidden="true">
            <div
                className="bg-purple-200/30 rounded-full transition-transform duration-100 ease-out"
                style={{
                    transform: `scale(${scale})`,
                    width: '200px',
                    height: '200px',
                    opacity: volume * 0.8,
                }}
            />
        </div>
    );
};

const saveSessionToHistory = (messages: Message[], mode: AppMode) => {
    if (!messages || messages.length === 0) return; 

    const newSession: SessionRecord = {
        id: Date.now(),
        mode,
        timestamp: Date.now(),
        messages,
    };

    try {
        const existingHistoryRaw = localStorage.getItem(HISTORY_KEY);
        const existingHistory: SessionRecord[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];
        
        const updatedHistory = [newSession, ...existingHistory].slice(0, 20);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
        console.error("Failed to save session to history:", error);
    }
};

const getInitialAiPrompt = (mode: AppMode, buddyName: string): string | null => {
    switch (mode) {
        case 'homework':
            return `Hello! I'm ${buddyName}, and I'm here to help with your homework. What subject are we working on today? You can tell me, or even show me a picture of your work.`;
        case 'learning':
            return `Hi there! I'm ${buddyName}. I'm so excited to learn with you! What are you curious about today? We can talk about anything, like animals, space, or dinosaurs!`;
        case 'read-and-learn':
            return `Welcome to Read and Learn! I'm ${buddyName}, and I love stories. Would you like to hear a fun story about a squirrel who learned to fly, or would you like to learn about something new?`;
        case 'free-chat':
        default:
            return null; // User initiates
    }
};

const ChatView: React.FC<ChatViewProps> = ({ mode, buddy, onExit }) => {
    const [status, setStatus] = useState<ConversationStatus>(ConversationStatus.IDLE);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [micVolume, setMicVolume] = useState(0);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userInputRef = useRef('');
    const aiResponseRef = useRef('');
    const nextAudioStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const conversationRef = useRef(conversation);
    const speechEndTimeoutRef = useRef<number | null>(null);
    const statusRef = useRef(status);
    
    conversationRef.current = conversation;
    statusRef.current = status;

    const cleanup = useCallback(() => {
        if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
    }, []);
    
    const handleFeedback = useCallback((messageId: number, feedback: 'up' | 'down') => {
        setConversation(currentConversation =>
            currentConversation.map(msg =>
                msg.id === messageId ? { ...msg, feedback: msg.feedback === feedback ? null : feedback } : msg
            )
        );
    }, []);

    const startListeningForUser = useCallback(async () => {
        setPermissionDenied(false);
        setError(null);
        setStatus(ConversationStatus.PROCESSING);

        if (!process.env.API_KEY) {
            setError('API_KEY is not set.');
            setStatus(ConversationStatus.ERROR);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            const ai = aiRef.current ?? new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            aiRef.current = ai;

            let systemInstruction = '';
            let tools: { functionDeclarations: FunctionDeclaration[] }[] = [];

            switch (mode) {
                case 'homework':
                    systemInstruction = `You are ${buddy.name}, a helpful and patient AI homework assistant for children ages 6 to 14. Your primary goal is to teach, not just give answers. Your tone must be encouraging and supportive. When a child asks a homework question, your response MUST follow this two-part structure:
1.  **Concept First:** Start by identifying the core concept of the problem. Begin your explanation with a phrase like "That's a great question! It looks like we're working with [Concept Name]. Let's break that down first." Then, explain the concept simply, using an analogy a child can understand.
2.  **Apply to the Problem:** After explaining the concept, transition to the specific problem by saying something like "Now that we know about [Concept Name], let's look at your question." Then, guide them step-by-step without giving the final answer directly.

If the user provides a picture of their homework, analyze it and follow the same two-part structure. If they explicitly ask for a picture, you MUST call the \`generateImage\` tool.`;
                    tools = [{ functionDeclarations: [generateImageFunctionDeclaration] }];
                    break;
                case 'read-and-learn':
                    systemInstruction = `You are ${buddy.name}, a friendly AI storyteller and teacher for children. Your primary goal is to tell engaging stories or explain concepts. For every main response you provide, you MUST ALSO generate a cute, friendly, cartoon-style illustration that visually represents the information. To do this, you MUST call the \`generateImage\` tool with a descriptive prompt related to your response. For example, if you are telling a story about a brave knight, call the tool with a prompt like "A cartoon drawing of a brave knight in shiny armor standing in front of a castle." Do not ask the user if they want an image; generate it automatically to enhance the learning experience.`;
                    tools = [{ functionDeclarations: [generateImageFunctionDeclaration] }];
                    break;
                case 'learning':
                    systemInstruction = `You are ${buddy.name}, a fun, friendly, and very patient AI learning buddy for children ages 4 to 12. Explain things simply, with lots of encouragement and a cheerful tone. Keep your answers short, safe, and easy for a young child to understand. If the child seems unsure what to ask, proactively suggest interesting topics or fun questions to spark their curiosity, like "Did you know that octopuses have three hearts?" or "Would you like to learn about the biggest volcano in our solar system?". If the user explicitly asks for a picture, drawing, or image, you MUST call the \`generateImage\` tool with a descriptive prompt. Do not call it if they don't ask for an image. You can suggest different image styles like cartoon, sketch, or realistic if the user seems interested.`;
                    tools = [{ functionDeclarations: [generateImageFunctionDeclaration] }];
                    break;
                case 'free-chat':
                case 'voice-to-story': // Fallthrough, no specific instructions for chat
                    systemInstruction = `You are ${buddy.name}, a fun and friendly AI chat buddy for a child. Your goal is to have a casual, safe, and engaging conversation. Be curious, ask questions, and keep the chat light and positive. You are NOT able to create images or pictures, so politely decline if asked.`;
                    tools = [];
                    break;
            }
            
            sessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: tools,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: buddy.voice } } },
                    systemInstruction: systemInstruction,
                },
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            
                            let sum = 0;
                            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                            setMicVolume(Math.min(1, Math.sqrt(sum / inputData.length) * 5));

                            const pcmBlob = createBlob(inputData);
                            if(sessionRef.current) sessionRef.current.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        setStatus(ConversationStatus.LISTENING);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'generateImage' && sessionRef.current && aiRef.current) {
                                    const prompt = fc.args.prompt as string;
                                    const style = fc.args.style as string | undefined;
                                    const imageMessageId = Date.now();
                                    
                                    setConversation(prev => [...prev, { id: imageMessageId, speaker: 'ai', text: `Ok, drawing a ${style || 'cartoon'} of: "${prompt}"`, isGeneratingImage: true }]);

                                    generateImageForResponse(aiRef.current, prompt, style).then(imageUrl => {
                                        setConversation(prev => prev.map(msg => msg.id === imageMessageId ? { ...msg, imageUrl: imageUrl ?? undefined, isGeneratingImage: false } : msg));
                                    });

                                    sessionRef.current.then(session => session.sendToolResponse({ functionResponses: { id : fc.id, name: fc.name, response: { result: "OK, the image is being generated for the user." } } }));
                                }
                            }
                        }

                        if (message.serverContent?.inputTranscription) {
                            if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);
                            speechEndTimeoutRef.current = window.setTimeout(() => {
                                if (statusRef.current === ConversationStatus.LISTENING) {
                                    setStatus(ConversationStatus.THINKING);
                                }
                            }, 1200);

                            userInputRef.current += message.serverContent.inputTranscription.text;
                            setConversation(prev => {
                                const last = prev[prev.length -1];
                                if (last?.speaker === 'user') return [...prev.slice(0, -1), { ...last, text: userInputRef.current }];
                                return [...prev, { id: Date.now(), speaker: 'user', text: userInputRef.current }];
                            });
                        }
                        if (message.serverContent?.outputTranscription) {
                            if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);
                            setStatus(ConversationStatus.SPEAKING);
                            aiResponseRef.current += message.serverContent.outputTranscription.text;
                             setConversation(prev => {
                                const last = prev[prev.length -1];
                                if (last?.speaker === 'ai') return [...prev.slice(0, -1), { ...last, text: aiResponseRef.current }];
                                return [...prev, { id: Date.now(), speaker: 'ai', text: aiResponseRef.current }];
                            });
                        }
                         if (message.serverContent?.turnComplete) {
                            if (speechEndTimeoutRef.current) clearTimeout(speechEndTimeoutRef.current);
                            userInputRef.current = '';
                            aiResponseRef.current = '';
                            if (statusRef.current !== ConversationStatus.ERROR) setStatus(ConversationStatus.LISTENING);
                        }

                        const modelTurn = message.serverContent?.modelTurn;
                        if (modelTurn?.parts) {
                            for (const part of modelTurn.parts) {
                                const audioData = part.inlineData?.data;
                                if (audioData && outputAudioContextRef.current) {
                                    const audioContext = outputAudioContextRef.current;
                                    nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, audioContext.currentTime);
                                    const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                                    
                                    const source = audioContext.createBufferSource();
                                    source.buffer = audioBuffer;
                                    source.connect(audioContext.destination);
                                    source.onended = () => audioSourcesRef.current.delete(source);
                                    source.start(nextAudioStartTimeRef.current);
                                    nextAudioStartTimeRef.current += audioBuffer.duration;
                                    audioSourcesRef.current.add(source);
                                }
                            }
                        }

                         if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextAudioStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: any) => {
                        console.error('API Error:', e);
                        setError(`An error occurred: ${e.message || 'Please try again.'}`);
                        setStatus(ConversationStatus.ERROR);
                        cleanup();
                    },
                    onclose: () => {},
                },
            });
        } catch (err) {
            console.error('Initialization error:', err);
            let message = 'An unknown error occurred.';
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
                    message = 'Microphone access was denied. Please allow it in your browser settings and try again.';
                    setPermissionDenied(true);
                } else {
                    message = err.message;
                }
            }
            setError(message);
            setStatus(ConversationStatus.ERROR);
            cleanup();
        }
    }, [cleanup, mode, buddy]);

    const stopConversation = useCallback(() => {
        cleanup();
        setStatus(ConversationStatus.IDLE);
    }, [cleanup]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';

        if (!sessionRef.current) {
            setError("Please start the conversation before sending an image.");
            return;
        }

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                setConversation(prev => [...prev, { id: Date.now(), speaker: 'user', text: `Here's a picture.`, imageUrl: dataUrl }]);
                const base64Data = dataUrl.split(',')[1];
                sessionRef.current?.then(session => session.sendRealtimeInput({ media: { data: base64Data, mimeType: file.type } }));
            };
            reader.readAsDataURL(file);
        } catch (e) {
            console.error("Error processing image:", e);
            setError("Sorry, there was a problem with that image.");
        }
    };
    
    useEffect(() => {
        const conversationBox = document.getElementById('conversation-box');
        if (conversationBox) conversationBox.scrollTop = conversationBox.scrollHeight;
    }, [conversation]);
    
    // Effect for AI-initiated conversation
    useEffect(() => {
        const initialPrompt = getInitialAiPrompt(mode, buddy.name);
        if (initialPrompt) {
            const initiate = async () => {
                setStatus(ConversationStatus.PROCESSING);
                setConversation([{ id: Date.now(), speaker: 'ai', text: initialPrompt }]);

                if (!process.env.API_KEY) {
                    setError('API_KEY is not set.');
                    setStatus(ConversationStatus.ERROR);
                    return;
                }

                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                    aiRef.current = ai;
                    
                    const audioRes = await ai.models.generateContent({
                        model: "gemini-2.5-flash-preview-tts",
                        contents: [{ parts: [{ text: initialPrompt }] }],
                        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: buddy.voice } } } }
                    });
                    const audioData = audioRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

                    if (audioData) {
                        setStatus(ConversationStatus.SPEAKING);
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        const audioContext = outputAudioContextRef.current;
                        const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioContext.destination);
                        source.onended = () => {
                            audioSourcesRef.current.delete(source);
                            startListeningForUser(); // Transition to listening
                        };
                        source.start();
                        audioSourcesRef.current.add(source);
                    } else {
                        // If TTS fails, just go to listening mode. The text is already displayed.
                        await startListeningForUser();
                    }
                } catch (err) {
                    console.error('AI initiation error:', err);
                    let message = 'An unknown error occurred while starting.';
                    if (err instanceof Error) message = err.message;
                    setError(message);
                    setStatus(ConversationStatus.ERROR);
                }
            };
            initiate();
        }

        return () => {
            saveSessionToHistory(conversationRef.current, mode);
            cleanup();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, buddy.name, buddy.voice]);


    useEffect(() => { if (status !== ConversationStatus.LISTENING) setMicVolume(0); }, [status]);

    const handleToggleConversation = () => {
        if (status === ConversationStatus.IDLE || status === ConversationStatus.ERROR) {
            startListeningForUser();
        }
        else stopConversation();
    };

    const getButtonContent = () => {
        switch (status) {
            case ConversationStatus.PROCESSING: return <><LoadingSpinner className="w-8 h-8" /> <span className="ml-2">Starting...</span></>;
            case ConversationStatus.LISTENING:
            case ConversationStatus.SPEAKING:
            case ConversationStatus.THINKING:
                return <><StopIcon className="w-8 h-8" /> <span className="ml-2">Stop</span></>;
            default: return <><MicrophoneIcon className="w-8 h-8" /> <span className="ml-2">Start Talking</span></>;
        }
    };

    const getModeTitle = () => {
        switch (mode) {
            case 'homework': return 'Homework Helper';
            case 'learning': return 'General Learning';
            case 'free-chat': return 'Free Chat';
            case 'voice-to-story': return 'Voice-to-Story';
            case 'read-and-learn': return 'Read & Learn';
        }
    };
    
    const getStatusText = () => {
        if (permissionDenied) return "Microphone permission needed!";
        switch (status) {
            case ConversationStatus.LISTENING: return "I'm listening...";
            case ConversationStatus.SPEAKING: return `${buddy.name} is talking...`;
            case ConversationStatus.THINKING: return `${buddy.name} is thinking...`;
            case ConversationStatus.PROCESSING: return "Getting ready...";
            case ConversationStatus.ERROR: return "Uh oh, something went wrong.";
            default: return "Ready when you are!";
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FFFBF5]">
            <header className="p-4 text-center">
                <h1 className="text-3xl font-bold text-slate-800">{getModeTitle()}</h1>
                <p className="text-slate-500">with your buddy, {buddy.name}!</p>
            </header>
            
            <main className="relative z-0 flex flex-col items-center flex-grow w-full max-w-2xl px-4 mx-auto overflow-hidden">
                <div className="py-2"><Mascot status={status} /></div>
                {status === ConversationStatus.LISTENING && <AudioVisualizer volume={micVolume} />}
                
                <div id="conversation-box" className="w-full overflow-y-auto flex-grow mb-2">
                     {conversation.length === 0 && status === ConversationStatus.IDLE && !permissionDenied && (
                        <div className="flex flex-col items-center justify-center text-center h-full text-slate-500">
                            <p className="text-lg">Press the button below and ask me a question!</p>
                             {mode === 'homework' && <p className="mt-1 text-sm text-slate-400">You can also send a picture of your homework!</p>}
                        </div>
                    )}
                    {conversation.map((msg) => <ChatBubble key={msg.id} message={msg} onFeedback={handleFeedback} />)}
                </div>
                {error && !permissionDenied && <div className="p-3 my-2 text-sm text-center text-red-800 bg-red-100 rounded-lg">{error}</div>}
            </main>

            <footer className="sticky bottom-0 left-0 right-0 p-4 bg-[#FFFBF5]/80 backdrop-blur-sm">
                 <div className="text-center text-slate-600 text-sm mb-2 h-5">{getStatusText()}</div>
                 {permissionDenied ? (
                     <div className="max-w-md p-4 mx-auto text-center bg-red-100 border border-red-200 rounded-xl">
                        <h3 className="text-lg font-bold text-red-800">Microphone Access Denied</h3>
                        <p className="mt-1 text-sm text-red-700">Askie needs to use your microphone. Please enable it in your browser's site settings, then click Retry.</p>
                        <button
                            onClick={startListeningForUser}
                            className="flex items-center justify-center w-full max-w-xs px-6 py-4 mx-auto mt-4 text-xl font-semibold text-white transition-all duration-200 ease-in-out transform bg-slate-800 rounded-full shadow-lg hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-opacity-75 focus:ring-slate-400"
                        >
                            Retry
                        </button>
                    </div>
                 ) : (
                    <div className="relative flex items-center justify-center w-full max-w-xs mx-auto">
                        <button 
                            onClick={onExit}
                            className="absolute left-0 p-3 text-slate-600 transition-colors rounded-full -translate-y-1/2 top-1/2 hover:bg-slate-200"
                            aria-label="Back to dashboard"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={handleToggleConversation}
                            disabled={status === ConversationStatus.PROCESSING}
                            className={`flex items-center justify-center px-6 py-4 text-xl font-semibold text-white transition-all duration-200 ease-in-out transform rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-75 bg-slate-800 hover:bg-slate-700 focus:ring-slate-400 ${status === ConversationStatus.PROCESSING ? 'cursor-not-allowed bg-slate-500' : ''} ${status === ConversationStatus.LISTENING || status === ConversationStatus.THINKING ? 'animate-pulse' : ''}`}
                        >
                            {getButtonContent()}
                        </button>
                        {mode === 'homework' && (status === ConversationStatus.LISTENING || status === ConversationStatus.SPEAKING || status === ConversationStatus.THINKING) && (
                            <button
                                onClick={handleUploadClick}
                                className="absolute right-0 p-3 text-slate-600 transition-colors rounded-full -translate-y-1/2 top-1/2 hover:bg-slate-200"
                                aria-label="Upload homework image"
                            >
                                <CameraIcon className="w-7 h-7" />
                            </button>
                        )}
                    </div>
                 )}
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
            </footer>
        </div>
    );
};

// =================================================================
// VOICE TO STORY VIEW COMPONENT
// =================================================================
type VoiceToStoryStatus = 'IDLE' | 'RECORDING' | 'DONE_RECORDING' | 'GENERATING' | 'DISPLAYING_RESULT' | 'ERROR';
type StoryOutputType = 'storybook' | 'comic' | 'audio';
interface GeneratedContent {
    type: StoryOutputType;
    title: string;
    text?: string;
    panels?: { scene: string; caption: string; }[];
    imageUrl?: string | null;
    audioData?: string | null; // base64
}

const VoiceToStoryView: React.FC<{ buddy: Buddy; onExit: () => void; }> = ({ buddy, onExit }) => {
    const [status, setStatus] = useState<VoiceToStoryStatus>('IDLE');
    const [transcript, setTranscript] = useState('');
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const transcriptRef = useRef('');

    const cleanup = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    }, []);

    const startRecording = useCallback(async () => {
        setPermissionDenied(false);
        setError(null);
        setTranscript('');
        transcriptRef.current = '';
        setStatus('RECORDING');

        if (!process.env.API_KEY) {
            setError('API_KEY is not set.');
            setStatus('ERROR');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            aiRef.current = ai;
            
            sessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    systemInstruction: "You are a helpful assistant. Your only job is to accurately transcribe what the user says. Do not respond or talk back.",
                },
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const processor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = processor;
                        processor.onaudioprocess = (e) => {
                            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                            sessionRef.current?.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: (msg: LiveServerMessage) => {
                        if (msg.serverContent?.inputTranscription) {
                            transcriptRef.current += msg.serverContent.inputTranscription.text;
                            setTranscript(transcriptRef.current);
                        }
                    },
                    onerror: (e: any) => {
                        setError(`An API error occurred: ${e.message}`);
                        setStatus('ERROR');
                        cleanup();
                    },
                    onclose: () => {},
                },
            });

        } catch (err) {
            if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('Permission denied'))) {
                setPermissionDenied(true);
            } else {
                setError('Failed to initialize microphone.');
            }
            setStatus('ERROR');
            cleanup();
        }
    }, [cleanup]);

    const stopRecording = useCallback(() => {
        cleanup();
        setStatus('DONE_RECORDING');
    }, [cleanup]);

    const generateOutput = useCallback(async (type: StoryOutputType) => {
        setStatus('GENERATING');
        setGeneratedContent(null);
        setError(null);
        
        if (!aiRef.current || !transcript) {
            setError('Something went wrong, please start over.');
            setStatus('ERROR');
            return;
        }
        const ai = aiRef.current;

        try {
            if (type === 'storybook') {
                const prompt = `You are a creative storyteller for young children. Based on the following transcript of a child's story, please write a short, enchanting bedtime story. The story should be easy to understand, positive, and have a clear beginning, middle, and end. Also, create a title for the story. Finally, write a single, detailed prompt for a cute, friendly, cartoon-style illustration that captures the main moment of the story. Do not generate the image itself, just the prompt for it.\n\nChild's story: "${transcript}"`
                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, storyText: { type: Type.STRING }, imagePrompt: { type: Type.STRING } } } }
                });
                const data = JSON.parse(res.text);
                const imageUrl = await generateImageForResponse(ai, data.imagePrompt);
                setGeneratedContent({ type, title: data.title, text: data.storyText, imageUrl });

            } else if (type === 'comic') {
                const prompt = `You are a comic book writer for kids. Transform the following transcript of a child's story into a simple 3-panel comic strip script. Create a fun title for the comic. For each of the 3 panels, provide a short "scene" description and a single line of "caption". Finally, write a single, detailed prompt to generate a cute, dynamic, cartoon-style image for the most exciting panel of the comic.\n\nChild's story: "${transcript}"`
                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, panels: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { scene: { type: Type.STRING }, caption: { type: Type.STRING } } } }, imagePrompt: { type: Type.STRING } } } }
                });
                const data = JSON.parse(res.text);
                const imageUrl = await generateImageForResponse(ai, data.imagePrompt);
                setGeneratedContent({ type, title: data.title, panels: data.panels, imageUrl });

            } else if (type === 'audio') {
                const scriptPrompt = `You are an audio drama writer for children. Rewrite the following transcript of a child's story into an engaging audio tale script. Create a title. The script should include a narrator's part and fun, simple sound effect cues written in brackets, like [whoosh!] or [giggle!]. Make the story exciting and easy to follow with just audio.\n\nChild's story: "${transcript}"`;
                const scriptRes = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: scriptPrompt });
                
                const audioRes: GenerateContentResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: `Read this story in a gentle, friendly voice: ${scriptRes.text}`,
                    config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: buddy.voice } } } }
                });
                const audioData = audioRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
                setGeneratedContent({ type, title: "Audio Story", text: scriptRes.text, audioData });
            }
            setStatus('DISPLAYING_RESULT');
        } catch(e) {
            console.error("Generation Error:", e);
            setError('Sorry, I couldn\'t create your story. Please try again.');
            setStatus('ERROR');
        }
    }, [transcript, buddy.voice]);
    
    const playAudio = useCallback(async (base64Audio: string) => {
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAudioContextRef.current = audioContext;
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    }, []);

    const handleStartOver = () => {
        cleanup();
        setStatus('IDLE');
        setTranscript('');
        setGeneratedContent(null);
        setError(null);
        transcriptRef.current = '';
    }

    useEffect(() => { return () => cleanup() }, [cleanup]);

    const renderContent = () => {
        if (permissionDenied || (status === 'ERROR' && permissionDenied)) {
             return (
                 <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                     <div className="max-w-md p-4 mx-auto text-center bg-red-100 border border-red-200 rounded-xl">
                        <h3 className="text-lg font-bold text-red-800">Microphone Access Denied</h3>
                        <p className="mt-1 text-sm text-red-700">This feature needs your microphone. Please enable it in your browser's site settings, then click Retry.</p>
                        <button onClick={startRecording} className="px-6 py-3 mt-4 font-semibold text-white bg-slate-800 rounded-full hover:bg-slate-700">Retry</button>
                    </div>
                 </div>
             );
        }

        if (status === 'GENERATING') {
            return (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4 text-slate-600">
                    <LoadingSpinner className="w-16 h-16" />
                    <p className="mt-4 text-xl">Creating your story...</p>
                    <p>This might take a moment!</p>
                </div>
            )
        }

        if (status === 'DISPLAYING_RESULT' && generatedContent) {
            return (
                <div className="flex-grow w-full p-4 overflow-y-auto">
                    <div className="p-6 mx-auto bg-white rounded-2xl shadow-lg max-w-prose">
                        <h2 className="text-3xl font-bold text-center text-purple-700">{generatedContent.title}</h2>
                        {generatedContent.imageUrl && <img src={generatedContent.imageUrl} alt={generatedContent.title} className="my-4 rounded-lg shadow-md" />}
                        {generatedContent.text && <p className="mt-4 whitespace-pre-wrap text-slate-700">{generatedContent.text}</p>}
                        {generatedContent.panels && (
                            <div className="mt-4 space-y-3">
                                {generatedContent.panels.map((panel, i) => (
                                    <div key={i} className="p-3 border rounded-lg bg-slate-50">
                                        <h4 className="font-bold text-slate-800">Panel {i+1}</h4>
                                        <p className="text-sm text-slate-600"><strong>Scene:</strong> {panel.scene}</p>
                                        <p className="text-sm text-slate-600"><strong>Caption:</strong> {panel.caption}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {generatedContent.audioData && (
                            <div className="mt-4 text-center">
                                <button onClick={() => playAudio(generatedContent.audioData!)} className="px-6 py-3 font-semibold text-white bg-purple-600 rounded-full shadow-lg hover:bg-purple-700">
                                    Play Audio Story
                                </button>
                            </div>
                        )}
                        <button onClick={handleStartOver} className="w-full px-6 py-3 mt-6 font-semibold text-white bg-slate-800 rounded-full hover:bg-slate-700">
                            Start a New Story
                        </button>
                    </div>
                </div>
            )
        }

        if (status === 'DONE_RECORDING') {
            return (
                 <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                     <div className="w-full max-w-lg p-6 bg-white rounded-2xl shadow-lg">
                        <h2 className="text-2xl font-bold text-slate-800">Here's your story!</h2>
                        <p className="p-4 my-4 text-left bg-slate-100 rounded-lg max-h-40 overflow-y-auto text-slate-700">{transcript || "You didn't say anything!"}</p>
                        {transcript && <>
                            <h3 className="text-lg font-semibold text-slate-600">What should we create?</h3>
                            <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-3">
                                <button onClick={() => generateOutput('storybook')} className="p-4 font-semibold text-white bg-pink-500 rounded-lg shadow hover:bg-pink-600">Storybook</button>
                                <button onClick={() => generateOutput('comic')} className="p-4 font-semibold text-white bg-blue-500 rounded-lg shadow hover:bg-blue-600">Comic Strip</button>
                                <button onClick={() => generateOutput('audio')} className="p-4 font-semibold text-white bg-green-500 rounded-lg shadow hover:bg-green-600">Audio Tale</button>
                            </div>
                        </>}
                        <button onClick={handleStartOver} className="w-full px-6 py-3 mt-6 font-semibold text-slate-700 bg-slate-200 rounded-full hover:bg-slate-300">
                            Record Again
                        </button>
                     </div>
                 </div>
            );
        }

        return (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-semibold text-slate-700">
                    {status === 'RECORDING' ? "I'm listening to your story..." : "Press the button to tell me a story!"}
                </h2>
                <div id="transcript-preview" className="my-4 text-slate-500 h-12">{transcript}</div>
                
                <button
                    onClick={status === 'RECORDING' ? stopRecording : startRecording}
                    className="flex items-center justify-center px-8 py-5 text-xl font-semibold text-white transition-all duration-200 ease-in-out transform bg-slate-800 rounded-full shadow-lg hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-opacity-75 focus:ring-slate-400"
                >
                    {status === 'RECORDING' ? <StopIcon className="w-8 h-8" /> : <MicrophoneIcon className="w-8 h-8" />}
                    <span className="ml-3">{status === 'RECORDING' ? 'I\'m Done!' : 'Start Recording'}</span>
                </button>
                {error && <div className="p-3 mt-4 text-sm text-center text-red-800 bg-red-100 rounded-lg">{error}</div>}
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-[#FFFBF5]">
            <header className="flex items-center p-4">
                <button onClick={onExit} className="p-2 mr-2 transition-colors rounded-full hover:bg-slate-100" aria-label="Back to dashboard">
                    <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
                </button>
                <h1 className="text-3xl font-bold text-slate-800">Voice-to-Story</h1>
            </header>
            <main className="relative z-0 flex flex-col items-center flex-grow w-full px-4 mx-auto overflow-hidden">
                <div className="py-2">
                    <Mascot status={status === 'RECORDING' ? ConversationStatus.LISTENING : ConversationStatus.IDLE} />
                </div>
                {renderContent()}
            </main>
        </div>
    );
};


// =================================================================
// MAIN APP COMPONENT
// =================================================================
const App: React.FC = () => {
    const [currentMode, setCurrentMode] = useState<AppMode | 'dashboard' | 'parent-dashboard' | 'settings'>('dashboard');
    const [history, setHistory] = useState<SessionRecord[]>([]);
    const [selectedBuddyId, setSelectedBuddyId] = useState<string>(BUDDIES[0].id);

    useEffect(() => {
        // Load history
        try {
            const savedHistory = localStorage.getItem(HISTORY_KEY);
            if (savedHistory) setHistory(JSON.parse(savedHistory));
        } catch (error) {
            console.error("Could not load history from localStorage:", error);
        }

        // Load settings
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.selectedBuddyId && BUDDIES.some(b => b.id === settings.selectedBuddyId)) {
                    setSelectedBuddyId(settings.selectedBuddyId);
                }
            }
        } catch (error) {
            console.error("Could not load settings from localStorage:", error);
        }
    }, []);

    const handleSelectBuddy = (buddyId: string) => {
        setSelectedBuddyId(buddyId);
        try {
            const settings = { selectedBuddyId: buddyId };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error("Could not save settings to localStorage:", error);
        }
    };

    const handleExitToDashboard = () => {
        if (currentMode !== 'parent-dashboard') {
             try {
                const savedHistory = localStorage.getItem(HISTORY_KEY);
                if (savedHistory) setHistory(JSON.parse(savedHistory));
            } catch (error) {
                console.error("Could not load history from localStorage:", error);
            }
        }
        setCurrentMode('dashboard');
    }
    
    const renderContent = () => {
        const selectedBuddy = BUDDIES.find(b => b.id === selectedBuddyId) || BUDDIES[0];

        if (currentMode === 'parent-dashboard') {
            return <ParentDashboard history={history} onExit={handleExitToDashboard} />;
        }
        if (currentMode === 'settings') {
            return <Settings 
                        buddies={BUDDIES} 
                        selectedBuddyId={selectedBuddyId} 
                        onSelectBuddy={handleSelectBuddy} 
                        onExit={handleExitToDashboard} 
                        onSelectParentDashboard={() => setCurrentMode('parent-dashboard')}
                    />;
        }
        if (currentMode === 'dashboard') {
            return <Dashboard 
                        onSelectMode={(mode) => setCurrentMode(mode)} 
                        onSelectSettings={() => setCurrentMode('settings')} 
                    />;
        }
        if (currentMode === 'voice-to-story') {
            return <VoiceToStoryView buddy={selectedBuddy} onExit={handleExitToDashboard} />;
        }
        
        return <ChatView mode={currentMode} buddy={selectedBuddy} onExit={handleExitToDashboard} />;
    };

    return (
        <div className="h-screen font-sans antialiased text-gray-800 bg-[#FFFBF5]">
            <div className="h-full max-w-lg mx-auto bg-white shadow-2xl">
                 {renderContent()}
            </div>
        </div>
    );
};

export default App;
