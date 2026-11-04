// Run with: node --test tests/record-identity.test.cjs
// Synthetic data only. Tests execute the actual functions extracted from index.html.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');

function extract(start, next) {
  const a = html.indexOf(start);
  const b = html.indexOf(next, a + start.length);
  assert.ok(a >= 0 && b > a, 'Expected application functions must exist');
  return html.slice(a, b);
}
function harness() {
  const ctx = {
    state: { logs: [], strengthLogs: [], weeks: {} },
    view: '',
    FormData: class { constructor(form) { return form; } },
    document: { getElementById: () => ({ close() {} }) },
    save: async () => {},
    render: () => {},
    strengthLibrary: { A: [{ id: 'calf', name: 'Calf raise' }] },
    Date, Math, Number, Object
  };
  vm.createContext(ctx);
  vm.runInContext(extract('function saveRun(', 'function editRun('), ctx);
  vm.runInContext(extract('function saveStrength(', 'function exportBackup('), ctx);
  return ctx;
}
const event = values => ({
  preventDefault() {},
  target: { entries: () => Object.entries(values)[Symbol.iterator]() }
});

test('editing Garmin run preserves source ID, external ID and metadata', () => {
  const c = harness();
  c.state.logs.push({
    id: 'intervals-123', externalId: '123', source: 'Garmin via Intervals.icu',
    date: '2026-11-03', distance: 3.32, duration: '00:33:29', customMetadata: 'retain',
    rpe: null, pain: null, notes: 'Original'
  });
  c.saveRun(event({date:'2026-11-03', distance:'3.32', hr:'145', rpe:'4', pain:'2', notes:'Easy'}), '', 'intervals-123');
  assert.equal(c.state.logs.length, 1);
  const run = c.state.logs[0];
  assert.equal(run.id, 'intervals-123');
  assert.equal(run.externalId, '123');
  assert.equal(run.source, 'Garmin via Intervals.icu');
  assert.equal(run.duration, '00:33:29');
  assert.equal(run.customMetadata, 'retain');
  assert.equal(run.rpe, 4);
  assert.equal(run.pain, 2);
  assert.equal(run.notes, 'Easy');
});

test('new manual run receives a local ID', () => {
  const c = harness();
  c.saveRun(event({date:'2026-11-03', distance:'2', hr:'', rpe:'', pain:'', notes:'Test'}), '', '');
  assert.match(c.state.logs[0].id, /^run-/);
  assert.equal(c.state.logs[0].rpe, null);
  assert.equal(c.state.logs[0].pain, null);
});

test('new strength entries receive distinct IDs', () => {
  const c = harness();
  const e = () => event({date:'2026-11-03', sets0:'2', reps0:'10', load0:'Bodyweight', pain:'1', rpe:'3', notes:'Test'});
  c.saveStrength(e(), '', 'A');
  c.saveStrength(e(), '', 'A');
  assert.equal(c.state.strengthLogs.length, 2);
  assert.match(c.state.strengthLogs[0].id, /^strength-/);
  assert.notEqual(c.state.strengthLogs[0].id, c.state.strengthLogs[1].id);
});
