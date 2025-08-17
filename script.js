document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  // Core controls (if present)
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressIndicator = document.getElementById('progress-indicator');

  // Sidenav
  const menuBtn = document.getElementById('menu-btn');
  const closeBtn = document.getElementById('close-btn');
  const overlay = document.getElementById('overlay');
  const navLinksContainer = document.getElementById('nav-links');

  // Theme
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  // Dashboard progress (if present)
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressPercent = document.getElementById('progress-percent');

  // Cards
  let allCards = Array.from(document.querySelectorAll('.card'));
  let currentCardIndex = 0;
  let viewedCards = new Set(JSON.parse(localStorage.getItem('viewedCards') || '[]'));

  /* -------------------- Helpers -------------------- */
  function applyTheme(theme) {
    if (theme === 'light') {
      body.classList.add('light-mode');
      if (themeToggleBtn) themeToggleBtn.textContent = '🌙 Dark Mode';
    } else {
      body.classList.remove('light-mode');
      if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Light Mode';
    }
  }

  function setupRevealAnswers(root) {
    const scope = root || document;
    const answers = Array.from(scope.querySelectorAll('p')).filter(p => {
      const t = (p.textContent || '').trim();
      return t.startsWith('✅ Correct Answer:') || t.startsWith('Correct Answer:');
    });
    answers.forEach(p => {
      if (p.closest('.answer-explanation')) return;
      const wrap = document.createElement('div');
      wrap.className = 'answer-explanation';
      p.parentNode.insertBefore(wrap, p);
      wrap.appendChild(p);
      const btn = document.createElement('button');
      btn.className = 'reveal-btn';
      btn.textContent = 'Reveal Answer';
      wrap.parentNode.insertBefore(btn, wrap);
      btn.addEventListener('click', () => { wrap.classList.add('visible'); btn.style.display = 'none'; }, { once: true });
    });
  }

  function updateFooter() {
    const total = allCards.length;
    if (progressIndicator) progressIndicator.textContent = `Card ${currentCardIndex + 1} of ${total}`;
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex >= total - 1;
  }

  function updateOverallProgress() {
    const total = allCards.length;
    const pct = total ? Math.round((viewedCards.size / total) * 100) : 0;
    if (progressBarFill) progressBarFill.style.width = pct + '%';
    if (progressPercent) progressPercent.textContent = pct + '% Complete';
  }

  function showCard(index) {
    allCards.forEach(card => card.style.display = 'none');
    document.querySelectorAll('.phase-title, .module-title').forEach(t => t.style.display = 'none');

    const activeCard = allCards[index];
    if (activeCard) {
      activeCard.style.display = 'block';

      const parentSection = activeCard.closest('section.module');
      if (parentSection) {
        const pt = parentSection.querySelector('.phase-title'); if (pt) pt.style.display = 'block';
        const mt = parentSection.querySelector('.module-title'); if (mt) mt.style.display = 'block';
      }

      activeCard.querySelectorAll('details').forEach(d => d.open = true);
      setupRevealAnswers(activeCard);

      currentCardIndex = index;
      viewedCards.add(index);
      localStorage.setItem('viewedCards', JSON.stringify(Array.from(viewedCards)));
      localStorage.setItem('lastViewedCard', String(index));
      updateOverallProgress();
      recordDailyView(index);
    }
    updateFooter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Build modules by scanning <h3.module-title> and subsequent .card until next <h3>
  function computeModulesByFlow() {
    const flow = Array.from(document.querySelectorAll('h3.module-title, .card'));
    const modules = [];
    let current = null;

    flow.forEach(el => {
      if (el.matches && el.matches('h3.module-title')) {
        current = {
          title: el.textContent || 'Module',
          headingEl: el,
          cardIndices: [],
          phase: (el.previousElementSibling && el.previousElementSibling.classList && el.previousElementSibling.classList.contains('phase-title'))
                   ? el.previousElementSibling.textContent : ''
        };
        modules.push(current);
      } else if (el.classList && el.classList.contains('card')) {
        const idx = allCards.indexOf(el);
        if (idx === -1) return;
        if (!current) {
          current = { title: 'Ungrouped', headingEl: null, cardIndices: [], phase: '' };
          modules.push(current);
        }
        current.cardIndices.push(idx);
      }
    });
    return modules;
  }

  function populateNavMenu() {
    if (!navLinksContainer) return;
    navLinksContainer.innerHTML = '';

    // Home link
    const homeLi = document.createElement('li');
    const homeA = document.createElement('a');
    homeA.href = '#';
    homeA.textContent = '🏠 Dashboard';
    homeA.addEventListener('click', (e) => {
      e.preventDefault();
      allCards.forEach(c => c.style.display = 'none');
      document.querySelectorAll('.phase-title, .module-title').forEach(t => t.style.display = '');
      const dash = document.getElementById('dashboard');
      const container = document.getElementById('card-container');
      if (dash) dash.classList.add('visible');
      if (container) container.classList.remove('visible');
      closeSidenav();
    });
    homeLi.appendChild(homeA);
    navLinksContainer.appendChild(homeLi);

    // Modules by flow
    const group = computeModulesByFlow();
    let lastPhase = null;
    group.forEach(mod => {
      if (mod.phase && mod.phase !== lastPhase) {
        const li = document.createElement('li');
        li.className = 'nav-phase';
        li.textContent = mod.phase;
        navLinksContainer.appendChild(li);
        lastPhase = mod.phase;
      }

      const moduleLi = document.createElement('li');
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = mod.title;
      details.appendChild(summary);

      const ul = document.createElement('ul');
      ul.className = 'card-links';

      if (mod.cardIndices.length) {
        mod.cardIndices.forEach(idx => {
          const li2 = document.createElement('li');
          const a = document.createElement('a');
          a.href = '#';
          const title = allCards[idx].querySelector('h4')?.textContent || `Card ${idx+1}`;
          a.textContent = title;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const dash = document.getElementById('dashboard');
            const container = document.getElementById('card-container');
            if (dash) dash.classList.remove('visible');
            if (container) container.classList.add('visible');
            showCard(idx);
            closeSidenav();
          });
          li2.appendChild(a);
          ul.appendChild(li2);
        });
      } else {
        const li2 = document.createElement('li');
        li2.textContent = '(No cards in this module)';
        ul.appendChild(li2);
      }

      details.appendChild(ul);
      moduleLi.appendChild(details);
      navLinksContainer.appendChild(moduleLi);
    });
  }

  // Sidenav controls
  function openSidenav() { body.classList.add('sidenav-open'); }
  function closeSidenav() { body.classList.remove('sidenav-open'); }

  if (menuBtn) menuBtn.addEventListener('click', openSidenav);
  if (closeBtn) closeBtn.addEventListener('click', closeSidenav);
  if (overlay) overlay.addEventListener('click', closeSidenav);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = body.classList.toggle('light-mode');
      const newTheme = isLight ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
    });
    applyTheme(localStorage.getItem('theme') || 'dark');
  }

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (currentCardIndex < allCards.length - 1) showCard(currentCardIndex + 1);
  });
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) showCard(currentCardIndex - 1);
  });

  setupRevealAnswers(document);
  populateNavMenu();

  // Default view
  const dash = document.getElementById('dashboard');
  const container = document.getElementById('card-container');
  if (allCards.length > 0) {
    if (dash) dash.classList.remove('visible');
    if (container) container.classList.add('visible');
    showCard(0);
  } else {
    if (dash) dash.classList.add('visible');
  }

  /* -------------------- Dashboard: Daily Goal + Resume + Reset -------------------- */
  // Inject widgets if needed and remove course outline
  (function ensureDashboardWidgets(){
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // Remove "Study Overview" and outline list
    dashboard.querySelectorAll('h3').forEach(h3 => {
      const t = (h3.textContent||'').toLowerCase();
      if (t.includes('study') && t.includes('overview')) {
        let nxt = h3.nextElementSibling;
        while (nxt && (nxt.tagName === 'UL' || nxt.tagName === 'DIV' || nxt.tagName === 'SECTION')) {
          if (nxt.id === 'dashboard-modules-list') { nxt.remove(); break; }
          nxt = nxt.nextElementSibling;
        }
        h3.remove();
      }
    });
    const stray = dashboard.querySelector('#dashboard-modules-list');
    if (stray) stray.remove();

    if (document.getElementById('daily-goals')) return;
    const section = document.createElement('section');
    section.id = 'daily-goals';
    section.setAttribute('aria-labelledby','daily-goals-title');
    section.innerHTML = `
      <h3 id="daily-goals-title">Daily Study</h3>
      <div class="goal-row">
        <label for="daily-goal-input">Daily goal</label>
        <input id="daily-goal-input" type="number" min="1" max="500" />
        <button id="save-goal-btn" class="pill-btn">Save</button>
      </div>
      <div class="goal-today">
        <div class="daily-progress-bar"><div id="daily-goal-fill"></div></div>
        <span id="daily-goal-text">0 / 0 today</span>
      </div>
      <div class="quick-actions">
        <button id="resume-btn" class="primary-btn">▶ Resume where you left off</button>
        <button id="reset-progress-btn" class="danger-btn" title="This clears all saved progress">Reset progress</button>
      </div>
    `;
    dashboard.appendChild(section);
  })();

  // Daily helpers
  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function updateDailyUI(set, goal) {
    const fill = document.getElementById('daily-goal-fill');
    const text = document.getElementById('daily-goal-text');
    const done = set.size;
    const target = Math.max(1, parseInt(goal || '1', 10));
    const pct = Math.min(100, Math.round((done / target) * 100));
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${done} / ${target} today`;
  }
  function loadDailyState() {
    const goal = parseInt(localStorage.getItem('dailyGoal') || '10', 10);
    const inp = document.getElementById('daily-goal-input');
    if (inp) inp.value = goal;
    const todayKey = getTodayKey();
    const todaySet = new Set(JSON.parse(localStorage.getItem('viewedToday_'+todayKey) || '[]'));
    updateDailyUI(todaySet, goal);
  }
  function recordDailyView(cardIndex) {
    const todayKey = getTodayKey();
    const key = 'viewedToday_'+todayKey;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if (!arr.includes(cardIndex)) {
      arr.push(cardIndex);
      localStorage.setItem(key, JSON.stringify(arr));
    }
    const goal = parseInt(localStorage.getItem('dailyGoal') || '10', 10);
    const todaySet = new Set(arr);
    updateDailyUI(todaySet, goal);
  }

  // Wire dashboard buttons
  (function wireDashboardButtons(){
    const save = document.getElementById('save-goal-btn');
    const input = document.getElementById('daily-goal-input');
    const reset = document.getElementById('reset-progress-btn');
    const resume = document.getElementById('resume-btn');
    if (save && input) {
      save.addEventListener('click', () => {
        const val = Math.max(1, parseInt((input.value||'10'),10));
        localStorage.setItem('dailyGoal', String(val));
        loadDailyState();
      });
    }
    if (reset) {
      reset.addEventListener('click', () => {
        if (!confirm('Reset all progress? This will clear viewed cards and daily history.')) return;
        Object.keys(localStorage).forEach(k => { if (k.startsWith('viewedToday_')) localStorage.removeItem(k); });
        localStorage.removeItem('viewedCards');
        localStorage.removeItem('lastViewedCard');
        viewedCards = new Set();
        updateOverallProgress();
        loadDailyState();
        updateFooter();
      });
    }
    if (resume) {
      resume.addEventListener('click', () => {
        const idx = parseInt(localStorage.getItem('lastViewedCard') || '-1', 10);
        if (!isNaN(idx) && idx >= 0 && idx < allCards.length) {
          const dash = document.getElementById('dashboard');
          const container = document.getElementById('card-container');
          if (dash) dash.classList.remove('visible');
          if (container) container.classList.add('visible');
          showCard(idx);
        } else if (allCards.length > 0) {
          showCard(0);
        }
      });
    }
  })();

  updateOverallProgress();
  loadDailyState();

  /* -------------------- Exam Simulator (Module 16) -------------------- */
  (function ensureExamSimulator(){
    if (document.getElementById('exam-sim-card')) return;

    // Find Module 16 location
    const h3s = Array.from(document.querySelectorAll('h3.module-title'));
    let target = null;
    if (h3s.length >= 16) target = h3s[15];
    if (!target) target = h3s.find(h3 => (h3.textContent||'').includes('16'));

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'exam-sim-card';
    card.innerHTML = `
      <h4>Module 16 — PMP Exam Simulator</h4>
      <div class="exam-controls">
        <div class="exam-row">
          <label for="exam-num-questions">Questions</label>
          <input id="exam-num-questions" type="number" min="5" max="200" value="20" />
          <label for="exam-duration">Duration (minutes)</label>
          <input id="exam-duration" type="number" min="5" max="240" value="30" />
          <button id="exam-start-btn" class="primary-btn">Start Exam</button>
          <button id="exam-import-btn" class="pill-btn">Import Questions</button>
          <input id="exam-import-input" type="file" accept=".json,.txt" style="display:none" />
          <button id="exam-export-btn" class="pill-btn">Export Bank</button>
        </div>
        <p class="exam-note">Preloaded with a starter bank. Import more from transcripts anytime.</p>
      </div>

      <div class="exam-stage" style="display:none">
        <div class="exam-topbar">
          <div class="exam-timer">⏱ <span id="exam-timer-text">00:00</span></div>
          <div class="exam-progress">Question <span id="exam-current">1</span> / <span id="exam-total">0</span></div>
        </div>
        <div id="exam-question"></div>
        <div id="exam-options"></div>
        <div class="exam-nav">
          <button id="exam-prev" class="ghost-btn">Previous</button>
          <button id="exam-next" class="ghost-btn">Next</button>
          <button id="exam-submit" class="danger-btn">Submit Exam</button>
        </div>
      </div>

      <div class="exam-results" style="display:none">
        <h5>Results</h5>
        <p><strong>Score:</strong> <span id="exam-score"></span></p>
        <div id="exam-review"></div>
        <button id="exam-restart" class="primary-btn">Start New Exam</button>
      </div>
    `;

    if (target && target.parentElement) {
      target.parentElement.appendChild(card);
    } else {
      const container = document.getElementById('card-container');
      (container || document.body).appendChild(card);
    }

    // Starter bank if none found in localStorage
    if (!localStorage.getItem('exam_bank')) {
      const starter = [
        {stem:"You review EVM and find SPI = 0.86 and CPI = 1.12. The sponsor asks you to bring the project back on track in two months. What should you do next?",
         options:["Apply schedule crashing to accelerate the schedule using extra resources.","Apply fast-tracking to run sequential work in parallel without extra cost.","Update the risk register and assign the risk to an executive to manage.","Reduce scope to meet the date."],
         correctIndex:0,
         explanation:"SPI<1 means behind schedule; CPI>1 under budget. Crashing uses budget to recover schedule."},
        {stem:"A team is new and experiencing conflict; some members are not showing up. What should you do next?",
         options:["Meet with functional managers to demand more team capacity.","Set a team charter and define roles, responsibilities and ways of working.","Escalate immediately to the steering committee as a project risk.","Replace the team members who missed meetings."],
         correctIndex:1,
         explanation:"Establishing a team charter clarifies roles and norms."},
        {stem:"Sprint Planning is about to start. What should happen next?",
         options:["Negotiate scope and cost with the sponsor.","Hold the daily stand-up: what did you do yesterday/today and blockers.","PO validates completed work and marks items as done.","The Product Owner presents the updated, prioritized backlog and the team ensures shared understanding."],
         correctIndex:3,
         explanation:"Planning needs a clear, prioritized backlog and shared understanding."},
        {stem:"In agile, what should you emphasize over processes and tools?",
         options:["Definition of success by the project manager","Individuals and interactions","Scope baseline control","Schedule compression techniques"],
         correctIndex:1,
         explanation:"Agile values individuals and interactions."},
        {stem:"A designer asks what they should be working on. Where do you look?",
         options:["Project scope statement","Requirements traceability matrix","Assumption log","WBS Dictionary"],
         correctIndex:3,
         explanation:"WBS Dictionary describes each work package details to execute."}
      ];
      localStorage.setItem('exam_bank', JSON.stringify(starter));
    }

    // Attach engine
    examEngine();
  })();

  /* -------------------- Exam Engine -------------------- */
  function examEngine(){
    const byId = (id)=>document.getElementById(id);
    let BANK = [];
    let exam = null;

    function loadBank() {
      try { BANK = JSON.parse(localStorage.getItem('exam_bank') || '[]'); } catch(e){ BANK = []; }
      // sanitize
      const seen = new Set();
      BANK = BANK.filter(q => {
        const key = (q.stem||'').slice(0,180).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return q.options && q.options.length >= 2;
      });
    }
    function saveBank(){ localStorage.setItem('exam_bank', JSON.stringify(BANK)); }
    function shuffle(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
    function pickQuestions(n){ const pool = BANK.slice(); shuffle(pool); return pool.slice(0, Math.min(n, pool.length)); }

    function renderQuestion(idx){
      const q = exam.questions[idx];
      byId('exam-current').textContent = String(idx+1);
      byId('exam-total').textContent = String(exam.questions.length);
      byId('exam-question').innerHTML = `<div class="exam-stem">${q.stem}</div>`;
      const oWrap = byId('exam-options');
      oWrap.innerHTML = q.options.map((opt,i)=>{
        const checked = exam.answers[idx] === i ? 'checked' : '';
        return `<label class="exam-option"><input type="radio" name="opt" value="${i}" ${checked}/> <span>${opt}</span></label>`;
      }).join("");
      oWrap.querySelectorAll('input[name="opt"]').forEach(input => {
        input.addEventListener('change', (e)=>{ exam.answers[idx] = parseInt(e.target.value,10); });
      });
    }

    function startTimer(minutes){
      const end = Date.now() + minutes*60*1000;
      exam.timer = setInterval(()=>{
        const remain = Math.max(0, end - Date.now());
        const m = Math.floor(remain/60000);
        const s = Math.floor((remain%60000)/1000);
        byId('exam-timer-text').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        if (remain <= 0) { clearInterval(exam.timer); finishExam(true); }
      }, 250);
    }

    function startExam(){
      loadBank();
      if (!BANK.length){ alert('No questions loaded yet. Use “Import Questions” to add more.'); return; }
      const n = Math.max(5, Math.min(200, parseInt(byId('exam-num-questions').value||'20',10)));
      const mins = Math.max(5, Math.min(240, parseInt(byId('exam-duration').value||'30',10)));
      exam = { questions: pickQuestions(n), answers: Array(n).fill(null), idx:0, timer:null };
      document.querySelector('#exam-sim-card .exam-controls').style.display = 'none';
      document.querySelector('#exam-sim-card .exam-results').style.display = 'none';
      document.querySelector('#exam-sim-card .exam-stage').style.display = 'block';
      byId('exam-current').textContent = '1';
      byId('exam-total').textContent = String(exam.questions.length);
      renderQuestion(0);
      startTimer(mins);
    }

    function finishExam(timeUp=false){
      if (exam?.timer) clearInterval(exam.timer);
      let correct = 0;
      const review = [];
      exam.questions.forEach((q,i)=>{
        const sel = exam.answers[i];
        const ok = sel === q.correctIndex;
        if (ok) correct++;
        if (!ok){
          review.push({i, stem:q.stem, options:q.options, chosen:sel, correct:q.correctIndex, explanation:q.explanation||''});
        }
      });
      const pct = exam.questions.length ? Math.round((correct/exam.questions.length)*100) : 0;
      const resultsWrap = document.querySelector('#exam-sim-card .exam-results');
      const reviewWrap = byId('exam-review');
      byId('exam-score').textContent = `${correct} / ${exam.questions.length} (${pct}%)${timeUp?' — time up':''}`;
      reviewWrap.innerHTML = review.map(item=>{
        const optsHtml = item.options.map((t,idx)=>{
          const mark = idx === item.correct ? '✅' : (idx === item.chosen ? '❌' : '•');
          return `<li>${mark} ${t}</li>`;
        }).join("");
        const exp = item.explanation ? `<div class="exam-explanation"><strong>Explanation:</strong> ${item.explanation}</div>` : '';
        return `<div class="review-item"><div class="review-stem">${item.i+1}. ${item.stem}</div><ul class="review-options">${optsHtml}</ul>${exp}</div>`;
      }).join("") || "<p>Nice work! No missed questions to review.</p>";
      document.querySelector('#exam-sim-card .exam-stage').style.display = 'none';
      resultsWrap.style.display = 'block';
    }

    function wire(){
      const root = document.getElementById('exam-sim-card');
      if (!root) return;
      document.getElementById('exam-start-btn')?.addEventListener('click', startExam);
      document.getElementById('exam-prev')?.addEventListener('click', ()=>{ if (!exam) return; exam.idx = Math.max(0, exam.idx-1); renderQuestion(exam.idx); });
      document.getElementById('exam-next')?.addEventListener('click', ()=>{ if (!exam) return; exam.idx = Math.min(exam.questions.length-1, exam.idx+1); renderQuestion(exam.idx); });
      document.getElementById('exam-submit')?.addEventListener('click', ()=>finishExam(false));
      document.getElementById('exam-restart')?.addEventListener('click', ()=>{
        document.querySelector('#exam-sim-card .exam-results').style.display = 'none';
        document.querySelector('#exam-sim-card .exam-controls').style.display = 'block';
      });
      // Import/export
      const impBtn = document.getElementById('exam-import-btn');
      const impInput = document.getElementById('exam-import-input');
      const expBtn = document.getElementById('exam-export-btn');
      impBtn?.addEventListener('click', ()=>impInput?.click());
      impInput?.addEventListener('change', async (e)=>{
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const text = await file.text();
        try {
          const arr = JSON.parse(text);
          if (Array.isArray(arr)) {
            const bank = JSON.parse(localStorage.getItem('exam_bank') || '[]');
            arr.forEach(q=>bank.push(q));
            localStorage.setItem('exam_bank', JSON.stringify(bank));
            alert(`Imported ${arr.length} questions.`);
            e.target.value = '';
            return;
          } else {
            throw new Error('JSON not an array');
          }
        } catch {
          // Plain text import: Q/A/B/C/D/Correct/Explanation with --- separator
          const chunks = text.split(/\n-{3,}\n/);
          const bank = JSON.parse(localStorage.getItem('exam_bank') || '[]');
          let added = 0;
          chunks.forEach(ch=>{
            const m = ch.match(/Q:\s*(.+)\nA:\s*(.+)\nB:\s*(.+)\nC:\s*(.+)\nD:\s*(.+)\nCorrect:\s*([A-D])\n(?:Explanation:\s*([\s\S]*))?/i);
            if (m) {
              bank.push({
                stem:m[1].trim(), options:[m[2].trim(),m[3].trim(),m[4].trim(),m[5].trim()],
                correctIndex:m[6].toUpperCase().charCodeAt(0)-65, explanation:(m[7]||'').trim()
              });
              added++;
            }
          });
          localStorage.setItem('exam_bank', JSON.stringify(bank));
          alert(`Imported ${added} questions.`);
          e.target.value = '';
        }
      });
      expBtn?.addEventListener('click', ()=>{
        const bank = localStorage.getItem('exam_bank') || '[]';
        const data = new Blob([bank], {type:'application/json'});
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url; a.download = 'exam_bank.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      });
    }
    wire();
  }
});
