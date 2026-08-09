(function () {
  'use strict';

  const HISTORY_KEY = 'quantOATrainerHistory';
  const VERSION_KEY = 'quantOATrainerVersion';
  const VERSION = 2;
  const MAX_ATTEMPTS = 60;
  const DRILL_RULES = Object.freeze({
    mental: { count: 80, correct: 1, incorrect: -1 },
    sequences: { count: 20, correct: 1, incorrect: -1 / 3 },
    probability: { count: 15, correct: 1, incorrect: -1 / 3 }
  });

  function safeNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function sanitiseQuestion(question) {
    if (!question || typeof question !== 'object') return null;
    if (typeof question.prompt !== 'string' || !question.prompt.trim()) return null;
    if (typeof question.correctAnswer !== 'string' || !question.correctAnswer.trim()) return null;
    if (typeof question.explanation !== 'string' || !question.explanation.trim()) return null;
    if (typeof question.subtype !== 'string' || !question.subtype.trim()) return null;
    return question;
  }

  function sanitiseResult(result) {
    if (!result || typeof result !== 'object') return null;
    const validStatus = ['correct', 'incorrect', 'skipped', 'unanswered'];
    const question = sanitiseQuestion(result.question);
    if (!question) return null;
    const selectedIndex = result.selectedIndex == null ? null : Math.floor(safeNumber(result.selectedIndex, -1));
    return {
      index: Math.max(0, Math.floor(safeNumber(result.index, 0))),
      status: validStatus.includes(result.status) ? result.status : 'unanswered',
      userAnswer: result.userAnswer == null ? null : String(result.userAnswer),
      selectedIndex: selectedIndex != null && selectedIndex >= 0 && selectedIndex <= 3 ? selectedIndex : null,
      responseTime: Math.max(0, safeNumber(result.responseTime, 0)),
      scoreChange: 0,
      question
    };
  }

  function sanitiseAttempt(attempt) {
    if (!attempt || typeof attempt !== 'object') return null;
    const drillType = attempt.drillType;
    const rule = DRILL_RULES[drillType];
    if (!rule || !attempt.id || !attempt.date || Number.isNaN(Date.parse(String(attempt.date)))) return null;

    const results = Array.isArray(attempt.results) ? attempt.results.map(sanitiseResult).filter(Boolean) : [];
    if (results.length !== rule.count) return null;
    results.sort((a, b) => a.index - b.index);
    if (results.some((result, index) => result.index !== index)) return null;

    const counts = { correct: 0, incorrect: 0, skipped: 0, unanswered: 0 };
    let score = 0;
    results.forEach((result) => {
      counts[result.status] += 1;
      result.scoreChange = result.status === 'correct' ? rule.correct : result.status === 'incorrect' ? rule.incorrect : 0;
      score += result.scoreChange;
    });
    score = Number(score.toFixed(12));
    const attempted = counts.correct + counts.incorrect;
    const measuredTimes = results.filter((result) => result.status !== 'unanswered').map((result) => result.responseTime);
    const averageTime = measuredTimes.length ? measuredTimes.reduce((sum, value) => sum + value, 0) / measuredTimes.length : 0;

    return {
      id: String(attempt.id),
      date: String(attempt.date),
      drillType,
      questionCount: rule.count,
      duration: Math.max(0, safeNumber(attempt.duration, 0)),
      score,
      correct: counts.correct,
      incorrect: counts.incorrect,
      skipped: counts.skipped,
      unanswered: counts.unanswered,
      accuracy: attempted ? counts.correct / attempted : 0,
      completionRate: attempted / rule.count,
      averageTime,
      medianTime: median(measuredTimes),
      results
    };
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitiseAttempt).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.warn('Quant OA Trainer could not read local history.', error);
      return [];
    }
  }

  function saveHistory(history) {
    const clean = (Array.isArray(history) ? history : []).map(sanitiseAttempt).filter(Boolean).slice(0, MAX_ATTEMPTS);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(clean));
      localStorage.setItem(VERSION_KEY, String(VERSION));
      return true;
    } catch (initialError) {
      // If the browser quota is full, retain as many recent attempts as fit instead of losing the newest attempt.
      for (let length = clean.length - 1; length >= 1; length -= 1) {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(clean.slice(0, length)));
          localStorage.setItem(VERSION_KEY, String(VERSION));
          console.warn(`Quant OA Trainer retained the ${length} most recent attempts because local storage was full.`);
          return true;
        } catch (_) { /* keep reducing */ }
      }
      console.warn('Quant OA Trainer could not save local history.', initialError);
      return false;
    }
  }

  function addAttempt(attempt) {
    const cleanAttempt = sanitiseAttempt(attempt);
    if (!cleanAttempt) return false;
    const history = loadHistory().filter((item) => item.id !== cleanAttempt.id);
    history.unshift(cleanAttempt);
    return saveHistory(history);
  }

  function clearHistory() {
    try {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.setItem(VERSION_KEY, String(VERSION));
      return true;
    } catch (error) {
      console.warn('Quant OA Trainer could not clear local history.', error);
      return false;
    }
  }

  function exportHistory() {
    const history = loadHistory();
    const payload = {
      app: 'Quant OA Trainer',
      version: VERSION,
      exportedAt: new Date().toISOString(),
      attempts: history
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `quant-oa-trainer-history-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  window.QuantStorage = {
    HISTORY_KEY,
    VERSION_KEY,
    VERSION,
    loadHistory,
    saveHistory,
    addAttempt,
    clearHistory,
    exportHistory,
    sanitiseAttempt
  };
}());
