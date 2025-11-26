import React, { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface FileUploaderProps {
    onUpload: (file: File) => void;
    isUploading: boolean;
}

export function FileUploader({ onUpload, isUploading }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
                setSelectedFile(file);
                onUpload(file);
            } else {
                alert('Please upload a PDF file.');
            }
        }
    }, [onUpload]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            onUpload(file);
        }
    }, [onUpload]);

    return (
        <div className="w-full max-w-xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                    "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out cursor-pointer overflow-hidden group",
                    !isDragging && "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
                    isUploading && "pointer-events-none opacity-80"
                )}
                style={isDragging ? {
                  borderColor: 'var(--navy-dark)',
                  backgroundColor: 'var(--cream)/50'
                } : undefined}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                />

                <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
                    <div className={clsx(
                        "p-4 rounded-full transition-colors duration-200",
                        isDragging ? "" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                    )}
                    style={isDragging ? {
                      backgroundColor: 'var(--cream)',
                      color: 'var(--navy-dark)'
                    } : undefined}>
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--burgundy-light)' }} />
                        ) : selectedFile ? (
                            <CheckCircle className="w-8 h-8" style={{ color: 'var(--navy-dark)' }} />
                        ) : (
                            <Upload className="w-8 h-8" />
                        )}
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {isUploading ? "Processing Report..." : selectedFile ? "Report Selected" : "Upload ERIS Report"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedFile ? selectedFile.name : "Drag & drop or click to browse"}
                        </p>
                    </div>
                </div>

                {/* Background gradient effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                  background: `linear-gradient(to top right, var(--navy-dark)/5, var(--cream)/10)`
                }} />
            </motion.div>
        </div>
    );
}
