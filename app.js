const firebaseConfig = {
  apiKey: "AIzaSyC2qeSMvQFrv4F7ciw9oy1RD74v9sVSqHI",
  authDomain: "ai-jackpot-patterns.firebaseapp.com",
  projectId: "ai-jackpot-patterns",
  storageBucket: "ai-jackpot-patterns.appspot.com",
  messagingSenderId: "123747762572",
  appId: "1:123747762572:web:44da96c6e186e1a5e0d6a9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const { useState, useEffect } = React;

const denominations = ['Penny', 'Nickel', 'Dime', 'Quarter', 'Dollar', '$2', 'High Limit'];
const tierLevels = ['Tier 1', 'Tier 2', 'Tier 3'];
const timeContexts = ['Witching Hours', 'Peak Hours', 'Normal Morning', 'Midday', 'Weekend', 'After Holiday', 'Promo/Event Night'];
const jackpotTypes = ['Mini', 'Minor', 'Major', 'Grand'];
const bonusTypes = ['Hold & Spin', 'Free Spins', 'Both'];

function App() {
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState('list');
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    const unsubscribe = db.collection("sessions").onSnapshot(snapshot => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  function startSession(data) {
    db.collection("sessions").add({
      ...data,
      status: "Active",
      startTime: new Date().toISOString(),
      jackpots: []
    }).then(() => setView("list"));
  }

  function logJackpot(sessionId, data) {
    const ref = db.collection("sessions").doc(sessionId);
    ref.update({
      jackpots: firebase.firestore.FieldValue.arrayUnion({
        ...data,
        id: Date.now(),
        timestamp: new Date().toISOString()
      })
    });
  }

  function endSession(sessionId, data) {
    const ref = db.collection("sessions").doc(sessionId);
    ref.update({
      ...data,
      endTime: new Date().toISOString(),
      status: "Ended"
    }).then(() => setView("list"));
  }

  const activeSessions = sessions.filter(s => s.status === 'Active');
  const endedSessions = sessions.filter(s => s.status === 'Ended');
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="container">
      <h1>AI Jackpot Patterns Tracker</h1>
      {view === 'list' && (
        <>
          <button onClick={() => setView('start')}>Start Session</button>
          <button onClick={() => setView('analytics')}>View Analytics</button>
          <h2>Active Sessions</h2>
          <ul>
            {activeSessions.map(s => (
              <li key={s.id}>
                {s.gameTitle} - {s.casino} - {s.startTime.slice(0,16)}
                <button onClick={() => { setSelectedSessionId(s.id); setView('detail'); }}>Open</button>
              </li>
            ))}
            {activeSessions.length === 0 && <li>None</li>}
          </ul>
          <h2>Ended Sessions</h2>
          <ul>
            {endedSessions.map(s => (
              <li key={s.id}>
                {s.gameTitle} - {s.casino} - Ended {s.endTime.slice(0,16)}
                <button onClick={() => { setSelectedSessionId(s.id); setView('detail'); }}>View</button>
              </li>
            ))}
            {endedSessions.length === 0 && <li>None</li>}
          </ul>
        </>
      )}
      {view === 'start' && (
        <StartSessionForm
          onCancel={() => setView('list')}
          onSubmit={startSession}
        />
      )}
      {view === 'detail' && selectedSession && (
        <SessionDetail
          session={selectedSession}
          onLog={data => logJackpot(selectedSession.id, data)}
          onEnd={data => endSession(selectedSession.id, data)}
          onBack={() => setView('list')}
        />
      )}
      {view === 'analytics' && (
        <Analytics sessions={sessions} onBack={() => setView('list')} />
      )}
    </div>
  );
}

function StartSessionForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({
    gameTitle: '',
    casino: '',
    denomination: denominations[0],
    betAmount: '',
    tierLevel: tierLevels[0],
    timeContext: timeContexts[0],
    checklistFollowed: false,
    notes: '',
    startingBudget: ''
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({...form, [name]: type === 'checkbox' ? checked : value});
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Start Session</h2>
      <div>
        <label>Game Title</label>
        <input name="gameTitle" value={form.gameTitle} onChange={handleChange} required />
      </div>
      <div>
        <label>Casino</label>
        <input name="casino" value={form.casino} onChange={handleChange} required />
      </div>
      <div>
        <label>Denomination</label>
        <select name="denomination" value={form.denomination} onChange={handleChange}>
          {denominations.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label>Bet Amount</label>
        <input name="betAmount" type="number" step="0.01" value={form.betAmount} onChange={handleChange} required />
      </div>
      <div>
        <label>Tier Level</label>
        <select name="tierLevel" value={form.tierLevel} onChange={handleChange}>
          {tierLevels.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label>Time Context</label>
        <select name="timeContext" value={form.timeContext} onChange={handleChange}>
          {timeContexts.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label>
          Checklist Followed?
          <input name="checklistFollowed" type="checkbox" checked={form.checklistFollowed} onChange={handleChange} />
        </label>
      </div>
      <div>
        <label>Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} />
      </div>
      <div>
        <label>Starting Budget</label>
        <input name="startingBudget" type="number" step="0.01" value={form.startingBudget} onChange={handleChange} />
      </div>
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function SessionDetail({ session, onLog, onEnd, onBack }) {
  const [showLog, setShowLog] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <h2>Session Detail</h2>
      <p><strong>Game:</strong> {session.gameTitle}</p>
      <p><strong>Casino:</strong> {session.casino}</p>
      <p><strong>Status:</strong> {session.status}</p>
      <h3>Jackpots</h3>
      <ul>
        {session.jackpots.map(j => (
          <li key={j.id}>{j.type} - {j.betAmount} at {j.timestamp.slice(0,16)}</li>
        ))}
        {session.jackpots.length === 0 && <li>None</li>}
      </ul>
      {session.status === 'Active' && (
        <>
          <button onClick={() => setShowLog(!showLog)}>Log Jackpot</button>
          <button onClick={() => setShowEnd(!showEnd)}>End Session</button>
        </>
      )}
      {showLog && <LogJackpotForm onSubmit={data => { onLog(data); setShowLog(false); }} onCancel={() => setShowLog(false)} session={session} />}
      {showEnd && <EndSessionForm onSubmit={data => { onEnd(data); setShowEnd(false); }} onCancel={() => setShowEnd(false)} />}
    </div>
  );
}

function LogJackpotForm({ session, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    type: jackpotTypes[0],
    denomination: session.denomination,
    betAmount: session.betAmount,
    bonusFeature: bonusTypes[0],
    miniHit: false,
    minorHit: false,
    notes: ''
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({...form, [name]: type === 'checkbox' ? checked : value});
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Log Jackpot</h3>
      <div>
        <label>Jackpot Type</label>
        <select name="type" value={form.type} onChange={handleChange}>
          {jackpotTypes.map(j => <option key={j}>{j}</option>)}
        </select>
      </div>
      <div>
        <label>Denomination</label>
        <select name="denomination" value={form.denomination} onChange={handleChange}>
          {denominations.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label>Bet Amount</label>
        <input name="betAmount" type="number" step="0.01" value={form.betAmount} onChange={handleChange} />
      </div>
      <div>
        <label>Bonus Feature</label>
        <select name="bonusFeature" value={form.bonusFeature} onChange={handleChange}>
          {bonusTypes.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label>
          Mini Hit
          <input name="miniHit" type="checkbox" checked={form.miniHit} onChange={handleChange} />
        </label>
      </div>
      <div>
        <label>
          Minor Hit
          <input name="minorHit" type="checkbox" checked={form.minorHit} onChange={handleChange} />
        </label>
      </div>
      <div>
        <label>Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} />
      </div>
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function EndSessionForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    finalBudget: '',
    finalNotes: ''
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({...form, [name]: value});
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>End Session</h3>
      <div>
        <label>Final Budget</label>
        <input name="finalBudget" type="number" step="0.01" value={form.finalBudget} onChange={handleChange} />
      </div>
      <div>
        <label>Final Notes</label>
        <textarea name="finalNotes" value={form.finalNotes} onChange={handleChange} />
      </div>
      <button type="submit">End</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function Analytics({ sessions, onBack }) {
  const jackpotCounts = sessions.reduce((acc, s) => {
    s.jackpots.forEach(j => {
      acc[j.type] = (acc[j.type] || 0) + 1;
    });
    return acc;
  }, {});

  const denomCounts = sessions.reduce((acc, s) => {
    acc[s.denomination] = (acc[s.denomination] || 0) + 1;
    return acc;
  }, {});

  const winRatio = sessions.reduce((acc, s) => {
    const bet = parseFloat(s.betAmount || 0);
    const finalBudget = parseFloat(s.finalBudget || s.startingBudget || 0);
    const startBudget = parseFloat(s.startingBudget || 0);
    const diff = finalBudget - startBudget;
    acc[bet] = acc[bet] || {won:0,total:0};
    if (diff > 0) acc[bet].won++;
    acc[bet].total++;
    return acc;
  }, {});

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <h2>Analytics</h2>
      <h3>Jackpots by Type</h3>
      <ul>
        {Object.entries(jackpotCounts).map(([type,count]) => (
          <li key={type}>{type}: {count}</li>
        ))}
      </ul>
      <h3>Most Played Denominations</h3>
      <ul>
        {Object.entries(denomCounts).map(([d,c]) => (
          <li key={d}>{d}: {c}</li>
        ))}
      </ul>
      <h3>Win Ratio by Bet</h3>
      <ul>
        {Object.entries(winRatio).map(([bet,obj]) => (
          <li key={bet}>{bet}: {(obj.won/obj.total*100).toFixed(0)}%</li>
        ))}
      </ul>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
