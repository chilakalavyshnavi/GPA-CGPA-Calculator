/**
 * validation.js
 * ------------------------------------------------------------
 * Central place for:
 *   1. The grade -> grade-point mapping (change it here ONLY,
 *      everything else in the app reads from this constant).
 *   2. Reusable validation helpers used by calculator.js,
 *      simulator.js and ui.js.
 * ------------------------------------------------------------
 */

// Single source of truth for grade points. Edit this object to
// support a different grading scale (e.g. 4.0 scale) without
// touching any other file.
const GRADE_POINTS = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'P': 4,
  'F': 0
};

// Ordered list of grade keys, used to populate <select> dropdowns
// in the exact order we want them displayed.
const GRADE_ORDER = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'];

const MAX_CGPA_SCALE = 10; // Used for simulator bounds/sanity checks

const Validation = {
  /**
   * Validates a subject name.
   * @param {string} name
   * @returns {string|null} error message, or null if valid
   */
  validateSubjectName(name) {
    if (!name || !name.trim()) return 'Subject name is required.';
    if (name.trim().length > 60) return 'Subject name is too long (max 60 characters).';
    return null;
  },

  /**
   * Validates a credit value (subject credits or semester credits).
   * @param {string|number} credits
   * @returns {string|null}
   */
  validateCredits(credits) {
    if (credits === '' || credits === null || credits === undefined) {
      return 'Credits are required.';
    }
    const num = Number(credits);
    if (Number.isNaN(num)) return 'Credits must be a number.';
    if (num <= 0) return 'Credits must be greater than 0.';
    if (num > 30) return 'Credits seem unrealistically high (max 30).';
    return null;
  },

  /**
   * Validates a grade key against the GRADE_POINTS map.
   * @param {string} grade
   * @returns {string|null}
   */
  validateGrade(grade) {
    if (!grade) return 'Please select a grade.';
    if (!(grade in GRADE_POINTS)) return 'Invalid grade selected.';
    return null;
  },

  /**
   * Validates a raw GPA/CGPA value (0 - 10 scale by default).
   * @param {string|number} gpa
   * @returns {string|null}
   */
  validateGpaValue(gpa) {
    if (gpa === '' || gpa === null || gpa === undefined) return 'GPA is required.';
    const num = Number(gpa);
    if (Number.isNaN(num)) return 'GPA must be a number.';
    if (num < 0 || num > MAX_CGPA_SCALE) return `GPA must be between 0 and ${MAX_CGPA_SCALE}.`;
    return null;
  },

  /**
   * Validates a semester name (non-empty, reasonable length).
   * @param {string} name
   * @returns {string|null}
   */
  validateSemesterName(name) {
    if (!name || !name.trim()) return 'Semester name is required.';
    if (name.trim().length > 40) return 'Semester name is too long (max 40 characters).';
    return null;
  },

  /**
   * Validates a positive integer count (e.g. remaining semesters).
   * @param {string|number} value
   * @returns {string|null}
   */
  validatePositiveInteger(value, label = 'Value') {
    if (value === '' || value === null || value === undefined) return `${label} is required.`;
    const num = Number(value);
    if (!Number.isInteger(num)) return `${label} must be a whole number.`;
    if (num <= 0) return `${label} must be greater than 0.`;
    return null;
  }
};
