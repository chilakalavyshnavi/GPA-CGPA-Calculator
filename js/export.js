/**
 * export.js
 * ------------------------------------------------------------
 * Handles everything that leaves the app: PDF export (jsPDF,
 * loaded via CDN in index.html), the browser Print dialog, and
 * JSON backup/restore of the full app state.
 * ------------------------------------------------------------
 */

const ExportManager = {
  /**
   * Builds a simple, readable PDF report of semesters + CGPA
   * using jsPDF's autoTable-free manual layout (keeps us to a
   * single CDN dependency).
   */
  exportPdf() {
    if (!window.jspdf) {
      UI.showToast('PDF library failed to load. Check your internet connection.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { totalCredits, totalGradePoints, cgpa } = Calculator.computeCgpa();

    let y = 20;
    doc.setFontSize(18);
    doc.text('GPA / CGPA Report', 14, y);

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, y);
    doc.setTextColor(0);

    y += 12;
    doc.setFontSize(13);
    doc.text('Semesters', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text('Semester', 14, y);
    doc.text('Credits', 100, y);
    doc.text('GPA', 140, y);
    y += 2;
    doc.line(14, y, 196, y);
    y += 6;

    if (Calculator.semesters.length === 0) {
      doc.text('No semesters saved.', 14, y);
      y += 8;
    } else {
      Calculator.semesters.forEach((sem) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(String(sem.name), 14, y);
        doc.text(String(sem.credits), 100, y);
        doc.text(String(sem.gpa.toFixed(2)), 140, y);
        y += 7;
      });
    }

    y += 6;
    doc.line(14, y, 196, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Total Credits: ${totalCredits}`, 14, y); y += 7;
    doc.text(`Total Grade Points: ${totalGradePoints}`, 14, y); y += 7;
    doc.setFontSize(14);
    doc.text(`Overall CGPA: ${cgpa.toFixed(2)}`, 14, y);

    doc.save(`GPA-Report-${Date.now()}.pdf`);
    UI.showToast('PDF exported successfully.', 'success');
  },

  /** Opens the native browser print dialog for the current page. */
  printReport() {
    window.print();
  },

  /**
   * Serializes the full app state (subjects, semesters, simulator)
   * to a downloadable JSON file.
   */
  exportJson() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: Calculator.subjects,
      semesters: Calculator.semesters,
      simulator: Simulator.state
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gpa-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    UI.showToast('Backup JSON downloaded.', 'success');
  },

  /**
   * Reads a user-selected JSON file and restores app state from it.
   * @param {File} file
   * @param {Function} onComplete callback fired after successful import
   */
  importJson(file, onComplete) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!data || typeof data !== 'object') throw new Error('Invalid backup file.');

        Calculator.subjects = Array.isArray(data.subjects) ? data.subjects : [];
        Calculator.semesters = Array.isArray(data.semesters) ? data.semesters : [];
        if (data.simulator) {
          Simulator.state.currentCgpa = data.simulator.currentCgpa || 0;
          Simulator.state.completedCredits = data.simulator.completedCredits || 0;
          Simulator.state.futureSemesters = Array.isArray(data.simulator.futureSemesters)
            ? data.simulator.futureSemesters
            : [];
        }

        Storage.set(STORAGE_KEYS.SUBJECTS, Calculator.subjects);
        Storage.set(STORAGE_KEYS.SEMESTERS, Calculator.semesters);
        Storage.set(STORAGE_KEYS.SIMULATOR, Simulator.state);

        UI.showToast('Backup imported successfully.', 'success');
        if (typeof onComplete === 'function') onComplete();
      } catch (err) {
        console.error('Import failed:', err);
        UI.showToast('Import failed: invalid JSON backup file.', 'error');
      }
    };
    reader.onerror = () => UI.showToast('Could not read the selected file.', 'error');
    reader.readAsText(file);
  }
};
