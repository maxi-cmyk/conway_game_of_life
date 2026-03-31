import { Line } from 'react-chartjs-2';
import config from '../../config';
import { readToken } from '../../lib/theme';

const labels = Array.from({ length: config.timePoints }, (_, i) => i);

function getOptions() {
    const tickColor = readToken('--text-secondary') || '#9aa0ab';
    const gridColor = 'rgba(20, 24, 31, 0.5)';
    const borderColor = 'rgba(20, 24, 31, 0.7)';

    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 22,
                right: 12,
                bottom: 0,
                left: 8,
            },
        },
        scales: {
            x: { display: false },
            y: {
                min: 0,
                max: 256,
                grid: { color: gridColor },
                ticks: {
                    maxTicksLimit: 5,
                    color: tickColor,
                    padding: 10,
                    font: { size: 12, weight: '600' },
                },
                border: { color: borderColor },
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: tickColor,
                    boxWidth: 10,
                    padding: 16,
                    font: { size: 11 }
                }
            }
        },
        elements: {
            point: { radius: 0 },
            line:  { tension: 0.3, borderWidth: 1.5 }
        }
    };
}

export function PopulationChart({ data }) {
    const lineColor = readToken('--color-pop') || '#64B5F6';

    const chartData = {
        labels: labels.slice(0, data.length),
        datasets: [{
            label: 'Population',
            data,
            borderColor: lineColor,
            fill: false,
        }],
    };

    return <Line data={chartData} options={getOptions()} />;
}
