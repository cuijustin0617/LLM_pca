import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, BarChart3 } from 'lucide-react';
import { BenchmarkResult } from '../utils/api';

interface BenchmarkStatsProps {
    results: BenchmarkResult;
}

export function BenchmarkStats({ results }: BenchmarkStatsProps) {
    const { metrics } = results;

    const StatCard = ({ label, value, subtext, color }: { label: string, value: string, subtext?: string, color: string }) => (
        <div className={`p-4 rounded-lg border bg-card text-card-foreground shadow-sm ${color}`}>
            <div className="flex flex-col space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <span className="text-2xl font-bold">{value}</span>
                {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: 'var(--navy-dark)' }} />
                <h2 className="text-xl font-semibold">Benchmark Results</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border shadow-sm" style={{ borderColor: 'var(--navy-light)', backgroundColor: 'var(--navy-dark)/10' }}>
                    <div className="flex flex-col space-y-1.5">
                        <span className="text-sm font-medium text-muted-foreground">Precision</span>
                        <span className="text-2xl font-bold">{`${(metrics.precision * 100).toFixed(1)}%`}</span>
                        <span className="text-xs text-muted-foreground">Accuracy of positive predictions</span>
                    </div>
                </div>
                <div className="p-4 rounded-lg border shadow-sm" style={{ borderColor: 'var(--navy-dark)', backgroundColor: 'var(--cream)/50' }}>
                    <div className="flex flex-col space-y-1.5">
                        <span className="text-sm font-medium text-muted-foreground">Recall</span>
                        <span className="text-2xl font-bold">{`${(metrics.recall * 100).toFixed(1)}%`}</span>
                        <span className="text-xs text-muted-foreground">Coverage of actual positives</span>
                    </div>
                </div>
                <div className="p-4 rounded-lg border shadow-sm" style={{ borderColor: 'var(--burgundy-light)', backgroundColor: 'var(--burgundy-dark)/10' }}>
                    <div className="flex flex-col space-y-1.5">
                        <span className="text-sm font-medium text-muted-foreground">F1 Score</span>
                        <span className="text-2xl font-bold">{`${(metrics.f1_score * 100).toFixed(1)}%`}</span>
                        <span className="text-xs text-muted-foreground">Harmonic mean of P & R</span>
                    </div>
                </div>
                <StatCard
                    label="Accuracy"
                    value={`${(metrics.accuracy * 100).toFixed(1)}%`}
                    subtext="Overall correctness"
                    color="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 rounded-lg border flex items-center space-x-3" style={{ borderColor: 'var(--navy-dark)', backgroundColor: 'var(--cream)/50' }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--navy-dark)' }} />
                    <div>
                        <div className="font-semibold" style={{ color: 'var(--navy-dark)' }}>{metrics.true_positives}</div>
                        <div className="text-sm text-muted-foreground">True Positives</div>
                    </div>
                </div>
                <div className="p-4 rounded-lg border flex items-center space-x-3" style={{ borderColor: 'var(--burgundy-light)', backgroundColor: 'var(--burgundy-dark)/10' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--burgundy-dark)' }} />
                    <div>
                        <div className="font-semibold" style={{ color: 'var(--burgundy-dark)' }}>{metrics.false_positives}</div>
                        <div className="text-sm text-muted-foreground">False Positives</div>
                    </div>
                </div>
                <div className="p-4 rounded-lg border flex items-center space-x-3" style={{ borderColor: 'var(--burgundy-light)', backgroundColor: 'var(--burgundy-dark)/10' }}>
                    <XCircle className="w-5 h-5" style={{ color: 'var(--burgundy-light)' }} />
                    <div>
                        <div className="font-semibold" style={{ color: 'var(--burgundy-dark)' }}>{metrics.false_negatives}</div>
                        <div className="text-sm text-muted-foreground">False Negatives</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
