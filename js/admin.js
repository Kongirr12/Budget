<div class="container">
  <h2><i class="fa-solid fa-sack-dollar text-primary"></i> ระบบบริหารงบประมาณ</h2>

  <!-- [NEW] ส่วน Dashboard Layout แบบ Grid 2x2 ด้านซ้าย + กราฟด้านขวา (ปรับความสูงเท่ากัน) -->
  <div id="admin-dashboard-panel" class="d-none mt-4 mb-5">
    
    <!-- Header -->
    <div class="d-flex align-items-center mb-4">
      <h5 class="text-secondary fw-bold mb-0">
        <i class="fa-solid fa-chart-pie me-2"></i> ภาพรวมงบประมาณ (Real-time)
      </h5>
    </div>

    <!-- Main Row: ใช้ align-items-stretch เพื่อให้คอลัมน์ซ้ายขวาสูงเท่ากัน -->
    <div class="row g-4 align-items-stretch">
      
      <!-- Left Column: Cards Grid (2x2) -->
      <div class="col-lg-8">
        <div class="row g-4 h-100">
          
          <!-- Card 1: งบประมาณอนุมัติรวม (Blue) -->
          <div class="col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
              <div class="card-body position-relative d-flex align-items-center">
                <div class="position-absolute top-0 start-0 bottom-0 bg-primary" style="width: 6px;"></div> <!-- Strip -->
                <div class="ps-3 w-100">
                  <div class="text-muted fw-bold small text-uppercase">งบประมาณอนุมัติรวม</div>
                  <div class="fs-2 fw-bold text-primary mt-2 mb-1" id="dash-total-budget">-</div>
                  <div class="text-muted small"><i class="fa-solid fa-sack-dollar me-2"></i>Total Budget</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: เบิกจ่ายจริงสะสม (Red) -->
          <div class="col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
              <div class="card-body position-relative d-flex align-items-center">
                <div class="position-absolute top-0 start-0 bottom-0 bg-danger" style="width: 6px;"></div> <!-- Strip -->
                <div class="ps-3 w-100">
                  <div class="text-muted fw-bold small text-uppercase">เบิกจ่ายจริงสะสม</div>
                  <div class="fs-2 fw-bold text-danger mt-2 mb-1" id="dash-total-used">-</div>
                  <div class="text-muted small"><i class="fa-solid fa-fire me-2"></i>Actual Used</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: คงเหลือสุทธิ (Green) -->
          <div class="col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
              <div class="card-body position-relative d-flex align-items-center">
                <div class="position-absolute top-0 start-0 bottom-0 bg-success" style="width: 6px;"></div> <!-- Strip -->
                <div class="ps-3 w-100">
                  <div class="text-muted fw-bold small text-uppercase">คงเหลือสุทธิ</div>
                  <div class="fs-2 fw-bold text-success mt-2 mb-1" id="dash-total-balance">-</div>
                  <div class="text-muted small"><i class="fa-solid fa-wallet me-2"></i>Remaining</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: % การเบิกจ่าย (Yellow) -->
          <div class="col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
              <div class="card-body position-relative d-flex align-items-center">
                <div class="position-absolute top-0 start-0 bottom-0 bg-warning" style="width: 6px;"></div> <!-- Strip -->
                <div class="ps-3 w-100">
                  <div class="text-muted fw-bold small text-uppercase">% การเบิกจ่าย</div>
                  <div class="fs-2 fw-bold text-warning mt-2 mb-1" id="dash-utilization">-</div>
                  
                  <!-- Progress Bar -->
                  <div class="progress mt-2 mb-2" style="height: 6px; background-color: #f0f0f0;">
                    <div id="dash-progress-bar" class="progress-bar bg-warning" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                  
                  <div class="text-muted small"><i class="fa-solid fa-percent me-2"></i>Percentage</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Right Column: Chart (ปรับให้สูงเท่าด้านซ้าย และกราฟใหญ่ขึ้น) -->
      <div class="col-lg-4">
        <div class="card h-100 border-0 shadow-sm rounded-3 p-2 d-flex flex-column justify-content-center align-items-center bg-light-subtle">
          <!-- ใช้ Flex-grow เพื่อให้พื้นที่กราฟขยายเต็มที่ -->
          <div class="flex-grow-1 w-100 d-flex justify-content-center align-items-center" style="position: relative; min-height: 250px;">
             <canvas id="budgetChart"></canvas>
          </div>
        </div>
      </div>

    </div>

  </div>
  <!-- [END NEW] -->

  <!-- แท็บเมนูหลัก (Modern) -->
  <ul class="nav nav-tabs mt-4" id="adminTabs">
    <li class="nav-item">
      <a class="nav-link active" data-bs-toggle="tab" href="#tab-transactions">
        <i class="fa-solid fa-file-invoice-dollar me-1"></i> บันทึกข้อมูล
      </a>
    </li>
    <!-- [EDITED] เพิ่ม ID และ d-none -->
    <li class="nav-item d-none" id="nav-project-tab">
      <a class="nav-link" data-bs-toggle="tab" href="#tab-projects">
        <i class="fa-solid fa-diagram-project me-1"></i> จัดการโครงการ
      </a>
    </li>
    <!-- [EDITED] เพิ่ม ID และ d-none -->
    <li class="nav-item d-none" id="nav-user-tab">
      <a class="nav-link" data-bs-toggle="tab" href="#tab-users">
        <i class="fa-solid fa-users-gear me-1"></i> จัดการผู้ใช้งาน
      </a>
    </li>
    <!-- [NEW] เพิ่มแท็บ "ตั้งค่าระบบ" -->
    <li class="nav-item d-none" id="nav-setting-tab">
      <a class="nav-link" data-bs-toggle="tab" href="#tab-settings">
        <i class="fa-solid fa-cogs me-1"></i> ตั้งค่าระบบ
      </a>
    </li>
  </ul>

  <div class="tab-content mt-3">
    <!-- 🔹 แท็บที่ 1: บันทึกข้อมูล -->
    <div class="tab-pane fade show active" id="tab-transactions">
      <!-- [EDITED] เพิ่ม ID และ d-none -->
      <div class="card shadow-sm d-none" id="form-transaction">
        <div class="card-header bg-light-pastel-primary d-flex align-items-center">
          <i class="fa-solid fa-wallet me-2"></i>
          <strong>ฟอร์มเบิกงบประมาณ</strong>
        </div>

        <div class="card-body">
          <!-- เลือกโครงการ -->
          <div class="mb-3">
            <label for="project" class="form-label">
              <i class="fa-solid fa-diagram-project me-1 text-primary"></i> เลือกโครงการ
            </label>
            <select id="project" class="form-select" onchange="onProjectChange()">
              <option value="">-- กรุณาเลือก --</option>
            </select>
          </div>

          <!-- ข้อมูลโครงการ -->
          <div id="projectInfo" class="alert alert-secondary d-none p-3">
            <p class="mb-1"><strong>ชื่อโครงการ:</strong> <span id="infoName">-</span></p>
            <p class="mb-1"><strong>งบประมาณทั้งหมด:</strong> <span id="infoBudget">-</span></p>
            <p class="mb-0"><strong>ผู้รับผิดชอบ:</strong> <span id="infoOwner">-</span></p>
          </div>

          <!-- ยอดคงเหลือ / จำนวนครั้ง -->
          <div class="row mb-3 g-3">
            <div class="col-md-6">
              <div class="alert alert-info p-3 m-0 d-flex align-items-center h-100">
                <i class="fa-solid fa-money-bill-wave fa-lg me-2 text-primary"></i>
                <div>
                  <strong>ยอดที่สามารถเบิกได้:</strong>
                  <span id="balanceAmount" class="ms-1 fs-5">-</span>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="alert alert-warning p-3 m-0 d-flex align-items-center h-100">
                <i class="fa-solid fa-hashtag fa-lg me-2 text-warning-emphasis"></i>
                <div>
                  <strong>จำนวนครั้งที่เบิกล่าสุด:</strong>
                  <span id="sequenceCount" class="ms-1 fs-5">-</span>
                </div>
              </div>
            </div>
          </div>

          <!-- กรอกจำนวนเงิน -->
          <div class="mb-3 mt-3">
            <!-- [ZERO-BUDGET EDIT] Add ID to label -->
            <label for="amount" class="form-label" id="labelAmount">
              <i class="fa-solid fa-money-bill-wave me-1 text-success"></i> จำนวนเงินที่ต้องการเบิก
            </label>
            <input type="number" id="amount" class="form-control" min="0" placeholder="ระบุจำนวนเงินที่ต้องการเบิก">
          </div>

          <!-- ปุ่มบันทึก -->
          <div class="text-end">
            <!-- [ZERO-BUDGET EDIT] Add ID to button -->
            <button onclick="submitTransaction()" class="btn btn-primary" id="btnSubmitTransaction">
              <i class="fa-solid fa-paper-plane me-1"></i> บันทึกการเบิกเงิน
            </button>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header bg-light-pastel-info">
          <i class="fa-solid fa-table-list me-2"></i> ตารางรายการเบิกงบ
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover" id="tableTransactions" style="width: 100%;">
              <thead></thead> <!-- DataTable will build this -->
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 🔹 แท็บที่ 2: จัดการโครงการ -->
    <div class="tab-pane fade" id="tab-projects">
      <div class="card shadow-sm">
        <!-- [MODIFIED] เพิ่มปุ่ม Import/Export/Template -->
        <div class="card-header bg-light-pastel-secondary d-flex flex-wrap align-items-center">
          <h5 class="pt-1 mb-0"><i class="fa-solid fa-diagram-project me-1"></i> จัดการโครงการ</h5>
          
          <div class="ms-auto d-flex flex-wrap">
            <!-- [NEW] Excel Template Button -->
            <button type="button" class="btn btn-outline-primary btn-sm me-2 d-none" id="btn-template-project">
              <i class="fa-solid fa-file-lines me-1"></i> Template
            </button>
            
            <!-- [NEW] Excel Export Button -->
            <button type="button" class="btn btn-success btn-sm me-2 d-none" id="btn-export-project">
              <i class="fa-solid fa-file-excel me-1"></i> ส่งออก
            </button>
  
            <!-- [NEW] Excel Import Button -->
            <button type="button" class="btn btn-info btn-sm me-2 d-none" id="btn-import-project">
              <i class="fa-solid fa-file-import me-1"></i> นำเข้า
            </button>
            
            <!-- [EDITED] เพิ่ม btn-sm -->
            <button type="button" class="btn btn-primary btn-sm d-none" id="btn-add-project" onclick="openProjectModal('add')">
              <i class="fa-solid fa-plus me-1"></i> เพิ่มโครงการ
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- [NEW] Hidden file input for Excel Import -->
          <input type="file" id="projectFileUploader" accept=".xlsx" style="display: none;">
          
          <div class="table-responsive">
            <table class="table table-hover" id="tableProjects" style="width: 100%;">
              <thead></thead> <!-- DataTable will build this -->
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 🔹 แท็บผู้ใช้งาน -->
    <div class="tab-pane fade" id="tab-users">
      <div class="card shadow-sm">
        <div class="card-header bg-light-pastel-secondary d-flex align-items-center">
          <h5 class="pt-1 mb-0"><i class="fa-solid fa-users-gear me-1"></i> จัดการผู้ใช้งาน</h5>
          <!-- [EDITED] เพิ่ม ID และ d-none -->
          <button type="button" class="btn btn-primary ms-auto d-none" id="btn-add-user" onclick="openUserModal()">
            <i class="fa-solid fa-user-plus me-1"></i> เพิ่มผู้ใช้งาน
          </button>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover" id="tableUsers" style="width: 100%;">
              <thead></thead> <!-- DataTable will build this -->
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- [NEW] 🔹 แท็บตั้งค่าระบบ -->
    <div class="tab-pane fade" id="tab-settings">
      <div class="card shadow-sm">
        <div class="card-header bg-light-pastel-secondary">
          <h5 class="pt-1 mb-0"><i class="fa-solid fa-cogs me-1"></i> ตั้งค่าระบบ</h5>
        </div>
        <div class="card-body">
          <form id="formSettings">
            <div class="alert alert-info">
              <i class="fa-solid fa-circle-info me-1"></i>
              การตั้งค่าเหล่านี้มีผลต่อการทำงานหลักของระบบ โปรดแก้ไขด้วยความระมัดระวัง
            </div>
            
            <!-- การตั้งค่า Drive Folder ID -->
            <div class="mb-3">
              <label for="driveFolderId" class="form-label">
                <i class="fa-brands fa-google-drive me-1 text-success"></i> 
                <strong>Google Drive Folder ID</strong> (สำหรับเก็บไฟล์แนบ)
              </label>
              <input type="text" class="form-control" id="driveFolderId" placeholder="กรอก Folder ID จาก Google Drive">
              <div class="form-text">
                คุณสามารถหา ID ได้จาก URL ของโฟลเดอร์ใน Google Drive (เช่น .../folders/<b>[THIS_IS_THE_ID]</b>)
              </div>
            </div>
            
            <div class="text-end">
              <button type="submit" class="btn btn-primary" id="btnSaveSettings">
                <i class="fa-solid fa-save me-1"></i> บันทึกการตั้งค่า
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
    
  </div>
</div>
