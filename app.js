// AI Question Paper Generator - Frontend Controller

// --- STATE MANAGEMENT ---
const State = {
  currentUser: null,
  currentProfile: null,
  activeView: 'view-auth',
  activeSubject: null,
  activePaper: null,
  subjects: [],
  materials: [],
  extractedTopics: [],
  selectedTopics: new Set(),
  activeModule: null,
  selectedModules: new Set([1, 2])
};

// --- UTILITY FILENAME PREFIX HELPERS ---
function getMaterialModule(name) {
  if (!name) return null;
  if (name.startsWith("[Module 1]")) return 1;
  if (name.startsWith("[Module 2]")) return 2;
  if (name.startsWith("[Module 3]")) return 3;
  if (name.startsWith("[Module 4]")) return 4;
  if (name.startsWith("[Module 5]")) return 5;
  if (name.startsWith("[Module 6]")) return 6;
  if (name.startsWith("[Past Papers]")) return 7;
  return null;
}

function stripModulePrefix(name) {
  if (!name) return "";
  return name.replace(/^\[Module [1-6]\]\s*/, '').replace(/^\[Past Papers\]\s*/, '');
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  // Load environment variables from .env file if available
  if (typeof loadEnvironment === 'function') {
    await loadEnvironment();
  }
  
  // Initialize Theme from localStorage
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    const toggleBtn = document.getElementById("btn-theme-toggle");
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  }

  // Check if Supabase credentials are configured
  const configured = isDbConfigured();
  const warningBanner = document.getElementById("gemini-warning-banner");
  
  // Show warning banner if Gemini API key is missing
  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes("your-gemini-api-key")) {
    if (warningBanner) warningBanner.style.display = "flex";
  }

  // Setup Event Listeners
  setupEventListeners();
  
  // Check current session
  showLoader(true, "Checking active session...");
  try {
    if (configured) {
      const session = await DatabaseService.getCurrentUser();
      if (session && session.profile) {
        State.currentUser = session.user;
        State.currentProfile = session.profile;
        showToast(`Logged in as ${State.currentProfile.name}`, 'success');
        setupSidebar();
        
        if (State.currentProfile.role === 'hod') {
          navigateTo('view-hod-dashboard');
        } else {
          navigateTo('view-teacher-dashboard');
        }
      } else {
        if (session) {
          // If session exists but profile is deleted from db, sign out to clear session
          await DatabaseService.signOut();
        }
        navigateTo('view-auth');
      }
    } else {
      navigateTo('view-auth');
      showToast("Database not configured. Fill in your credentials in config.js.", "error");
    }
  } catch (error) {
    console.error("Session check error:", error);
    navigateTo('view-auth');
  } finally {
    showLoader(false);
  }
});

// --- NAVIGATION & ROUTER ---
function navigateTo(viewId) {
  // Hide all views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active-view');
  });

  // Show active view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active-view');
    State.activeView = viewId;
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update specific view states
  if (viewId === 'view-teacher-dashboard') {
    renderTeacherDashboard();
  } else if (viewId === 'view-hod-dashboard') {
    renderHODDashboard();
  } else if (viewId === 'view-subject-workspace' && State.activeSubject) {
    renderSubjectWorkspace();
  } else if (viewId === 'view-review-edit' && State.activePaper) {
    renderPaperReview();
  }
}

// Setup sidebar visibility and menus
function setupSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  const navMenu = document.getElementById("nav-menu-container");
  const subNav = document.getElementById("app-sub-navbar");
  
  if (!State.currentUser || !State.currentProfile) {
    sidebar.style.display = "none";
    if (subNav) subNav.style.display = "none";
    return;
  }

  sidebar.style.display = "flex";
  if (subNav) subNav.style.display = "flex";
  
  // Set initials & user info
  const initials = State.currentProfile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  document.getElementById("user-avatar-initials").innerText = initials;
  document.getElementById("profile-user-name").innerText = State.currentProfile.name;
  document.getElementById("profile-user-role").innerText = State.currentProfile.role === 'hod' ? 'HOD' : 'Faculty';

  // Build menu items based on role
  let menuHtml = '';
  if (State.currentProfile.role === 'hod') {
    menuHtml = `
      <button class="nav-item ${State.activeView === 'view-hod-dashboard' ? 'active' : ''}" onclick="navigateTo('view-hod-dashboard')">
        <i class="fa-solid fa-chart-line"></i> Dashboard
      </button>
    `;
  } else {
    menuHtml = `
      <button class="nav-item ${State.activeView === 'view-teacher-dashboard' ? 'active' : ''}" onclick="navigateTo('view-teacher-dashboard')">
        <i class="fa-solid fa-house"></i> Home
      </button>
      <button class="nav-item" style="opacity: 0.6; cursor: not-allowed;" onclick="showToast('Courses directory is locked for other faculty divisions', 'info')">
        <i class="fa-solid fa-graduation-cap"></i> Courses
      </button>
      <button class="nav-item" style="opacity: 0.6; cursor: not-allowed;" onclick="showToast('Events module calendar is coming soon!', 'info')">
        <i class="fa-solid fa-calendar-days"></i> Events
      </button>
    `;
  }
  navMenu.innerHTML = menuHtml;
}

// --- EVENT LISTENERS REGISTRATION ---
function setupEventListeners() {
  // Switch auth panels
  document.getElementById("link-show-signup").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("auth-login-container").style.display = "none";
    document.getElementById("auth-signup-container").style.display = "flex";
  });

  document.getElementById("link-show-login").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("auth-signup-container").style.display = "none";
    document.getElementById("auth-login-container").style.display = "flex";
  });

  // Login Submit
  document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    // Enforce email domain restriction
    if (!email.toLowerCase().endsWith("@apsit.edu.in")) {
      showToast("Only email addresses ending with '@apsit.edu.in' are allowed.", "error");
      return;
    }

    showLoader(true, "Authenticating...");
    try {
      const response = await DatabaseService.signIn(email, password);
      State.currentUser = response.user;
      State.currentProfile = response.profile;
      
      if (!State.currentProfile) {
        showToast("Profile details not found. Please sign up to register.", "error");
        await DatabaseService.signOut();
        State.currentUser = null;
        return;
      }
      
      showToast(`Welcome back, ${State.currentProfile.name}!`, "success");
      setupSidebar();
      
      if (State.currentProfile.role === 'hod') {
        navigateTo('view-hod-dashboard');
      } else {
        navigateTo('view-teacher-dashboard');
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || "Invalid email or password", "error");
    } finally {
      showLoader(false);
    }
  });

  // Sign Up Submit
  document.getElementById("form-signup").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const role = document.getElementById("signup-role").value;

    // Enforce email domain restriction
    if (!email.toLowerCase().endsWith("@apsit.edu.in")) {
      showToast("Only email addresses ending with '@apsit.edu.in' are allowed.", "error");
      return;
    }

    showLoader(true, "Creating account...");
    try {
      await DatabaseService.signUp(name, email, password, role);
      showToast("Account created successfully! Please sign in.", "success");
      document.getElementById("auth-signup-container").style.display = "none";
      document.getElementById("auth-login-container").style.display = "flex";
      document.getElementById("login-email").value = email;
    } catch (error) {
      console.error(error);
      showToast(error.message || "Failed to create account", "error");
    } finally {
      showLoader(false);
    }
  });

  // Logout Trigger
  document.getElementById("btn-sidebar-logout").addEventListener("click", async () => {
    showLoader(true, "Logging out...");
    try {
      await DatabaseService.signOut();
      State.currentUser = null;
      State.currentProfile = null;
      setupSidebar();
      navigateTo('view-auth');
      showToast("Logged out successfully.", "info");
    } catch (error) {
      console.error(error);
      showToast("Error logging out", "error");
    } finally {
      showLoader(false);
    }
  });

  // Subject Modal controls
  document.getElementById("btn-dashboard-add-subject").addEventListener("click", () => {
    document.getElementById("modal-add-subject").style.display = "flex";
  });

  document.getElementById("btn-close-modal-add-subject").addEventListener("click", () => {
    document.getElementById("modal-add-subject").style.display = "none";
  });

  document.getElementById("btn-cancel-modal-add-subject").addEventListener("click", () => {
    document.getElementById("modal-add-subject").style.display = "none";
  });

  document.getElementById("modal-add-subject").addEventListener("click", (e) => {
    if (e.target.id === "modal-add-subject") {
      document.getElementById("modal-add-subject").style.display = "none";
    }
  });

  // Add Subject Submit Form
  document.getElementById("form-add-subject").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("modal-subject-name").value;
    const code = document.getElementById("modal-subject-code").value;
    const semester = document.getElementById("modal-subject-semester").value;

    showLoader(true, "Adding subject...");
    try {
      const subject = await DatabaseService.addSubject(name, code, semester, State.currentUser.id);
      showToast(`${name} added successfully!`, "success");
      document.getElementById("modal-add-subject").style.display = "none";
      document.getElementById("form-add-subject").reset();
      renderTeacherDashboard(); // refresh
    } catch (error) {
      console.error(error);
      showToast("Failed to add subject", "error");
    } finally {
      showLoader(false);
    }
  });

  // Breadcrumbs click
  document.getElementById("breadcrumb-subjects").addEventListener("click", () => {
    navigateTo('view-teacher-dashboard');
  });

  document.getElementById("btn-workspace-back").addEventListener("click", () => {
    navigateTo('view-teacher-dashboard');
  });

  document.getElementById("review-breadcrumb-dashboard").addEventListener("click", () => {
    navigateTo('view-teacher-dashboard');
  });

  document.getElementById("review-breadcrumb-subject").addEventListener("click", () => {
    navigateTo('view-subject-workspace');
  });

  document.getElementById("btn-review-back-to-subject").addEventListener("click", () => {
    navigateTo('view-subject-workspace');
  });

  // Workspace Tabs toggler
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
      
      btn.classList.add('active-tab');
      const contentId = btn.getAttribute('data-tab');
      document.getElementById(contentId).classList.add('active-content');
    });
  });

  // Drag and Drop File Upload Event handlers
  const dragZone = document.getElementById("material-drag-drop-zone");
  const fileInput = document.getElementById("upload-file-input");

  if (dragZone && fileInput) {
    dragZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dragZone.classList.add("dragover");
    });

    dragZone.addEventListener("dragleave", () => {
      dragZone.classList.remove("dragover");
    });

    dragZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dragZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        handleFilesUpload(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFilesUpload(e.target.files);
      }
    });
  }

  // Close Module Workspace Dialog
  document.getElementById("btn-close-modal-module-workspace").addEventListener("click", () => {
    document.getElementById("modal-module-workspace").style.display = "none";
  });
  
  document.getElementById("btn-close-module-workspace").addEventListener("click", () => {
    document.getElementById("modal-module-workspace").style.display = "none";
  });

  document.getElementById("modal-module-workspace").addEventListener("click", (e) => {
    if (e.target.id === "modal-module-workspace") {
      document.getElementById("modal-module-workspace").style.display = "none";
    }
  });

  // Paper generator module selection chip toggle
  const selectionContainer = document.getElementById("generator-module-selection");
  if (selectionContainer) {
    selectionContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".module-select-chip");
      if (!chip) return;
      
      const modVal = parseInt(chip.getAttribute("data-module"));
      if (State.selectedModules.has(modVal)) {
        // Enforce at least one module selected
        if (State.selectedModules.size > 1) {
          State.selectedModules.delete(modVal);
          chip.classList.remove("active");
        } else {
          showToast("Please select at least one module for the Unit Test.", "warning");
        }
      } else {
        State.selectedModules.add(modVal);
        chip.classList.add("active");
      }
      
      updateGeneratorTopicsFromSelectedModules();
    });
  }

  // Module drag and drop events
  const moduleDragZone = document.getElementById("module-material-drag-drop-zone");
  const moduleFileInput = document.getElementById("module-upload-file-input");

  if (moduleDragZone && moduleFileInput) {
    moduleDragZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      moduleDragZone.classList.add("dragover");
    });

    moduleDragZone.addEventListener("dragleave", () => {
      moduleDragZone.classList.remove("dragover");
    });

    moduleDragZone.addEventListener("drop", (e) => {
      e.preventDefault();
      moduleDragZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        handleModuleFilesUpload(e.dataTransfer.files);
      }
    });

    moduleFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleModuleFilesUpload(e.target.files);
      }
    });
  }

  // Generate Question Paper Submit Form
  document.getElementById("form-paper-generation-settings").addEventListener("submit", async (e) => {
    e.preventDefault();
    generatePaperWorkflow();
  });

  // Review save / export handlers
  document.getElementById("btn-review-save-to-database").addEventListener("click", async () => {
    savePaperToDatabase();
  });

  document.getElementById("btn-review-print-pdf").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-review-export-docx").addEventListener("click", () => {
    exportToDocx();
  });

  // Theme Toggle listener
  const toggleBtn = document.getElementById("btn-theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      
      toggleBtn.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
        
      showToast(`Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 'info');
    });
  }
}

// Dynamic thumbnail generator based on subject name and code
function getSubjectThumbnail(code, name) {
  const hash = code.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
    'linear-gradient(135deg, #a855f7, #6b21a8)', // Purple
    'linear-gradient(135deg, #f97316, #c2410c)', // Orange
    'linear-gradient(135deg, #10b981, #047857)', // Emerald
    'linear-gradient(135deg, #ec4899, #be185d)'  // Pink
  ];
  const bg = colors[hash % colors.length];
  
  let icon = 'fa-book';
  const lower = name.toLowerCase();
  if (lower.includes("machine") || lower.includes("ml") || lower.includes("intelligence") || lower.includes("ai")) icon = 'fa-brain';
  if (lower.includes("database") || lower.includes("dbms") || lower.includes("sql")) icon = 'fa-database';
  if (lower.includes("network") || lower.includes("cloud") || lower.includes("computing")) icon = 'fa-network-wired';
  if (lower.includes("security") || lower.includes("crypt")) icon = 'fa-shield-halved';
  if (lower.includes("game")) icon = 'fa-gamepad';
  
  return `
    <div class="subject-thumbnail" style="width: 140px; height: 75px; background: ${bg}; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 24px; flex-shrink: 0; box-shadow: inset 0 0 20px rgba(0,0,0,0.2);">
      <i class="fa-solid ${icon}"></i>
    </div>
  `;
}

// --- TEACHER DASHBOARD VIEW CONTROLLER ---
async function renderTeacherDashboard() {
  setupSidebar();
  
  if (!State.currentUser) return;

  const subjectsGrid = document.getElementById("teacher-subjects-grid");
  const recentPapersTbody = document.getElementById("recent-papers-tbody");
  
  subjectsGrid.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading subjects...</div>`;
  recentPapersTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading papers...</td></tr>`;

  try {
    // 1. Fetch Subjects
    const subjects = await DatabaseService.getSubjects(State.currentUser.id);
    State.subjects = subjects;
    
    // Update stats count
    document.getElementById("stat-subjects-count").innerText = subjects.length;

    if (subjects.length === 0) {
      subjectsGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-graduation-cap" style="font-size: 48px; margin-bottom: 16px; color: var(--border-color);"></i>
          <h3>No Subjects Added Yet</h3>
          <p style="margin-top: 8px;">Click "+ Add Subject" button in top right to get started.</p>
        </div>
      `;
    } else {
      subjectsGrid.innerHTML = subjects.map(subject => {
        const thumbnail = getSubjectThumbnail(subject.code, subject.name);
        return `
          <div class="glass-card subject-card" onclick="openSubjectWorkspace('${subject.id}')" style="display: flex; flex-direction: row; align-items: center; gap: 20px; padding: 16px; cursor: pointer; width: 100%;">
            ${thumbnail}
            <div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0;">
              <h3 class="subject-title" style="font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${subject.code} : ${subject.name}</h3>
              <span style="font-size: 13px; color: var(--text-secondary);">Semester ${subject.semester} • A.Y 2025-26</span>
            </div>
            <div style="font-size: 18px; color: var(--text-muted); margin-left: auto; padding-right: 8px;">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </div>
          </div>
        `;
      }).join("");
    }

    // 2. Fetch Recent Papers and Materials Count
    let allPapersList = [];
    let utCount = 0;
    let totalMaterialsCount = 0;
    
    for (const sub of subjects) {
      const papers = await DatabaseService.getPapers(sub.id);
      papers.forEach(p => {
        allPapersList.push({
          ...p,
          subjectCode: sub.code,
          subjectName: sub.name
        });
        if (p.exam_type === 'unit_test') utCount++;
      });
      
      const materials = await DatabaseService.getMaterials(sub.id);
      totalMaterialsCount += materials.length;
    }

    document.getElementById("stat-papers-count").innerText = allPapersList.length;
    document.getElementById("stat-ut-count").innerText = utCount;
    document.getElementById("stat-materials-count").innerText = totalMaterialsCount;

    // Sort papers by date desc
    allPapersList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (allPapersList.length === 0) {
      recentPapersTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No papers generated yet. Select a subject and generate a paper to populate archives.</td></tr>`;
    } else {
      recentPapersTbody.innerHTML = allPapersList.slice(0, 5).map(paper => `
        <tr>
          <td><strong>${paper.title}</strong></td>
          <td><span class="subject-code">${paper.subjectCode}</span></td>
          <td>${paper.exam_type === 'unit_test' ? 'Unit Test' : 'Semester Exam'}</td>
          <td><strong>${paper.total_marks}</strong></td>
          <td>${new Date(paper.created_at).toLocaleDateString()}</td>
          <td>
            <div class="item-actions">
              <button class="btn btn-icon-sm" title="View/Edit" onclick="viewArchivePaper('${paper.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="btn btn-icon-sm btn-danger" title="Delete" onclick="deleteArchivePaper('${paper.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join("");
    }

  } catch (error) {
    console.error("Failed to render dashboard:", error);
    showToast("Error retrieving dashboard details", "error");
  }
}

// --- SUBJECT WORKSPACE CONTROLLER ---
function openSubjectWorkspace(subjectId) {
  const subject = State.subjects.find(s => s.id === subjectId);
  if (!subject) return;
  State.activeSubject = subject;
  navigateTo('view-subject-workspace');
}

async function renderSubjectWorkspace() {
  setupSidebar();
  const sub = State.activeSubject;
  if (!sub) return;

  // Breadcrumbs and titles
  document.getElementById("breadcrumb-subject-code").innerText = sub.code;
  document.getElementById("subject-workspace-title").innerText = sub.name;
  document.getElementById("subject-workspace-subtitle").innerText = `Semester ${sub.semester} • Subject Code: ${sub.code}`;

  // Reset selected modules to 1 & 2 by default
  State.selectedModules = new Set([1, 2]);
  document.querySelectorAll(".module-select-chip").forEach(chip => {
    const mod = parseInt(chip.getAttribute("data-module"));
    if (mod === 1 || mod === 2) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  // Reset topics checklist
  State.extractedTopics = [];
  State.selectedTopics.clear();

  // Reset tab selection to tab-materials
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
  document.querySelector('[data-tab="tab-materials"]').classList.add('active-tab');
  document.getElementById('tab-materials').classList.add('active-content');

  // Fetch materials & papers archive
  await refreshMaterials();
  await refreshSubjectArchive();
}

async function refreshMaterials() {
  const sub = State.activeSubject;
  const grid = document.getElementById("modules-card-grid");
  if (!grid) return;
  
  grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Loading modules...</div>`;

  try {
    const materials = await DatabaseService.getMaterials(sub.id);
    State.materials = materials;

    // Group and render modules 1-6 + Past Papers (7)
    let gridHtml = "";
    for (let m = 1; m <= 7; m++) {
      const moduleMaterials = materials.filter(mat => {
        const modNum = getMaterialModule(mat.name);
        // If uncategorized, treat as Module 1
        if (modNum === null && m === 1) return true;
        return modNum === m;
      });
      
      const moduleTopics = new Set();
      moduleMaterials.forEach(mat => {
        if (Array.isArray(mat.extracted_topics)) {
          mat.extracted_topics.forEach(t => moduleTopics.add(t));
        }
      });
      
      const isPastPapers = m === 7;
      const title = isPastPapers ? "Previous Year Papers" : `Module ${m} Materials`;
      const label = isPastPapers ? "PYQ" : `Module ${m}`;
      const icon = isPastPapers ? "fa-file-signature" : "fa-folder-open";

      gridHtml += `
        <div class="glass-card module-card" onclick="openModuleWorkspace(${m})">
          <div class="module-card-header">
            <div class="module-icon"><i class="fa-solid ${icon}"></i></div>
            <span class="module-number">${label}</span>
          </div>
          <h3 class="module-title">${title}</h3>
          <div class="module-summary">
            <span class="badge badge-info" style="font-size: 11px; padding: 4px 8px;"><i class="fa-solid fa-file" style="margin-right: 4px;"></i> ${moduleMaterials.length} Files</span>
            <span class="badge badge-success" style="font-size: 11px; padding: 4px 8px;"><i class="fa-solid fa-brain" style="margin-right: 4px;"></i> ${moduleTopics.size} Topics</span>
          </div>
          <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 12px; font-size: 13px; padding: 6px;">Open Module <i class="fa-solid fa-arrow-right" style="margin-left: 4px; font-size: 10px;"></i></button>
        </div>
      `;
    }
    
    grid.innerHTML = gridHtml;
    
    // Update active topics for paper generation
    updateGeneratorTopicsFromSelectedModules();

  } catch (error) {
    console.error("Failed to refresh modules:", error);
    showToast("Error retrieving modules materials", "error");
  }
}

// Group topics inside the selected modules and update checkboxes
function updateGeneratorTopicsFromSelectedModules() {
  const materials = State.materials || [];
  const selectedTopicsSet = new Set();
  
  materials.forEach(m => {
    const modNum = getMaterialModule(m.name);
    const normalizedMod = modNum === null ? 1 : modNum;
    
    if (State.selectedModules.has(normalizedMod)) {
      if (Array.isArray(m.extracted_topics)) {
        m.extracted_topics.forEach(t => selectedTopicsSet.add(t));
      }
    }
  });
  
  State.selectedTopics = selectedTopicsSet;
  updateGeneratorTopicsText();
}

// Open module detailed view dialog
function openModuleWorkspace(moduleNum) {
  State.activeModule = moduleNum;
  
  const modal = document.getElementById("modal-module-workspace");
  const modalTitle = document.getElementById("module-workspace-modal-title");
  
  const isPastPapers = moduleNum === 7;
  modalTitle.innerText = isPastPapers ? "Previous Year Papers Workspace" : `Module ${moduleNum} Workspace`;
  
  const uploadTitle = document.getElementById("module-upload-title");
  uploadTitle.innerText = isPastPapers 
    ? "Drag & Drop Previous Year Papers" 
    : `Drag & Drop Module ${moduleNum} Notes / Materials`;

  refreshModuleWorkspaceDetails();
  
  modal.style.display = "flex";
}
window.openModuleWorkspace = openModuleWorkspace;

// Renders the list of files and topics inside open module modal
function refreshModuleWorkspaceDetails() {
  const moduleNum = State.activeModule;
  const materialsList = document.getElementById("module-uploaded-materials-list");
  const topicsContainer = document.getElementById("module-ai-topics-container");
  
  if (!materialsList || !topicsContainer) return;
  
  const filtered = State.materials.filter(m => {
    const modNum = getMaterialModule(m.name);
    if (modNum === null && moduleNum === 1) return true;
    return modNum === moduleNum;
  });
  
  document.getElementById("module-badge-materials-count").innerText = `${filtered.length} Files`;

  if (filtered.length === 0) {
    materialsList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">No documents uploaded to this module yet.</div>`;
    topicsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">Upload notes to extract concepts.</div>`;
    document.getElementById("module-badge-topics-count").innerText = "0 Topics";
    return;
  }
  
  // Render documents list
  materialsList.innerHTML = filtered.map(m => {
    const displayName = stripModulePrefix(m.name);
    return `
      <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.02); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); width: 100%;">
        <span class="item-name" style="font-size: 13px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 240px;" title="${displayName}">
          <i class="fa-solid ${m.type === 'notes' ? 'fa-file-lines' : 'fa-file-signature'}" style="color: var(--primary-color); margin-right: 6px;"></i> ${displayName}
        </span>
        <button class="btn btn-icon-sm btn-danger" title="Delete file" onclick="deleteModuleMaterial('${m.id}')" style="margin-left: auto;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }).join("");
  
  // Extracted topics
  const topics = new Set();
  filtered.forEach(m => {
    if (Array.isArray(m.extracted_topics)) {
      m.extracted_topics.forEach(t => topics.add(t));
    }
  });
  
  document.getElementById("module-badge-topics-count").innerText = `${topics.size} Topics`;
  
  if (topics.size === 0) {
    topicsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px; width: 100%;">No topics extracted yet.</div>`;
  } else {
    topicsContainer.innerHTML = Array.from(topics).map(topic => `
      <span class="badge badge-success" style="font-size: 11px; padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-brain" style="margin-right: 6px;"></i> ${topic}</span>
    `).join("");
  }
}

// Delete material handler inside workspace details view
async function deleteModuleMaterial(materialId) {
  showLoader(true, "Deleting document...");
  try {
    const { error } = await supabaseClient
      .from('materials')
      .delete()
      .eq('id', materialId);
      
    if (error) throw error;
    showToast("Document deleted successfully.", "info");
    
    // Refresh
    const sub = State.activeSubject;
    const materials = await DatabaseService.getMaterials(sub.id);
    State.materials = materials;
    refreshModuleWorkspaceDetails();
    await refreshMaterials();
  } catch (error) {
    console.error(error);
    showToast("Failed to delete document", "error");
  } finally {
    showLoader(false);
  }
}
window.deleteModuleMaterial = deleteModuleMaterial;

// Handles file uploads to a specific module
async function handleModuleFilesUpload(filesList) {
  const sub = State.activeSubject;
  const moduleNum = State.activeModule;
  if (!sub || !moduleNum) return;

  showLoader(true, "Analyzing and uploading files...");

  try {
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      let extracted = [];
      
      if (file.name.endsWith('.txt')) {
        const fileContent = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
        extracted = AIEngine.extractTopics(file.name, fileContent);
      } else {
        extracted = AIEngine.extractTopics(file.name, "");
      }

      const isPrevPaper = moduleNum === 7 || 
                           file.name.toLowerCase().includes("paper") || 
                           file.name.toLowerCase().includes("exam") || 
                           file.name.toLowerCase().includes("test");
      const type = isPrevPaper ? 'previous_paper' : 'notes';

      // Prefix filename with module details
      const prefix = moduleNum === 7 ? "[Past Papers] " : `[Module ${moduleNum}] `;
      const prefixedName = prefix + file.name;

      await DatabaseService.uploadMaterial(sub.id, prefixedName, type, extracted);
    }

    showToast("Documents uploaded and AI topics extracted for this module!", "success");
    
    const materials = await DatabaseService.getMaterials(sub.id);
    State.materials = materials;
    refreshModuleWorkspaceDetails();
    await refreshMaterials();

  } catch (error) {
    console.error("Upload error:", error);
    showToast(error.message || "Failed to upload materials", "error");
  } finally {
    showLoader(false);
  }
}

// Update checkable topics checklist under generator setting form
function updateGeneratorTopicsText() {
  const container = document.getElementById("generator-selected-topics-list");
  if (!container) return;
  
  if (State.selectedTopics.size === 0) {
    container.innerHTML = `<span style="color: var(--danger-color); font-weight: 500;">No topics found in the selected modules. Please upload study materials to these modules.</span>`;
    return;
  }
  
  container.innerHTML = Array.from(State.selectedTopics).map(topic => `
    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; user-select: none;">
      <input type="checkbox" checked value="${topic}" class="generator-topic-checkbox" style="width: 16px; height: 16px; accent-color: var(--primary-color);">
      <span>${topic}</span>
    </label>
  `).join("");
}

async function refreshSubjectArchive() {
  const sub = State.activeSubject;
  const tbody = document.getElementById("subject-archive-tbody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Loading archive...</td></tr>`;

  try {
    const papers = await DatabaseService.getPapers(sub.id);
    papers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (papers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No question papers generated in this subject yet.</td></tr>`;
    } else {
      tbody.innerHTML = papers.map(paper => `
        <tr>
          <td><strong>${paper.title}</strong></td>
          <td>${paper.exam_type === 'unit_test' ? 'Unit Test' : 'Semester Exam'}</td>
          <td><strong>${paper.total_marks}</strong></td>
          <td>${new Date(paper.created_at).toLocaleDateString()}</td>
          <td>
            <div class="item-actions">
              <button class="btn btn-icon-sm" title="View/Edit" onclick="viewArchivePaper('${paper.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="btn btn-icon-sm btn-danger" title="Delete" onclick="deleteArchivePaper('${paper.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join("");
    }
  } catch (error) {
    console.error("Archive error:", error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-danger);">Failed to retrieve archive.</td></tr>`;
  }
}

// --- QUESTION PAPER GENERATION WORKFLOW ---
async function generatePaperWorkflow() {
  const sub = State.activeSubject;
  if (!sub) return;

  const checkedBoxes = document.querySelectorAll(".generator-topic-checkbox:checked");
  const topicsArr = Array.from(checkedBoxes).map(cb => cb.value);

  // Validation: Check if topics are selected
  if (topicsArr.length === 0) {
    showToast("Please check/select at least one topic to generate the paper.", "error");
    return;
  }

  const examType = "unit_test";
  const modelNumber = document.getElementById("generator-model-code").value;
  
  let totalMarks = 20;
  let markingSchemeStr = document.getElementById("ut-marking-scheme").value;
  
  // Validate marking scheme split
  const split = markingSchemeStr.split("+").map(x => parseInt(x.trim()));
  const sum = split.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);
  
  if (sum !== 20 || split.some(isNaN)) {
    showToast("Unit Test marking scheme split must sum up to exactly 20 marks. (e.g. 8+7+5)", "error");
    return;
  }
  
  const choiceStructure = {
    markingList: split,
    choiceType: "one_out_of_two"
  };

  // Visual Generation Stepper Simulation
  showLoader(true, "Initializing parameters...");
  const steps = [
    { id: "step-loader-1", text: "Reading study materials & previous patterns..." },
    { id: "step-loader-2", text: "Structuring question options & alternative mappings..." },
    { id: "step-loader-3", text: "Balancing cognitive difficulty splits (Easy/Medium/Hard)..." },
    { id: "step-loader-3", text: "Synthesizing final exam layout content..." }
  ];

  // Run stepper delays
  for (let idx = 0; idx < steps.length; idx++) {
    await new Promise(r => setTimeout(r, 600));
    document.querySelectorAll(".loader-step").forEach(el => el.classList.remove("active"));
    
    const stepEl = document.getElementById("step-loader-2"); // reuse container for update
    if (stepEl) {
      stepEl.className = "loader-step active";
      stepEl.innerText = steps[idx].text;
    }
  }

  try {
    // Call Generation Engine
    const generatedPaper = await AIEngine.generateQuestionPaper(
      sub.name, sub.code, sub.semester, topicsArr, examType, totalMarks, modelNumber, markingSchemeStr, choiceStructure
    );

    // Save paper details to active state
    State.activePaper = {
      id: null, // unsaved new paper
      subject_id: sub.id,
      title: generatedPaper.title || `${sub.name} Unit Test (Model ${modelNumber})`,
      exam_type: examType,
      total_marks: totalMarks,
      model_number: modelNumber,
      marking_scheme: markingSchemeStr,
      content: generatedPaper
    };

    showToast("Question Paper generated successfully by AI!", "success");
    navigateTo('view-review-edit');

  } catch (error) {
    console.error("AI Paper Generation Failed:", error);
    showToast(error.message || "Paper generation failed.", "error");
  } finally {
    showLoader(false);
  }
}

// --- REVIEW AND EDIT WORKSPACE ---
function renderPaperReview() {
  setupSidebar();
  const paper = State.activePaper;
  const sub = State.activeSubject;
  if (!paper) return;

  // Set top breadcrumbs
  document.getElementById("review-breadcrumb-subject").innerText = sub ? sub.name : "Subject";
  document.getElementById("review-info-subject").innerText = sub ? sub.name : "Unknown Subject";
  document.getElementById("review-info-exam").innerText = paper.exam_type === 'unit_test' ? 'Unit Test' : 'Semester Exam';
  document.getElementById("review-info-marks").innerText = `${paper.total_marks} Marks`;
  document.getElementById("review-info-model").innerText = paper.model_number;

  // Toggle Save to DB button status (disabled if already saved in db)
  const saveBtn = document.getElementById("btn-review-save-to-database");
  if (paper.id) {
    saveBtn.innerText = "Paper Saved in Archive";
    saveBtn.disabled = true;
    saveBtn.className = "btn btn-secondary";
  } else {
    saveBtn.innerText = "Save Paper to Archive";
    saveBtn.disabled = false;
    saveBtn.className = "btn btn-primary";
  }

  // Draw academic paper layout HTML
  const content = paper.content;
  const paperArea = document.getElementById("paper-academic-rendering-area");

  let instructionsHtml = '';
  if (content.instructions && content.instructions.length > 0) {
    instructionsHtml = `
      <div class="academic-instructions">
        <strong>Instructions:</strong>
        <ol>
          ${content.instructions.map(ins => `<li>${ins}</li>`).join("")}
        </ol>
      </div>
    `;
  }

  let questionsHtml = '';
  if (content.questions && content.questions.length > 0) {
    content.questions.forEach((qBlock, qIdx) => {
      let qTypeHtml = '';

      if (qBlock.type === 'choice_or') {
        const opA = qBlock.options[0];
        const opB = qBlock.options[1];
        
        qTypeHtml = `
          <!-- Option A -->
          <div class="interactive-q-row academic-q-row" id="qrow-${qIdx}-A">
            <span class="academic-q-num">Q${qBlock.question_number}A</span>
            <span class="academic-q-text" id="qtext-${qIdx}-A" onclick="makeQuestionEditable('${qIdx}', 'A')">${opA.text}</span>
            <span class="academic-q-marks">[${opA.marks}]</span>
            <div class="q-edit-overlay">
              <button class="btn-icon-sm" title="Edit text" onclick="makeQuestionEditable('${qIdx}', 'A')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon-sm" title="Regenerate question options" onclick="regenerateQuestionOption('${qIdx}', '0')"><i class="fa-solid fa-arrows-rotate"></i></button>
            </div>
          </div>
          
          <div class="academic-or-separator">OR</div>
          
          <!-- Option B -->
          <div class="interactive-q-row academic-q-row" id="qrow-${qIdx}-B">
            <span class="academic-q-num">Q${qBlock.question_number}B</span>
            <span class="academic-q-text" id="qtext-${qIdx}-B" onclick="makeQuestionEditable('${qIdx}', 'B')">${opB.text}</span>
            <span class="academic-q-marks">[${opB.marks}]</span>
            <div class="q-edit-overlay">
              <button class="btn-icon-sm" title="Edit text" onclick="makeQuestionEditable('${qIdx}', 'B')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon-sm" title="Regenerate question options" onclick="regenerateQuestionOption('${qIdx}', '1')"><i class="fa-solid fa-arrows-rotate"></i></button>
            </div>
          </div>
        `;
      } else if (qBlock.type === 'choice_any_two' || qBlock.type === 'choice_any_one') {
        qTypeHtml = `
          <div style="font-weight: bold; font-size: 15px; margin-bottom: 8px; font-style: italic;">${qBlock.choice_text || 'Answer the following'}:</div>
          ${qBlock.options.map((op, opIdx) => `
            <div class="interactive-q-row academic-q-row" id="qrow-${qIdx}-${op.option_letter}">
              <span class="academic-q-num">Q${qBlock.question_number}${op.option_letter}</span>
              <span class="academic-q-text" id="qtext-${qIdx}-${op.option_letter}" onclick="makeQuestionEditable('${qIdx}', '${op.option_letter}')">${op.text}</span>
              <span class="academic-q-marks">[${op.marks}]</span>
              <div class="q-edit-overlay">
                <button class="btn-icon-sm" title="Edit text" onclick="makeQuestionEditable('${qIdx}', '${op.option_letter}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon-sm" title="Regenerate question options" onclick="regenerateQuestionOption('${qIdx}', '${opIdx}')"><i class="fa-solid fa-arrows-rotate"></i></button>
              </div>
            </div>
          `).join("")}
        `;
      } else {
        // Single mandatory question
        const op = qBlock.options[0];
        qTypeHtml = `
          <div class="interactive-q-row academic-q-row" id="qrow-${qIdx}-A">
            <span class="academic-q-num">Q${qBlock.question_number}</span>
            <span class="academic-q-text" id="qtext-${qIdx}-A" onclick="makeQuestionEditable('${qIdx}', 'A')">${op.text}</span>
            <span class="academic-q-marks">[${op.marks}]</span>
            <div class="q-edit-overlay">
              <button class="btn-icon-sm" title="Edit text" onclick="makeQuestionEditable('${qIdx}', 'A')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon-sm" title="Regenerate question options" onclick="regenerateQuestionOption('${qIdx}', '0')"><i class="fa-solid fa-arrows-rotate"></i></button>
            </div>
          </div>
        `;
      }

      questionsHtml += `
        <div class="academic-question-block">
          <div style="position: absolute; left: -36px; top: 0;" class="q-edit-overlay">
            <button class="btn-icon-sm" title="Move Up" onclick="moveQuestion(${qIdx}, 'up')"><i class="fa-solid fa-arrow-up"></i></button>
            <button class="btn-icon-sm" title="Move Down" onclick="moveQuestion(${qIdx}, 'down')"><i class="fa-solid fa-arrow-down"></i></button>
          </div>
          ${qTypeHtml}
        </div>
      `;
    });
  }

  paperArea.innerHTML = `
    <div class="academic-header">
      <div class="academic-inst">DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING</div>
      <div class="academic-exam-title">${content.title || 'Semester Assessment'}</div>
      <div class="academic-meta-grid">
        <div><strong>Subject Code:</strong> ${content.subject_code || ''}</div>
        <div><strong>Semester:</strong> ${content.semester || ''}</div>
      </div>
    </div>
    
    <div class="academic-marks-time">
      <span>Total Marks: ${content.total_marks || paper.total_marks} Marks</span>
      <span>Duration: ${paper.exam_type === 'unit_test' ? '1 Hour' : '3 Hours'}</span>
    </div>

    ${instructionsHtml}
    ${questionsHtml}
  `;
}

// In-line editing textbox conversion
function makeQuestionEditable(qIdx, optionLetter) {
  const textSpan = document.getElementById(`qtext-${qIdx}-${optionLetter}`);
  if (!textSpan || textSpan.tagName === 'TEXTAREA') return;

  const currentText = textSpan.innerText;
  const textarea = document.createElement("textarea");
  textarea.className = "inline-q-textarea";
  textarea.value = currentText;
  textarea.rows = 3;

  textarea.addEventListener("blur", () => {
    saveInlineQuestionEdit(qIdx, optionLetter, textarea.value);
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textarea.blur();
    }
  });

  textSpan.replaceWith(textarea);
  textarea.focus();
}
window.makeQuestionEditable = makeQuestionEditable; // expose

// Save Inline Edit
function saveInlineQuestionEdit(qIdx, optionLetter, newText) {
  const paper = State.activePaper;
  if (!paper) return;

  const qBlock = paper.content.questions[parseInt(qIdx)];
  const option = qBlock.options.find(op => op.option_letter === optionLetter || (qBlock.type === 'single' && optionLetter === 'A'));
  
  if (option && newText.trim() !== "") {
    option.text = newText;
  }
  
  renderPaperReview();
}

// Regenerate single question using random index from database
function regenerateQuestionOption(qIdx, optionIndex) {
  const paper = State.activePaper;
  if (!paper) return;

  const qBlock = paper.content.questions[parseInt(qIdx)];
  const option = qBlock.options[parseInt(optionIndex)];
  
  if (!option) return;

  // Collect all question texts currently in paper to avoid repeat
  const existingTexts = [];
  paper.content.questions.forEach(qb => {
    qb.options.forEach(o => existingTexts.push(o.text));
  });

  const marks = option.marks;
  const newQ = AIEngine.getRandomQuestionOfMarks(marks, existingTexts);
  
  option.text = newQ.text;
  option.topic = newQ.topic;
  option.difficulty = newQ.difficulty;
  
  showToast("Question regenerated!", "info");
  renderPaperReview();
}
window.regenerateQuestionOption = regenerateQuestionOption; // expose

// Move question order up/down
function moveQuestion(index, direction) {
  const paper = State.activePaper;
  if (!paper) return;

  const questions = paper.content.questions;
  if (direction === 'up' && index > 0) {
    // swap
    const temp = questions[index];
    questions[index] = questions[index - 1];
    questions[index - 1] = temp;
    
    // adjust question numbering
    const num1 = questions[index].question_number;
    questions[index].question_number = questions[index - 1].question_number;
    questions[index - 1].question_number = num1;
  } else if (direction === 'down' && index < questions.length - 1) {
    const temp = questions[index];
    questions[index] = questions[index + 1];
    questions[index + 1] = temp;

    const num1 = questions[index].question_number;
    questions[index].question_number = questions[index + 1].question_number;
    questions[index + 1].question_number = num1;
  }

  renderPaperReview();
}
window.moveQuestion = moveQuestion; // expose

// Save Question Paper to database
async function savePaperToDatabase() {
  const paper = State.activePaper;
  if (!paper || paper.id) return; // already saved

  showLoader(true, "Saving to database archive...");
  try {
    const saved = await DatabaseService.savePaper(
      paper.subject_id,
      paper.title,
      paper.exam_type,
      paper.total_marks,
      paper.model_number,
      paper.marking_scheme,
      paper.content
    );
    
    State.activePaper.id = saved.id;
    showToast("Question Paper saved to database archive successfully!", "success");
    renderPaperReview(); // redraws screen, disables save button

  } catch (error) {
    console.error(error);
    showToast("Failed to save paper to database.", "error");
  } finally {
    showLoader(false);
  }
}

// Render archive papers in Review Workspace
async function viewArchivePaper(paperId) {
  showLoader(true, "Retrieving paper...");
  try {
    const paper = await DatabaseService.getPaperById(paperId);
    if (!paper) throw new Error("Paper details not found.");
    
    State.activePaper = paper;
    State.activeSubject = paper.subjects; // bind subject context
    
    navigateTo('view-review-edit');
  } catch (error) {
    console.error(error);
    showToast("Error retrieving paper", "error");
  } finally {
    showLoader(false);
  }
}
window.viewArchivePaper = viewArchivePaper; // expose

// Delete question paper from database
async function deleteArchivePaper(paperId) {
  showLoader(true, "Deleting paper...");
  try {
    await DatabaseService.deletePaper(paperId);
    showToast("Question paper deleted.", "info");
    
    // Refresh lists
    if (State.activeView === 'view-teacher-dashboard') {
      await renderTeacherDashboard();
    } else if (State.activeView === 'view-subject-workspace') {
      await refreshSubjectArchive();
    } else if (State.activeView === 'view-hod-dashboard') {
      await renderHODDashboard();
    }
  } catch (error) {
    console.error(error);
    showToast("Failed to delete paper", "error");
  } finally {
    showLoader(false);
  }
}
window.deleteArchivePaper = deleteArchivePaper; // expose

// DOCX Formatting Export Blob
function exportToDocx() {
  const paper = State.activePaper;
  if (!paper) return;

  // Build basic HTML structure that MS Word parses perfectly as document
  const htmlContent = document.getElementById("paper-academic-rendering-area").innerHTML;
  
  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${paper.title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; }
        .academic-header { text-align: center; border-bottom: 2pt solid #000; padding-bottom: 12pt; margin-bottom: 18pt; }
        .academic-inst { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .academic-exam-title { font-size: 13pt; font-weight: bold; margin: 6pt 0; }
        .academic-meta-grid { display: table; width: 100%; font-size: 11pt; margin-top: 10pt; }
        .academic-meta-grid div { display: inline-block; width: 48%; }
        .academic-marks-time { border-bottom: 1pt solid #000; padding-bottom: 6pt; margin-bottom: 18pt; font-size: 11pt; font-weight: bold; }
        .academic-marks-time span { display: inline-block; width: 48%; }
        .academic-marks-time span:last-child { text-align: right; }
        .academic-instructions { font-size: 11pt; font-style: italic; margin-bottom: 18pt; }
        .academic-question-block { margin-bottom: 18pt; }
        .academic-q-row { display: table; width: 100%; margin-bottom: 6pt; }
        .academic-q-num { display: table-cell; width: 40pt; font-weight: bold; }
        .academic-q-text { display: table-cell; text-align: justify; }
        .academic-q-marks { display: table-cell; width: 50pt; text-align: right; font-weight: bold; }
        .academic-or-separator { text-align: center; font-weight: bold; margin: 10pt 0; font-size: 11pt; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + fullHtml], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${paper.title.replace(/\s+/g, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("DOCX file generated and download started.", "success");
}

// --- HOD DASHBOARD CONTROLLER ---
async function renderHODDashboard() {
  setupSidebar();
  
  if (!State.currentUser) return;

  const teachersTbody = document.getElementById("hod-teachers-tbody");
  const papersTbody = document.getElementById("hod-papers-tbody");

  teachersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Loading teachers directory...</td></tr>`;
  papersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading department papers...</td></tr>`;

  try {
    // 1. Fetch Department Stats
    const stats = await DatabaseService.getDepartmentStats();
    document.getElementById("hod-stat-teachers").innerText = stats.teachers;
    document.getElementById("hod-stat-subjects").innerText = stats.subjects;
    document.getElementById("hod-stat-papers").innerText = stats.papers;
    
    document.getElementById("hod-stat-ratio").innerText = stats.materials;

    // 2. Fetch Teachers Directory List
    const teachersList = await DatabaseService.getTeachersList();
    if (teachersList.length === 0) {
      teachersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No teachers registered yet.</td></tr>`;
    } else {
      teachersTbody.innerHTML = teachersList.map(teacher => {
        const subsText = teacher.subjects.length > 0 
          ? teacher.subjects.map(s => `<span class="subject-code">${s.code}</span>`).join(" ")
          : `<span style="color: var(--text-muted); font-style: italic;">No subjects assigned</span>`;
        return `
          <tr>
            <td><strong>${teacher.name}</strong></td>
            <td>${teacher.email}</td>
            <td>${subsText}</td>
            <td><strong>${teacher.papersCount}</strong> papers generated</td>
          </tr>
        `;
      }).join("");
    }

    // 3. Fetch All Departmental Papers
    const allPapers = await DatabaseService.getAllPapers();
    if (allPapers.length === 0) {
      papersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No departmental question papers found.</td></tr>`;
    } else {
      papersTbody.innerHTML = allPapers.map(paper => {
        const subName = paper.subjects ? paper.subjects.name : "N/A";
        const subCode = paper.subjects ? paper.subjects.code : "";
        const teacherName = paper.subjects?.profiles ? paper.subjects.profiles.name : "Unknown Faculty";
        
        return `
          <tr>
            <td><strong>${paper.title}</strong></td>
            <td>${subName} <span class="subject-code" style="margin-left: 6px;">${subCode}</span></td>
            <td>${teacherName}</td>
            <td>${paper.exam_type === 'unit_test' ? 'Unit Test' : 'Semester Exam'}</td>
            <td><strong>${paper.total_marks}</strong></td>
            <td>${new Date(paper.created_at).toLocaleDateString()}</td>
            <td>
              <div class="item-actions">
                <button class="btn btn-icon-sm" title="View Paper" onclick="viewArchivePaper('${paper.id}')"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-icon-sm btn-danger" title="Delete Paper" onclick="deleteArchivePaper('${paper.id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

  } catch (error) {
    console.error("HOD Dashboard error:", error);
    showToast("Error retrieving departmental reports", "error");
  }
}

// --- UTILITIES & LAYOUT HELPERS ---

// Show/Hide page spinner loader
function showLoader(show, text = "Loading...") {
  const overlay = document.getElementById("loading-overlay");
  if (show) {
    const textEl = document.querySelector("#loading-overlay-steps h2");
    if (textEl) textEl.innerText = text;
    overlay.style.display = "flex";
  } else {
    overlay.style.display = "none";
  }
}

// Show animated Toast Alerts
function showToast(message, type = 'info') {
  const container = document.getElementById("toast-messages-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Auto remove after 4.5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 4500);
}
