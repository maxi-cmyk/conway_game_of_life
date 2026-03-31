import { Scatter } from 'react-chartjs-2';
import { ExpandableChartCard } from '../charts/ExpandableChartCard';
import { readToken } from '../../lib/theme';

function getOptions() {
    const textSecondary = readToken('--text-secondary');
    const border = readToken('--border');

    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 14,
                right: 8,
                bottom: 0,
                left: 4,
            },
        },
        scales: {
            x: {
                title: { display: true, text: 'Generations', color: textSecondary },
                grid: { color: border },
                ticks: { color: textSecondary, padding: 8 },
            },
            y: {
                min: 0,
                max: 1,
                title: { display: true, text: 'Avg Entropy', color: textSecondary },
                grid: { color: border },
                ticks: { color: textSecondary, padding: 8 },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 16,
                    color: textSecondary,
                    font: { size: 11 },
                },
            },
        },
    };
}

export function EntropyVsGenerations({ sessions }) {
    if (!sessions || sessions.length === 0) {
        return (
            <ExpandableChartCard
                title="Entropy vs Generations"
                emptyTitle="No finished sessions yet"
                emptyBody="Finish a session batch to compare how long sessions run against their average entropy."
            />
        );
    }

    const data = {
        datasets: [{
            label: 'Sessions',
            data: sessions.map(session => ({
                x: session.generations ?? 0,
                y: (session.avgEntropy ?? 0) / 100,
            })),
            backgroundColor: readToken('--color-entropy'),
            pointRadius: 4,
        }],
    };

    return <ExpandableChartCard title="Entropy vs Generations" renderChart={() => <Scatter data={data} options={getOptions()} />} />;
}
