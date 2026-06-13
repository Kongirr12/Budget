// ==========================================
  // Scripts สำหรับ Admin CRUD (Projects & Users)
  // ==========================================
  
  document.addEventListener('DOMContentLoaded', function() {
    // โหลดข้อมูลตาราง admin เมื่อแท็บถูกคลิก
    const adminTabs = document.getElementById('adminTabs');
    if (adminTabs) {
      const projectTab = adminTabs.querySelector('a[href="#tab-projects"]');
      const userTab = adminTabs.querySelector('a[href="#tab-users"]');
      const settingTab = adminTabs.querySelector('a[href="#tab-settings"]'); 

      if(projectTab) {
        projectTab.addEventListener('shown.bs.tab', function() { 
           if ($.fn.DataTable.isDataTable('#tableProjects')) {
              $('#tableProjects').DataTable().columns.adjust();
           } else {
              loadProjectData();
           }
        });
      }
      
      if(userTab) {
        userTab.addEventListener('shown.bs.tab', function() { 
          if ($.fn.DataTable.isDataTable('#tableUsers')) {
             $('#tableUsers').DataTable().columns.adjust();
          } else {
             loadUsersData();
          }
        });
      }

      if(settingTab) {
        settingTab.addEventListener('shown.bs.tab', function() {
          loadSystemSettings();
        });
      }

      // โหลดข้อมูลธุรกรรมในแท็บแรก (ถ้าล็อกอินอยู่)
      if (isLoggedIn && document.querySelector('#tab-transactions').classList.contains('active')) {
         loadDataTransactions();
      }
    }

    // Event Listeners for Excel buttons
    const btnTemplate = document.getElementById('btn-template-project');
    const btnExport = document.getElementById('btn-export-project');
    const btnImport = document.getElementById('btn-import-project');
    const fileUploader = document.getElementById('projectFileUploader');

    if (btnTemplate) {
      btnTemplate.addEventListener('click', downloadProjectTemplate);
    }
    if (btnExport) {
      btnExport.addEventListener('click', exportProjects);
    }
    if (btnImport) {
      btnImport.addEventListener('click', function() {
        if (fileUploader) fileUploader.click();
      });
    }
    if (fileUploader) {
      fileUploader.addEventListener('change', handleProjectImport);
    }

  });


  /** โหลดข้อมูลโครงการจากชีต */
  function loadProjectData() {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    loadingStart();
    
    callAPI('getProjectData', { token: authToken })
      .then(function(results) {
        loadingEnd();
        showProjectTable(results);
      })
      .catch(onFailure);
  }

  /** แสดงข้อมูลใน DataTable */
  function showProjectTable(items) {
    const tableId = '#tableProjects';

    if ($.fn.DataTable.isDataTable(tableId)) {
      $(tableId).DataTable().destroy();
    }

    if (!items || items.length === 0) {
      $(tableId).html("<thead><tr><th>ที่</th><th>รหัส</th><th>ชื่อโครงการ</th><th>งบประมาณ</th><th>ผู้รับผิดชอบ</th><th>การจัดการ</th></tr></thead><tbody><tr><td colspan='6' class='text-center'>ไม่พบข้อมูล</td></tr></tbody>");
      return;
    }
    
    new DataTable(tableId, {
      destroy: true,
      responsive: true,
      pageLength: 10,
      data: items,
      order: [[0, 'asc']],
      columns: [
        { 
          title: "ที่",
          data: null,
          render: function(data, type, row, meta) { return meta.row + 1; },
          className: 'text-center'
        },
        { title: "รหัสโครงการ", data: 0, className: 'text-center' },
        { title: "ชื่อโครงการ", data: 1 },
        { 
          title: "งบประมาณ", 
          data: 2,
          render: function(data) { return Number(data || 0).toLocaleString(); }, 
          className: 'text-end'
        },
        { 
          title: "ผู้รับผิดชอบ", 
          data: 3, 
          render: function(data) { 
            const ownerIds = _parseOwnerIds(data);
            const ownerNames = ownerIds.map(getUserFullName).join(', ');
            return ownerNames || '(ไม่ได้ระบุ)'; 
          }
        },
        {
          title: "การจัดการ",
          data: 0, 
          orderable: false,
          className: 'text-center',
          render: function(data) { 
            if (userRole !== 'Admin') return 'N/A';
            return (
              '<button class="btn btn-sm btn-warning me-1" onclick="openProjectModal(\'edit\',\'' + data + '\')">' +
                '<i class="fa-solid fa-pen-to-square"></i>' +
              '</button>' +
              '<button class="btn btn-sm btn-danger" onclick="deleteProjectConfirm(\'' + data + '\')">' +
                '<i class="fa-solid fa-trash"></i>' +
              '</button>'
            );
          }
        }
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

  /** เปิด Modal เพิ่ม/แก้ไข */
  function openProjectModal(mode, code = "") {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    const modalEl = document.getElementById('projectModal');
    const modal = new bootstrap.Modal(modalEl);
    $('#myFormAddProject')[0].reset();
    $('#projectMode').val(mode);
    $('#projectId').val(code);

    if (tomSelectOwner) {
      tomSelectOwner.destroy(); 
    }
    
    tomSelectOwner = new TomSelect('#projectOwner', {
      valueField: 'id', 
      labelField: 'fullName', 
      searchField: ['fullName'], 
      options: assignableUsers, 
      placeholder: 'เลือกผู้รับผิดชอบ (หรือเว้นว่างไว้)',
      create: false
    });

    if (mode === "add") {
      $('#labelModalProjectModal').html('<i class="fa-solid fa-plus me-2"></i> เพิ่มโครงการ');
      $('#projectCode').prop('disabled', false);
      tomSelectOwner.setValue([]); 
      modal.show();
    } else if (mode === "edit") {
      $('#labelModalProjectModal').html('<i class="fa-solid fa-pen-to-square me-2"></i> แก้ไขโครงการ');
      loadingStart();
      
      callAPI('getProjectByCode', { token: authToken, code: code })
        .then(function(project) {
          loadingEnd();
          if (!project) {
            Swal.fire({ icon: 'error', title: 'ไม่พบข้อมูลโครงการนี้' });
            return;
          }
          $('#projectCode').val(project.ProjectCode).prop('disabled', true);
          $('#projectName').val(project.ProjectName);
          $('#projectBudget').val(project.Budget);
          
          const ownerIds = _parseOwnerIds(project.Owner);
          tomSelectOwner.setValue(ownerIds || []); 
          
          modal.show();
        })
        .catch(onFailure);
    }
  }

  /** บันทึกโครงการ */
  function saveProject() {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    
    const mode = $('#projectMode').val();
    const code = $('#projectCode').val().trim();
    const name = $('#projectName').val().trim();
    const budget = $('#projectBudget').val().trim();
    const owner = tomSelectOwner.getValue(); 

    if (!code || !name || !budget) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล รหัส, ชื่อ, และงบประมาณ ให้ครบถ้วน' });
      return;
    }

    loadingStart();

    const callback = function(msg) { 
      loadingEnd();
      const icon = msg.startsWith('✅') ? 'success' : 'error';
      Swal.fire({ icon: icon, title: msg });
      
      if (icon === 'success') {
        bootstrap.Modal.getInstance(document.getElementById('projectModal')).hide();
        loadProjectData(); 
        loadProjects(); 
        loadProjectSummary(); 
      }
    };
    
    const action = mode === "add" ? 'addProject' : 'updateProject';
    
    callAPI(action, { token: authToken, code: code, name: name, budget: budget, owner: owner })
      .then(callback)
      .catch(onFailure);
  }

  /** ลบโครงการ */
  function deleteProjectConfirm(code) {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    
    Swal.fire({
      title: 'คุณต้องการลบโครงการนี้หรือไม่?',
      text: 'รหัส: ' + code + ' (การดำเนินการนี้ไม่สามารถย้อนกลับได้)', 
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: '#6c757d',
    }).then(function(result) { 
      if (result.isConfirmed) {
        loadingStart();
        callAPI('deleteProject', { token: authToken, code: code })
          .then(function(msg) {
            loadingEnd();
            const icon = msg.startsWith('🗑️') ? 'success' : 'error';
            Swal.fire({ icon: icon, title: msg });
            
            if (icon === 'success') {
              loadProjectData(); 
              loadProjects(); 
              loadProjectSummary(); 
            }
          })
          .catch(onFailure);
      }
    });
  }

  // =======================================
  // Excel Import / Export
  // =======================================

  function downloadProjectTemplate() {
    if (userRole !== 'Admin' || !requireLogin()) return;
    
    loadingStart();
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Projects_Template');

      worksheet.columns = [
        { header: 'ProjectCode', key: 'code', width: 25 },
        { header: 'ProjectName', key: 'name', width: 40 },
        { header: 'Budget', key: 'budget', width: 20 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FF000000' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      headerRow.eachCell(function(cell) { cell.border = { bottom: { style: 'thin' } }; });

      workbook.xlsx.writeBuffer().then(function(buffer) {
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), "Project_Template.xlsx");
        loadingEnd();
      });
    } catch (err) {
      onFailure(err);
    }
  }

  function exportProjects() {
    if (userRole !== 'Admin' || !requireLogin()) return;
    loadingStart();
    callAPI('getProjectData', { token: authToken })
      .then(onDataForExport)
      .catch(onFailure);
  }

  function onDataForExport(data) {
    if (!data || data.length === 0) {
      loadingEnd();
      toastr.info('ไม่พบข้อมูลโครงการที่จะส่งออก');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Project_Export');

      worksheet.columns = [
        { header: 'ProjectCode', key: 'code', width: 25 },
        { header: 'ProjectName', key: 'name', width: 40 },
        { header: 'Budget', key: 'budget', width: 20 },
        { header: 'Owner (JSON)', key: 'owner', width: 40 }
      ];
      
      worksheet.getRow(1).font = { bold: true };

      data.forEach(function(row) {
        worksheet.addRow({
          code: row[0],
          name: row[1],
          budget: parseFloat(row[2]) || 0,
          owner: row[3] 
        });
      });

      workbook.xlsx.writeBuffer().then(function(buffer) {
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), "Project_Export.xlsx");
        loadingEnd();
      });

    } catch (err) {
      onFailure(err);
    }
  }

  async function handleProjectImport(e) {
    if (userRole !== 'Admin' || !requireLogin()) return;
    
    const file = e.target.files[0];
    if (!file) return;

    loadingStart();
    
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(1); 
      if (!worksheet) throw new Error("ไม่พบ Worksheet ในไฟล์ Excel");

      const projectsToImport = [];
      let headerCount = 0;

      worksheet.eachRow(function(row, rowNumber) {
        if (rowNumber === 1) {
          if (String(row.getCell(1).value).trim() === 'ProjectCode') headerCount++;
          if (String(row.getCell(2).value).trim() === 'ProjectName') headerCount++;
          if (String(row.getCell(3).value).trim() === 'Budget') headerCount++;
          return; 
        }

        const project = {
          code: String(row.getCell(1).value || '').trim(),
          name: String(row.getCell(2).value || '').trim(),
          budget: parseFloat(row.getCell(3).value) || 0
        };

        if (project.code && project.name) {
          projectsToImport.push(project);
        }
      });

      if (headerCount < 3) {
         throw new Error("ไฟล์ Template ไม่ถูกต้อง กรุณาดาวน์โหลด Template ใหม่");
      }

      if (projectsToImport.length === 0) {
        loadingEnd();
        toastr.info('ไม่พบข้อมูลที่จะนำเข้าในไฟล์');
        return;
      }

      callAPI('importProjects', { token: authToken, projectsToImport: projectsToImport })
        .then(onImportComplete)
        .catch(onFailure);

    } catch (err) {
      onFailure(err);
    } finally {
      $(e.target).val(null);
    }
  }

  function onImportComplete(response) {
    loadingEnd();
    if (response.success) {
      let title = 'นำเข้าสำเร็จ!';
      let icon = 'success';
      let html = '<p>✅ เพิ่มข้อมูลใหม่: <strong>' + response.added + '</strong> รายการ</p>';

      if (response.skipped && response.skipped.length > 0) {
        title = 'นำเข้าสำเร็จ (มีข้อมูลซ้ำ)';
        icon = 'warning';
        html += '<p>⚠️ ข้ามข้อมูล (รหัสซ้ำ): <strong>' + response.skipped.length + '</strong> รายการ</p>' +
                '<small>(' + response.skipped.join(', ') + ')</small>';
      }

      Swal.fire({ icon: icon, title: title, html: html });

      loadProjectData(); 
      loadProjects(); 
      loadProjectSummary(); 

    } else {
      onFailure(new Error(response.message));
    }
  }


  // =======================================
  // จัดการผู้ใช้งาน
  // =======================================

  function loadUsersData() {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    
    loadingStart();
    callAPI('getUserData', { token: authToken })
      .then(function(results) {
        loadingEnd();
        showUserTable(results);
      })
      .catch(onFailure);
  }

  function showUserTable(users) {
    const tableId = '#tableUsers';

    if ($.fn.DataTable.isDataTable(tableId)) {
      $(tableId).DataTable().destroy();
    }

    if (!users || users.length === 0) {
      $(tableId).html("<thead><tr><th>#</th><th>Username</th><th>Full Name</th><th>Status</th><th>Role</th><th>Action</th></tr></thead><tbody><tr><td colspan='6' class='text-center'>ไม่พบข้อมูล</td></tr></tbody>");
      return;
    }

    new DataTable(tableId, {
      destroy: true,
      responsive: true,
      pageLength: 10,
      data: users,
      order: [[0, 'asc']],
      columns: [
        {
          title: "#",
          data: null,
          render: function(data, type, row, meta) { return meta.row + 1; },
          className: 'text-center'
        },
        { title: "Username", data: "username" },
        { title: "Full Name", data: "fullName" },
        {
          title: "Status",
          data: "status",
          className: 'text-center',
          render: function(data) { 
            return data === 'active' 
            ? '<span class="badge bg-success-subtle text-success-emphasis rounded-pill">Active</span>'
            : '<span class="badge bg-danger-subtle text-danger-emphasis rounded-pill">Inactive</span>'
          }
        },
        { title: "Role", data: "role", className: 'text-center' },
        {
          title: "Action",
          data: "id", 
          orderable: false,
          className: 'text-center',
          render: function(data) { 
            if (userRole !== 'Admin') return 'N/A';
            return (
              '<button class="btn btn-sm btn-warning me-1" onclick="editUser(\'' + data + '\')">' +
                '<i class="fa-solid fa-pen-to-square"></i>' +
              '</button>' +
              '<button class="btn btn-sm btn-danger" onclick="deleteUserConfirm(\'' + data + '\')">' +
                '<i class="fa-solid fa-trash-can"></i>' +
              '</button>'
            );
          }
        }
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

  function openUserModal() {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    
    $("#formUser")[0].reset();
    $("#userId").val('');
    $("#roleUser").val('Viewer'); 
    $("#status").val('active');
    $("#modalUserLabel").html('<i class="fas fa-user-plus me-2"></i> เพิ่มผู้ใช้งาน');
    const modal = new bootstrap.Modal(document.getElementById('modalUser'));
    modal.show();
  }

  function editUser(id) {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    
    loadingStart();
    callAPI('getUserById', { token: authToken, id: id })
      .then(function(user) {
        loadingEnd();
        if (!user) return Swal.fire('ไม่พบผู้ใช้งาน', '', 'error');
        $("#userId").val(user.id);
        $("#usernameUser").val(user.username);
        $("#passwordUser").val(user.password);
        $("#fullName").val(user.fullName);
        $("#status").val(user.status);
        $("#roleUser").val(user.role);
        $("#modalUserLabel").html('<i class="fas fa-user-pen me-2"></i> แก้ไขผู้ใช้งาน');
        const modal = new bootstrap.Modal(document.getElementById('modalUser'));
        modal.show();
      })
      .catch(onFailure);
  }

  function deleteUserConfirm(id) {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;
    
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: "การลบผู้ใช้งานจะไม่สามารถย้อนกลับได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(function(result) { 
      if (result.isConfirmed) {
        loadingStart();
        callAPI('deleteUser', { token: authToken, id: id })
          .then(function(msg) {
            loadingEnd();
            const icon = msg.startsWith('ลบ') ? 'success' : 'error';
            Swal.fire({ icon: icon, title: msg });
            if (icon === 'success') {
              loadUsersData();
              loadAssignableUsers(); 
            }
          })
          .catch(onFailure);
      }
    });
  }

  $("#formUser").submit(function (e) {
    e.preventDefault();
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;

    const data = {
      id: $("#userId").val(),
      username: $("#usernameUser").val().trim(),
      password: $("#passwordUser").val(),
      fullName: $("#fullName").val(),
      status: $("#status").val(),
      role: $("#roleUser").val() 
    };

    if (!data.username || !data.password || !data.fullName || !data.status || !data.role) {
      return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    }
    
    loadingStart();
    callAPI('saveUserData', { token: authToken, userData: data }) // ส่ง key ให้ตรงกับหลังบ้าน params.userData
      .then(function(msg) {
        loadingEnd();
        const icon = msg.includes('สำเร็จ') ? 'success' : 'error';
        Swal.fire({ icon: icon, title: msg });
        
        if (icon === 'success') {
          bootstrap.Modal.getInstance(document.getElementById('modalUser')).hide();
          loadUsersData();
          loadAssignableUsers(); 
        }
      })
      .catch(onFailure);
  });

  // =======================================
  // ตั้งค่าระบบ
  // =======================================

  function loadSystemSettings() {
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;

    loadingStart();
    callAPI('getDriveFolderId', { token: authToken })
      .then(function(response) {
        loadingEnd();
        if (response.success) {
          $('#driveFolderId').val(response.folderId);
        } else {
          Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้: ' + response.message, 'error');
        }
      })
      .catch(onFailure);
  }

  $("#formSettings").submit(function (e) {
    e.preventDefault();
    if (userRole !== 'Admin') return; 
    if (!requireLogin()) return;

    const newFolderId = $('#driveFolderId').val().trim();

    if (!newFolderId) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอก Google Drive Folder ID', 'warning');
      return;
    }

    Swal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'คุณต้องการอัปเดต Folder ID ใช่หรือไม่? การเปลี่ยนแปลงนี้มีผลต่อระบบไฟล์แนบ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--success-color)',
    }).then(function(result) {
      if (result.isConfirmed) {
        loadingStart();
        callAPI('setDriveFolderId', { token: authToken, newId: newFolderId }) // ส่ง key ให้ตรงกับหลังบ้าน params.newId
          .then(function(response) {
            loadingEnd();
            if (response.success) {
              Swal.fire('สำเร็จ!', response.message, 'success');
              loadSystemSettings(); 
            } else {
              Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกได้: ' + response.message, 'error');
            }
          })
          .catch(onFailure);
      }
    });
  });
