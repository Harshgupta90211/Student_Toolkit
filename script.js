/**
 * ==============================================================================
 * STUDENT TOOLKIT - CORE SCRIPT ENGINE
 * Modular, Clean Architecture, React-Ready, Zero Alert() Calls
 * ==============================================================================
 */

'use strict';

/* --------------------------------------------------------------------------
   1. STORAGE SERVICE (LOCAL STORAGE WITH SAFE FALLBACKS)
   -------------------------------------------------------------------------- */
const StorageService = {
  KEYS: {
    THEME: 'student_toolkit_theme',
    NOTES: 'student_toolkit_notes',
    BACKLOGS: 'student_toolkit_backlogs',
    CGPA: 'student_toolkit_cgpa_record'
  },

  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (err) {
      console.warn(`[StorageService] Failed to read "${key}" from localStorage:`, err);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[StorageService] Failed to write "${key}" to localStorage:`, err);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[StorageService] Failed to remove "${key}" from localStorage:`, err);
      return false;
    }
  }
};

/* --------------------------------------------------------------------------
   2. TOAST NOTIFICATION SERVICE (REPLACES BROWSER ALERT)
   -------------------------------------------------------------------------- */
const ToastService = {
  container: null,

  init() {
    this.container = document.getElementById('toastStack');
  },

  show(message, type = 'info', duration = 3200) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon according to type
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <span class="toast-icon" style="flex-shrink:0;">${iconSvg}</span>
      <span class="toast-text">${this.escapeHtml(message)}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 4200); },
  info(msg) { this.show(msg, 'info'); },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

/* --------------------------------------------------------------------------
   3. THEME MANAGER (DARK-FIRST DEFAULT, LIGHT THEME PERSISTENCE)
   -------------------------------------------------------------------------- */
const ThemeManager = {
  currentTheme: 'dark',

  init() {
    const savedTheme = StorageService.get(StorageService.KEYS.THEME, null);
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Dark mode is default per design specification
      this.currentTheme = 'dark';
    }

    this.applyTheme(this.currentTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTheme());
    }
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    StorageService.set(StorageService.KEYS.THEME, theme);
  },

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    ToastService.info(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} theme`);
  }
};

/* --------------------------------------------------------------------------
   4. TIME & CLOCK SERVICE (HEADER LIVE TICKER)
   -------------------------------------------------------------------------- */
const TimeService = {
  element: null,

  init() {
    this.element = document.getElementById('liveTimeText');
    if (!this.element) return;
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  },

  updateClock() {
    const now = new Date();
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    this.element.textContent = now.toLocaleDateString(undefined, options);
  }
};

/* --------------------------------------------------------------------------
   5. NAVIGATION CONTROLLER (SIDEBAR, DRAWER, TAB SWITCHING)
   -------------------------------------------------------------------------- */
const Navigation = {
  activeView: 'dashboard',
  sidebar: null,
  backdrop: null,

  init() {
    this.sidebar = document.getElementById('sidebar');
    this.backdrop = document.getElementById('sidebarBackdrop');

    // Sidebar navigation buttons
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.getAttribute('data-view');
        if (view) {
          this.navigateTo(view);
          this.closeMobileDrawer();
        }
      });
    });

    // Mobile menu toggles
    const mobileMenuBtn = document.getElementById('mobileMenuToggle');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => this.openMobileDrawer());
    }
    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener('click', () => this.closeMobileDrawer());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.closeMobileDrawer());
    }

    // Keyboard support: Escape closes mobile drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
        this.closeMobileDrawer();
      }
    });
  },

  navigateTo(viewId) {
    this.activeView = viewId;

    // Update nav button active states
    document.querySelectorAll('.nav-item').forEach(item => {
      const isTarget = item.getAttribute('data-view') === viewId;
      item.classList.toggle('active', isTarget);
      if (isTarget) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    // Update views visibility
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`view-${viewId}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Trigger dashboard updates if navigating to dashboard
    if (viewId === 'dashboard') {
      DashboardModule.update();
    }
  },

  openMobileDrawer() {
    if (this.sidebar) this.sidebar.classList.add('open');
    if (this.backdrop) this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeMobileDrawer() {
    if (this.sidebar) this.sidebar.classList.remove('open');
    if (this.backdrop) this.backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
};

/* --------------------------------------------------------------------------
   6. BASIC CALCULATOR MODULE
   Keypad, display tape, zero division detection, keyboard event bindings
   -------------------------------------------------------------------------- */
const BasicCalculator = {
  currentInput: '0',
  previousInput: '',
  operation: null,
  resetDisplayNext: false,

  displayElement: null,
  equationElement: null,
  errorBanner: null,
  errorText: null,

  init() {
    this.displayElement = document.getElementById('calcDisplay');
    this.equationElement = document.getElementById('calcEquation');
    this.errorBanner = document.getElementById('calcErrorBanner');
    this.errorText = document.getElementById('calcErrorText');

    // Bind keypad clicks
    const keypad = document.querySelector('.calc-keypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.calc-btn');
        if (!btn) return;

        if (btn.hasAttribute('data-num')) {
          this.appendNumber(btn.getAttribute('data-num'));
        } else if (btn.hasAttribute('data-action')) {
          const action = btn.getAttribute('data-action');
          if (action === 'operator') {
            this.setOperation(btn.getAttribute('data-op'));
          } else if (action === 'calculate') {
            this.compute();
          } else if (action === 'clear') {
            this.clear();
          } else if (action === 'delete') {
            this.delete();
          } else if (action === 'percent') {
            this.percentage();
          } else if (action === 'negate') {
            this.negate();
          }
        }
      });
    }

    // Global keyboard listener when inside calculator view
    window.addEventListener('keydown', (e) => {
      // Avoid capturing keystrokes when typing into text/search inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      if (Navigation.activeView !== 'calculator') return;

      if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
        e.preventDefault();
        this.appendNumber(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        this.setOperation(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.compute();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.delete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clear();
      }
    });

    this.updateScreen();
  },

  showError(msg) {
    if (this.errorBanner && this.errorText) {
      this.errorText.textContent = msg;
      this.errorBanner.classList.add('show');
    }
  },

  clearError() {
    if (this.errorBanner) {
      this.errorBanner.classList.remove('show');
    }
  },

  appendNumber(number) {
    this.clearError();

    if (number === '.' && this.currentInput.includes('.')) return;

    if (this.resetDisplayNext || this.currentInput === '0') {
      if (number === '.') {
        this.currentInput = '0.';
      } else {
        this.currentInput = number;
      }
      this.resetDisplayNext = false;
    } else {
      if (this.currentInput.length >= 16) return; // Prevent screen overflow
      this.currentInput += number;
    }

    this.updateScreen();
  },

  setOperation(op) {
    this.clearError();

    if (this.currentInput === '') return;

    if (this.previousInput !== '') {
      this.compute(false);
    }

    this.operation = op;
    this.previousInput = this.currentInput;
    this.resetDisplayNext = true;
    this.updateScreen();
  },

  compute(finalStep = true) {
    this.clearError();

    const prev = parseFloat(this.previousInput);
    const curr = parseFloat(this.currentInput);

    if (isNaN(prev) || isNaN(curr) || !this.operation) return;

    let result = 0;

    switch (this.operation) {
      case '+':
        result = prev + curr;
        break;
      case '-':
        result = prev - curr;
        break;
      case '*':
        result = prev * curr;
        break;
      case '/':
        if (curr === 0) {
          this.showError('Cannot divide by zero. Please reset or choose another divisor.');
          this.currentInput = '0';
          this.previousInput = '';
          this.operation = null;
          this.resetDisplayNext = true;
          this.updateScreen();
          return;
        }
        result = prev / curr;
        break;
      default:
        return;
    }

    // Format clean numbers without floating-point precision quirks
    result = Math.round((result + Number.EPSILON) * 100000000) / 100000000;

    if (finalStep) {
      const opSymbol = this.getOpSymbol(this.operation);
      this.equationElement.textContent = `${prev} ${opSymbol} ${curr} =`;
      this.currentInput = result.toString();
      this.operation = null;
      this.previousInput = '';
      this.resetDisplayNext = true;
    } else {
      this.currentInput = result.toString();
      this.previousInput = result.toString();
      this.resetDisplayNext = true;
    }

    this.updateScreen();
  },

  clear() {
    this.clearError();
    this.currentInput = '0';
    this.previousInput = '';
    this.operation = null;
    this.resetDisplayNext = false;
    this.equationElement.innerHTML = '&nbsp;';
    this.updateScreen();
  },

  delete() {
    this.clearError();
    if (this.resetDisplayNext) return;

    if (this.currentInput.length <= 1 || this.currentInput === '0') {
      this.currentInput = '0';
    } else {
      this.currentInput = this.currentInput.slice(0, -1);
    }
    this.updateScreen();
  },

  percentage() {
    this.clearError();
    const curr = parseFloat(this.currentInput);
    if (!isNaN(curr)) {
      this.currentInput = (curr / 100).toString();
      this.updateScreen();
    }
  },

  negate() {
    this.clearError();
    const curr = parseFloat(this.currentInput);
    if (!isNaN(curr) && curr !== 0) {
      this.currentInput = (curr * -1).toString();
      this.updateScreen();
    }
  },

  getOpSymbol(op) {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  },

  updateScreen() {
    if (this.displayElement) {
      this.displayElement.textContent = this.currentInput;
    }

    if (this.equationElement && this.operation && this.previousInput !== '') {
      this.equationElement.textContent = `${this.previousInput} ${this.getOpSymbol(this.operation)}`;
    }
  }
};

/* --------------------------------------------------------------------------
   7. CGPA CALCULATOR MODULE
   Dynamic subject rows, credit-weighting, preserved calculations, dashboard sync
   -------------------------------------------------------------------------- */
const CgpaCalculator = {
  subjects: [],

  init() {
    // Load stored calculation or start with 4 balanced default subjects
    const savedRecord = StorageService.get(StorageService.KEYS.CGPA, null);
    if (savedRecord && Array.isArray(savedRecord.subjects) && savedRecord.subjects.length > 0) {
      this.subjects = savedRecord.subjects;
      this.renderSubjectsTable();
      this.displayResults(savedRecord);
    } else {
      this.loadDefaults();
    }

    // Bind action buttons
    const addBtn = document.getElementById('cgpaAddSubjectBtn');
    const calcBtn = document.getElementById('cgpaCalculateBtn');
    const resetBtn = document.getElementById('cgpaResetBtn');
    const sampleBtn = document.getElementById('cgpaSampleBtn');

    if (addBtn) addBtn.addEventListener('click', () => this.addSubjectRow());
    if (calcBtn) calcBtn.addEventListener('click', () => this.calculate());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    if (sampleBtn) sampleBtn.addEventListener('click', () => this.loadSampleData());
  },

  loadDefaults() {
    // 4 subjects with equal credits (directly mirrors original 4-subject logic)
    this.subjects = [
      { id: 1, name: 'Subject 1', marks: 85, credits: 4 },
      { id: 2, name: 'Subject 2', marks: 78, credits: 4 },
      { id: 3, name: 'Subject 3', marks: 92, credits: 4 },
      { id: 4, name: 'Subject 4', marks: 88, credits: 4 }
    ];
    this.renderSubjectsTable();
  },

  loadSampleData() {
    this.subjects = [
      { id: Date.now() + 1, name: 'Data Structures & Algorithms', marks: 92, credits: 4 },
      { id: Date.now() + 2, name: 'Database Management Systems', marks: 86, credits: 4 },
      { id: Date.now() + 3, name: 'Computer Networks', marks: 79, credits: 3 },
      { id: Date.now() + 4, name: 'Discrete Mathematics', marks: 84, credits: 4 },
      { id: Date.now() + 5, name: 'Software Engineering Lab', marks: 95, credits: 2 }
    ];
    this.renderSubjectsTable();
    this.calculate();
    ToastService.success('Loaded realistic university course sample data.');
  },

  renderSubjectsTable() {
    const tbody = document.getElementById('cgpaTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    this.subjects.forEach((subj, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input 
            type="text" 
            class="table-input subj-name" 
            placeholder="e.g. Subject ${index + 1}" 
            value="${ToastService.escapeHtml(subj.name)}"
            data-id="${subj.id}"
            aria-label="Subject name ${index + 1}"
          >
        </td>
        <td>
          <input 
            type="number" 
            class="table-input subj-marks" 
            placeholder="0 - 100" 
            min="0" 
            max="100" 
            step="any"
            value="${subj.marks !== null && subj.marks !== undefined ? subj.marks : ''}"
            data-id="${subj.id}"
            aria-label="Marks for ${ToastService.escapeHtml(subj.name)}"
          >
        </td>
        <td>
          <input 
            type="number" 
            class="table-input subj-credits" 
            placeholder="1 - 6" 
            min="1" 
            max="12" 
            step="0.5"
            value="${subj.credits || 4}"
            data-id="${subj.id}"
            aria-label="Credits for ${ToastService.escapeHtml(subj.name)}"
          >
        </td>
        <td style="text-align: center;">
          <button 
            type="button" 
            class="delete-row-btn" 
            title="Remove subject row" 
            onclick="CgpaCalculator.removeSubjectRow(${subj.id})"
            aria-label="Remove ${ToastService.escapeHtml(subj.name)}"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  addSubjectRow() {
    const newId = Date.now();
    this.syncCurrentInputs();
    this.subjects.push({
      id: newId,
      name: `Subject ${this.subjects.length + 1}`,
      marks: '',
      credits: 4
    });
    this.renderSubjectsTable();
    this.clearError();

    // Focus newly added subject input
    setTimeout(() => {
      const inputs = document.querySelectorAll('.subj-name');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
  },

  removeSubjectRow(id) {
    if (this.subjects.length <= 1) {
      this.showError('You must retain at least one subject in the calculation table.');
      return;
    }
    this.syncCurrentInputs();
    this.subjects = this.subjects.filter(s => s.id !== id);
    this.renderSubjectsTable();
    this.clearError();
  },

  syncCurrentInputs() {
    const rows = document.querySelectorAll('#cgpaTableBody tr');
    rows.forEach(tr => {
      const nameInput = tr.querySelector('.subj-name');
      const marksInput = tr.querySelector('.subj-marks');
      const creditsInput = tr.querySelector('.subj-credits');

      if (nameInput && marksInput && creditsInput) {
        const id = parseInt(nameInput.getAttribute('data-id'), 10);
        const subj = this.subjects.find(s => s.id === id);
        if (subj) {
          subj.name = nameInput.value.trim() || 'Untitled Subject';
          subj.marks = marksInput.value === '' ? '' : parseFloat(marksInput.value);
          subj.credits = parseFloat(creditsInput.value) || 1;
        }
      }
    });
  },

  showError(msg) {
    const banner = document.getElementById('cgpaErrorBanner');
    const text = document.getElementById('cgpaErrorText');
    if (banner && text) {
      text.textContent = msg;
      banner.style.display = 'flex';
    }
  },

  clearError() {
    const banner = document.getElementById('cgpaErrorBanner');
    if (banner) banner.style.display = 'none';
  },

  calculate() {
    this.syncCurrentInputs();
    this.clearError();

    if (this.subjects.length === 0) {
      this.showError('Please add at least one subject to calculate CGPA.');
      return;
    }

    let totalWeightedPoints = 0;
    let totalCredits = 0;
    let totalMarks = 0;
    let isValid = true;

    for (const subj of this.subjects) {
      if (subj.marks === '' || isNaN(subj.marks)) {
        this.showError(`Please enter marks for "${subj.name}".`);
        isValid = false;
        break;
      }
      if (subj.marks < 0 || subj.marks > 100) {
        this.showError(`Marks for "${subj.name}" must be between 0 and 100.`);
        isValid = false;
        break;
      }
      if (isNaN(subj.credits) || subj.credits <= 0) {
        this.showError(`Credits for "${subj.name}" must be greater than 0.`);
        isValid = false;
        break;
      }

      // Continuous 10-point scale: marks / 10 = grade points
      // E.g., 85 marks = 8.5 grade point
      // Weighted points = 8.5 * credits
      const gradePoint = subj.marks / 10;
      totalWeightedPoints += gradePoint * subj.credits;
      totalCredits += subj.credits;
      totalMarks += subj.marks;
    }

    if (!isValid) return;

    const cgpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits) : 0;
    const cgpaFormatted = cgpa.toFixed(2);
    const equivalentPercentage = (cgpa * 10).toFixed(1);

    // Performance classification
    let gradeLabel = 'Pass';
    let badgeClass = 'badge-success';
    let remarks = '';

    if (cgpa >= 9.0) {
      gradeLabel = 'Outstanding (O / A+)';
      badgeClass = 'badge-primary';
      remarks = 'Exceptional performance across registered coursework. Outstanding academic distinction.';
    } else if (cgpa >= 8.0) {
      gradeLabel = 'First Class Distinction (A)';
      badgeClass = 'badge-success';
      remarks = 'Consistent high honors and commendable mastery of course curricula.';
    } else if (cgpa >= 7.0) {
      gradeLabel = 'First Class (B+)';
      badgeClass = 'badge-success';
      remarks = 'Good overall academic standing with sound conceptual understanding.';
    } else if (cgpa >= 6.0) {
      gradeLabel = 'Second Class (B)';
      badgeClass = 'badge-warning';
      remarks = 'Satisfactory performance. Consider reviewing key course areas to elevate GPA.';
    } else if (cgpa >= 5.0) {
      gradeLabel = 'Pass Class (C)';
      badgeClass = 'badge-warning';
      remarks = 'Pass criteria met. Focused preparation is advised for upcoming semesters.';
    } else {
      gradeLabel = 'Needs Improvement (F)';
      badgeClass = 'badge-warning';
      remarks = 'Academic performance is below minimum passing threshold. Prioritize subject revisions.';
    }

    const record = {
      cgpa: cgpaFormatted,
      percentage: equivalentPercentage,
      totalCredits: totalCredits,
      gradeLabel: gradeLabel,
      badgeClass: badgeClass,
      remarks: remarks,
      subjects: this.subjects,
      calculatedAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    // Save to storage
    StorageService.set(StorageService.KEYS.CGPA, record);

    // Render results
    this.displayResults(record);

    // Refresh Dashboard stat card immediately
    DashboardModule.update();

    ToastService.success(`CGPA Calculated: ${cgpaFormatted} / 10.0`);
  },

  displayResults(record) {
    const cgpaOut = document.getElementById('cgpaOutputVal');
    const percentOut = document.getElementById('cgpaPercentVal');
    const creditsOut = document.getElementById('cgpaCreditsVal');
    const gradeBadge = document.getElementById('cgpaGradeBadge');
    const remarksText = document.getElementById('cgpaRemarksText');
    const timestamp = document.getElementById('cgpaCalcTimestamp');

    if (cgpaOut) cgpaOut.textContent = record.cgpa;
    if (percentOut) percentOut.textContent = `${record.percentage}%`;
    if (creditsOut) creditsOut.textContent = `${record.totalCredits} Credits`;
    if (remarksText) remarksText.textContent = record.remarks;
    if (timestamp) timestamp.textContent = `Calculated: ${record.calculatedAt}`;

    if (gradeBadge) {
      gradeBadge.textContent = record.gradeLabel;
      gradeBadge.className = `badge ${record.badgeClass}`;
    }
  },

  reset() {
    this.clearError();
    this.loadDefaults();
    StorageService.remove(StorageService.KEYS.CGPA);

    const cgpaOut = document.getElementById('cgpaOutputVal');
    const percentOut = document.getElementById('cgpaPercentVal');
    const creditsOut = document.getElementById('cgpaCreditsVal');
    const gradeBadge = document.getElementById('cgpaGradeBadge');
    const remarksText = document.getElementById('cgpaRemarksText');
    const timestamp = document.getElementById('cgpaCalcTimestamp');

    if (cgpaOut) cgpaOut.textContent = '0.00';
    if (percentOut) percentOut.textContent = '0.0%';
    if (creditsOut) creditsOut.textContent = '0';
    if (remarksText) remarksText.textContent = 'Enter subject marks and credits on the left, then click "Calculate CGPA".';
    if (timestamp) timestamp.textContent = 'Not calculated';
    if (gradeBadge) {
      gradeBadge.textContent = 'Pending';
      gradeBadge.className = 'badge badge-neutral';
    }

    DashboardModule.update();
    ToastService.info('CGPA calculator inputs reset to defaults.');
  }
};

/* --------------------------------------------------------------------------
   8. GRADE CONVERTER MODULE
   Preserves original grading logic strictly, provides rich visual feedback
   -------------------------------------------------------------------------- */
const GradeConverter = {
  inputElement: null,
  errorBanner: null,
  errorText: null,
  resultBox: null,

  init() {
    this.inputElement = document.getElementById('gradeMarksInput');
    this.errorBanner = document.getElementById('gradeErrorBanner');
    this.errorText = document.getElementById('gradeErrorText');
    this.resultBox = document.getElementById('gradeResultBox');

    // Auto-convert on typing for seamless UX
    if (this.inputElement) {
      this.inputElement.addEventListener('input', () => {
        if (this.inputElement.value.trim() !== '') {
          this.convert();
        } else {
          this.clearError();
          if (this.resultBox) this.resultBox.style.display = 'none';
        }
      });
    }
  },

  showError(msg) {
    if (this.errorBanner && this.errorText) {
      this.errorText.textContent = msg;
      this.errorBanner.style.display = 'flex';
      if (this.resultBox) this.resultBox.style.display = 'none';
    }
  },

  clearError() {
    if (this.errorBanner) this.errorBanner.style.display = 'none';
  },

  convert() {
    this.clearError();

    const marksStr = this.inputElement.value.trim();
    if (marksStr === '') {
      this.showError('Please enter marks to convert.');
      return;
    }

    const marks = parseFloat(marksStr);

    if (isNaN(marks) || marks < 0 || marks > 100) {
      this.showError('Please enter valid marks between 0 and 100.');
      return;
    }

    // STRICT PRESERVATION of existing grade thresholds:
    // marks >= 90: A+
    // marks >= 80: A
    // marks >= 70: B+
    // marks >= 60: B
    // marks >= 50: C
    // else: F
    let grade = '';
    let classification = '';
    let performanceMsg = '';

    if (marks >= 90) {
      grade = 'A+';
      classification = 'Outstanding Performance';
      performanceMsg = 'Exceptional mastery of subject concepts, top percentile achievement, and exemplary coursework.';
    } else if (marks >= 80) {
      grade = 'A';
      classification = 'Excellent Performance';
      performanceMsg = 'High level of competence, thorough understanding, and strong problem-solving abilities.';
    } else if (marks >= 70) {
      grade = 'B+';
      classification = 'Good Performance';
      performanceMsg = 'Solid foundation and sound conceptual clarity. Consistent academic achievement.';
    } else if (marks >= 60) {
      grade = 'B';
      classification = 'Above Average Performance';
      performanceMsg = 'Satisfactory grasp of course contents with room to target distinction in advanced modules.';
    } else if (marks >= 50) {
      grade = 'C';
      classification = 'Average / Passing Performance';
      performanceMsg = 'Meets standard passing requirements. Further structured revision is recommended.';
    } else {
      grade = 'F';
      classification = 'Needs Improvement / Fail';
      performanceMsg = 'Below passing threshold. Requires focused study and scheduled re-examination.';
    }

    // Update Result UI
    document.getElementById('gradeBadgeLetter').textContent = grade;
    document.getElementById('gradeScorePill').textContent = `${marks}%`;
    document.getElementById('gradeTitleText').textContent = classification;
    document.getElementById('gradePerformanceMsg').textContent = performanceMsg;

    if (this.resultBox) {
      this.resultBox.style.display = 'flex';
    }
  },

  reset() {
    if (this.inputElement) this.inputElement.value = '';
    this.clearError();
    if (this.resultBox) this.resultBox.style.display = 'none';
  }
};

/* --------------------------------------------------------------------------
   9. NOTES MANAGER MODULE
   Full CRUD, live search, important star toggle, categories, localStorage
   -------------------------------------------------------------------------- */
const NotesManager = {
  notes: [],
  activeFilter: 'all', // 'all' or 'important'
  searchQuery: '',

  init() {
    this.notes = StorageService.get(StorageService.KEYS.NOTES, [
      {
        id: 1,
        title: 'Welcome to Student Toolkit Notes',
        category: 'General',
        content: 'You can create, edit, star, and search study notes here. All changes are saved automatically to your browser storage.',
        isImportant: true,
        createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      }
    ]);

    // Bind composer controls
    const openComposerBtn = document.getElementById('openNewNoteBtn');
    const closeComposerBtn = document.getElementById('closeComposerBtn');
    const cancelNoteBtn = document.getElementById('cancelNoteBtn');
    const noteForm = document.getElementById('noteForm');

    if (openComposerBtn) openComposerBtn.addEventListener('click', () => this.openComposer());
    if (closeComposerBtn) closeComposerBtn.addEventListener('click', () => this.closeComposer());
    if (cancelNoteBtn) cancelNoteBtn.addEventListener('click', () => this.closeComposer());

    if (noteForm) {
      noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveNote();
      });
    }

    // Search and filter pills
    const searchInput = document.getElementById('notesSearchInput');
    const clearSearchBtn = document.getElementById('notesClearSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
        this.renderNotes();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.searchQuery = '';
          clearSearchBtn.style.display = 'none';
          this.renderNotes();
        }
      });
    }

    const filterAllBtn = document.getElementById('notesFilterAll');
    const filterImportantBtn = document.getElementById('notesFilterImportant');

    if (filterAllBtn) {
      filterAllBtn.addEventListener('click', () => {
        this.activeFilter = 'all';
        filterAllBtn.classList.add('active');
        if (filterImportantBtn) filterImportantBtn.classList.remove('active');
        this.renderNotes();
      });
    }

    if (filterImportantBtn) {
      filterImportantBtn.addEventListener('click', () => {
        this.activeFilter = 'important';
        filterImportantBtn.classList.add('active');
        if (filterAllBtn) filterAllBtn.classList.remove('active');
        this.renderNotes();
      });
    }

    this.renderNotes();
    this.updateBadges();
  },

  openComposer(editNoteId = null) {
    const card = document.getElementById('noteComposerCard');
    const heading = document.getElementById('composerHeading');
    const idField = document.getElementById('editingNoteId');
    const titleInput = document.getElementById('noteTitleInput');
    const catSelect = document.getElementById('noteCategorySelect');
    const contentInput = document.getElementById('noteContentInput');
    const importantCheckbox = document.getElementById('noteImportantCheckbox');
    const errorBanner = document.getElementById('noteFormErrorBanner');

    if (!card) return;
    if (errorBanner) errorBanner.style.display = 'none';

    if (editNoteId) {
      const note = this.notes.find(n => n.id === editNoteId);
      if (note) {
        heading.textContent = 'Edit Note';
        idField.value = note.id;
        titleInput.value = note.title;
        catSelect.value = note.category || 'General';
        contentInput.value = note.content;
        importantCheckbox.checked = !!note.isImportant;
      }
    } else {
      heading.textContent = 'Create New Note';
      idField.value = '';
      titleInput.value = '';
      catSelect.value = 'Lecture';
      contentInput.value = '';
      importantCheckbox.checked = false;
    }

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => titleInput.focus(), 100);
  },

  closeComposer() {
    const card = document.getElementById('noteComposerCard');
    if (card) card.style.display = 'none';
  },

  saveNote() {
    const idField = document.getElementById('editingNoteId');
    const titleInput = document.getElementById('noteTitleInput');
    const catSelect = document.getElementById('noteCategorySelect');
    const contentInput = document.getElementById('noteContentInput');
    const importantCheckbox = document.getElementById('noteImportantCheckbox');
    const errorBanner = document.getElementById('noteFormErrorBanner');
    const errorText = document.getElementById('noteFormErrorText');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = catSelect.value;
    const isImportant = importantCheckbox.checked;

    if (!title || !content) {
      if (errorBanner && errorText) {
        errorText.textContent = 'Please fill out both the note title and content.';
        errorBanner.style.display = 'flex';
      }
      return;
    }

    const editId = idField.value ? parseInt(idField.value, 10) : null;

    if (editId) {
      // Update existing
      const note = this.notes.find(n => n.id === editId);
      if (note) {
        note.title = title;
        note.category = category;
        note.content = content;
        note.isImportant = isImportant;
        note.updatedAt = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
      ToastService.success('Note updated successfully.');
    } else {
      // Add new
      const newNote = {
        id: Date.now(),
        title: title,
        category: category,
        content: content,
        isImportant: isImportant,
        createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      };
      this.notes.unshift(newNote);
      ToastService.success('Note created and saved.');
    }

    StorageService.set(StorageService.KEYS.NOTES, this.notes);
    this.closeComposer();
    this.renderNotes();
    this.updateBadges();
    DashboardModule.update();
  },

  deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    StorageService.set(StorageService.KEYS.NOTES, this.notes);
    this.renderNotes();
    this.updateBadges();
    DashboardModule.update();
    ToastService.info('Note deleted.');
  },

  toggleStar(id) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.isImportant = !note.isImportant;
      StorageService.set(StorageService.KEYS.NOTES, this.notes);
      this.renderNotes();
      this.updateBadges();
      DashboardModule.update();
      ToastService.info(note.isImportant ? 'Marked note as important' : 'Removed note from important');
    }
  },

  renderNotes() {
    const grid = document.getElementById('notesGrid');
    const emptyState = document.getElementById('notesEmptyState');
    const emptyTitle = document.getElementById('notesEmptyTitle');
    const emptyDesc = document.getElementById('notesEmptyDesc');

    if (!grid) return;

    let filtered = this.notes;

    if (this.activeFilter === 'important') {
      filtered = filtered.filter(n => n.isImportant);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(this.searchQuery) ||
        n.content.toLowerCase().includes(this.searchQuery) ||
        (n.category && n.category.toLowerCase().includes(this.searchQuery))
      );
    }

    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.style.display = 'none';
      if (emptyState) {
        emptyState.style.display = 'block';
        if (this.searchQuery) {
          emptyTitle.textContent = 'No matching notes found';
          emptyDesc.textContent = `No notes match "${ToastService.escapeHtml(this.searchQuery)}". Try searching for other terms or clear the filter.`;
        } else if (this.activeFilter === 'important') {
          emptyTitle.textContent = 'No important notes';
          emptyDesc.textContent = 'You have not marked any notes with a star yet.';
        } else {
          emptyTitle.textContent = 'No notes yet';
          emptyDesc.textContent = 'Start organizing your study materials by creating your first note.';
        }
      }
      return;
    }

    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(note => {
      const card = document.createElement('article');
      card.className = `note-card ${note.isImportant ? 'important' : ''}`;
      card.innerHTML = `
        <div class="note-card-header">
          <span class="note-tag" data-cat="${note.category || 'General'}">${note.category || 'General'}</span>
          <button 
            type="button" 
            class="note-star-btn ${note.isImportant ? 'starred' : ''}" 
            title="${note.isImportant ? 'Unstar note' : 'Mark as important'}"
            onclick="NotesManager.toggleStar(${note.id})"
            aria-label="${note.isImportant ? 'Unstar note' : 'Star note'}"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${note.isImportant ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
        <h3 class="note-card-title">${ToastService.escapeHtml(note.title)}</h3>
        <p class="note-card-body">${ToastService.escapeHtml(note.content)}</p>
        <div class="note-card-footer">
          <span>${note.createdAt || 'Recent'}</span>
          <div class="note-card-actions">
            <button 
              type="button" 
              class="btn-icon" 
              title="Edit note" 
              onclick="NotesManager.openComposer(${note.id})"
              aria-label="Edit note"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button 
              type="button" 
              class="btn-icon" 
              title="Delete note" 
              onclick="NotesManager.deleteNote(${note.id})"
              aria-label="Delete note"
              style="color: var(--danger);"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  updateBadges() {
    const badge = document.getElementById('notesNavBadge');
    if (badge) {
      badge.textContent = this.notes.length;
    }
  }
};

/* --------------------------------------------------------------------------
   10. BACKLOG TRACKER MODULE
   Status toggle (Pending / Completed), counts, filtering, search, localStorage
   -------------------------------------------------------------------------- */
const BacklogManager = {
  backlogs: [],
  activeFilter: 'all', // 'all', 'pending', 'completed'
  searchQuery: '',

  init() {
    this.backlogs = StorageService.get(StorageService.KEYS.BACKLOGS, [
      {
        id: 1,
        subject: 'Engineering Mathematics II',
        code: 'MAT201 • Sem 2',
        status: 'pending',
        createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      }
    ]);

    // Search and filter pills
    const searchInput = document.getElementById('backlogSearchInput');
    const clearSearchBtn = document.getElementById('backlogClearSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
        this.renderBacklogs();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.searchQuery = '';
          clearSearchBtn.style.display = 'none';
          this.renderBacklogs();
        }
      });
    }

    const filterAll = document.getElementById('backlogFilterAll');
    const filterPending = document.getElementById('backlogFilterPending');
    const filterCompleted = document.getElementById('backlogFilterCompleted');

    const setFilter = (filterType, activeBtn) => {
      this.activeFilter = filterType;
      [filterAll, filterPending, filterCompleted].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
      this.renderBacklogs();
    };

    if (filterAll) filterAll.addEventListener('click', () => setFilter('all', filterAll));
    if (filterPending) filterPending.addEventListener('click', () => setFilter('pending', filterPending));
    if (filterCompleted) filterCompleted.addEventListener('click', () => setFilter('completed', filterCompleted));

    this.renderBacklogs();
    this.updateStats();
  },

  showError(msg) {
    const banner = document.getElementById('backlogErrorBanner');
    const text = document.getElementById('backlogErrorText');
    if (banner && text) {
      text.textContent = msg;
      banner.style.display = 'flex';
    }
  },

  clearError() {
    const banner = document.getElementById('backlogErrorBanner');
    if (banner) banner.style.display = 'none';
  },

  addSubject() {
    this.clearError();

    const subjectInput = document.getElementById('backlogSubjectInput');
    const codeInput = document.getElementById('backlogCodeInput');

    const subject = subjectInput.value.trim();
    const code = codeInput.value.trim();

    if (!subject) {
      this.showError('Please enter a valid subject name.');
      return;
    }

    const newBacklog = {
      id: Date.now(),
      subject: subject,
      code: code || 'General Course',
      status: 'pending',
      createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    };

    this.backlogs.unshift(newBacklog);
    StorageService.set(StorageService.KEYS.BACKLOGS, this.backlogs);

    subjectInput.value = '';
    codeInput.value = '';

    this.renderBacklogs();
    this.updateStats();
    DashboardModule.update();
    ToastService.success(`Added "${subject}" to backlog tracker.`);
  },

  toggleStatus(id) {
    const item = this.backlogs.find(b => b.id === id);
    if (item) {
      item.status = item.status === 'pending' ? 'completed' : 'pending';
      StorageService.set(StorageService.KEYS.BACKLOGS, this.backlogs);
      this.renderBacklogs();
      this.updateStats();
      DashboardModule.update();
      ToastService.info(`Subject marked as ${item.status === 'completed' ? 'Cleared / Completed' : 'Pending'}.`);
    }
  },

  deleteItem(id) {
    this.backlogs = this.backlogs.filter(b => b.id !== id);
    StorageService.set(StorageService.KEYS.BACKLOGS, this.backlogs);
    this.renderBacklogs();
    this.updateStats();
    DashboardModule.update();
    ToastService.info('Backlog item removed.');
  },

  renderBacklogs() {
    const container = document.getElementById('backlogListContainer');
    const emptyState = document.getElementById('backlogEmptyState');
    const emptyTitle = document.getElementById('backlogEmptyTitle');
    const emptyDesc = document.getElementById('backlogEmptyDesc');

    if (!container) return;

    let filtered = this.backlogs;

    if (this.activeFilter === 'pending') {
      filtered = filtered.filter(b => b.status === 'pending');
    } else if (this.activeFilter === 'completed') {
      filtered = filtered.filter(b => b.status === 'completed');
    }

    if (this.searchQuery) {
      filtered = filtered.filter(b => 
        b.subject.toLowerCase().includes(this.searchQuery) ||
        (b.code && b.code.toLowerCase().includes(this.searchQuery))
      );
    }

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.style.display = 'none';
      if (emptyState) {
        emptyState.style.display = 'block';
        if (this.searchQuery) {
          emptyTitle.textContent = 'No matching backlog courses';
          emptyDesc.textContent = `No subjects match "${ToastService.escapeHtml(this.searchQuery)}".`;
        } else if (this.activeFilter === 'pending') {
          emptyTitle.textContent = 'No pending backlogs!';
          emptyDesc.textContent = 'All clear! You currently have zero uncleared backlogs.';
        } else if (this.activeFilter === 'completed') {
          emptyTitle.textContent = 'No cleared backlogs yet';
          emptyDesc.textContent = 'When you clear an exam, toggle its status to show here.';
        } else {
          emptyTitle.textContent = 'No backlogs recorded';
          emptyDesc.textContent = 'Use the form above to track any pending modules or arrears.';
        }
      }
      return;
    }

    container.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(item => {
      const isCompleted = item.status === 'completed';
      const card = document.createElement('div');
      card.className = `backlog-item-card ${isCompleted ? 'completed' : ''}`;
      card.innerHTML = `
        <div class="backlog-item-left">
          <input 
            type="checkbox" 
            class="backlog-checkbox" 
            ${isCompleted ? 'checked' : ''} 
            onchange="BacklogManager.toggleStatus(${item.id})"
            aria-label="Toggle status for ${ToastService.escapeHtml(item.subject)}"
          >
          <div class="backlog-details">
            <span class="backlog-name">${ToastService.escapeHtml(item.subject)}</span>
            <span class="backlog-meta">${ToastService.escapeHtml(item.code)} • Added ${item.createdAt || 'Recent'}</span>
          </div>
        </div>
        <div class="backlog-item-right">
          <span class="status-badge ${item.status}">
            ${isCompleted ? 'Cleared' : 'Pending'}
          </span>
          <button 
            type="button" 
            class="delete-item-btn" 
            title="Delete subject"
            onclick="BacklogManager.deleteItem(${item.id})"
            aria-label="Delete ${ToastService.escapeHtml(item.subject)}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  },

  updateStats() {
    const total = this.backlogs.length;
    const pending = this.backlogs.filter(b => b.status === 'pending').length;
    const completed = this.backlogs.filter(b => b.status === 'completed').length;

    const totalEl = document.getElementById('backlogTotalCount');
    const pendingEl = document.getElementById('backlogPendingCount');
    const completedEl = document.getElementById('backlogCompletedCount');
    const navBadge = document.getElementById('backlogNavBadge');

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;

    if (navBadge) {
      navBadge.textContent = pending;
      navBadge.style.display = pending > 0 ? 'inline-flex' : 'none';
    }
  }
};

/* --------------------------------------------------------------------------
   11. DASHBOARD MODULE (REAL-TIME AGGREGATION & WIDGET UPDATES)
   -------------------------------------------------------------------------- */
const DashboardModule = {
  update() {
    // 1. CGPA Metric
    const cgpaRecord = StorageService.get(StorageService.KEYS.CGPA, null);
    const dashCgpaVal = document.getElementById('dashCgpaVal');
    const dashCgpaStatus = document.getElementById('dashCgpaStatus');

    if (dashCgpaVal && dashCgpaStatus) {
      if (cgpaRecord && cgpaRecord.cgpa) {
        dashCgpaVal.textContent = cgpaRecord.cgpa;
        dashCgpaStatus.textContent = `${cgpaRecord.gradeLabel || 'Active GPA'}`;
      } else {
        dashCgpaVal.textContent = '0.00';
        dashCgpaStatus.textContent = 'No calculation recorded';
      }
    }

    // 2. Notes Metric
    const notes = StorageService.get(StorageService.KEYS.NOTES, []);
    const dashNotesVal = document.getElementById('dashNotesVal');
    const dashNotesImportant = document.getElementById('dashNotesImportant');

    if (dashNotesVal && dashNotesImportant) {
      dashNotesVal.textContent = notes.length;
      const importantCount = notes.filter(n => n.isImportant).length;
      dashNotesImportant.textContent = `${importantCount} marked important`;
    }

    // 3. Backlog Metric
    const backlogs = StorageService.get(StorageService.KEYS.BACKLOGS, []);
    const dashBacklogsVal = document.getElementById('dashBacklogsVal');
    const dashBacklogsCleared = document.getElementById('dashBacklogsCleared');

    if (dashBacklogsVal && dashBacklogsCleared) {
      const pendingCount = backlogs.filter(b => b.status === 'pending').length;
      const completedCount = backlogs.filter(b => b.status === 'completed').length;
      dashBacklogsVal.textContent = pendingCount;
      dashBacklogsCleared.textContent = `${completedCount} cleared`;
    }

    // 4. Recent Notes Preview
    const recentNotesList = document.getElementById('dashRecentNotesList');
    if (recentNotesList) {
      if (notes.length === 0) {
        recentNotesList.innerHTML = `<div class="empty-state-small">No notes created yet. Click Notes to add your first note!</div>`;
      } else {
        const top3Notes = notes.slice(0, 3);
        recentNotesList.innerHTML = top3Notes.map(n => `
          <div class="dash-preview-item">
            <div>
              <div class="dash-preview-title">${ToastService.escapeHtml(n.title)}</div>
              <div class="dash-preview-sub">${n.category || 'General'} • ${n.createdAt || 'Recent'}</div>
            </div>
            ${n.isImportant ? '<span style="color: var(--warning); font-size: 1.1rem;">★</span>' : ''}
          </div>
        `).join('');
      }
    }

    // 5. Backlog Status Preview
    const backlogPreviewList = document.getElementById('dashBacklogPreviewList');
    if (backlogPreviewList) {
      if (backlogs.length === 0) {
        backlogPreviewList.innerHTML = `<div class="empty-state-small">No backlogs recorded. Great work staying on track!</div>`;
      } else {
        const top3Backlogs = backlogs.slice(0, 3);
        backlogPreviewList.innerHTML = top3Backlogs.map(b => `
          <div class="dash-preview-item">
            <div>
              <div class="dash-preview-title">${ToastService.escapeHtml(b.subject)}</div>
              <div class="dash-preview-sub">${ToastService.escapeHtml(b.code)}</div>
            </div>
            <span class="status-badge ${b.status}">${b.status === 'completed' ? 'Cleared' : 'Pending'}</span>
          </div>
        `).join('');
      }
    }
  }
};

/* --------------------------------------------------------------------------
   12. APPLICATION ENTRYPOINT BOOTSTRAP
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize services in strict dependency order
  ToastService.init();
  ThemeManager.init();
  TimeService.init();
  Navigation.init();
  BasicCalculator.init();
  CgpaCalculator.init();
  GradeConverter.init();
  NotesManager.init();
  BacklogManager.init();
  DashboardModule.update();

  console.log('[Student Toolkit] Application successfully initialized.');
});
