import { useEffect, useId, useState } from 'react';
import styles from './Charts.module.css';

export function ExpandableChartCard({
    title,
    renderChart,
    renderControls,
    emptyTitle,
    emptyBody,
}) {
    const [expanded, setExpanded] = useState(false);
    const titleId = useId();
    const hasControls = typeof renderControls === 'function';
    const isEmpty = typeof renderChart !== 'function';

    useEffect(() => {
        if (!expanded) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setExpanded(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expanded]);

    const openExpanded = () => {
        if (!isEmpty) {
            setExpanded(true);
        }
    };

    const handleCanvasKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openExpanded();
        }
    };

    return (
        <>
            <section className={`${styles.card} ${!isEmpty ? styles.cardInteractive : ''}`}>
                <div className={styles.header}>
                    <div className={styles.title} id={titleId}>{title}</div>

                    {hasControls ? (
                        <div className={styles.headerActions} onClick={event => event.stopPropagation()}>
                            {renderControls()}
                        </div>
                    ) : null}
                </div>

                {isEmpty ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyTitle}>{emptyTitle}</p>
                        <p className={styles.emptyBody}>{emptyBody}</p>
                    </div>
                ) : (
                    <div
                        className={styles.canvasButton}
                        role="button"
                        tabIndex={0}
                        aria-labelledby={titleId}
                        onClick={openExpanded}
                        onKeyDown={handleCanvasKeyDown}
                    >
                        <div className={styles.canvas}>
                            {renderChart()}
                        </div>
                    </div>
                )}
            </section>

            {expanded ? (
                <div
                    className={styles.modalOverlay}
                    role="presentation"
                    onClick={() => setExpanded(false)}
                >
                    <div
                        className={styles.modalCard}
                        id={`${titleId}-dialog`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`${titleId}-modal`}
                        onClick={event => event.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle} id={`${titleId}-modal`}>{title}</div>
                            <div className={styles.modalHeaderActions}>
                                {hasControls ? renderControls() : null}
                                <button
                                    className={styles.closeButton}
                                    type="button"
                                    onClick={() => setExpanded(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className={styles.modalCanvas}>
                            <div className={styles.modalChartFrame}>
                                {renderChart()}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
