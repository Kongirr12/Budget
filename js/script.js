<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
<script src="https://cdn.datatables.net/2.0.8/js/dataTables.min.js"></script>
<script src="https://cdn.datatables.net/2.0.8/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- Tom-Select JS ถูกย้ายไป index.html (ก่อนไฟล์นี้) -->

<script>
  // ==============================
  // ตัวแปรหลัก (SCOPE FIX: เปลี่ยน let เป็น var)
  // ==============================
  var summaryData = []; // เก็บข้อมูลสรุปโครงการ (ตอนนี้จะมี balance และ sequence)
  var projects = []; // เก็บรายการโครงการ (สำหรับ dropdown)
  var latestTransactions = []; // เก็บรายการทำธุรกรรมล่าสุด
  var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // ตรวจสอบสถานะล็อกอิน
  var fullName = localStorage.getItem('fullName') || ''; // ชื่อผู้ใช้
  var userRole = localStorage.getItem('userRole') || ''; // [EDITED] เพิ่ม Role
  var authToken = localStorage.getItem('authToken') || ''; // [NEW] เพิ่ม Token

  // [EDITED] เพิ่มตัวแปรสำหรับ Tom-Select
  var assignableUsers = []; // [REFACTOR] เก็บ {id, fullName}
  var tomSelectOwner = null; // เก็บ instance ของ Tom-Select

  // [NEW] เพิ่มตัวแปรสำหรับ Chart.js ของ Admin Dashboard
  var budgetChartInstance = null; 

  // [BATCH EDIT] ---------------------------------------------------
  // เพิ่มตัวแปรสำหรับ Modal และ Batch Processing
  var uploadModal = null;
  var currentUploadTxId = null; // เก็บ TxId ที่กำลังอัปโหลด
  var uploadMode = 'read';      // 'read' หรือ 'edit'
  var stagedUploads = [];   // ไฟล์ใหม่ (Base64) ที่รออัปโหลด
  var stagedDeletions = []; // fileId เก่า ที่รอลบ
  // ----------------------------------------------------------------
  
  // [REFACTOR] 
  /**
   * Helper: แปลง UUID เป็น FullName
   * @param {string} userId - UUID ของผู้ใช้
   * @returns {string} ชื่อเต็ม หรือ (ไม่พบชื่อ)
   */
  function getUserFullName(userId) {
    if (!userId) return '(ไม่ได้ระบุ)';
    const user = assignableUsers.find(function(u) { return u.id === userId; });
    return user ? user.fullName : '(ไม่พบชื่อ)';
  }

  /**
   * [NEW] Helper (Client-side): แปลงข้อมูล Owner
   * รองรับทั้งข้อมูลเก่า (String "uuid") และข้อมูลใหม่ (JSON String ["uuid1", "uuid2"])
   */
  function _parseOwnerIds(ownerData) {
    if (!ownerData) {
      return []; // ถ้าค่าเป็น null หรือ ""
    }
    if (typeof ownerData === 'string' && ownerData.startsWith('[')) {
      try {
        // นี่คือรูปแบบใหม่: ["uuid1", "uuid2"]
        const ids = JSON.parse(ownerData);
        return Array.isArray(ids) ? ids : [];
      } catch (e) {
        console.error("Failed to parse Owner JSON: " + ownerData);
        return [];
      }
    }
    if (typeof ownerData === 'string' && ownerData.length > 0) {
      // นี่คือรูปแบบเก่า: "uuid1"
      return [ownerData];
    }
    return [];
  }

  // [REFACTOR]
  /**
   * โหลดรายชื่อผู้ใช้ (ID, Name) สำหรับ Staff และ Admin
   * (ย้ายมาจาก script1.html และแก้ไข)
   */
  function loadAssignableUsers() {
    // [REFACTOR] Staff และ Admin เรียกใช้ได้
    if (userRole !== 'Admin' && userRole !== 'Staff') return; 
    
    // ไม่ต้อง loadingStart() เพราะทำงานเบื้องหลัง
    google.script.run
      .withFailureHandler(onFailure)
      .withSuccessHandler(function(users) { // [SYNTAX FIX]
        // [REFACTOR] assignableUsers ตอนนี้คือ [{id, fullName}, ...]
        assignableUsers = users; 
      })
      .getAssignableUsersList(authToken); // [REFACTOR] เรียกฟังก์ชันใหม่
  }


  /**
   * [NEW] Centralized Failure Handler
   * @param {Error} error - The error object from google.script.run
   */
  /* [EDITED-V2] Making onFailure more robust to handle 429 errors and null/undefined messages */
  function onFailure(error) {
    loadingEnd(); // Always stop the loader on failure
    console.error('GAS Server Error:', error); // Keep this for debugging

    let errorName = "Error";
    let errorMessage = ""; // [FIX] Start empty

    // 1. Extract Name and Message safely
    if (typeof error === 'object' && error !== null) {
      errorName = error.name || "Error";
      if (typeof error.message === 'object') {
        errorMessage = JSON.stringify(error.message); // Handle nested error objects
      } else {
        errorMessage = error.message; // This might be undefined, null, or a string
      }
    } else if (typeof error === 'string') {
      errorMessage = error; // Error is just a string
    }

    // 2. [FIX] Coerce to string and provide a default if it's null, undefined, or empty
    // This prevents .includes() from failing on undefined
    errorMessage = String(errorMessage || "การเชื่อมต่อล้มเหลว หรือ Server ไม่ตอบสนอง");

    // 3. Now it's safe to use .includes()
    let errorText = '[' + errorName + '] ' + errorMessage + '. กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ';

    if (errorMessage.includes("Invalid or expired token")) {
      errorText = "เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง";
      forceLogout(); 
    }
    
    if (errorMessage.includes("HTTP 429") || errorMessage.includes("Too Many Requests")) {
        errorName = "TooManyRequests"; // Ensure name is correct
        errorText = "ขณะนี้ Server กำลังประมวลผลคำขอจำนวนมาก (HTTP 429) กรุณารอสักครู่ (ประมาณ 1-2 นาที) แล้วลองใหม่อีกครั้ง";
    }

    // 4. Display the final, safe error message
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาดฝั่ง Server (' + errorName + ')',
      text: errorText,
      footer: 'โปรดตรวจสอบ Console log สำหรับข้อมูลเพิ่มเติม'
    });
  }


  // [NEW] ฟังก์ชันบังคับ Logout (เมื่อ Token ผิดพลาด)
  function forceLogout() {
    isLoggedIn = false;
    fullName = '';
    userRole = '';
    authToken = ''; // [NEW] ล้าง Token
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('fullName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken'); // [NEW] ล้าง Token

    // [EDITED] เปลี่ยนไปเรียก getScriptUrl เพื่อรีโหลดหน้า
    google.script.run
      .withFailureHandler(function(err) { console.error("Logout reload failed: ", err) }) // [SYNTAX FIX]
      .withSuccessHandler(function(url) { // [SYNTAX FIX]
        window.top.location.href = url;
      })
      .getScriptUrl();
  }

  // ==============================
  // ฟังก์ชันเมื่อโหลดหน้าเว็บเสร็จ
  // ==============================
  document.addEventListener('DOMContentLoaded', function() { // [SYNTAX FIX]
    // ตั้งค่า Toastr
    toastr.options = {
      "positionClass": "toast-bottom-right",
      "timeOut": "3000",
      "progressBar": true
    };

    updateNavbar(); // อัพเดตเมนูนำทาง (และใช้สิทธิ์)
    loadProjectSummary(); // โหลดข้อมูลสรุปโครงการ

    if (isLoggedIn) {
      // [NEW] ตรวจสอบ Token ว่ายังใช้ได้หรือไม่
      // (เราจะเรียก loadProjects() ซึ่งต้องใช้ Token,
      // ถ้ามัน Fail ใน onFailure, มันจะบังคับ Logout เอง)
      loadProjects();
      // [UX EDIT] เปลี่ยนจาก 'admin' เป็น 'public'
      showSection('public'); 
    } else {
      showSection('public'); // แสดงหน้าสาธารณะ
    }

    // [BATCH EDIT] Initial Modal และ ปุ่มควบคุม
    if (document.getElementById('modalUploadFiles')) {
      uploadModal = new bootstrap.Modal(document.getElementById('modalUploadFiles'));
      setupDropzones(); // ตั้งค่า Dropzone (เหมือนเดิม)
      
      // ปุ่มควบคุมโหมด
      document.getElementById('btnUploadEdit').addEventListener('click', function() {
        setUploadMode('edit');
      });
      document.getElementById('btnUploadCancel').addEventListener('click', function() {
        cancelUploadChanges();
      });
      document.getElementById('btnUploadSave').addEventListener('click', function() {
        saveFileChangesClient();
      });
    }


    // ==============================
    // ฟอร์มล็อกอิน
    // ==============================
    document.getElementById('loginForm').addEventListener('submit', function(e) { // [SYNTAX FIX]
      e.preventDefault(); // ป้องกันการ submit แบบปกติ

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      if (!username || !password) {
        Swal.fire('ผิดพลาด', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
        return;
      }

      loadingStart(); // เริ่ม animation โหลด
      google.script.run
        .withFailureHandler(onFailure) // [NEW] Added Failure Handler
        .withSuccessHandler(function(response) { // [SYNTAX FIX]
          loadingEnd(); // หยุด animation โหลด

          if (response.success) {
            // กำหนดสถานะล็อกอิน
            isLoggedIn = true;
            fullName = response.fullName;
            userRole = response.role;
            authToken = response.token; // [NEW] รับ Token
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('fullName', fullName);
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('authToken', authToken); // [NEW] บันทึก Token

            updateNavbar(); // อัปเดต UI และสิทธิ์ (จะเรียก loadAssignableUsers() ที่นี่)
            
            // [UX EDIT] เปลี่ยนหน้าแรกหลังล็อกอินเป็น 'public' (Dashboard)
            showSection('public');
            
            // [BUG FIX] ----------------------------------------------------
            // เรียกโหลดข้อมูล Dashboard ซ้ำอีกครั้ง (ด้วย Token ใหม่)
            loadProjectSummary(); 
            // --------------------------------------------------------------
            
            loadProjects(); // โหลดโครงการ (Server จะกรองให้ตามสิทธิ์)
            loadDataTransactions(); // โหลดข้อมูลธุรกรรมทันทีหลังล็อกอิน
            Swal.fire('สำเร็จ', response.message, 'success');

            // ปิด modal
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
          } else {
            Swal.fire('ผิดพลาด', response.message, 'error');
          }
        })
        .authenticateUser(username, password); // [EDITED] กลับไปใช้ User/Pass
    });
  });

  // ==============================
  // ฟังก์ชันแสดง Section
  // ==============================
  function showSection(sectionId) {
    if (sectionId === 'admin' && !isLoggedIn) {
      // [UX EDIT] เปลี่ยนข้อความ Alert
      Swal.fire('กรุณาล็อกอิน', 'คุณต้องล็อกอินเพื่อใช้งานส่วนดำเนินการ', 'warning');
      bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show();
      return;
    }

    // ซ่อนทุก section ก่อน
    document.querySelectorAll('.section').forEach(function(section) { // [SYNTAX FIX]
       section.classList.remove('active');
    });

    // แสดง section ที่ต้องการ
    const el = document.getElementById(sectionId);
    if (el) {
      el.classList.add('active');
    }
    window.scrollTo(0, 0);

    // อัปเดต Active link ใน Navbar
    document.querySelectorAll('#navLinks .nav-link').forEach(function(link) { // [SYNTAX FIX]
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + sectionId) { // [SYNTAX FIX] (Template Literal)
        link.classList.add('active');
      }
    });
  }

  // ==============================
  // ฟังก์ชันอัปเดต Navbar และใช้สิทธิ์ (Permissions)
  // ==============================
  function updateNavbar() {
    const navLinks = document.getElementById('navLinks');
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    // [EDITED] ดึงองค์ประกอบที่ต้องควบคุมสิทธิ์
    const navProjectTab = document.getElementById('nav-project-tab');
    const navUserTab = document.getElementById('nav-user-tab');
    const btnAddProject = document.getElementById('btn-add-project');
    const btnAddUser = document.getElementById('btn-add-user');
    const formTransaction = document.getElementById('form-transaction');
    const navSettingTab = document.getElementById('nav-setting-tab'); // [NEW] ดึงปุ่มแท็บตั้งค่า
    
    // [NEW] ดึงปุ่ม Excel
    const btnTemplateProject = document.getElementById('btn-template-project');
    const btnExportProject = document.getElementById('btn-export-project');
    const btnImportProject = document.getElementById('btn-import-project');

    if (isLoggedIn) {
      // [EDITED] แสดง Role ด้วย
      userInfo.textContent = 'สวัสดี, ' + fullName + ' (' + userRole + ')'; // [SYNTAX FIX]
      logoutBtn.style.display = 'inline-block';
      
      // [UX EDIT] เปลี่ยนชื่อเมนู "ระบบแอดมิน" เป็น "ดำเนินการ"
      navLinks.innerHTML =
          '<li class="nav-item">' +
            '<a class="nav-link" href="#admin" onclick="showSection(\'admin\')">' +
              '<i class="fa-solid fa-user-shield me-1"></i> ดำเนินการ' +
            '</a>' +
          '</li>' +
          '<li class="nav-item">' +
            '<a class="nav-link" href="#public" onclick="showSection(\'public\')">' +
              '<i class="fa-solid fa-chart-line me-1"></i> ข้อมูลทั่วไป' +
            '</a>' +
          '</li>'; // [SYNTAX FIX]
      navLinks.classList.add('me-auto');
      navLinks.classList.remove('ms-auto');

      // [EDITED] ใช้สิทธิ์ (Apply Permissions)
      if (userRole === 'Admin') {
        if (navProjectTab) navProjectTab.classList.remove('d-none');
        if (navUserTab) navUserTab.classList.remove('d-none');
        if (navSettingTab) navSettingTab.classList.remove('d-none'); // [NEW] Admin เห็นแท็บตั้งค่า
        if (btnAddProject) btnAddProject.classList.remove('d-none');
        if (btnAddUser) btnAddUser.classList.remove('d-none');
        if (formTransaction) formTransaction.classList.remove('d-none');

        // [NEW] แสดงปุ่ม Excel สำหรับ Admin
        if (btnTemplateProject) btnTemplateProject.classList.remove('d-none');
        if (btnExportProject) btnExportProject.classList.remove('d-none');
        if (btnImportProject) btnImportProject.classList.remove('d-none');

        // [REFACTOR] โหลดข้อมูลผู้ใช้สำหรับ Dropdown (ถ้ายังไม่มี)
        if (assignableUsers.length === 0) {
          loadAssignableUsers();
        }

      } else if (userRole === 'Staff') {
        if (navProjectTab) navProjectTab.classList.add('d-none');
        if (navUserTab) navUserTab.classList.add('d-none');
        if (navSettingTab) navSettingTab.classList.add('d-none'); // [NEW] Staff ซ่อนแท็บตั้งค่า
        if (btnAddProject) btnAddProject.classList.add('d-none');
        if (btnAddUser) btnAddUser.classList.add('d-none');
        if (formTransaction) formTransaction.classList.remove('d-none'); // Staff เห็นฟอร์มเบิกเงิน
        
        // [NEW] ซ่อนปุ่ม Excel สำหรับ Staff
        if (btnTemplateProject) btnTemplateProject.classList.add('d-none');
        if (btnExportProject) btnExportProject.classList.add('d-none');
        if (btnImportProject) btnImportProject.classList.add('d-none');
        
        // [REFACTOR] Staff ต้องโหลดรายชื่อผู้ใช้เพื่อใช้แปล UUID
        if (assignableUsers.length === 0) {
          loadAssignableUsers();
        }
        
      } else { // Viewer
        if (navProjectTab) navProjectTab.classList.add('d-none');
        if (navUserTab) navUserTab.classList.add('d-none');
        if (navSettingTab) navSettingTab.classList.add('d-none'); // [NEW] Viewer ซ่อนแท็บตั้งค่า
        if (btnAddProject) btnAddProject.classList.add('d-none');
        if (btnAddUser) btnAddUser.classList.add('d-none');
        if (formTransaction) formTransaction.classList.add('d-none'); // Viewer ซ่อนฟอร์มเบิกเงิน

        // [NEW] ซ่อนปุ่ม Excel สำหรับ Viewer
        if (btnTemplateProject) btnTemplateProject.classList.add('d-none');
        if (btnExportProject) btnExportProject.classList.add('d-none');
        if (btnImportProject) btnImportProject.classList.add('d-none');
      }

    } else {
      // Logged Out
      userInfo.textContent = '';
      logoutBtn.style.display = 'none';
      navLinks.innerHTML =
          '<li class="nav-item">' +
            '<a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">' +
              '<i class="fa-solid fa-right-to-bracket me-1"></i> เข้าสู่ระบบ' +
            '</a>' +
          '</li>'; // [SYNTAX FIX]
      navLinks.classList.add('ms-auto');
      navLinks.classList.remove('me-auto');

      // [EDITED] ซ่อนองค์ประกอบ Admin ทั้งหมด
      if (navProjectTab) navProjectTab.classList.add('d-none');
      if (navUserTab) navUserTab.classList.add('d-none');
      if (navSettingTab) navSettingTab.classList.add('d-none'); // [NEW] Logged out ซ่อนแท็บตั้งค่า
      if (btnAddProject) btnAddProject.classList.add('d-none');
      if (btnAddUser) btnAddUser.classList.add('d-none');
      if (formTransaction) formTransaction.classList.add('d-none');
      
      // [NEW] ซ่อนปุ่ม Excel เมื่อ Logout
      if (btnTemplateProject) btnTemplateProject.classList.add('d-none');
      if (btnExportProject) btnExportProject.classList.add('d-none');
      if (btnImportProject) btnImportProject.classList.add('d-none');

      assignableUsers = []; // [REFACTOR] ล้างข้อมูลผู้ใช้เมื่อล็อกเอาท์
    }
  }

  // ==============================
  // ปุ่ม Logout
  // ==============================
  document.getElementById('logoutBtn').addEventListener('click', function() { // [SYNTAX FIX]
    Swal.fire({
      title: 'ยืนยันการล็อกเอาท์',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ล็อกเอาท์',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: '#6c757d'
    }).then(function(result) { // [SYNTAX FIX]
      if (result.isConfirmed) {
        // [EDITED] ลบข้อมูล Local ทั้งหมด
        isLoggedIn = false;
        fullName = '';
        userRole = '';
        authToken = '';
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('fullName');
        localStorage.removeItem('userRole');
        localStorage.removeItem('authToken');

        // [EDITED] แสดงการโหลดและเรียก Server เพื่อรีโหลดหน้า
        loadingStart();
        google.script.run
          .withFailureHandler(onFailure) // ใช้ onFailure เผื่อ Server ล่ม
          .withSuccessHandler(function(url) { // [SYNTAX FIX]
            // สั่งให้หน้าหลัก (top) รีโหลดไปยัง URL
            window.top.location.href = url;
          })
          .getScriptUrl(); // เรียกฟังก์ชันใหม่ที่ Server
      }
    });
  });

  // ==============================
  // ฟังก์ชันโหลดโครงการ (สำหรับ Dropdown)
  // ==============================
  function loadProjects() {
    if (!isLoggedIn) {
      return;
    }

    loadingStart();
    google.script.run
      .withFailureHandler(onFailure) // [NEW] Added Failure Handler
      .withSuccessHandler(function(data) { // [SYNTAX FIX]
        // Server จะกรองโครงการตามสิทธิ์ (Staff/Admin) มาให้แล้ว
        loadingEnd();
        projects = data; // [REFACTOR] projects ตอนนี้มี { code, name, budget, owner (String/JSON String) }

        const select = document.getElementById('project');
        if (!select) return; // ถ้าไม่อยู่หน้า admin ก็ออก

        select.innerHTML = '';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- กรุณาเลือก --';
        select.appendChild(emptyOption);

        data.forEach(function(project) { // [SYNTAX FIX]
          const option = document.createElement('option');
          option.value = project.code;
          option.textContent = project.code + ' - ' + project.name; // [SYNTAX FIX]
          select.appendChild(option);
        });

        // เรียก onProjectChange เพื่อล้างข้อมูลฟอร์ม (ถ้ามี)
        onProjectChange();
      })
      .getProjects(authToken); // [EDITED] ส่ง Token
  }

  // ==============================
  // ฟังก์ชันเปลี่ยนโครงการ (Optimized - No Server Call)
  // ==============================
  function onProjectChange() {
    const code = document.getElementById('project').value;

    // ดึงข้อมูลพื้นฐานจาก 'projects' (ที่โหลดมาตอนแรก)
    const project = projects.find(function(p) { return p.code === code; }); // [SYNTAX FIX]

    // [EDITED] ดึงข้อมูลการเงินจาก 'summaryData' (ที่โหลด/อัปเดตตลอด)
    // [DASHBOARD EDIT] เปลี่ยนไปใช้ .find จาก 'summaryData' เพื่อหาข้อมูลการเงิน
    const projectData = summaryData.find(function(p) { return p.code === code; });

    const infoDiv = document.getElementById('projectInfo');
    // ถ้าไม่มี element นี้ (เช่น อยู่หน้า public) ให้ออก
    if (!infoDiv) return;

    // [ZERO-BUDGET EDIT] Get form elements
    const amountInput = document.getElementById('amount');
    const amountLabel = document.getElementById('labelAmount');
    const submitButton = document.getElementById('btnSubmitTransaction');

    const infoName = document.getElementById('infoName');
    const infoBudget = document.getElementById('infoBudget');
    const infoOwner = document.getElementById('infoOwner');
    const balanceAmount = document.getElementById('balanceAmount');
    const sequenceCount = document.getElementById('sequenceCount');

    if (project) {
      // แสดงข้อมูลพื้นฐาน (จาก 'projects')
      infoDiv.classList.remove('d-none');
      infoName.textContent = project.name;
      const budget = parseFloat(project.budget) || 0; // [ZERO-BUDGET EDIT]
      infoBudget.textContent = budget.toLocaleString() + " บาท";
      
      // [MULTI-OWNER EDIT] 
      const ownerIds = _parseOwnerIds(project.owner);
      const ownerNames = ownerIds.map(getUserFullName).join(', ');
      infoOwner.textContent = ownerNames || '(ไม่ได้ระบุ)';

      // [DASHBOARD EDIT] แสดงข้อมูลการเงิน (จาก 'summaryData')
      if (projectData) {
        balanceAmount.textContent = Number(projectData.balance).toLocaleString() + " บาท";
        sequenceCount.textContent = projectData.txCount || "0";
      } else {
        balanceAmount.textContent = budget.toLocaleString() + " บาท";
        sequenceCount.textContent = "0";
      }
      
      // [ZERO-BUDGET EDIT] Control form based on budget
      if (budget === 0) {
        amountInput.value = 0;
        amountInput.disabled = true;
        amountLabel.innerHTML = '<i class="fa-solid fa-file-lines me-1 text-info"></i> บันทึกรายงาน (ไม่ใช้งบประมาณ)';
        submitButton.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> บันทึกรายงาน';
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-info');
      } else {
        amountInput.value = ''; // เคลียร์ค่าเก่า
        amountInput.disabled = false;
        amountInput.placeholder = 'ระบุจำนวนเงินที่ต้องการเบิก';
        amountLabel.innerHTML = '<i class="fa-solid fa-money-bill-wave me-1 text-success"></i> จำนวนเงินที่ต้องการเบิก';
        submitButton.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> บันทึกการเบิกเงิน';
        submitButton.classList.add('btn-primary');
        submitButton.classList.remove('btn-info');
      }

    } else {
      // ถ้าไม่เลือกโครงการ ให้ล้างค่า
      infoDiv.classList.add('d-none');
      infoName.textContent = "-";
      infoBudget.textContent = "-";
      infoOwner.textContent = "-";
      balanceAmount.textContent = "-";
      sequenceCount.textContent = "-";
      
      // [ZERO-BUDGET EDIT] Reset form
      amountInput.value = '';
      amountInput.disabled = false;
      amountInput.placeholder = 'ระบุจำนวนเงินที่ต้องการเบิก';
      amountLabel.innerHTML = '<i class="fa-solid fa-money-bill-wave me-1 text-success"></i> จำนวนเงินที่ต้องการเบิก';
      submitButton.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> บันทึกการเบิกเงิน';
      submitButton.classList.add('btn-primary');
      submitButton.classList.remove('btn-info');
    }
  }

  // ==============================
  // [DELETED] ฟังก์ชันอัปเดตยอดคงเหลือ (updateBalanceInfo)
  // (ถูกรวมเข้ากับ onProjectChange แล้ว)
  // ==============================

  // ==============================
  // [DELETED] ฟังก์ชันอัปเดตจำนวนครั้งที่เบิก (updateSequenceCount)
  // (ถูกรวมเข้ากับ onProjectChange แล้ว)
  // ==============================

  // ==============================
  // ฟังก์ชันทำธุรกรรมใหม่
  // ==============================
  function submitTransaction() {
    // [EDITED] ตรวจสอบสิทธิ์ฝั่ง Client ก่อน
    if (userRole === 'Viewer') {
      toastr.error("⚠️ คุณไม่มีสิทธิ์ในการเบิกเงิน");
      return;
    }
    if (!requireLogin()) return;

    const projectCode = document.getElementById('project').value;
    // [ZERO-BUDGET EDIT] อ่านค่า amount (อาจเป็น 0)
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value);

    if (!projectCode) {
      toastr.error("⚠️ กรุณาเลือกโครงการก่อนทำรายการ");
      return;
    }
    
    // [ZERO-BUDGET EDIT] แก้ไขการตรวจสอบ: อนุญาตให้ 0 ผ่านได้
    // (null, undefined, < 0 ถือว่าผิด)
    if (amount === null || amount === undefined || amount < 0) {
      toastr.error("⚠️ กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    const project = projects.find(function(p) { return p.code === projectCode; }); // [SYNTAX FIX]
    const projectName = project ? project.name : '(ไม่ทราบชื่อโครงการ)';
    const budget = parseFloat(project.budget) || 0;

    // [ZERO-BUDGET EDIT] ปรับแต่งข้อความยืนยัน
    let swalTitle = 'ยืนยันการเบิกเงิน';
    let swalHtml =
        '<p><i class="fa-solid fa-diagram-project text-primary me-1"></i> โครงการ: <strong>' + projectName + '</strong></p>' +
        '<p><i class="fa-solid fa-coins text-warning me-1"></i> จำนวนเงิน: <strong>' + amount.toLocaleString() + '</strong> บาท</p>';
    
    if (budget === 0 && amount === 0) {
      swalTitle = 'ยืนยันการบันทึกรายงาน';
      swalHtml =
          '<p><i class="fa-solid fa-diagram-project text-primary me-1"></i> โครงการ: <strong>' + projectName + '</strong></p>' +
          '<p class="text-info"><i class="fa-solid fa-file-lines me-1"></i> บันทึกรายงานนี้ (ไม่ใช้งบประมาณ)</p>';
    }

    Swal.fire({
      title: swalTitle,
      html: swalHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่,ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--success-color)',
      cancelButtonColor: '#6c757d',
    }).then(function(result) { // [SYNTAX FIX]
      if (result.isConfirmed) {
        loadingStart();
        google.script.run
          .withFailureHandler(onFailure) // [NEW] Added Failure Handler
          .withSuccessHandler(function(response) { // [SYNTAX FIX]
            loadingEnd();
            if (response.success) {
              
              // [ZERO-BUDGET EDIT] ปรับแต่งข้อความสำเร็จ
              let successTitle = 'สำเร็จ!';
              let successHtml =
                  response.message + '<br>' +
                  '✅ ครั้งที่เบิก: ' + response.sequence + '<br>' +
                  '💰 ยอดคงเหลือ: ' + Number(response.balance).toLocaleString() + ' บาท';
              
              if (amount === 0) {
                 successTitle = 'บันทึกรายงานสำเร็จ!';
                 successHtml = 'ระบบได้สร้างรายการสำหรับแนบไฟล์แล้ว (ยอด 0 บาท)';
              }
              
              Swal.fire({
                icon: 'success',
                title: successTitle,
                html: successHtml
              });
              
              // [ZERO-BUDGET EDIT] รีเซ็ตฟอร์ม (onProjectChange จะจัดการเอง)
              // document.getElementById('amount').value = '';
              onProjectChange(); // เรียกซ้ำเพื่อรีเซ็ต UI (เผื่อเป็น 0 บาท)

              loadDataTransactions(); // โหลดตารางธุรกรรมใหม่
              loadProjectSummary(); // รีเฟรช dashboard (และฟอร์ม admin)
            } else {
              Swal.fire('เกิดข้อผิดพลาด!', response.message, 'error');
            }
          })
          .submitTransaction(authToken, projectCode, amount); // [EDITED] ส่ง Token
      }
    });
  }

  // =======================================
  // ฟังก์ชันตรวจสอบการล็อกอิน
  // =======================================
  function requireLogin() {
    if (!isLoggedIn || !authToken) { // [NEW] ตรวจสอบ Token ด้วย
      // [UX EDIT] เปลี่ยนข้อความ Alert
      Swal.fire('กรุณาล็อกอิน', 'คุณต้องล็อกอินเพื่อใช้งานส่วนดำเนินการ', 'warning');
      bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show();
      return false;
    }
    return true;
  }

  // =======================================
  // ฟังก์ชันโหลดธุรกรรมล่าสุด
  // =======================================
  function loadDataTransactions() {
    if (!requireLogin()) return; // ตรวจสอบล็อกอินก่อน

    loadingStart();
    google.script.run
      .withFailureHandler(onFailure) // [NEW] Added Failure Handler
      .withSuccessHandler(function(data) { // [SYNTAX FIX]
        // Server กรองข้อมูลตามสิทธิ์ (Staff/Admin/Viewer) มาให้แล้ว
        loadingEnd();
        latestTransactions = data; // เก็บข้อมูลล่าสุดไว้ใช้ในฟังก์ชันอื่น
        showTableTransactions(data); // แสดงตารางธุรกรรม
      })
      .getDataTransactions(authToken); // [EDITED] ส่ง Token
  }

  // =======================================
  // ฟังก์ชันแสดงตารางธุรกรรม
  // =======================================
  function showTableTransactions(items) {
    const tableId = '#tableTransactions';

    // ทำลาย DataTable เดิม (ถ้ามี)
    if ($.fn.DataTable.isDataTable(tableId)) {
      $(tableId).DataTable().destroy();
    }

    // ตรวจสอบข้อมูลว่าง
    if (!items || items.length === 0) {
      $(tableId).html("<thead><tr><th>#</th><th>โครงการ</th><th>จำนวนเงิน</th><th>ครั้งที่</th><th>คงเหลือ</th><th>Action</th></tr></thead><tbody><tr><td colspan='6' class='text-center'>ไม่พบข้อมูล</td></tr></tbody>");
      return;
    }

    // สร้าง DataTable ใหม่
    new DataTable(tableId, {
      destroy: true,
      responsive: true,
      pageLength: 10,
      data: items,
      order: [
        [4, 'desc']
      ], // เรียงตามวันที่ (คอลัมน์ 4) ล่าสุด
      columns: [{
        title: "#",
        data: null,
        render: function(data, type, row, meta) { return meta.row + 1; }, // [SYNTAX FIX]
        className: 'text-center'
      }, {
        title: "รหัส/โครงการ",
        data: null,
        render: function(data, type, row) { return row[1] + ' ' + row[2]; }, // [SYNTAX FIX]
      }, {
        title: "จำนวนเงินที่เบิก",
        data: 3,
        render: function(data) { return Number(data).toLocaleString(); }, // [SYNTAX FIX]
        className: 'text-end'
      }, {
        title: "ครั้งที่เบิก",
        data: 5,
        className: 'text-center'
      }, {
        title: "เงินคงเหลือ",
        data: 6,
        render: function(data) { return Number(data).toLocaleString(); }, // [SYNTAX FIX]
        className: 'text-end'
      }, {
        title: "Action",
        data: 0, // txId อยู่ที่ index 0
        orderable: false,
        className: 'text-center',
        render: function(data, type, row) { // [SYNTAX FIX]
          // data = txId (index 0)
          // row[7] = receipts JSON, row[8] = reports JSON

          // [ATTACHMENT EDIT] ตรวจสอบว่ามีไฟล์แนบหรือไม่
          const hasAttachments = (row[7] && row[7] !== "[]") || (row[8] && row[8] !== "[]");

          // [STAFF EDIT] Staff can edit, but not delete
          // [SYNTAX FIX] เปลี่ยน Template Literal เป็น String Concat
          let editBtn =
                '<button class="btn btn-sm btn-warning" onclick="editTransactions(\'' + data + '\')" title="แก้ไข">' +
                  '<i class="fas fa-pen"></i>' +
                '</button>';
          
          let deleteBtn =
                '<button class="btn btn-sm btn-danger ms-1" onclick="deleteTransactions(\'' + data + '\')" title="ลบ">' +
                  '<i class="fas fa-trash"></i>' +
                '</button>';
          
          // [ATTACHMENT EDIT] Add upload button
          let uploadBtn =
                '<button class="btn btn-sm ' + (hasAttachments ? 'btn-success' : 'btn-info') + ' ms-1" ' +
                        'onclick="openUploadModal(\'' + data + '\')" title="แนบไฟล์">' +
                  '<i class="fas fa-paperclip"></i>' +
                '</button>';

          if (userRole === 'Admin') {
            return editBtn + deleteBtn + uploadBtn;
          }
          if (userRole === 'Staff') {
            return editBtn + uploadBtn; // Staff can edit and upload
          }
          return 'N/A'; // Viewer
        }
      }],
      pagingType: 'simple_numbers',
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
        paginate: {
          previous: '<i class="fa-solid fa-caret-left"></i>',
          next: '<i class="fa-solid fa-caret-right"></i>'
        }
      }
    });
  }


  // =======================================
  // ฟังก์ชันลบธุรกรรม
  // =======================================
  function deleteTransactions(txId) {
    // [EDITED] ตรวจสอบสิทธิ์ (แม้ปุ่มจะซ่อนอยู่)
    if (userRole !== 'Admin') {
      toastr.error("⚠️ คุณไม่มีสิทธิ์ลบรายการ");
      return;
    }
    if (!requireLogin()) return;

    const transaction = latestTransactions.find(function(tx) { return tx[0] === txId; }); // [SYNTAX FIX]
    const projectCode = transaction ? transaction[1] : '';
    const projectName = transaction ? transaction[2] : '(ไม่ทราบชื่อโครงการ)';

    Swal.fire({
      title: 'ลบรายการ',
      // [SYNTAX FIX] เปลี่ยน Template Literal เป็น String Concat
      html:
          '<p><strong>โครงการ:</strong> ' + projectName + ' (' + projectCode + ')</p>' +
          '<p><strong>ID:</strong> ' + txId + '</p>' +
          '<p>ต้องการลบรายการนี้หรือไม่?</p>' +
          '<p class="text-danger">การดำเนินการนี้จะลบไฟล์แนบทั้งหมด และคำนวณยอดคงเหลือของโครงการนี้ใหม่</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่,ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: '#6c757d',
    }).then(function(result) { // [SYNTAX FIX]
      if (result.isConfirmed) {
        loadingStart();
        google.script.run
          .withFailureHandler(onFailure) // [NEW] Added Failure Handler
          .withSuccessHandler(function(resp) { // [SYNTAX FIX]
            loadingEnd();
            if (resp.success) {
              Swal.fire('ลบเสร็จสิ้น', 'รายการถูกลบและคำนวณยอดคงเหลือใหม่เรียบร้อยแล้ว', 'success');
              loadProjectSummary(); // โหลดข้อมูลสรุปโครงการใหม่ (และอัปเดตฟอร์ม)
              loadDataTransactions(); // โหลดตารางธุรกรรมใหม่
            } else {
              Swal.fire('ผิดพลาด', resp.message, 'error');
            }
          })
          .deleteTransactionById(authToken, txId); // [EDITED] ส่ง Token
      }
    });
  }

  // =======================================
  // ฟังก์ชันแก้ไขธุรกรรม
  // =======================================
  function editTransactions(txId) {
    // [STAFF EDIT] ตรวจสอบสิทธิ์ (Admin หรือ Staff)
    if (userRole !== 'Admin' && userRole !== 'Staff') {
      toastr.error("⚠️ คุณไม่มีสิทธิ์แก้ไขรายการ");
      return;
    }
    if (!requireLogin()) return;

    loadingStart();
    google.script.run
      .withFailureHandler(onFailure) // [NEW] Added Failure Handler
      .withSuccessHandler(function(tx) { // [SYNTAX FIX]
        loadingEnd();
        if (!tx) {
          Swal.fire('ผิดพลาด', 'ไม่พบรายการที่จะแก้ไข', 'error');
          return;
        }

        // [ATTACHMENT EDIT] ตรวจสอบว่ามีไฟล์แนบหรือไม่
        const hasAttachments = (tx.receipts && tx.receipts !== "[]") || (tx.reports && tx.reports !== "[]");
        
        // [ZERO-BUDGET EDIT] ตรวจสอบว่าเป็นรายการ 0 บาทหรือไม่
        const isZeroAmountTx = parseFloat(tx.amount) === 0;

        Swal.fire({
          title: 'แก้ไขรายการ',
          // [SYNTAX FIX] เปลี่ยน Template Literal เป็น String Concat
          html:
              '<p><strong>ID:</strong> ' + tx.id + '</p>' +
              '<p><strong>โครงการ:</strong> ' + tx.projectCode + ' ' + tx.projectName + '</p>' +
              '<input type="number" id="swal-input-amount" class="swal2-input" ' +
                     'value="' + tx.amount + '" placeholder="จำนวนเงิน" ' +
                     // [ZERO-BUDGET EDIT] ปิดการแก้ไข ถ้ามีไฟล์แนบ หรือ ถ้าเป็นรายการ 0 บาท
                     (hasAttachments || isZeroAmountTx ? 'disabled' : '') + '>' +
              (hasAttachments ? '<small class="text-danger d-block mt-2">ไม่สามารถแก้ไขยอดเงินได้หลังจากแนบไฟล์แล้ว</small>' : '') +
              (isZeroAmountTx && !hasAttachments ? '<small class="text-info d-block mt-2">ไม่สามารถแก้ไขยอดเงินของรายการที่บันทึกแบบ 0 บาทได้</small>' : ''),
          showCancelButton: true,
          confirmButtonText: 'บันทึก',
          confirmButtonColor: 'var(--success-color)',
          preConfirm: function() { // [SYNTAX FIX]
            // [ATTACHMENT EDIT] ถ้าช่องถูกปิดใช้งาน ให้ส่งค่าเดิมกลับไป
            if (hasAttachments || isZeroAmountTx) {
              return parseFloat(tx.amount);
            }
            // ถ้าไม่ ให้ตรวจสอบค่าใหม่
            const newAmt = parseFloat(document.getElementById('swal-input-amount').value);
            // [ZERO-BUDGET EDIT] อนุญาตให้ 0 ผ่านได้
            if (newAmt === null || newAmt === undefined || newAmt < 0) {
                 Swal.showValidationMessage('กรุณากรอกจำนวนเงินที่ถูกต้อง');
                 return false; // [FIX] ต้อง return false เพื่อหยุด
            }
            if (newAmt === 0) {
                 Swal.showValidationMessage('ไม่สามารถแก้ไขเป็น 0 บาทได้ กรุณาสร้างรายการใหม่');
                 return false; // [FIX] ต้อง return false เพื่อหยุด
            }
            return newAmt;
          }
        }).then(function(res) { // [SYNTAX FIX]
          
          // [FIX] ถ้า preConfirm ส่ง false กลับมา res.value จะเป็น undefined
          if (res.isConfirmed && res.value !== undefined) {
            
            // [ATTACHMENT EDIT] ถ้าค่าไม่เปลี่ยนแปลง (เช่น โดน disable) ไม่ต้องเรียก Server
            if (res.value === parseFloat(tx.amount)) {
                toastr.info("ไม่มีการเปลี่ยนแปลงยอดเงิน");
                return;
            }
            
            loadingStart();
            google.script.run
              .withFailureHandler(onFailure) // [NEW] Added Failure Handler
              .withSuccessHandler(function(resp) { // [SYNTAX FIX]
                loadingEnd();
                if (resp.success) {
                  Swal.fire('สำเร็จ', resp.message, 'success');
                  loadProjectSummary(); // โหลดข้อมูลสรุปโครงการใหม่ (และอัปเดตฟอร์ม)
                  loadDataTransactions();
                  $('#project').val('').trigger('change');
                } else {
                  Swal.fire('ผิดพลาด', resp.message, 'error');
                }
              })
              .updateTransaction(authToken, tx.id, res.value); // [EDITED] ส่ง Token
          }
        });
      })
      .getTransactionById(authToken, txId); // [EDITED] ส่ง Token
  }

  // =======================================
  // ฟังก์ชันโหลดข้อมูลสรุปโครงการ
  // =======================================
  function loadProjectSummary() {
    loadingStart();
    // [EDITED] ส่ง authToken (หรือ null ถ้ายังไม่ล็อกอิน)
    const tokenToSend = isLoggedIn ? authToken : null;

    google.script.run
      .withFailureHandler(onFailure) // [NEW] Added Failure Handler
      .withSuccessHandler(function(res) { // [SYNTAX FIX]
        // Server กรองข้อมูลตามสิทธิ์ (Staff/Admin/Viewer) มาให้แล้ว
        loadingEnd();
        if (res.success) {
          summaryData = res.data; // อัปเดตตัวแปรหลัก

          // [STATUS FILTER EDIT] เก็บค่า Filter ที่เลือกไว้ปัจจุบัน
          const filterSelect = document.getElementById('filterProject');
          const currentProjectVal = filterSelect.value; // เก็บค่าโครงการที่เลือกไว้
          const filterStatusSelect = document.getElementById('filterStatus');
          const currentStatusVal = filterStatusSelect.value; // เก็บค่าสถานะที่เลือกไว้

          // สร้าง options สำหรับ filter โครงการ
          filterSelect.innerHTML = '<option value="">-- แสดงทั้งหมด --</option>';
          summaryData.forEach(function(item) { // [SYNTAX FIX]
            const opt = document.createElement('option');
            opt.value = item.code;
            opt.textContent = item.code + ' - ' + item.name; // [SYNTAX FIX]
            filterSelect.appendChild(opt);
          });
          
          // [STATUS FILTER EDIT] ตั้งค่า Filter กลับไปที่เดิม
          filterSelect.value = currentProjectVal;
          filterStatusSelect.value = currentStatusVal;

          filterSummaryTable(); // เรียกกรองข้อมูลตารางสรุป (ซึ่งตอนนี้จะใช้ทั้งสอง filter)

          // [EDITED] อัปเดตข้อมูลในฟอร์ม admin (ถ้ามีการเลือกโครงการไว้)
          onProjectChange();
          
          // [NEW] เรียกแสดงผล Admin Dashboard (ถ้าเป็น Admin)
          if (userRole === 'Admin') {
             renderAdminDashboard(summaryData);
          }

        } else {
          toastr.error("ไม่สามารถโหลดข้อมูลสรุปโครงการได้");
        }
      })
      .getProjectSummary(tokenToSend); // [EDITED] ส่ง Token
  }

  // =======================================
  // ฟังก์ชันกรองตารางสรุปโครงการ
  // =======================================
  function filterSummaryTable() {
    // [STATUS FILTER EDIT] อ่านค่าจาก Filter ทั้งสอง
    const selectedCode = document.getElementById('filterProject').value;
    const selectedStatus = document.getElementById('filterStatus').value;

    let filteredData = summaryData;

    // 1. กรองตามโครงการ (ถ้ามีการเลือก)
    if (selectedCode) {
      filteredData = filteredData.filter(function(item) { return item.code === selectedCode; });
    }

    // 2. กรองตามสถานะ (ถ้ามีการเลือก)
    if (selectedStatus) {
      filteredData = filteredData.filter(function(item) { return item.status === selectedStatus; });
    }

    // [STATUS FILTER EDIT] ส่งข้อมูลที่กรองแล้วไปแสดงผล
    renderSummaryTable(filteredData);
    renderSummaryDashboard(filteredData);
  }

  // =======================================
  // [DASHBOARD EDIT] Helper สร้างป้ายสถานะ
  // =======================================
  function getStatusBadge(status) {
    if (status === "เสร็จสิ้น") {
      return '<span class="badge bg-success-subtle text-success-emphasis rounded-pill">' + status + '</span>';
    }
    if (status === "กำลังดำเนินการ") {
      return '<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill">' + status + '</span>';
    }
    return '<span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">' + status + '</span>';
  }

  // =======================================
  // [DASHBOARD EDIT] ฟังก์ชันแสดงตารางสรุปโครงการ (อัปเดตใหม่)
  // =======================================
  function renderSummaryTable(data) {
    const tableId = '#summaryTable';

    // ทำลาย DataTable เดิม
    if ($.fn.DataTable.isDataTable(tableId)) {
      $(tableId).DataTable().destroy();
    }

    const tbody = document.querySelector(tableId + ' tbody'); // [SYNTAX FIX]
    tbody.innerHTML = ''; // เคลียร์ tbody

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">ไม่พบข้อมูล</td></tr>'; // [DASHBOARD EDIT] Colspan = 5
      return;
    }

    data.forEach(function(item, index) { // [SYNTAX FIX]
      const tr = document.createElement('tr');
      
      // [DASHBOARD EDIT] สร้าง "3 / 5"
      const reportRatio = item.txWithFiles + ' / ' + item.txCount;
      
      // [DASHBOARD EDIT] เปลี่ยน HTML ของแถว
      tr.innerHTML =
          '<td class="text-center">' + (index + 1) + '</td>' +
          '<td>' + item.code + ' - ' + item.name + '</td>' +
          '<td class="text-center">' + getStatusBadge(item.status) + '</td>' +
          '<td class="text-center">' + item.txCount + '</td>' +
          '<td class="text-center">' + (item.txCount > 0 ? reportRatio : '-') + '</td>';
      tbody.appendChild(tr);
    });

    // สร้าง DataTable ใหม่
    new DataTable(tableId, {
      destroy: true,
      responsive: true,
      pageLength: 10,
      order: [
        [0, 'asc']
      ],
      pagingType: 'simple_numbers',
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
        paginate: {
          previous: '<i class="fa-solid fa-caret-left"></i>',
          next: '<i class="fa-solid fa-caret-right"></i>'
        }
      }
    });
  }

  // =======================================
  // [DASHBOARD EDIT] ฟังก์ชันแสดง Dashboard สรุปโครงการ (อัปเดตใหม่)
  // =======================================
  function renderSummaryDashboard(data) {
    const totalProjects = data.length;
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalNotStarted = 0;

    data.forEach(function(item) {
      if (item.status === "เสร็จสิ้น") {
        totalCompleted++;
      } else if (item.status === "กำลังดำเนินการ") {
        totalInProgress++;
      } else { // "ยังไม่ดำเนินการ"
        totalNotStarted++;
      }
    });

    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('totalCompleted').textContent = totalCompleted;
    document.getElementById('totalInProgress').textContent = totalInProgress;
    document.getElementById('totalNotStarted').textContent = totalNotStarted;
  }
  
  // =======================================
  // [NEW] ฟังก์ชันแสดง Admin Dashboard (Client-Side Calculation)
  // =======================================
  function renderAdminDashboard(data) {
    const dashboardPanel = document.getElementById('admin-dashboard-panel');
    if (!dashboardPanel) return;

    // 1. ตรวจสอบสิทธิ์ (Double check)
    if (userRole !== 'Admin') {
      dashboardPanel.classList.add('d-none');
      return;
    }
    
    // แสดง Panel
    dashboardPanel.classList.remove('d-none');

    // 2. คำนวณยอดรวม (Client-Side)
    let totalBudget = 0;
    let totalUsed = 0;

    if (data && data.length > 0) {
      data.forEach(function(item) {
        totalBudget += parseFloat(item.budget) || 0;
        totalUsed += parseFloat(item.used) || 0;
      });
    }

    const totalBalance = totalBudget - totalUsed;
    const utilization = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

    // 3. จัดรูปแบบตัวเลข
    const fmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // 4. อัปเดต UI Cards (ปรับแก้: ไม่ต้องใส่หน่วย เพราะ HTML มีแยกไว้แล้ว)
    document.getElementById('dash-total-budget').textContent = fmt.format(totalBudget);
    document.getElementById('dash-total-used').textContent = fmt.format(totalUsed);
    document.getElementById('dash-total-balance').textContent = fmt.format(totalBalance);
    
    document.getElementById('dash-utilization').textContent = utilization.toFixed(2);
    
    // [CORRECTED] Update progress bar logic
    const progressBar = document.getElementById('dash-progress-bar');
    if (progressBar) {
        progressBar.style.width = Math.min(utilization, 100) + '%';
        progressBar.setAttribute('aria-valuenow', utilization);
    }

    // 5. วาดกราฟ (Chart.js)
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    if (budgetChartInstance) {
      budgetChartInstance.destroy(); // ทำลายกราฟเก่าก่อนสร้างใหม่
    }

    budgetChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['ใช้ไปแล้ว', 'คงเหลือ'],
        datasets: [{
          data: [totalUsed, totalBalance],
          backgroundColor: [
            '#ffc107', // Used - Yellow (Warning) - Matches image 3 style
            '#198754'  // Remaining - Green (Success) - Matches image 3 style
          ],
          borderWidth: 0, 
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%', // ปรับลด cutout ให้วงกลมมีความหนาและใหญ่ขึ้น ดูโดดเด่น
        layout: {
            padding: 10 // เพิ่ม padding เล็กน้อยกันตกขอบ
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 15, // ลด padding ของ legend ให้กระชับขึ้น
                boxWidth: 8, // ปรับขนาดจุดสีใน legend
                font: {
                    family: "'Kanit', sans-serif",
                    size: 12
                }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed !== null) {
                  label += fmt.format(context.parsed) + ' บาท';
                }
                return label;
              }
            }
          },
          title: { display: false }
        }
      }
    });
  }


  // =======================================
  // [BATCH EDIT] ฟังก์ชันจัดการไฟล์แนบ (เขียนใหม่)
  // =======================================

  /**
   * [BATCH] 1. ควบคุมโหมด (Read/Edit)
   */
  function setUploadMode(mode) {
    uploadMode = mode;
    const modalBody = document.querySelector('#modalUploadFiles .upload-modal-body');
    if (!modalBody) return;
    
    modalBody.dataset.mode = mode; // 'read' or 'edit'

    // สลับปุ่ม
    if (mode === 'edit') {
      document.getElementById('upload-footer-readonly').classList.add('d-none');
      document.getElementById('upload-footer-edit').classList.remove('d-none');
    } else { // 'read'
      document.getElementById('upload-footer-readonly').classList.remove('d-none');
      document.getElementById('upload-footer-edit').classList.add('d-none');
    }
  }

  /**
   * [BATCH] 2. เปิด Modal (จุดเริ่มต้น)
   */
  function openUploadModal(txId) {
    if (!requireLogin()) return;
    
    currentUploadTxId = txId; // เก็บ ID ไว้ในตัวแปร global
    
    // รีเซ็ตสถานะ
    setUploadMode('read');
    stagedUploads = [];
    stagedDeletions = [];
    
    // เคลียร์ค่าเก่า
    document.getElementById('uploadTxId').value = txId;
    document.getElementById('uploadTxIdDisplay').textContent = txId;
    document.getElementById('uploadTxProjectName').textContent = 'กำลังโหลด...';
    document.getElementById('preview-receipts').innerHTML = '';
    document.getElementById('preview-reports').innerHTML = '';

    uploadModal.show();
    loadingStart(); // แสดงการโหลดขณะดึงข้อมูล Transaction

    // ดึงข้อมูล Transaction (รวมถึงไฟล์แนบเดิม)
    google.script.run
      .withFailureHandler(onFailure)
      .withSuccessHandler(function(tx) { // [SYNTAX FIX]
        loadingEnd();
        if (!tx) {
          uploadModal.hide();
          Swal.fire('ผิดพลาด', 'ไม่พบ Transaction', 'error');
          return;
        }

        // อัปเดตชื่อโครงการ
        document.getElementById('uploadTxProjectName').textContent = tx.projectCode + ' - ' + tx.projectName; // [SYNTAX FIX]

        // Render thumbnails สำหรับไฟล์ที่มีอยู่ (Receipts)
        if (tx.receipts) {
          try {
            const fileIds = JSON.parse(tx.receipts);
            if (Array.isArray(fileIds)) {
              fileIds.forEach(function(id) { 
                // [FIX] (ข้อจำกัด: สมมติว่าเป็นรูปภาพ)
                renderThumbnail(id, id, 'receipts', false, true, ''); // isStaged=false, isImage=true (guess)
              });
            }
          } catch (e) { /* (ไม่ต้องทำอะไรถ้า JSON ผิด) */ }
        }

        // Render thumbnails สำหรับไฟล์ที่มีอยู่ (Reports)
        if (tx.reports) {
          try {
            const fileIds = JSON.parse(tx.reports);
            if (Array.isArray(fileIds)) {
              fileIds.forEach(function(id) { 
                // [FIX] (ข้อจำกัด: สมมติว่าเป็นรูปภาพ)
                renderThumbnail(id, id, 'reports', false, true, ''); // isStaged=false, isImage=true (guess)
              });
            }
          } catch (e) { /* (ไม่ต้องทำอะไรถ้า JSON ผิด) */ }
        }

      })
      .getTransactionById(authToken, txId);
  }

  /**
   * [BATCH] 3. ตั้งค่า Dropzone (เหมือนเดิม)
   */
  function setupDropzones() {
    const dropzones = document.querySelectorAll('.dropzone');
    const fileUploader = document.getElementById('fileUploader');

    dropzones.forEach(function(zone) { // [SYNTAX FIX]
      const fileType = zone.dataset.fileType;

      // ป้องกันการเปิดไฟล์เมื่อลากมาวาง
      zone.addEventListener('dragover', function(e) { // [SYNTAX FIX]
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', function(e) { // [SYNTAX FIX]
        e.preventDefault();
        zone.classList.remove('dragover');
      });

      // จัดการไฟล์เมื่อวาง
      zone.addEventListener('drop', function(e) { // [SYNTAX FIX]
        e.preventDefault();
        zone.classList.remove('dragover');
        if (uploadMode !== 'edit') return; // [BATCH] เช็คโหมด
        if (e.dataTransfer.files) {
          processFiles(e.dataTransfer.files, fileType);
        }
      });

      // จัดการไฟล์เมื่อคลิก
      zone.addEventListener('click', function() { // [SYNTAX FIX]
        if (uploadMode !== 'edit') return; // [BATCH] เช็คโหมด
        fileUploader.dataset.fileType = fileType; // เก็บ fileType ไว้ใน input
        fileUploader.click();
      });
    });

    // Event listener สำหรับ input file
    fileUploader.addEventListener('change', function(e) { // [SYNTAX FIX]
      if (uploadMode !== 'edit') return; // [BATCH] เช็คโหมด
      const fileType = e.target.dataset.fileType;
      if (e.target.files) {
        processFiles(e.target.files, fileType);
      }
      e.target.value = null; // เคลียร์ค่า input เพื่อให้เลือกไฟล์ซ้ำได้
    });
  }

  /**
   * [BATCH] 4. ตรวจสอบไฟล์ (เกือบเหมือนเดิม)
   */
  function processFiles(files, fileType) {
    if (!files || files.length === 0) return;

    // จำกัดประเภทไฟล์ (อนุญาตเฉพาะรูปภาพและ PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toastr.error('ไฟล์ ' + file.name + ' มีประเภทไม่ถูกต้อง', 'ไม่อนุญาต'); // [SYNTAX FIX]
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
           toastr.error('ไฟล์ ' + file.name + ' มีขนาดใหญ่เกิน 10MB', 'ขนาดใหญ่เกิน'); // [SYNTAX FIX]
           continue;
      }

      // [BATCH] เปลี่ยนจาก uploadFileClient เป็น stageFileForUpload
      stageFileForUpload(file, fileType);
    }
  }
  
  /**
   * [BATCH] 5. พักไฟล์ (Stage) ไว้ที่ Client (FIXED)
   */
  async function stageFileForUpload(file, fileType) {
      const tempId = 'temp-' + Date.now() + '-' + Math.random();
      const isImage = file.type.startsWith('image/');

      // 1. Render a placeholder
      // [FIX] ส่ง file.name ไป, ไม่ใช่ filePreview
      const thumbEl = renderThumbnail(tempId, file.name, fileType, true, isImage, ''); // isStaged=true, previewUrl=''
      
      // 2. Add spinner
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'thumbnail-loading';
      loadingDiv.innerHTML = '<div class="spinner-border" role="status"></div>';
      thumbEl.appendChild(loadingDiv);

      try {
          // 3. Get Base64 data
          const base64Data = await base64Encode(file); // Full "data:..." string
          
          // 4. Store in stage
          stagedUploads.push({
              tempId: tempId,
              base64Data: base64Data.split(',')[1], // Data only
              mimeType: file.type,
              fileName: file.name,
              fileType: fileType,
              previewUrl: isImage ? base64Data : '' // Full data string for preview
          });
          
          // 5. Update preview
          if (isImage) {
              const img = thumbEl.querySelector('img');
              if (img) { 
                  img.src = base64Data; 
                  img.style.display = 'block';
              }
          }
          
          loadingDiv.remove(); // Remove spinner
      } catch (error) {
          console.error('File Read Error:', error);
          toastr.error('อ่านไฟล์ ' + file.name + ' ล้มเหลว', 'ผิดพลาด');
          thumbEl.remove();
      }
  }


  /**
   * [BATCH] 6. ลบไฟล์ (Client-side)
   */
  function deleteFileClient(thumbEl) {
    if (uploadMode !== 'edit') return; // เช็คโหมด
    
    const fileId = thumbEl.dataset.fileId;
    const fileType = thumbEl.dataset.fileType;
    const isStaged = thumbEl.dataset.isStaged === 'true';

    if (isStaged) {
      // 1. ถ้าเป็นไฟล์ใหม่ (Staged) -> ลบออกจาก Array
      stagedUploads = stagedUploads.filter(function(f) { return f.tempId !== fileId; });
      thumbEl.remove(); // ลบ Thumbnail ออกเลย
    } else {
      // 2. ถ้าเป็นไฟล์เก่า -> เพิ่มใน Array ที่จะลบ (stagedDeletions)
      stagedDeletions.push({
        fileId: fileId,
        fileType: fileType
      });
      thumbEl.style.display = 'none'; // ซ่อน Thumbnail นี้ไว้ (เผื่อกดยกเลิก)
    }
  }
  
  /**
   * [BATCH] 7. ยกเลิกการเปลี่ยนแปลง
   */
  function cancelUploadChanges() {
    setUploadMode('read'); // กลับสู่โหมดอ่าน
    
    // ลบ Thumbnail ของไฟล์ใหม่ (Staged) ทั้งหมด
    document.querySelectorAll('.thumbnail[data-is-staged="true"]').forEach(function(t) { t.remove(); });
    
    // แสดง Thumbnail ของไฟล์เก่าที่ซ่อนไว้ (ที่รอลบ)
    document.querySelectorAll('#modalUploadFiles .thumbnail[style*="display: none"]').forEach(function(t) { t.style.display = 'flex'; });
    
    // รีเซ็ต Arrays
    stagedUploads = [];
    stagedDeletions = [];
  }
  
  /**
   * [BATCH] 8. บันทึกการเปลี่ยนแปลง (ส่ง Batch ไป Server)
   */
  function saveFileChangesClient() {
    loadingStart(); // แสดงการโหลดแบบเต็มหน้า

    // 1. เตรียมข้อมูลที่จะส่ง (ลบ tempId ออก)
    const uploadsToSend = stagedUploads.map(function(f) {
      return {
        base64Data: f.base64Data,
        mimeType: f.mimeType,
        fileName: f.fileName,
        fileType: f.fileType
      };
    });

    // 2. เรียก Server (เพียงครั้งเดียว)
    google.script.run
      .withFailureHandler(function(err) {
          // ถ้าล้มเหลว ให้รีเซ็ตกลับหน้า Edit (ห้ามปิด Modal)
          loadingEnd();
          onFailure(err);
          // (ผู้ใช้ยังอยู่ในโหมด Edit และสามารถลองกด Save ใหม่ได้)
      })
      .withSuccessHandler(function(response) {
          loadingEnd();
          if (response.success) {
            uploadModal.hide(); // ปิด Modal
            Swal.fire('สำเร็จ', response.message, 'success');
            loadDataTransactions(); // รีเฟรชตารางหลัก (สำคัญมาก)
            loadProjectSummary(); // [DASHBOARD EDIT] รีเฟรช Dashboard ด้วย
          } else {
            // Server ส่ง Error กลับมา
            onFailure(new Error(response.message));
          }
      })
      .saveFileChanges(authToken, currentUploadTxId, uploadsToSend, stagedDeletions);
  }


  /**
   * [BATCH] 9. สร้าง Thumbnail (CLEANUP)
   * isStaged = true (ไฟล์ใหม่): fileId=tempId, fileName=file.name, isImage=bool, previewUrl='' (จะถูกเติมทีหลัง)
   * isStaged = false (ไฟล์เก่า): fileId=fileId, fileName=fileId (ข้อจำกัด), isImage=true (สมมติ), previewUrl=''
   */
  function renderThumbnail(fileId, fileName, fileType, isStaged, isImage, previewUrl) {
      const container = document.getElementById('preview-' + fileType); 
      const thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      thumb.dataset.fileId = fileId;    
      thumb.dataset.fileType = fileType; 
      thumb.dataset.isStaged = isStaged; 

      let fileUrl = ''; // This will be for the <img> src
      let displayName = '';
      let clickHandler = 'style="cursor:default"'; // Default: staged files aren't clickable

      if (isStaged) {
          displayName = fileName;
          fileUrl = isImage ? previewUrl : ''; // Use previewUrl (which is blank or '' for non-images)
          // clickHandler remains default (not clickable)
      } else {
          // ไฟล์เก่า (existing file)
          displayName = fileId.substring(0, 15) + '...';
          isImage = true; // Assume it's an image for the thumbnail
          fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId; // For <img> src
          
          // [LINK FIX] Create the correct Drive viewer URL for the click handler
          var driveViewerUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
          clickHandler = 'onclick="window.open(\'' + driveViewerUrl + '\', \'_blank\')"';
      }

      if (isImage) {
        thumb.innerHTML =
          // [FIX] ถ้า isStaged และ previewUrl ว่าง (กำลังโหลด) ให้ซ่อน img tag
          '<img src="' + fileUrl + '" alt="' + displayName + '" ' + (isStaged && !previewUrl ? 'style="display:none;"' : '') + '>' + 
          '<span class="file-info" title="' + displayName + '" ' + clickHandler + '>' + displayName + '</span>';
      } else {
        thumb.innerHTML =
          '<i class="file-icon ' + getFileIcon(displayName) + '"></i>' +
          '<span class="file-info" title="' + displayName + '" ' + clickHandler + '>' + displayName + '</span>';
      }

      // ปุ่มลบ
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-file';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'ลบไฟล์';
      deleteBtn.onclick = function(e) { 
        e.stopPropagation();
        deleteFileClient(thumb); // ส่ง Element
      };
      thumb.appendChild(deleteBtn);
      
      container.appendChild(thumb);
      return thumb;
  }
  
  
  /**
   * แปลงชื่อไฟล์เป็นไอคอน FontAwesome
   */
  function getFileIcon(fileName) {
    if (/\.pdf$/i.test(fileName)) return 'fa-solid fa-file-pdf text-danger';
    if (/\.(doc|docx)$/i.test(fileName)) return 'fa-solid fa-file-word text-primary';
    if (/\.(xls|xlsx)$/i.test(fileName)) return 'fa-solid fa-file-excel text-success';
    if (/\.(ppt|pptx)$/i.test(fileName)) return 'fa-solid fa-file-powerpoint text-warning';
    return 'fa-solid fa-file-alt'; // ไฟล์ทั่วไป
  }

  /**
   * Helper แปลง File เป็น Base64
   */
  function base64Encode(file) {
    return new Promise(function(resolve, reject) { // [SYNTAX FIX]
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function() { resolve(reader.result); }; // [SYNTAX FIX]
      reader.onerror = function(error) { reject(error); }; // [SYNTAX FIX]
    });
  }
</script>
