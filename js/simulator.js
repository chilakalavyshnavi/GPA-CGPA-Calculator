/**
 * simulator.js
 * ------------------------------------------------------------
 * "What-If" graduation CGPA predictor. Given a student's current
 * CGPA + completed credits, plus a list of hypothetical future
 * semesters (credits + expected GPA), predicts the CGPA at
 * graduation.
 * ------------------------------------------------------------
 */

const DEFAULT_SEMESTER_CREDITS = 20; // sensible default when generating rows

const Simulator = {
  state: {
    currentCgpa: 0,
    completedCredits: 0,
    futureSemesters: [] // [{ id, label, credits, gpa }]
  },

  /**
   * Builds `count` future semester rows, each defaulting to
   * DEFAULT_SEMESTER_CREDITS and the student's current CGPA
   * (a reasonable "if nothing changes" starting guess).
   */
  generateFutureSemesters(count, currentCgpa) {
    const rows = [];
    for (let i = 1; i <= count; i++) {
      rows.push({
        id: `sim_${i}_${Date.now()}`,
        label: `Semester +${i}`,
        credits: DEFAULT_SEMESTER_CREDITS,
        gpa: Calculator._round(currentCgpa, 2) || 8
      });
    }
    this.state.futureSemesters = rows;
    return rows;
  },

  updateFutureSemester(id, { credits, gpa }) {
    const row = this.state.futureSemesters.find((r) => r.id === id);
    if (!row) return null;
    if (credits !== undefined) row.credits = Number(credits);
    if (gpa !== undefined) row.gpa = Number(gpa);
    return row;
  },

  clear() {
    this.state.futureSemesters = [];
  },

  /**
   * Predicts graduation CGPA:
   *   predictedCGPA = (currentCGPA * completedCredits + Σ(futureGPA * futureCredits))
   *                   / (completedCredits + Σ futureCredits)
   */
  predictGraduationCgpa() {
    const { currentCgpa, completedCredits, futureSemesters } = this.state;

    let futureCredits = 0;
    let futureGradePoints = 0;

    for (const sem of futureSemesters) {
      futureCredits += sem.credits;
      futureGradePoints += sem.credits * sem.gpa;
    }

    const existingGradePoints = currentCgpa * completedCredits;
    const totalCredits = completedCredits + futureCredits;
    const totalGradePoints = existingGradePoints + futureGradePoints;

    const predictedCgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
    const improvement = predictedCgpa - currentCgpa;

    return {
      totalCredits: Calculator._round(totalCredits, 2),
      predictedCgpa: Calculator._round(predictedCgpa, 2),
      improvement: Calculator._round(improvement, 2)
    };
  }
};
