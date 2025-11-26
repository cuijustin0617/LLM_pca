import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface ProgressVisualizerProps {
    jobId: string;
    onComplete: (data: any) => void;
    onError: (message: string) => void;
}

interface LogEntry {
    id: number;
    message: string;
    timestamp: Date;
}

export function ProgressVisualizer({ jobId, onComplete, onError }: ProgressVisualizerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentStep, setCurrentStep] = useState<string>("Initializing...");
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!jobId) return;

        const eventSource = new EventSource(`http://localhost:8000/extract/${jobId}/progress`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.status === 'progress') {
                const message = data.message;
                setLogs(prev => [...prev, { id: Date.now(), message, timestamp: new Date() }]);

                // Update current step based on message content
                if (message.includes("Extracted text")) setCurrentStep("Extracting Text");
                else if (message.includes("Chunking")) setCurrentStep("Chunking Content");
                else if (message.includes("Processing pages")) setCurrentStep("Analyzing Pages with LLM");
                else if (message.includes("Compiling")) setCurrentStep("Compiling Results");
                else setCurrentStep(message); // Fallback

            } else if (data.status === 'complete') {
                eventSource.close();
                onComplete(data);
            } else if (data.status === 'error') {
                eventSource.close();
                onError(data.message);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            // Don't trigger onError immediately on connection loss, might be temporary
        };

        return () => {
            eventSource.close();
        };
    }, [jobId, onComplete, onError]);

    // Auto-scroll to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            {/* Current Step Indicator */}
            <div className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--cream)/30' }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--burgundy-light)' }} />
                <span className="font-semibold" style={{ color: 'var(--navy-dark)' }}>{currentStep}</span>
            </div>

            {/* Terminal-like Log Window */}
            <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden border border-gray-800 font-mono text-sm">
                <div className="flex items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <Terminal className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-400">Extraction Log</span>
                    <div className="flex space-x-1.5 ml-auto">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--burgundy-dark)/50' }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--cream)' }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--navy-dark)/50' }} />
                    </div>
                </div>

                <div className="p-4 h-64 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <AnimatePresence initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-gray-300 flex space-x-2"
                            >
                                <span className="text-gray-600">[{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                <span>{log.message}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
