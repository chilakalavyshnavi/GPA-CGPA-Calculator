/**
 * calculator.js
 * ------------------------------------------------------------
 * Holds application state for the Semester GPA and CGPA views,
 * plus pure calculation functions. No DOM access happens here —
 * that separation keeps the math independently testable and
 * keeps ui.js focused purely on rendering.
 * ------------------------------------------------------------
 */

const Calculator = {
  // In-memory state (hydrated from Storage in app.js on load)
  subjects: [],   // [{ id, name, credits, grade }]
  semesters: [],  // [{ id, name, credits, gpa }]

  // ---------------- Subject (Semester GPA) operations ----------------

  /**
   * Adds a subject to the current semester's working list.
   * @returns {object} the created subject record
   */
  addSubject({ name, credits, grade }) {
    const subject = {
      id: Calculator._generateId(),
      name: name.trim(),
      credits: Number(credits),
      grade
    };
    this.subjects.push(subject);
    return subject;
  },

  updateSubject(id, { name, credits, grade }) {
    const subject = this.subjects.find((s) => s.id === id);
    if (!subject) return null;
    subject.name = name.trim();
    subject.credits = Number(credits);
    subject.grade = grade;
    return subject;
  },

  deleteSubject(id) {
    this.subjects = this.subjects.filter((s) => s.id !== id);
  },

  clearSubjects() {
    this.subjects = [];
  },

  /**
   * Computes total credits, total grade points and GPA for the
   * current subject list.
   * @returns {{ totalCredits: number, totalGradePoints: number, gpa: number }}
   */
  computeSemesterGpa() {
    let totalCredits = 0;
    let totalGradePoints = 0;

    for (const subject of this.subjects) {
      const points = GRADE_POINTS[subject.grade] ?? 0;
      totalCredits += subject.credits;
      totalGradePoints += subject.credits * points;
    }

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    return {
      totalCredits: Calculator._round(totalCredits, 2),
      totalGradePoints: Calculator._round(totalGradePoints, 2),
      gpa: Calculator._round(gpa, 2)
    };
  },

  // ---------------- Semester (CGPA) operations ----------------

  addSemester({ name, credits, gpa }) {
    const semester = {
      id: Calculator._generateId(),
      name: name.trim(),
      credits: Number(credits),
      gpa: Number(gpa)
    };
    this.semesters.push(semester);
    return semester;
  },

  updateSemester(id, { name, credits, gpa }) {
    const semester = this.semesters.find((s) => s.id === id);
    if (!semester) return null;
    semester.name = name.trim();
    semester.credits = Number(credits);
    semester.gpa = Number(gpa);
    return semester;
  },

  deleteSemester(id) {
    this.semesters = this.semesters.filter((s) => s.id !== id);
  },

  clearSemesters() {
    this.semesters = [];
  },

  /**
   * Computes overall CGPA across all saved semesters.
   * Grade points per semester = semester GPA * semester credits.
   */
  computeCgpa() {
    let totalCredits = 0;
    let totalGradePoints = 0;

    for (const semester of this.semesters) {
      totalCredits += semester.credits;
      totalGradePoints += semester.credits * semester.gpa;
    }

    const cgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    return {
      totalCredits: Calculator._round(totalCredits, 2),
      totalGradePoints: Calculator._round(totalGradePoints, 2),
      cgpa: Calculator._round(cgpa, 2)
    };
  },

  // ---------------- Utilities ----------------

  _round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  },

  _generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
};
