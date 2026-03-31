import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    Chart as ChartJS,
    ScatterController,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js';

import './tokens.css';
import './index.css';
import App from './App';
import { readToken } from './lib/theme';

// Register all Chart.js components — including Filler for CI bands
ChartJS.register(
    ScatterController,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);

// Global chart defaults — set once, inherited by all charts
ChartJS.defaults.animation         = false;   // live data — never animate
ChartJS.defaults.color             = readToken('--text-secondary');
ChartJS.defaults.borderColor       = readToken('--border');
ChartJS.defaults.font.family       = readToken('--font-ui');
ChartJS.defaults.font.size         = 11;
ChartJS.defaults.plugins.legend.display = false;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
