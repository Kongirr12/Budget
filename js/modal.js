<!-- Modal สำหรับ Login -->
<div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">

      <!-- Header ของ Modal -->
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title" id="loginModalLabel">
          <i class="fa-solid fa-lock me-2"></i> เข้าสู่ระบบ
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>

      <!-- Body ของ Modal -->
      <div class="modal-body">
        <form id="loginForm">
          <!-- ช่องกรอก Username -->
          <div class="mb-3">
            <!-- [EDITED] กลับไปใช้ "ชื่อผู้ใช้" ธรรมดา -->
            <label for="username" class="form-label">ชื่อผู้ใช้</label>
            <input type="text" id="username" class="form-control" placeholder="ชื่อผู้ใช้" required>
          </div>

          <!-- ช่องกรอก Password -->
          <div class="mb-3">
            <label for="password" class="form-label">รหัสผ่าน</label>
            <input type="password" id="password" class="form-control" placeholder="รหัสผ่าน" required>
          </div>

          <!-- ปุ่ม Submit Login -->
          <button type="submit" class="btn btn-primary w-100">
            <i class="fa-solid fa-right-to-bracket me-1"></i> เข้าสู่ระบบ
          </button>
        </form>
      </div>

    </div>
  </div>
</div>

<!-- โมดอลจัดการโครงการ -->
<div class="modal fade" id="projectModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title" id="labelModalProjectModal">
          <i class="fa-solid fa-diagram-project me-2"></i> จัดการโครงการ
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <form id="myFormAddProject">
          <input type="hidden" id="projectMode"> <!-- add / edit -->
          <input type="hidden" id="projectId"> <!-- สำหรับรหัสโครงการเก่าเวลาจะแก้ไข -->

          <div class="mb-3">
            <label class="form-label">รหัสโครงการ</label>
            <input type="text" class="form-control" id="projectCode" required>
          </div>

          <div class="mb-3">
            <label class="form-label">ชื่อโครงการ</label>
            <input type="text" class="form-control" id="projectName" required>
          </div>

          <div class="mb-3">
            <label class="form-label">งบประมาณ (บาท)</label>
            <input type="number" class="form-control" id="projectBudget" min="0" required>
          </div>

          <div class="mb-3">
            <label class="form-label">ผู้รับผิดชอบ (เลือกได้หลายคน)</label>
            <!-- [EDITED] เปลี่ยนจาก input เป็น select สำหรับ Tom-Select -->
            <!-- [MULTI-OWNER EDIT] Add 'multiple' attribute -->
            <select id="projectOwner" placeholder="เลือกผู้รับผิดชอบ..." autocomplete="off" multiple>
            </select>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="fa-solid fa-xmark me-1"></i> ยกเลิก
        </button>
        <button type="button" class="btn btn-success" onclick="saveProject()">
          <i class="fa-solid fa-floppy-disk me-1"></i> บันทึก
        </button>
      </div>
    </div>
  </div>
</div>

<!-- 🔹 โมดอลเพิ่ม/แก้ไขผู้ใช้งาน -->
<div class="modal fade" id="modalUser" tabindex="-1" aria-labelledby="modalUserLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form id="formUser" class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title" id="modalUserLabel"><i class="fa-solid fa-user-pen me-2"></i> จัดการผู้ใช้งาน</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="userId" />
        <div class="mb-3">
          <!-- [EDITED] กลับไปใช้ "Username" ธรรมดา -->
          <label class="form-label">Username</label>
          <input type="text" id="usernameUser" class="form-control" required />
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" id="passwordUser" class="form-control" required />
        </div>
        <div class="mb-3">
          <label class="form-label">Full Name</label>
          <input type="text" id="fullName" class="form-control" required />
        </div>
        <div class="mb-3" id="div-user-role">
          <label class="form-label">Role</label>
          <select id="roleUser" class="form-select">
            <option value="Viewer">Viewer</option>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div class="mb-3" id="div-user-status">
          <label class="form-label">Status</label>
          <select id="status" class="form-select">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="fa-solid fa-xmark me-1"></i> ปิด
        </button>
        <button type="submit" class="btn btn-success">
          <i class="fa-solid fa-floppy-disk me-1"></i> บันทึก
        </button>
      </div>
    </form>
  </div>
</div>

<!-- [BATCH EDIT] โมดอลจัดการไฟล์แนบ (ปรับปรุงใหม่) -->
<div class="modal fade" id="modalUploadFiles" tabindex="-1" aria-labelledby="modalUploadFilesLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title" id="modalUploadFilesLabel"><i class="fa-solid fa-paperclip me-2"></i> จัดการไฟล์แนบ</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      
      <!-- [BATCH EDIT] เพิ่ม class 'upload-modal-body' และ data-mode -->
      <div class="modal-body upload-modal-body" data-mode="read">
        <input type="hidden" id="uploadTxId" />
        <input type="file" id="fileUploader" multiple style="display: none;" />

        <!-- ข้อมูล Transaction -->
        <div class="alert alert-secondary p-3">
          <div class="row">
            <div class="col-md-6">
              <strong>ID ธุรกรรม:</strong> <span id="uploadTxIdDisplay">-</span>
            </div>
            <div class="col-md-6">
              <strong>โครงการ:</strong> <span id="uploadTxProjectName">-</span>
            </div>
          </div>
        </div>

        <div class="row">
          <!-- ใบเสร็จ/ใบแจ้งหนี้ -->
          <div class="col-md-6">
            <h6 class="text-primary"><i class="fa-solid fa-receipt me-1"></i> 1. ไฟล์ใบเสร็จ / ใบแจ้งหนี้</h6>
            <!-- [BATCH EDIT] Dropzone จะถูกซ่อน/แสดง โดย .upload-modal-body[data-mode="edit"] -->
            <div class="dropzone" id="dropzone-receipts" data-file-type="receipts">
              <i class="fa-solid fa-cloud-arrow-up fa-2x text-muted"></i>
              <p class="mb-0">ลากไฟล์มาวาง หรือ คลิกที่นี่</p>
              <small>(.jpg, .png, .pdf | สูงสุด 10MB)</small>
            </div>
            <div class="preview-container" id="preview-receipts">
              <!-- Thumbnails จะถูกสร้างโดย JS -->
            </div>
          </div>

          <!-- รายงานโครงการ -->
          <div class="col-md-6">
            <h6 class="text-success"><i class="fa-solid fa-file-lines me-1"></i> 2. ไฟล์รายงานการดำเนินโครงการ</h6>
            <!-- [BATCH EDIT] Dropzone -->
            <div class="dropzone" id="dropzone-reports" data-file-type="reports">
              <i class="fa-solid fa-cloud-arrow-up fa-2x text-muted"></i>
              <p class="mb-0">ลากไฟล์มาวาง หรือ คลิกที่นี่</p>
              <small>(.jpg, .png, .pdf | สูงสุด 10MB)</small>
            </div>
            <div class="preview-container" id="preview-reports">
              <!-- Thumbnails จะถูกสร้างโดย JS -->
            </div>
          </div>
        </div>
      </div>

      <!-- [BATCH EDIT] Footer (Read-Only Mode) -->
      <div class="modal-footer" id="upload-footer-readonly">
        <button type="button" class="btn btn-primary" id="btnUploadEdit">
          <i class="fa-solid fa-pen-to-square me-1"></i> เพิ่ม / แก้ไข
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="fa-solid fa-xmark me-1"></i> ปิด
        </button>
      </div>

      <!-- [BATCH EDIT] Footer (Edit Mode) -->
      <div class="modal-footer d-none" id="upload-footer-edit">
        <button type="button" class="btn btn-success" id="btnUploadSave">
          <i class="fa-solid fa-save me-1"></i> บันทึกการเปลี่ยนแปลง
        </button>
        <button type="button" class="btn btn-warning" id="btnUploadCancel">
          <i class="fa-solid fa-times me-1"></i> ยกเลิก
        </button>
      </div>

    </div>
  </div>
</div>
