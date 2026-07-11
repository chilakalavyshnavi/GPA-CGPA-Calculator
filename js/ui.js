/**
 * ui.js
 * ------------------------------------------------------------
 * All DOM interaction lives here: rendering tables/stats,
 * toast notifications, the confirm dialog, tab switching and
 * dark-mode. calculator.js / simulator.js stay DOM-free so the
 * math can be reasoned about (and tested) independently.
 * ------------------------------------------------------------
 */

const UI = {
  _confirmResolve: null,

  // Tracks which row (if any) is currently in "editable input" mode.
  // Value is a subject/semester id, or the string 'new' for a
  // not-yet-saved row, or null when no row is being edited.
  editingSubjectId: null,
  editingSemesterId: null,

  // ================= Toasts =================

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${UI._escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  // ================= Confirm dialog =================

  /**
   * Shows a confirm dialog and resolves a Promise<boolean> based
   * on the user's choice. Usage: `if (await UI.confirm('Delete?')) { ... }`
   */
  confirm(message, title = 'Are you sure?') {
    const overlay = document.getElementById('confirmDialogOverlay');
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    overlay.classList.add('visible');

    return new Promise((resolve) => {
      UI._confirmResolve = resolve;
    });
  },

  _closeConfirm(result) {
    document.getElementById('confirmDialogOverlay').classList.remove('visible');
    if (UI._confirmResolve) {
      UI._confirmResolve(result);
      UI._confirmResolve = null;
    }
  },

  // ================= Tabs / navigation =================

  switchView(targetId) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === targetId));
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      const isActive = tab.dataset.target === targetId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    document.getElementById('mobileDrawer').classList.remove('open');
  },

  // ================= Dark mode =================

  applyTheme(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
    const icon = document.querySelector('#themeToggle i');
    icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    Storage.set(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  },

  // ================= Grade <select> builder =================

  buildGradeOptions(selectedGrade = '') {
    let html = '<option value="" disabled' + (selectedGrade ? '' : ' selected') + '>Grade</option>';
    GRADE_ORDER.forEach((g) => {
      html += `<option value="${g}" ${g === selectedGrade ? 'selected' : ''}>${g} (${GRADE_POINTS[g]})</option>`;
    });
    return html;
  },

  // ================= Semester GPA table =================

  renderSubjectsTable() {
    const tbody = document.getElementById('subjectsTbody');
    const emptyState = document.getElementById('subjectsEmptyState');
    tbody.innerHTML = '';

    const hasRows = Calculator.subjects.length > 0 || UI.editingSubjectId === 'new';
    emptyState.classList.toggle('visible', !hasRows);

    Calculator.subjects.forEach((subject, index) => {
      const isEditing = UI.editingSubjectId === subject.id;
      const tr = document.createElement('tr');
      tr.dataset.id = subject.id;

      if (isEditing) {
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" class="edit-name-input" value="${UI._escapeHtml(subject.name)}" placeholder="Subject name" /></td>
          <td><input type="number" class="edit-credits-input" min="0.5" step="0.5" value="${subject.credits}" /></td>
          <td><select class="edit-grade-input">${UI.buildGradeOptions(subject.grade)}</select></td>
          <td>&mdash;</td>
          <td>
            <div class="row-actions">
              <button class="btn-icon-only edit-btn" data-action="save-subject" title="Save"><i class="fa-solid fa-check"></i></button>
              <button class="btn-icon-only" data-action="cancel-edit-subject" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </td>
        `;
      } else {
        const points = GRADE_POINTS[subject.grade] ?? 0;
        const gradePointsForRow = (points * subject.credits).toFixed(2);
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${UI._escapeHtml(subject.name)}</td>
          <td>${subject.credits}</td>
          <td><span class="grade-badge">${subject.grade}</span></td>
          <td>${gradePointsForRow}</td>
          <td>
            <div class="row-actions">
              <button class="btn-icon-only edit-btn" data-action="edit-subject" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon-only" data-action="delete-subject" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
      }
      tbody.appendChild(tr);
    });

    if (UI.editingSubjectId === 'new') {
      const tr = document.createElement('tr');
      tr.dataset.id = 'new';
      tr.classList.add('new-row');
      tr.innerHTML = `
        <td>${Calculator.subjects.length + 1}</td>
        <td><input type="text" class="edit-name-input" placeholder="e.g. Data Structures" /></td>
        <td><input type="number" class="edit-credits-input" min="0.5" step="0.5" placeholder="e.g. 4" /></td>
        <td><select class="edit-grade-input">${UI.buildGradeOptions()}</select></td>
        <td>&mdash;</td>
        <td>
          <div class="row-actions">
            <button class="btn-icon-only edit-btn" data-action="save-subject" title="Save"><i class="fa-solid fa-check"></i></button>
            <button class="btn-icon-only" data-action="cancel-edit-subject" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    UI.updateSemesterStats();
  },

  updateSemesterStats() {
    const { totalCredits, totalGradePoints, gpa } = Calculator.computeSemesterGpa();
    document.getElementById('totalCreditsStat').textContent = totalCredits;
    document.getElementById('totalGradePointsStat').textContent = totalGradePoints.toFixed(2);
    document.getElementById('semesterGpaStat').textContent = gpa.toFixed(2);
  },

  // ================= CGPA table =================

  renderSemestersTable() {
    const tbody = document.getElementById('semestersTbody');
    const emptyState = document.getElementById('semestersEmptyState');
    tbody.innerHTML = '';

    emptyState.classList.toggle('visible', Calculator.semesters.length === 0);

    Calculator.semesters.forEach((sem, index) => {
      const isEditing = UI.editingSemesterId === sem.id;
      const tr = document.createElement('tr');
      tr.dataset.id = sem.id;

      if (isEditing) {
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" class="edit-sem-name-input" value="${UI._escapeHtml(sem.name)}" /></td>
          <td><input type="number" class="edit-sem-credits-input" min="0.5" step="0.5" value="${sem.credits}" /></td>
          <td><input type="number" class="edit-sem-gpa-input" min="0" max="${MAX_CGPA_SCALE}" step="0.01" value="${sem.gpa}" /></td>
          <td>&mdash;</td>
          <td>
            <div class="row-actions">
              <button class="btn-icon-only edit-btn" data-action="save-semester" title="Save"><i class="fa-solid fa-check"></i></button>
              <button class="btn-icon-only" data-action="cancel-edit-semester" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </td>
        `;
      } else {
        const gradePoints = (sem.gpa * sem.credits).toFixed(2);
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${UI._escapeHtml(sem.name)}</td>
          <td>${sem.credits}</td>
          <td>${sem.gpa.toFixed(2)}</td>
          <td>${gradePoints}</td>
          <td>
            <div class="row-actions">
              <button class="btn-icon-only edit-btn" data-action="edit-semester" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon-only" data-action="delete-semester" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
      }
      tbody.appendChild(tr);
    });

    UI.updateCgpaStats();
  },

  updateCgpaStats() {
    const { totalCredits, totalGradePoints, cgpa } = Calculator.computeCgpa();
    document.getElementById('cgpaTotalCreditsStat').textContent = totalCredits;
    document.getElementById('cgpaTotalGradePointsStat').textContent = totalGradePoints.toFixed(2);
    document.getElementById('overallCgpaStat').textContent = cgpa.toFixed(2);
  },

  // ================= What-If simulator table =================

  renderSimulatorTable() {
    const tbody = document.getElementById('simSemestersTbody');
    const emptyState = document.getElementById('simEmptyState');
    tbody.innerHTML = '';

    if (Simulator.state.futureSemesters.length === 0) {
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
    }

    Simulator.state.futureSemesters.forEach((row) => {
      const tr = document.createElement('tr');
      tr.dataset.id = row.id;
      tr.innerHTML = `
        <td>${UI._escapeHtml(row.label)}</td>
        <td><input type="number" min="1" step="0.5" class="sim-credits-input" value="${row.credits}" /></td>
        <td><input type="number" min="0" max="${MAX_CGPA_SCALE}" step="0.01" class="sim-gpa-input" value="${row.gpa}" /></td>
      `;
      tbody.appendChild(tr);
    });

    UI.updateSimulatorStats();
  },

  updateSimulatorStats() {
    const { totalCredits, predictedCgpa, improvement } = Simulator.predictGraduationCgpa();
    document.getElementById('simTotalCreditsStat').textContent = totalCredits;
    document.getElementById('simPredictedCgpaStat').textContent = predictedCgpa.toFixed(2);

    const improvementEl = document.getElementById('simImprovementStat');
    const sign = improvement > 0 ? '+' : '';
    improvementEl.textContent = `${sign}${improvement.toFixed(2)}`;

    const card = document.getElementById('simImprovementCard');
    card.classList.remove('positive', 'negative');
    if (improvement > 0) card.classList.add('positive');
    if (improvement < 0) card.classList.add('negative');
  },

  // ================= Helpers =================

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  setFieldError(inputEl, message) {
    if (message) {
      inputEl.classList.add('input-error');
      inputEl.title = message;
    } else {
      inputEl.classList.remove('input-error');
      inputEl.title = '';
    }
  }
};
