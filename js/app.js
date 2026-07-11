/**
 * app.js
 * ------------------------------------------------------------
 * Application entry point. Wires DOM events to the Calculator /
 * Simulator / ExportManager / UI modules, hydrates state from
 * Storage on load, and persists state after every mutation.
 * Loaded last (after every other script) so all globals exist.
 * ------------------------------------------------------------
 */

(function App() {

  // ---------------- Persistence helpers ----------------

  function persistSubjects() {
    Storage.set(STORAGE_KEYS.SUBJECTS, Calculator.subjects);
  }

  function persistSemesters() {
    Storage.set(STORAGE_KEYS.SEMESTERS, Calculator.semesters);
  }

  function persistSimulator() {
    Storage.set(STORAGE_KEYS.SIMULATOR, Simulator.state);
  }

  function hydrateFromStorage() {
    Calculator.subjects = Storage.get(STORAGE_KEYS.SUBJECTS, []);
    Calculator.semesters = Storage.get(STORAGE_KEYS.SEMESTERS, []);
    const savedSim = Storage.get(STORAGE_KEYS.SIMULATOR, null);
    if (savedSim) Simulator.state = savedSim;

    const savedTheme = Storage.get(STORAGE_KEYS.THEME, null);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    UI.applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);
  }

  // ---------------- Semester GPA tab ----------------

  function onAddSubjectClick() {
    if (UI.editingSubjectId !== null) return; // one row edited at a time
    UI.editingSubjectId = 'new';
    UI.renderSubjectsTable();
    focusFirstInput('#subjectsTbody tr.new-row');
  }

  function onSubjectsTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr');
    const id = row.dataset.id;
    const action = btn.dataset.action;

    if (action === 'edit-subject') {
      UI.editingSubjectId = id;
      UI.renderSubjectsTable();
      focusFirstInput(`#subjectsTbody tr[data-id="${id}"]`);
    } else if (action === 'cancel-edit-subject') {
      UI.editingSubjectId = null;
      UI.renderSubjectsTable();
    } else if (action === 'save-subject') {
      saveSubjectRow(row, id);
    } else if (action === 'delete-subject') {
      deleteSubject(id);
    }
  }

  function saveSubjectRow(row, id) {
    const nameInput = row.querySelector('.edit-name-input');
    const creditsInput = row.querySelector('.edit-credits-input');
    const gradeInput = row.querySelector('.edit-grade-input');

    const nameError = Validation.validateSubjectName(nameInput.value);
    const creditsError = Validation.validateCredits(creditsInput.value);
    const gradeError = Validation.validateGrade(gradeInput.value);

    UI.setFieldError(nameInput, nameError);
    UI.setFieldError(creditsInput, creditsError);
    UI.setFieldError(gradeInput, gradeError);

    const firstError = nameError || creditsError || gradeError;
    if (firstError) {
      UI.showToast(firstError, 'error');
      return;
    }

    const payload = { name: nameInput.value, credits: creditsInput.value, grade: gradeInput.value };

    if (id === 'new') {
      Calculator.addSubject(payload);
      UI.showToast('Subject added.', 'success');
    } else {
      Calculator.updateSubject(id, payload);
      UI.showToast('Subject updated.', 'success');
    }

    UI.editingSubjectId = null;
    persistSubjects();
    UI.renderSubjectsTable();
  }

  async function deleteSubject(id) {
    const confirmed = await UI.confirm('This subject will be permanently removed from this semester.', 'Delete subject?');
    if (!confirmed) return;
    Calculator.deleteSubject(id);
    persistSubjects();
    UI.renderSubjectsTable();
    UI.showToast('Subject deleted.', 'info');
  }

  async function onClearSemesterClick() {
    if (Calculator.subjects.length === 0) {
      UI.showToast('There is nothing to clear.', 'info');
      return;
    }
    const confirmed = await UI.confirm('All subjects in the current semester will be removed.', 'Clear semester?');
    if (!confirmed) return;
    Calculator.clearSubjects();
    UI.editingSubjectId = null;
    persistSubjects();
    UI.renderSubjectsTable();
    UI.showToast('Semester cleared.', 'info');
  }

  function onSaveSemesterClick() {
    const nameInput = document.getElementById('semesterNameInput');
    const { totalCredits, gpa } = Calculator.computeSemesterGpa();

    const nameError = Validation.validateSemesterName(nameInput.value);
    UI.setFieldError(nameInput, nameError);
    if (nameError) { UI.showToast(nameError, 'error'); return; }

    if (Calculator.subjects.length === 0) {
      UI.showToast('Add at least one subject before saving the semester.', 'error');
      return;
    }

    const savedName = nameInput.value.trim();
    Calculator.addSemester({ name: savedName, credits: totalCredits, gpa });
    persistSemesters();
    UI.renderSemestersTable();
    nameInput.value = '';
    UI.showToast(`"${savedName}" saved to your CGPA tracker.`, 'success');
  }

  // ---------------- CGPA tab ----------------

  function onSemestersTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr');
    const id = row.dataset.id;
    const action = btn.dataset.action;

    if (action === 'edit-semester') {
      UI.editingSemesterId = id;
      UI.renderSemestersTable();
      focusFirstInput(`#semestersTbody tr[data-id="${id}"]`);
    } else if (action === 'cancel-edit-semester') {
      UI.editingSemesterId = null;
      UI.renderSemestersTable();
    } else if (action === 'save-semester') {
      saveSemesterRow(row, id);
    } else if (action === 'delete-semester') {
      deleteSemester(id);
    }
  }

  function saveSemesterRow(row, id) {
    const nameInput = row.querySelector('.edit-sem-name-input');
    const creditsInput = row.querySelector('.edit-sem-credits-input');
    const gpaInput = row.querySelector('.edit-sem-gpa-input');

    const nameError = Validation.validateSemesterName(nameInput.value);
    const creditsError = Validation.validateCredits(creditsInput.value);
    const gpaError = Validation.validateGpaValue(gpaInput.value);

    UI.setFieldError(nameInput, nameError);
    UI.setFieldError(creditsInput, creditsError);
    UI.setFieldError(gpaInput, gpaError);

    const firstError = nameError || creditsError || gpaError;
    if (firstError) { UI.showToast(firstError, 'error'); return; }

    Calculator.updateSemester(id, { name: nameInput.value, credits: creditsInput.value, gpa: gpaInput.value });
    UI.editingSemesterId = null;
    persistSemesters();
    UI.renderSemestersTable();
    UI.showToast('Semester updated.', 'success');
  }

  async function deleteSemester(id) {
    const confirmed = await UI.confirm('This semester will be removed from your CGPA calculation.', 'Delete semester?');
    if (!confirmed) return;
    Calculator.deleteSemester(id);
    persistSemesters();
    UI.renderSemestersTable();
    UI.showToast('Semester deleted.', 'info');
  }

  async function onClearCgpaClick() {
    if (Calculator.semesters.length === 0) {
      UI.showToast('There is nothing to clear.', 'info');
      return;
    }
    const confirmed = await UI.confirm('All saved semesters will be permanently removed.', 'Clear all semesters?');
    if (!confirmed) return;
    Calculator.clearSemesters();
    UI.editingSemesterId = null;
    persistSemesters();
    UI.renderSemestersTable();
    UI.showToast('All semesters cleared.', 'info');
  }

  // ---------------- What-If simulator tab ----------------

  function onGenerateSemestersClick() {
    const cgpaInput = document.getElementById('simCurrentCgpa');
    const creditsInput = document.getElementById('simCompletedCredits');
    const semestersInput = document.getElementById('simRemainingSemesters');

    const cgpaError = Validation.validateGpaValue(cgpaInput.value);
    const creditsError = Validation.validateCredits(creditsInput.value);
    const countError = Validation.validatePositiveInteger(semestersInput.value, 'Remaining semesters');

    UI.setFieldError(cgpaInput, cgpaError);
    UI.setFieldError(creditsInput, creditsError);
    UI.setFieldError(semestersInput, countError);

    const firstError = cgpaError || creditsError || countError;
    if (firstError) { UI.showToast(firstError, 'error'); return; }

    Simulator.state.currentCgpa = Number(cgpaInput.value);
    Simulator.state.completedCredits = Number(creditsInput.value);
    Simulator.generateFutureSemesters(Number(semestersInput.value), Simulator.state.currentCgpa);

    persistSimulator();
    UI.renderSimulatorTable();
    UI.showToast('Simulation rows generated — edit them below to explore scenarios.', 'success');
  }

  // Live-updates as the user edits any future-semester row (event delegation)
  function onSimTableInput(e) {
    const input = e.target;
    const row = input.closest('tr');
    if (!row) return;
    const id = row.dataset.id;

    if (input.classList.contains('sim-credits-input')) {
      const error = Validation.validateCredits(input.value);
      UI.setFieldError(input, error);
      if (!error) Simulator.updateFutureSemester(id, { credits: input.value });
    }
    if (input.classList.contains('sim-gpa-input')) {
      const error = Validation.validateGpaValue(input.value);
      UI.setFieldError(input, error);
      if (!error) Simulator.updateFutureSemester(id, { gpa: input.value });
    }

    persistSimulator();
    UI.updateSimulatorStats();
  }

  // ---------------- Global controls ----------------

  function onThemeToggleClick() {
    const isDark = !document.body.classList.contains('dark-theme');
    UI.applyTheme(isDark);
  }

  function onNavTabClick(e) {
    const tab = e.target.closest('.nav-tab');
    if (!tab) return;
    UI.switchView(tab.dataset.target);
  }

  function onHamburgerClick() {
    document.getElementById('mobileDrawer').classList.toggle('open');
  }

  function focusFirstInput(containerSelector) {
    setTimeout(() => {
      const el = document.querySelector(`${containerSelector} input, ${containerSelector} select`);
      if (el) el.focus();
    }, 30);
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + D -> toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onThemeToggleClick();
      }
      // Escape -> cancel any inline edit / close dialogs
      if (e.key === 'Escape') {
        if (document.getElementById('confirmDialogOverlay').classList.contains('visible')) {
          UI._closeConfirm(false);
        } else if (UI.editingSubjectId !== null) {
          UI.editingSubjectId = null;
          UI.renderSubjectsTable();
        } else if (UI.editingSemesterId !== null) {
          UI.editingSemesterId = null;
          UI.renderSemestersTable();
        }
      }
    });
  }

  // ---------------- Event wiring ----------------

  function bindEvents() {
    document.getElementById('addSubjectBtn').addEventListener('click', onAddSubjectClick);
    document.getElementById('subjectsTbody').addEventListener('click', onSubjectsTableClick);
    document.getElementById('clearSemesterBtn').addEventListener('click', onClearSemesterClick);
    document.getElementById('saveSemesterBtn').addEventListener('click', onSaveSemesterClick);

    document.getElementById('semestersTbody').addEventListener('click', onSemestersTableClick);
    document.getElementById('clearCgpaBtn').addEventListener('click', onClearCgpaClick);

    document.getElementById('generateSemestersBtn').addEventListener('click', onGenerateSemestersClick);
    document.getElementById('simSemestersTbody').addEventListener('input', onSimTableInput);

    document.getElementById('exportPdfBtn').addEventListener('click', () => ExportManager.exportPdf());
    document.getElementById('printBtn').addEventListener('click', () => ExportManager.printReport());
    document.getElementById('exportJsonBtn').addEventListener('click', () => ExportManager.exportJson());
    document.getElementById('importJsonInput').addEventListener('change', (e) => {
      ExportManager.importJson(e.target.files[0], () => {
        UI.renderSubjectsTable();
        UI.renderSemestersTable();
        UI.renderSimulatorTable();
      });
      e.target.value = ''; // allow re-importing the same file later
    });

    document.getElementById('themeToggle').addEventListener('click', onThemeToggleClick);
    document.getElementById('hamburgerBtn').addEventListener('click', onHamburgerClick);
    document.getElementById('navbarTabs').addEventListener('click', onNavTabClick);
    document.getElementById('mobileDrawer').addEventListener('click', onNavTabClick);

    document.getElementById('confirmDialogOk').addEventListener('click', () => UI._closeConfirm(true));
    document.getElementById('confirmDialogCancel').addEventListener('click', () => UI._closeConfirm(false));
    document.getElementById('confirmDialogOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'confirmDialogOverlay') UI._closeConfirm(false);
    });

    setupKeyboardShortcuts();
  }

  // ---------------- Boot ----------------

  function init() {
    hydrateFromStorage();
    bindEvents();

    UI.renderSubjectsTable();
    UI.renderSemestersTable();

    // Repopulate simulator inputs if a previous session left data
    if (Simulator.state.currentCgpa) {
      document.getElementById('simCurrentCgpa').value = Simulator.state.currentCgpa;
    }
    if (Simulator.state.completedCredits) {
      document.getElementById('simCompletedCredits').value = Simulator.state.completedCredits;
    }
    UI.renderSimulatorTable();

    // Hide the loader once everything has rendered
    setTimeout(() => document.getElementById('loader').classList.add('hidden'), 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
