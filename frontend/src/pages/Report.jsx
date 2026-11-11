import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import TopBar from '../components/TopBar.jsx';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function Report() {
  const navigate = useNavigate();
  const session = useSelector((s) => s.interview.session);
  const report = session?.report;

  // If someone lands here without a completed session, bounce them home.
  useEffect(() => {
    if (!session || session.state !== 'ended' || !session.report) {
      // Small grace — don't redirect if we're still loading after a refresh.
      const t = setTimeout(() => {
        if (!session || !session.report) navigate('/interview/setup');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [session, navigate]);

  if (!report) {
    return (
      <>
        <TopBar searchPlaceholder="Search…" />
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading report…
        </div>
      </>
    );
  }

  const chartData = {
    labels: report.radar.labels,
    datasets: [
      {
        label: 'You',
        data: report.radar.you,
        backgroundColor: 'rgba(122, 162, 247, 0.16)',
        borderColor: '#7aa2f7',
        borderWidth: 2,
        pointBackgroundColor: '#7aa2f7',
        pointRadius: 4,
      },
      {
        label: 'Role target',
        data: report.radar.target,
        backgroundColor: 'rgba(187, 154, 247, 0.05)',
        borderColor: '#bb9af7',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#a1aacb', font: { size: 12 } } } },
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        grid: { color: '#2a3042' },
        angleLines: { color: '#2a3042' },
        pointLabels: { color: '#a1aacb', font: { size: 12 } },
        ticks: { display: false },
      },
    },
  };

  return (
    <>
      <TopBar searchPlaceholder="Search…" />

      <div className="report-hero">
        <h1>Session <em>complete.</em></h1>
        <p>{report.meta || `${session.questionsCovered} questions answered`}</p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            marginTop: 28,
            position: 'relative',
            zIndex: 2,
            flexWrap: 'wrap',
          }}
        >
          <button className="btn btn-primary" onClick={() => navigate('/interview/setup')}>
            Start another
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-stat">
          <div className="value">{report.overallScore}</div>
          <div className="label">Overall Score</div>
        </div>
        <div className="report-stat">
          <div className="value">
            {session.questionsCovered}/{session.questionsTarget}
          </div>
          <div className="label">Questions Attempted</div>
        </div>

        {report.radar.labels.length > 0 && (
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <h3>Performance by <em>category</em></h3>
            <div style={{ height: 360 }}>
              <Radar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        <div className="card">
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontStyle: 'italic',
              marginBottom: 16,
            }}
          >
            <em style={{ color: 'var(--lime)' }}>Strengths</em>
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {report.strengths.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specific strengths highlighted.</p>
            )}
            {report.strengths.map((s, i) => (
              <div key={i} className="ats-item">
                <div className="ats-check pass">✓</div>
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontStyle: 'italic',
              marginBottom: 16,
            }}
          >
            Areas to <em style={{ color: 'var(--lime)' }}>grow</em>
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {report.growth.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specific growth areas flagged.</p>
            )}
            {report.growth.map((g, i) => (
              <div key={i} className="ats-item">
                <div className="ats-check fail">!</div>
                {g}
              </div>
            ))}
          </div>
        </div>

        {report.nextSteps.length > 0 && (
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontStyle: 'italic',
                marginBottom: 16,
              }}
            >
              <em style={{ color: 'var(--lime)' }}>Next steps</em> — your AI coach recommends
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {report.nextSteps.map((n, i) => (
                <div key={i} className="rec-card">
                  <div className="rec-icon">{n.icon}</div>
                  <div>
                    <h5>{n.title}</h5>
                    <p>{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
