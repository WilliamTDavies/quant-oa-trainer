# Quant OA Trainer

A lightweight, browser-based training tool for practising **mental math, numerical sequences, probability, and expected value under time pressure**.

Quant OA Trainer is designed as a focused personal training tool rather than a course, commercial platform, or imitation of any named firm's current assessment.

**No installation. No backend. No account. No dependencies.**

## Live Demo

**[Open Quant OA Trainer](https://williamtdavies.github.io/quant-oa-trainer/)**

The application runs entirely in the browser and stores attempt history locally using `localStorage`.

## Training Modes

| Mode                       | Questions | Time Limit | Scoring                  |
| -------------------------- | --------: | ---------: | ------------------------ |
| **80 in 8 Mental Math**    |        80 |  8 minutes | +1 correct, −1 incorrect |
| **Timed Sequences**        |        20 | 10 minutes | +1 correct, −1 incorrect |
| **Timed Probability & EV** |        15 | 15 minutes | +1 correct, −1 incorrect |
| **Untimed Mixed Practice** | Unlimited |       None | No score                 |

### 80 in 8 Mental Math

Fast arithmetic and quantitative calculations designed to be completed under significant time pressure.

### Timed Sequences

Procedural numerical-sequence questions requiring pattern recognition and rapid calculation.

### Timed Probability & EV

Structured probability and expected-value problems covering a range of quantitative reasoning patterns.

### Untimed Mixed Practice

Unlimited practice drawn equally from the three main categories, with immediate feedback and no time pressure.

## Features

### Practice & Questions

* Procedural question generation
* Validation of generated questions before display
* Four-option multiple choice for timed drills
* Typed answers for untimed mental-math practice
* Multiple question subtypes within each major category
* Mistake review and full-question review

### Timing & Controls

* Timestamp-based overall countdown timers
* Per-question response-time tracking
* Delayed feedback during timed drills
* Immediate feedback during untimed practice
* Keyboard-first controls:

  * `1`–`4` — select an answer
  * `Escape` — skip a question

### Scoring & Analytics

* Drill-specific negative marking
* Accuracy and completion-rate calculations
* Average and median response times
* Internal subtype performance breakdowns
* Recent attempts
* Latest and best scores
* Persistent local attempt history

### Data

* Attempt history stored in browser `localStorage`
* JSON history export
* No account or server-side database
* No external API
* No analytics service
* No runtime AI question generation

## Quick Start

Quant OA Trainer is a static web application with no installation or build step.

Clone the repository:

```bash
git clone REPOSITORY_URL
cd quant-oa-trainer
```

Then open `index.html` in a modern browser.

The application uses ordinary deferred `<script>` tags rather than JavaScript modules, so it can be opened directly from the local filesystem without a development server.

## Technology

The application is intentionally dependency-free:

* **HTML** — application structure
* **CSS** — styling and responsive layout
* **Vanilla JavaScript** — question generation, timing, scoring, and UI logic
* **`localStorage`** — local attempt persistence

There is currently no:

* Backend
* Database
* Account/authentication system
* Package manager
* Build process
* External API
* Analytics service
* Runtime AI generation

## Data & Privacy

Attempt history is stored locally in the browser using `localStorage`.

The application itself does not send attempt data to a backend or require an account. Clearing the browser's site data may remove saved history.

When history is exported as JSON, the resulting file remains under the user's control unless it is subsequently moved, shared, or uploaded elsewhere.

## Development & Validation

Question generation includes validation before generated questions are presented to the user.

Development validation can also be run from the browser console.

If you are contributing to the project, test the main flows across:

* Timed and untimed modes
* Correct and incorrect answers
* Skipped questions
* Timer expiration
* Page refresh/reload behaviour
* Local history persistence
* History export
* Desktop and mobile layouts
* Keyboard controls

## Project Philosophy

Quant OA Trainer intentionally keeps the implementation small and dependency-free.

The goal is to provide a fast feedback loop for repeated quantitative practice without requiring accounts, servers, subscriptions, or a large application framework.

## Disclaimer

Quant OA Trainer is an **independent practice tool**.

It is not affiliated with, endorsed by, or intended to reproduce the current assessment of any quantitative trading firm, bank, recruitment platform, or assessment provider.

## Licence

MIT. See [`LICENSE`](LICENSE).
