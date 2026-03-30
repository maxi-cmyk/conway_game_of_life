import { Line } from 'react-chartjs-2';
import config from '../../config';
import { readToken } from '../../lib/theme';

const labels = Array.from({ length: config.timePoints }, (_, i) => i);

const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
        x: { display: false },
        y: {
            min: 0,
            max: 256,
            grid: { color: '#1a1a1a' },
            ticks: { maxTicksLimit: 5, color: '#444' },
            border: { color: '#222' },
        }
    },
    plugins: { legend: { display: false } },
    elements: {
        point: { radius: 0 },
        line:  { tension: 0.3, borderWidth: 1.5 }
    }
};

export function PopulationChart({ data }) {
    const lineColor = readToken('--color-pop') || '#64B5F6';

    const chartData = {
        labels: labels.slice(0, data.length),
        datasets: [{
            data,
            borderColor: lineColor,
            fill: false,
        }],
    };

    return <Line data={chartData} options={options} />;
}
