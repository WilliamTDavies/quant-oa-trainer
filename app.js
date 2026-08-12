(function () {
  'use strict';

  const Q = window.QuantQuestions;
  const Storage = window.QuantStorage;

  if (!Q || !Storage) {
    document.body.innerHTML = '<p class="noscript">Quant OA Trainer could not initialise. Required scripts are missing.</p>';
    return;
  }

  const elements = {
    body: document.body,
    screens: Array.from(document.querySelectorAll('.screen')),
    home: document.getElementById('home-screen'),
    drill: document.getElementById('drill-screen'),
    results: document.getElementById('results-screen'),
    review: document.getElementById('review-screen'),
    practice: document.getElementById('practice-screen'),
    brandHome: document.getElementById('brand-home'),
    summaryGrid: document.getElementById('summary-grid'),
    historyEmpty: document.getElementById('history-empty'),
    recentAttempts: document.getElementById('recent-attempts'),
    exportHistory: document.getElementById('export-history'),
    clearHistory: document.getElementById('clear-history'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmClear: document.getElementById('confirm-clear'),
    cancelClear: document.getElementById('cancel-clear'),
    overallTimer: document.getElementById('overall-timer'),
    questionTimer: document.getElementById('question-timer'),
    questionCounter: document.getElementById('question-counter'),
    drillProgress: document.getElementById('drill-progress'),
    drillPrompt: document.getElementById('drill-prompt'),
    drillOptions: document.getElementById('drill-options'),
    skipQuestion: document.getElementById('skip-question'),
    resultCards: document.getElementById('result-cards'),
    resultsTitle: document.getElementById('results-title'),
    subtypeResults: document.getElementById('subtype-results'),
    previousAttempts: document.getElementById('previous-attempts'),
    reviewMistakes: document.getElementById('review-mistakes'),
    reviewAll: document.getElementById('review-all'),
    repeatDrill: document.getElementById('repeat-drill'),
    resultsHome: document.getElementById('results-home'),
    reviewBack: document.getElementById('review-back'),
    reviewList: document.getElementById('review-list'),
    reviewTitle: document.getElementById('review-title'),
    startPractice: document.getElementById('start-practice'),
    endPractice: document.getElementById('end-practice'),
    practiceCategory: document.getElementById('practice-category'),
    practiceTimer: document.getElementById('practice-timer'),
    practicePrompt: document.getElementById('practice-prompt'),
    practiceForm: document.getElementById('practice-form'),
    practiceInput: document.getElementById('practice-input'),
    practiceOptions: document.getElementById('practice-options'),
    practiceFeedback: document.getElementById('practice-feedback'),
    nextPractice: document.getElementById('next-practice')
  };

  let history = Storage.loadHistory();
  let activeSession = null;
  let currentAttempt = null;
  let practiceState = null;
  let lastFocusedBeforeModal = null;

  function showScreen(screen) {
    elements.screens.forEach((item) => {
      const active = item === screen;
      item.hidden = !active;
      item.classList.toggle('active', active);
    });
    window.scrollTo(0, 0);
  }

  function returnHome() {
    stopTimedInterval();
    stopPracticeInterval();
    activeSession = null;
    practiceState = null;
    elements.body.classList.remove('timed-active');
    history = Storage.loadHistory();
    renderHome();
    showScreen(elements.home);
    document.getElementById('home-title').focus({ preventScroll: true });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatScore(score, drillType) {
    if (drillType === 'mental') return String(Math.round(score));
    return Number(score).toFixed(2);
  }

  function formatPercent(value) {
    return `${Math.round((Number(value) || 0) * 100)}%`;
  }

  function formatSeconds(value) {
    return `${(Number(value) || 0).toFixed(1)}s`;
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function renderHome() {
    history = Storage.loadHistory();
    const hasHistory = history.length > 0;
    elements.historyEmpty.hidden = hasHistory;
    elements.summaryGrid.hidden = !hasHistory;
    elements.exportHistory.disabled = !hasHistory;
    elements.clearHistory.disabled = !hasHistory;

    if (hasHistory) {
      const cards = Object.keys(Q.DRILLS).map((type) => {
        const attempts = history.filter((attempt) => attempt.drillType === type);
        const recent = attempts[0];
        const best = attempts.length ? attempts.reduce((top, attempt) => attempt.score > top.score ? attempt : top, attempts[0]) : null;
        return `
          <article class="summary-card">
            <h3>${escapeHtml(Q.DRILLS[type].name)}</h3>
            <div class="summary-stat"><span>Most recent</span><strong>${recent ? formatScore(recent.score, type) : '—'}</strong></div>
            <div class="summary-stat"><span>Best</span><strong>${best ? formatScore(best.score, type) : '—'}</strong></div>
          </article>`;
      });
      const totalAnswered = history.reduce((sum, attempt) => sum + attempt.correct + attempt.incorrect, 0);
      cards.push(`<article class="summary-card total-answered"><h3>Total timed questions answered</h3><strong class="attempt-score">${totalAnswered}</strong></article>`);
      elements.summaryGrid.innerHTML = cards.join('');
    } else {
      elements.summaryGrid.innerHTML = '';
    }

    if (!hasHistory) {
      elements.recentAttempts.innerHTML = '<p class="muted">No attempts saved.</p>';
      return;
    }
    elements.recentAttempts.innerHTML = history.slice(0, 8).map((attempt) => attemptRow(attempt, true)).join('');
  }

  function attemptRow(attempt, clickable) {
    const content = `
      <span class="attempt-main">
        <span class="attempt-title">${escapeHtml(Q.DRILLS[attempt.drillType].name)}</span>
        <span class="attempt-meta">${escapeHtml(formatDate(attempt.date))} · ${attempt.correct}/${attempt.questionCount} correct · ${formatPercent(attempt.accuracy)} accuracy</span>
      </span>
      <span class="attempt-score">${formatScore(attempt.score, attempt.drillType)}</span>`;
    return `<div class="attempt-item">${clickable ? `<button class="attempt-open" type="button" data-attempt-id="${escapeHtml(attempt.id)}">${content}</button>` : content}</div>`;
  }

  function setButtonsDisabled(container, disabled) {
    container.querySelectorAll('button').forEach((button) => { button.disabled = disabled; });
  }

  function startTimedDrill(drillType) {
    const drill = Q.DRILLS[drillType];
    if (!drill) return;

    const sourceButton = document.querySelector(`[data-start-drill="${drillType}"]`);
    if (sourceButton) sourceButton.disabled = true;
    try {
      const questions = Q.generateTimedSet(drillType);
      activeSession = {
        drillType,
        drill,
        questions,
        currentIndex: 0,
        results: [],
        sessionStart: null,
        endTimestamp: null,
        questionStart: null,
        intervalId: null,
        gate: Q.createSubmissionGate(),
        finished: false
      };
      elements.body.classList.add('timed-active');
      showScreen(elements.drill);
      renderTimedQuestion();
      const now = performance.now();
      activeSession.sessionStart = now;
      activeSession.endTimestamp = now + drill.durationSeconds * 1000;
      activeSession.questionStart = now;
      updateTimedDisplays();
      activeSession.intervalId = window.setInterval(updateTimedDisplays, 100);
    } catch (error) {
      console.error('Could not generate timed drill.', error);
      window.alert('The drill could not be generated safely. Reload the page and try again.');
      returnHome();
    } finally {
      if (sourceButton) sourceButton.disabled = false;
    }
  }

  function renderTimedQuestion() {
    if (!activeSession || activeSession.finished) return;
    const question = activeSession.questions[activeSession.currentIndex];
    if (!question) {
      finishTimedDrill('completed');
      return;
    }
    elements.questionCounter.textContent = `Question ${activeSession.currentIndex + 1} / ${activeSession.questions.length}`;
    elements.drillProgress.style.width = `${(activeSession.currentIndex / activeSession.questions.length) * 100}%`;
    elements.drillPrompt.textContent = question.prompt;
    elements.drillOptions.innerHTML = question.options.map((option, index) => `
      <button class="answer-button" type="button" data-answer-index="${index}">
        <span class="answer-key" aria-hidden="true">${index + 1}</span>
        <span>${escapeHtml(option)}</span>
      </button>`).join('');
    setButtonsDisabled(elements.drillOptions, false);
    elements.skipQuestion.disabled = false;
    const firstButton = elements.drillOptions.querySelector('button');
    if (firstButton) firstButton.focus({ preventScroll: true });
  }

  function updateTimedDisplays() {
    if (!activeSession || activeSession.finished || activeSession.endTimestamp == null) return;
    const now = performance.now();
    const remaining = Q.remainingMs(activeSession.endTimestamp, now);
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    elements.overallTimer.textContent = `Time left: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    elements.overallTimer.classList.toggle('urgent', remaining <= 60000 && remaining > 15000);
    elements.overallTimer.classList.toggle('critical', remaining <= 15000);
    const questionElapsed = activeSession.questionStart == null ? 0 : Q.elapsedMs(activeSession.questionStart, now) / 1000;
    elements.questionTimer.textContent = `Question time: ${questionElapsed.toFixed(1)}s`;
    if (remaining <= 0) finishTimedDrill('timeout');
  }

  function answerTimedQuestion(selectedIndex) {
    if (!activeSession || activeSession.finished || activeSession.questionStart == null) return;
    const now = performance.now();
    if (activeSession.endTimestamp != null && Q.remainingMs(activeSession.endTimestamp, now) <= 0) {
      finishTimedDrill('timeout');
      return;
    }
    if (!activeSession.gate.tryAcquire()) return;
    const question = activeSession.questions[activeSession.currentIndex];
    if (!question || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
      activeSession.gate.release();
      return;
    }
    const responseTime = Q.elapsedMs(activeSession.questionStart, now) / 1000;
    const correct = selectedIndex === question.correctIndex;
    activeSession.results.push({
      index: activeSession.currentIndex,
      status: correct ? 'correct' : 'incorrect',
      userAnswer: question.options[selectedIndex],
      selectedIndex,
      responseTime,
      scoreChange: correct ? activeSession.drill.correct : activeSession.drill.incorrect,
      question
    });
    advanceTimedQuestion();
  }

  function skipTimedQuestion() {
    if (!activeSession || activeSession.finished || activeSession.questionStart == null) return;
    const now = performance.now();
    if (activeSession.endTimestamp != null && Q.remainingMs(activeSession.endTimestamp, now) <= 0) {
      finishTimedDrill('timeout');
      return;
    }
    if (!activeSession.gate.tryAcquire()) return;
    const question = activeSession.questions[activeSession.currentIndex];
    if (!question) {
      activeSession.gate.release();
      return;
    }
    const responseTime = Q.elapsedMs(activeSession.questionStart, now) / 1000;
    activeSession.results.push({
      index: activeSession.currentIndex,
      status: 'skipped',
      userAnswer: null,
      selectedIndex: null,
      responseTime,
      scoreChange: 0,
      question
    });
    advanceTimedQuestion();
  }

  function advanceTimedQuestion() {
    if (!activeSession || activeSession.finished) return;
    setButtonsDisabled(elements.drillOptions, true);
    elements.skipQuestion.disabled = true;
    activeSession.currentIndex += 1;
    activeSession.questionStart = null;
    if (activeSession.currentIndex >= activeSession.questions.length) {
      finishTimedDrill('completed');
      return;
    }
    window.setTimeout(() => {
      if (!activeSession || activeSession.finished) return;
      const now = performance.now();
      if (activeSession.endTimestamp != null && Q.remainingMs(activeSession.endTimestamp, now) <= 0) {
        finishTimedDrill('timeout');
        return;
      }
      renderTimedQuestion();
      activeSession.questionStart = now;
      elements.questionTimer.textContent = 'Question time: 0.0s';
      activeSession.gate.release();
    }, 45);
  }

  function stopTimedInterval() {
    if (activeSession && activeSession.intervalId != null) {
      window.clearInterval(activeSession.intervalId);
      activeSession.intervalId = null;
    }
  }

  function finishTimedDrill(reason) {
    if (!activeSession || activeSession.finished) return;
    activeSession.finished = true;
    activeSession.gate.end();
    stopTimedInterval();
    const now = performance.now();

    if (reason === 'timeout') {
      for (let index = activeSession.currentIndex; index < activeSession.questions.length; index += 1) {
        activeSession.results.push({
          index,
          status: 'unanswered',
          userAnswer: null,
          selectedIndex: null,
          responseTime: index === activeSession.currentIndex && activeSession.questionStart != null ? Q.elapsedMs(activeSession.questionStart, now) / 1000 : 0,
          scoreChange: 0,
          question: activeSession.questions[index]
        });
      }
    }

    while (activeSession.results.length < activeSession.questions.length) {
      const index = activeSession.results.length;
      activeSession.results.push({ index, status: 'unanswered', userAnswer: null, selectedIndex: null, responseTime: 0, scoreChange: 0, question: activeSession.questions[index] });
    }

    const attempt = buildAttempt(activeSession, now);
    Storage.addAttempt(attempt);
    history = Storage.loadHistory();
    currentAttempt = attempt;
    elements.body.classList.remove('timed-active');
    renderResults(attempt, false);
    showScreen(elements.results);
    elements.resultsTitle.focus({ preventScroll: true });
  }

  function buildAttempt(session, finishedAt) {
    const counts = { correct: 0, incorrect: 0, skipped: 0, unanswered: 0 };
    session.results.forEach((result) => { counts[result.status] += 1; });
    const attempted = counts.correct + counts.incorrect;
    const measuredTimes = session.results.filter((result) => result.status !== 'unanswered').map((result) => result.responseTime);
    const averageTime = measuredTimes.length ? measuredTimes.reduce((a, b) => a + b, 0) / measuredTimes.length : 0;
    return {
      id: `attempt-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      date: new Date().toISOString(),
      drillType: session.drillType,
      questionCount: session.questions.length,
      duration: session.sessionStart == null ? 0 : Q.elapsedMs(session.sessionStart, finishedAt) / 1000,
      score: Q.scoreResults(session.results, session.drillType),
      correct: counts.correct,
      incorrect: counts.incorrect,
      skipped: counts.skipped,
      unanswered: counts.unanswered,
      accuracy: attempted ? counts.correct / attempted : 0,
      completionRate: session.questions.length ? attempted / session.questions.length : 0,
      averageTime,
      medianTime: Q.median(measuredTimes),
      results: session.results
    };
  }

  function renderResults(attempt, savedView) {
    currentAttempt = attempt;
    const attempted = attempt.correct + attempt.incorrect;
    elements.resultsTitle.textContent = savedView ? `Saved result: ${Q.DRILLS[attempt.drillType].name}` : Q.DRILLS[attempt.drillType].name;
    const cards = [
      ['Final score', formatScore(attempt.score, attempt.drillType)],
      ['Correct', attempt.correct],
      ['Incorrect', attempt.incorrect],
      ['Skipped', attempt.skipped],
      ['Unanswered', attempt.unanswered],
      ['Accuracy', attempted ? formatPercent(attempt.accuracy) : '—'],
      ['Completion rate', formatPercent(attempt.completionRate)],
      ['Average / median time', `${formatSeconds(attempt.averageTime)} / ${formatSeconds(attempt.medianTime)}`]
    ];
    elements.resultCards.innerHTML = cards.map(([label, value]) => `<article class="result-card"><span class="result-label">${escapeHtml(label)}</span><strong class="result-value">${escapeHtml(value)}</strong></article>`).join('');

    const subtypeMap = new Map();
    attempt.results.forEach((result) => {
      const key = result.question.subtypeLabel || result.question.subtype || 'Other';
      if (!subtypeMap.has(key)) subtypeMap.set(key, { correct: 0, attempted: 0, total: 0 });
      const row = subtypeMap.get(key);
      row.total += 1;
      if (result.status === 'correct') { row.correct += 1; row.attempted += 1; }
      else if (result.status === 'incorrect') row.attempted += 1;
    });
    elements.subtypeResults.innerHTML = Array.from(subtypeMap.entries()).map(([label, row]) => `<tr><td>${escapeHtml(label)}</td><td>${row.correct}</td><td>${row.attempted}</td><td>${row.total}</td></tr>`).join('');

    const previous = history.filter((item) => item.drillType === attempt.drillType && item.id !== attempt.id).slice(0, 5);
    elements.previousAttempts.innerHTML = previous.length ? previous.map((item) => attemptRow(item, true)).join('') : '<p class="muted">No previous attempts for this drill.</p>';
    elements.reviewMistakes.disabled = !attempt.results.some((result) => result.status !== 'correct');
  }

  function openSavedAttempt(id) {
    const attempt = history.find((item) => item.id === id);
    if (!attempt) return;
    renderResults(attempt, true);
    showScreen(elements.results);
    elements.resultsTitle.focus({ preventScroll: true });
  }

  function renderReview(mode) {
    if (!currentAttempt) return;
    const results = mode === 'mistakes' ? currentAttempt.results.filter((result) => result.status !== 'correct') : currentAttempt.results;
    elements.reviewTitle.textContent = mode === 'mistakes' ? 'Mistake review' : 'All questions';
    if (!results.length) {
      elements.reviewList.innerHTML = '<div class="panel"><h2>No mistakes to review.</h2></div>';
    } else {
      elements.reviewList.innerHTML = results.map((result) => reviewCard(result)).join('');
    }
    showScreen(elements.review);
    elements.reviewTitle.focus({ preventScroll: true });
  }

  function reviewCard(result) {
    const question = result.question;
    const userAnswer = result.userAnswer == null ? (result.status === 'skipped' ? 'Skipped' : 'No answer') : result.userAnswer;
    const subtype = question.subtypeLabel || question.subtype || 'Other';
    const score = result.scoreChange > 0 ? `+${formatScore(result.scoreChange, currentAttempt.drillType)}` : formatScore(result.scoreChange, currentAttempt.drillType);
    const responseTime = result.status === 'unanswered' && result.responseTime === 0 ? 'Not shown' : formatSeconds(result.responseTime);
    const assumptions = question.assumptions ? `<p class="method-note"><strong>Assumptions:</strong> ${escapeHtml(question.assumptions)}</p>` : '';
    const faster = question.fasterMethod ? `<p class="method-note"><strong>Faster method:</strong> ${escapeHtml(question.fasterMethod)}</p>` : '';
    return `
      <article class="review-card status-${escapeHtml(result.status)}">
        <div class="review-card-header"><span class="review-number">Question ${result.index + 1}</span><span class="status-label">${escapeHtml(result.status)}</span></div>
        <p class="review-question">${escapeHtml(question.prompt)}</p>
        <div class="review-facts">
          <div class="review-fact"><span>Your answer</span><strong>${escapeHtml(userAnswer)}</strong></div>
          <div class="review-fact"><span>Correct answer</span><strong>${escapeHtml(question.correctAnswer)}</strong></div>
          <div class="review-fact"><span>Response time</span><strong>${escapeHtml(responseTime)}</strong></div>
          <div class="review-fact"><span>Score change</span><strong>${escapeHtml(score)}</strong></div>
        </div>
        <p class="review-fact"><span>Internal subtype</span><strong>${escapeHtml(subtype)}</strong></p>
        <p class="explanation"><strong>${escapeHtml(question.method || 'Explanation')}:</strong> ${escapeHtml(question.explanation)}</p>
        ${assumptions}${faster}
      </article>`;
  }

  function startPractice() {
    stopTimedInterval();
    elements.body.classList.remove('timed-active');
    practiceState = { question: null, questionStart: null, intervalId: null, answered: false };
    showScreen(elements.practice);
    nextPracticeQuestion();
  }

  function nextPracticeQuestion() {
    if (!practiceState) return;
    stopPracticeInterval();
    const categories = ['mental', 'sequences', 'probability'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    let question = Q.generatePracticeQuestion(category);
    if (category === 'mental') {
      let attempts = 0;
      while (question.answerStyle === 'text' && attempts < 50) {
        question = Q.generatePracticeQuestion('mental');
        attempts += 1;
      }
    }
    practiceState.question = question;
    practiceState.questionStart = null;
    practiceState.answered = false;
    elements.practiceCategory.textContent = category === 'mental' ? 'Mental Math' : category === 'sequences' ? 'Sequences' : 'Probability & EV';
    elements.practicePrompt.textContent = question.prompt;
    elements.practiceFeedback.hidden = true;
    elements.practiceFeedback.className = 'feedback-panel';
    elements.practiceFeedback.innerHTML = '';
    elements.nextPractice.hidden = true;
    elements.practiceTimer.textContent = 'Question time: 0.0s';

    if (category === 'mental') {
      elements.practiceForm.hidden = false;
      elements.practiceOptions.hidden = true;
      elements.practiceInput.value = '';
      elements.practiceInput.disabled = false;
      elements.practiceForm.querySelector('button[type="submit"]').disabled = false;
      requestAnimationFrame(() => elements.practiceInput.focus());
    } else {
      elements.practiceForm.hidden = true;
      elements.practiceOptions.hidden = false;
      elements.practiceOptions.innerHTML = question.options.map((option, index) => `
        <button class="answer-button" type="button" data-practice-answer="${index}">
          <span class="answer-key" aria-hidden="true">${index + 1}</span>
          <span>${escapeHtml(option)}</span>
        </button>`).join('');
      const first = elements.practiceOptions.querySelector('button');
      if (first) first.focus({ preventScroll: true });
    }
    practiceState.questionStart = performance.now();
    practiceState.intervalId = window.setInterval(updatePracticeTimer, 100);
  }

  function updatePracticeTimer() {
    if (!practiceState || practiceState.answered || practiceState.questionStart == null) return;
    const elapsed = Q.elapsedMs(practiceState.questionStart, performance.now()) / 1000;
    elements.practiceTimer.textContent = `Question time: ${elapsed.toFixed(1)}s`;
  }

  function stopPracticeInterval() {
    if (practiceState && practiceState.intervalId != null) {
      window.clearInterval(practiceState.intervalId);
      practiceState.intervalId = null;
    }
  }

  function submitPracticeTyped(event) {
    event.preventDefault();
    if (!practiceState || practiceState.answered || practiceState.question.category !== 'mental') return;
    const answer = elements.practiceInput.value;
    if (!Q.parseNumericAnswer(answer)) {
      elements.practiceInput.setCustomValidity('Enter a valid integer, decimal, fraction, or percentage.');
      elements.practiceInput.reportValidity();
      return;
    }
    elements.practiceInput.setCustomValidity('');
    const correct = Q.isTypedAnswerCorrect(practiceState.question, answer);
    finishPracticeAnswer(correct, answer);
  }

  function submitPracticeChoice(index) {
    if (!practiceState || practiceState.answered || practiceState.question.category === 'mental') return;
    const question = practiceState.question;
    if (!Number.isInteger(index) || index < 0 || index >= question.options.length) return;
    finishPracticeAnswer(index === question.correctIndex, question.options[index]);
  }

  function finishPracticeAnswer(correct, userAnswer) {
    if (!practiceState || practiceState.answered) return;
    practiceState.answered = true;
    stopPracticeInterval();
    const elapsed = Q.elapsedMs(practiceState.questionStart, performance.now()) / 1000;
    const question = practiceState.question;
    elements.practiceTimer.textContent = `Question time: ${elapsed.toFixed(1)}s`;
    elements.practiceInput.disabled = true;
    const submit = elements.practiceForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setButtonsDisabled(elements.practiceOptions, true);

    const assumptions = question.assumptions ? `<p><strong>Assumptions:</strong> ${escapeHtml(question.assumptions)}</p>` : '';
    const faster = question.fasterMethod ? `<p><strong>Faster method:</strong> ${escapeHtml(question.fasterMethod)}</p>` : '';
    elements.practiceFeedback.className = `feedback-panel ${correct ? 'correct' : 'incorrect'}`;
    elements.practiceFeedback.innerHTML = `
      <p class="feedback-title">${correct ? 'Correct' : 'Incorrect'}</p>
      <p><strong>Your answer:</strong> ${escapeHtml(userAnswer)}</p>
      <p><strong>Correct answer:</strong> ${escapeHtml(question.correctAnswer)}</p>
      <p><strong>${escapeHtml(question.method || 'Explanation')}:</strong> ${escapeHtml(question.explanation)}</p>
      ${assumptions}${faster}
      <p><strong>Question time:</strong> ${elapsed.toFixed(1)}s</p>`;
    elements.practiceFeedback.hidden = false;
    elements.nextPractice.hidden = false;
    elements.practiceFeedback.focus({ preventScroll: true });
  }

  function openClearModal() {
    if (!history.length) return;
    lastFocusedBeforeModal = document.activeElement;
    elements.confirmModal.hidden = false;
    elements.confirmClear.focus();
  }

  function closeClearModal() {
    elements.confirmModal.hidden = true;
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') lastFocusedBeforeModal.focus();
  }

  document.querySelectorAll('[data-start-drill]').forEach((button) => {
    button.addEventListener('click', () => startTimedDrill(button.dataset.startDrill));
  });

  elements.brandHome.addEventListener('click', returnHome);
  elements.startPractice.addEventListener('click', startPractice);
  elements.endPractice.addEventListener('click', returnHome);
  elements.nextPractice.addEventListener('click', nextPracticeQuestion);
  elements.practiceForm.addEventListener('submit', submitPracticeTyped);

  elements.drillOptions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-answer-index]');
    if (button) answerTimedQuestion(Number(button.dataset.answerIndex));
  });
  elements.skipQuestion.addEventListener('click', skipTimedQuestion);
  elements.practiceOptions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-practice-answer]');
    if (button) submitPracticeChoice(Number(button.dataset.practiceAnswer));
  });

  document.addEventListener('keydown', (event) => {
    if (!elements.confirmModal.hidden) {
      if (event.key === 'Escape') { event.preventDefault(); closeClearModal(); }
      return;
    }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (activeSession && !activeSession.finished && !elements.drill.hidden) {
      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        answerTimedQuestion(Number(event.key) - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        skipTimedQuestion();
      }
      return;
    }
    if (practiceState && !elements.practice.hidden) {
      if (practiceState.answered && event.key === 'Enter') {
        event.preventDefault();
        nextPracticeQuestion();
        return;
      }
    
      if (
        !practiceState.answered &&
        practiceState.question.category !== 'mental' &&
        /^[1-4]$/.test(event.key)
      ) {
        event.preventDefault();
        submitPracticeChoice(Number(event.key) - 1);
      }
    }
  });

  elements.reviewMistakes.addEventListener('click', () => renderReview('mistakes'));
  elements.reviewAll.addEventListener('click', () => renderReview('all'));
  elements.repeatDrill.addEventListener('click', () => { if (currentAttempt) startTimedDrill(currentAttempt.drillType); });
  elements.resultsHome.addEventListener('click', returnHome);
  elements.reviewBack.addEventListener('click', () => { if (currentAttempt) { renderResults(currentAttempt, history.some((item) => item.id === currentAttempt.id)); showScreen(elements.results); } });

  function handleAttemptClick(event) {
    const button = event.target.closest('[data-attempt-id]');
    if (button) openSavedAttempt(button.dataset.attemptId);
  }
  elements.recentAttempts.addEventListener('click', handleAttemptClick);
  elements.previousAttempts.addEventListener('click', handleAttemptClick);

  elements.exportHistory.addEventListener('click', () => Storage.exportHistory());
  elements.clearHistory.addEventListener('click', openClearModal);
  elements.cancelClear.addEventListener('click', closeClearModal);
  elements.confirmClear.addEventListener('click', () => {
    Storage.clearHistory();
    history = [];
    closeClearModal();
    renderHome();
  });
  elements.confirmModal.addEventListener('click', (event) => { if (event.target === elements.confirmModal) closeClearModal(); });

  window.addEventListener('beforeunload', () => {
    stopTimedInterval();
    stopPracticeInterval();
  });

  window.QuantOAApp = Object.freeze({
    startTimedDrill,
    startPractice,
    returnHome,
    getHistory: () => Storage.loadHistory()
  });

  renderHome();
}());
