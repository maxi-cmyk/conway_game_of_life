import { useSimData }    from './hooks/useSimData';
import { Header }        from './components/Header/Header';
import { ChartGrid }     from './components/ChartGrid/ChartGrid';
import { AnalysisPanel } from './components/AnalysisPanel/AnalysisPanel';
import styles            from './App.module.css';

export default function App() {
    const sim = useSimData();

    return (
        <div className={styles.app}>
            <Header 
                density={sim.density}
                pop={sim.pop}
                born={sim.born}
                died={sim.died}
                entropy={sim.entropy}
                pBirth={sim.pBirth}
                pDeath={sim.pDeath}
                session={sim.session}
                batchTarget={sim.batchTarget}
                totalSessions={sim.totalSessions}
                state={sim.state}
                onStart={sim.start}
                onRestart={sim.restart}
                onPause={sim.pause}
                onResume={sim.resume}
                onClear={sim.clearHistory}
            />
            <main className={styles.main} >
                <ChartGrid
                    popHistory={sim.popHistory}
                    entropyHistory={sim.entropyHistory}
                    pBirthRolling={sim.pBirthRolling}
                    pDeathRolling={sim.pDeathRolling}
                    pBirthPersistent={sim.pBirthPersistent}
                    pDeathPersistent={sim.pDeathPersistent}
                    windowMode={sim.windowMode}
                    setWindowMode={sim.setWindowMode}
                />
                <AnalysisPanel
                    sessions={sim.sessions}
                />
            </main>
        </div>
    );
}
