import React from 'react';
import { motion } from 'framer-motion';

interface PCARow {
    pca_identifier: number;
    address: string;
    location_relation_to_site: string;
    pca_number: number | null;
    pca_name: string;
    description_timeline: string;
    source_pages: string;
}

interface PCATableProps {
    rows: PCARow[];
}

export function PCATable({ rows }: PCATableProps) {
    if (!rows || rows.length === 0) {
        return <div className="text-center text-gray-500 py-8">No PCA rows found.</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
        >
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Address</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3">PCA #</th>
                        <th className="px-6 py-3">PCA Name</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Pages</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={index}
                            className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <td className="px-6 py-4 font-medium">{row.pca_identifier}</td>
                            <td className="px-6 py-4">{row.address}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.location_relation_to_site === 'On-Site'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    }`}>
                                    {row.location_relation_to_site}
                                </span>
                            </td>
                            <td className="px-6 py-4">{row.pca_number || '-'}</td>
                            <td className="px-6 py-4 max-w-xs truncate" title={row.pca_name}>{row.pca_name}</td>
                            <td className="px-6 py-4 max-w-md truncate" title={row.description_timeline}>{row.description_timeline}</td>
                            <td className="px-6 py-4 text-gray-500">{row.source_pages}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </motion.div>
    );
}
