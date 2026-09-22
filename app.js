// Nagpur Civic Platform Application Core
let activePersona = 'citizen';
let currentGrievance = null;
let leafletMap = null;
let mapMarkersLayer = null;
let clusterLayers = [];
let allZones = [];
let isOfflineSimulated = false;

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span style="font-size: 1.1rem;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// Quick interactive demo scenarios
function selectScenario(scenario) {
  document.querySelectorAll('.scenario-pill').forEach(pill => {
    const fnStr = pill.getAttribute('onclick') || '';
    pill.classList.toggle('active', fnStr.includes(`'${scenario}'`));
  });

  if (scenario === 'sunita') {
    switchPersona('citizen');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === 'citizen'));
    loadTrackedTicket('NMC-2026-ASH-0042');
    showToast('Scenario 1 Active: Sunita Meshram (Ashi Nagar Citizen OTP Flow)', 'info');
  } else if (scenario === 'field') {
    switchPersona('field');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === 'field'));
    loadFieldQueue();
    showToast('Scenario 2 Active: Orange City Water (Field Inspection & Work)', 'info');
  } else if (scenario === 'admin') {
    switchPersona('admin');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === 'admin'));
    initOrRefreshMap();
    loadCommandCenterAnalytics();
    showToast('Scenario 3 Active: Zonal Executive Command Center & Pie Charts', 'info');
  } else if (scenario === 'twist') {
    const twistPanel = document.getElementById('twist-demo-panel');
    if (twistPanel) {
      const body = document.getElementById('twist-content-body');
      if (body) body.style.display = 'block';
      const icon = document.getElementById('twist-toggle-icon');
      if (icon) icon.textContent = '−';
      twistPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      twistPanel.classList.add('pulse-highlight');
      setTimeout(() => twistPanel.classList.remove('pulse-highlight'), 3000);
    }
    showToast('Scenario 4 Active: 7. Twist Demonstration Panel (Digital Inclusion Mode)', 'info');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setLanguage('mr'); // Default to Marathi per Sunita persona
  await loadZones();
  setupEventListeners();
  loadTrackedTicket('NMC-2026-ASH-0042'); // Load Sunita Meshram's initial ticket
  loadCommandCenterAnalytics();
});

function setupEventListeners() {
  // Role selector
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePersona = btn.dataset.role;
      switchPersona(activePersona);
    });
  });

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      if (currentGrievance) renderTicketDetails(currentGrievance);
    });
  });

  // Grievance submission form
  const form = document.getElementById('grievance-form');
  if (form) {
    form.addEventListener('submit', handleGrievanceSubmit);
  }

  // Detect GPS button
  const gpsBtn = document.getElementById('btn-detect-gps');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', detectGpsLocation);
  }

  // Ticket search form
  const searchBtn = document.getElementById('btn-search-ticket');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const tid = document.getElementById('search-ticket-id').value.trim();
      if (tid) loadTrackedTicket(tid);
    });
  }

  // Category cards tap selection
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.dataset.val;
      const agencyName = card.dataset.agencyName;
      document.getElementById('form-category').value = val;
      const agencyBadge = document.getElementById('selected-agency-badge');
      if (agencyBadge) agencyBadge.textContent = agencyName;

      // Auto-sync photo sample if user has not uploaded custom camera photo
      if (!isCustomPhotoUploaded) {
        if (val === 'pothole') {
          selectSamplePhoto('pothole', false);
        } else if (val === 'garbage_overflow' || val === 'drainage_choke') {
          selectSamplePhoto('garbage', false);
        } else {
          selectSamplePhoto('pipe', false);
        }
      }
    });
  });

  // Voice Input Speech Recognition button
  const voiceBtn = document.getElementById('btn-voice-input');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', toggleVoiceInput);
  }

  // Offline toggle
  const offlineToggle = document.getElementById('offline-toggle');
  if (offlineToggle) {
    offlineToggle.addEventListener('change', (e) => {
      isOfflineSimulated = e.target.checked;
      document.getElementById('offline-banner').style.display = isOfflineSimulated ? 'flex' : 'none';
    });
  }
}

function switchPersona(role) {
  document.querySelectorAll('.persona-view').forEach(view => {
    view.classList.remove('active');
  });
  const activeView = document.getElementById(`view-${role}`);
  if (activeView) activeView.classList.add('active');

  if (role === 'admin') {
    initOrRefreshMap();
    loadCommandCenterAnalytics();
  } else if (role === 'field') {
    loadFieldQueue();
  }
}

async function loadZones() {
  try {
    const res = await fetch('/api/zones');
    allZones = await res.json();
    const zoneSelect = document.getElementById('form-zone');
    const fieldZoneFilter = document.getElementById('field-zone-filter');
    
    if (zoneSelect) {
      zoneSelect.innerHTML = '<option value="">Auto-detected via GPS</option>';
      allZones.forEach(z => {
        zoneSelect.innerHTML += `<option value="${z.zone_id}">${z.zone_no}. ${z.name_en} (${z.name_mr})</option>`;
      });
    }

    if (fieldZoneFilter) {
      fieldZoneFilter.innerHTML = '<option value="">All 10 Zones</option>';
      allZones.forEach(z => {
        fieldZoneFilter.innerHTML += `<option value="${z.zone_id}" ${z.zone_id === 9 ? 'selected' : ''}>${z.name_en} (${z.name_mr})</option>`;
      });
    }
  } catch (err) {
    console.error('Failed to load zones:', err);
  }
}

let isCustomPhotoUploaded = false;

// Handle real photo file selection from camera / gallery
function handlePhotoFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const dataUrl = event.target.result;
    isCustomPhotoUploaded = true;
    const previewImg = document.getElementById('photo-preview-img');
    const hiddenUrl = document.getElementById('form-photo-url');
    const nameEl = document.getElementById('photo-preview-name');
    const statusEl = document.getElementById('photo-preview-status');

    if (previewImg) previewImg.src = dataUrl;
    if (hiddenUrl) hiddenUrl.value = dataUrl;
    if (nameEl) nameEl.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
    if (statusEl) statusEl.textContent = "✅ फोटो पुरावा जोडला (Custom Photo Attached)";

    showToast(`📷 ${file.name} फोटो पुरावा यशस्वीरित्या जोडला!`, 'success');
  };
  reader.readAsDataURL(file);
}

// Select preset sample defect photo
function selectSamplePhoto(type, notify = true) {
  isCustomPhotoUploaded = false;
  const previewImg = document.getElementById('photo-preview-img');
  const hiddenUrl = document.getElementById('form-photo-url');
  const nameEl = document.getElementById('photo-preview-name');
  const statusEl = document.getElementById('photo-preview-status');

  let fileUrl = '/assets/before_defect.svg';
  let displayName = 'water_leak_proof.svg';
  let title = 'पाणी गळती नमुना';

  if (type === 'pothole') {
    fileUrl = '/assets/pothole_defect.svg';
    displayName = 'pothole_proof.svg';
    title = 'रस्त्यावरील खड्डा नमुना';
  } else if (type === 'garbage') {
    fileUrl = '/assets/garbage_defect.svg';
    displayName = 'garbage_dump_proof.svg';
    title = 'कचरा साचणे नमुना';
  }

  if (previewImg) previewImg.src = fileUrl;
  if (hiddenUrl) hiddenUrl.value = fileUrl;
  if (nameEl) nameEl.textContent = displayName;
  if (statusEl) statusEl.textContent = "✅ नमुना पुरावा संलग्न (Sample Attached)";

  if (notify) {
    showToast(`📷 ${title} निवडला!`, 'info');
  }
}

// Real Device GPS with automated zone detection via backend
async function detectGpsLocation() {
  const gpsBtn = document.getElementById('btn-detect-gps');
  const gpsDisplay = document.getElementById('gps-display');
  
  if (gpsBtn) {
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = '⏳ <span>स्थान शोधत आहे...</span>';
  }

  async function resolveZone(lat, lng, sourceName = 'Device GPS') {
    try {
      const res = await fetch('/api/zones/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: lat, lng: lng })
      });
      const z = await res.json();
      
      document.getElementById('form-lat').value = lat;
      document.getElementById('form-lng').value = lng;
      
      const zoneSelect = document.getElementById('form-zone');
      if (zoneSelect) zoneSelect.value = z.zone_id;

      const zoneBadge = document.getElementById('form-zone-badge');
      if (zoneBadge) zoneBadge.textContent = `Zone ${z.zone_no}: ${z.name_en}`;

      if (gpsDisplay) {
        gpsDisplay.innerHTML = `
          📍 <strong>${z.name_en} (${z.name_mr} - Zone ${z.zone_no})</strong>, Ward ${z.ward_no}<br>
          <span style="font-size: 0.75rem; color: #0284c7;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (${sourceName} • अंतर: ${z.distance_km}km)</span>
        `;
      }

      showToast(`📍 जीपीएस स्थान शोधले: ${z.name_en} (प्रभाग ${z.ward_no})`, 'success');
    } catch (err) {
      console.warn('Zone resolution notice:', err);
      applyDefaultAshiNagar();
    } finally {
      if (gpsBtn) {
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = '🔄 <span data-i18n="gps_tag_btn">जीपीएस स्थान शोधा</span>';
      }
    }
  }

  function applyDefaultAshiNagar() {
    const lat = 21.1852;
    const lng = 79.1154;
    document.getElementById('form-lat').value = lat;
    document.getElementById('form-lng').value = lng;
    const zoneSelect = document.getElementById('form-zone');
    if (zoneSelect) zoneSelect.value = 9;
    const zoneBadge = document.getElementById('form-zone-badge');
    if (zoneBadge) zoneBadge.textContent = `Zone 9: Ashi Nagar`;
    if (gpsDisplay) {
      gpsDisplay.innerHTML = `
        📍 <strong>Ashi Nagar (आसी नगर - Zone 9)</strong>, Ward 24, Teka Naka / Kamptee Rd<br>
        <span style="font-size: 0.75rem; color: #0284c7;">Lat: ${lat}, Lng: ${lng} (Nagpur Municipal GIS Tagged)</span>
      `;
    }
    showToast('📍 नागपूर आसी नगर (प्रभाग २४) स्थान सक्रिय केले', 'info');
    if (gpsBtn) {
      gpsBtn.disabled = false;
      gpsBtn.innerHTML = '🔄 <span data-i18n="gps_tag_btn">जीपीएस स्थान शोधा</span>';
    }
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolveZone(pos.coords.latitude, pos.coords.longitude, 'Live Device GPS');
      },
      (err) => {
        console.warn('Geolocation unavailable/denied:', err.message);
        applyDefaultAshiNagar();
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  } else {
    applyDefaultAshiNagar();
  }
}

async function handleGrievanceSubmit(e) {
  e.preventDefault();
  const payload = {
    citizen_name: document.getElementById('form-name').value,
    phone: document.getElementById('form-phone').value,
    language: currentLanguage,
    category: document.getElementById('form-category').value,
    description: document.getElementById('form-desc').value,
    latitude: parseFloat(document.getElementById('form-lat').value) || 21.1852,
    longitude: parseFloat(document.getElementById('form-lng').value) || 79.1154,
    zone_id: parseInt(document.getElementById('form-zone').value) || 9,
    photo_url: (document.getElementById('form-photo-url') && document.getElementById('form-photo-url').value) || "/assets/before_defect.svg"
  };

  try {
    const res = await fetch('/api/grievances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    showToast(`Grievance #${data.ticket.ticket_id} registered successfully!`, 'success');
    openReceiptModal(data.receipt);
    loadTrackedTicket(data.ticket.ticket_id);
    document.getElementById('grievance-form').reset();
    isCustomPhotoUploaded = false;
    selectSamplePhoto('pipe', false);
    detectGpsLocation();
  } catch (err) {
    showToast('Error submitting grievance: ' + err.message, 'error');
  }
}

function openReceiptModal(receipt) {
  const modal = document.getElementById('receipt-modal');
  document.getElementById('receipt-ticket-id').textContent = receipt.ticket_id;
  document.getElementById('receipt-timestamp').textContent = new Date(receipt.timestamp).toLocaleString();
  document.getElementById('receipt-zone').textContent = `${receipt.zone} (${receipt.zone_mr}) - Ward ${receipt.ward_no}`;
  document.getElementById('receipt-agency').textContent = receipt.assigned_agency;
  document.getElementById('receipt-sla').textContent = `< ${receipt.sla_target_hours} Business Hours`;
  document.getElementById('receipt-qr-code').textContent = receipt.qr_token;

  const notifs = receipt.simulated_notifications;
  const smsEl = document.getElementById('sim-sms-text');
  if (smsEl && notifs) smsEl.textContent = notifs.channel_sms || '';
  const waEl = document.getElementById('sim-wa-text');
  if (waEl && notifs) waEl.textContent = notifs.channel_whatsapp || '';

  modal.classList.add('active');
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.remove('active');
}

async function loadTrackedTicket(ticketId) {
  try {
    const res = await fetch(`/api/grievances/${ticketId}`);
    if (!res.ok) {
      showToast('Ticket not found: ' + ticketId, 'error');
      return;
    }
    currentGrievance = await res.json();
    renderTicketDetails(currentGrievance);
  } catch (err) {
    console.error('Error loading ticket:', err);
  }
}

function renderTicketDetails(ticket) {
  document.getElementById('search-ticket-id').value = ticket.ticket_id;
  document.getElementById('track-ticket-header').innerHTML = `
    <div>
      <span style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">#${ticket.ticket_id}</span>
      <span class="badge badge-${ticket.status}" style="margin-left: 8px;">${ticket.status.replace(/_/g, ' ')}</span>
    </div>
    <span style="font-size: 0.8rem; color: #64748b;">${new Date(ticket.created_at).toLocaleString()}</span>
  `;

  document.getElementById('track-meta-zone').textContent = `${ticket.zone_name_en} (${ticket.zone_name_mr}) - Ward ${ticket.ward_no}`;
  document.getElementById('track-meta-agency').textContent = ticket.assigned_agency;
  document.getElementById('track-meta-citizen').textContent = `${ticket.citizen_name} (${ticket.phone})`;
  document.getElementById('track-meta-desc').textContent = ticket.description;

  // Stepper progression
  const steps = ['reported', 'assigned', 'in_progress', 'pending_citizen_confirmation', 'closed'];
  const curIdx = steps.indexOf(ticket.status === 'reopened_contested' ? 'in_progress' : ticket.status);
  
  for (let i = 0; i < steps.length; i++) {
    const stepEl = document.getElementById(`step-${i + 1}`);
    if (!stepEl) continue;
    stepEl.classList.remove('active', 'completed');
    if (i < curIdx || ticket.status === 'closed') {
      stepEl.classList.add('completed');
    } else if (i === curIdx) {
      stepEl.classList.add('active');
    }
  }

  // Citizen Confirmation Card
  const confirmBox = document.getElementById('citizen-confirmation-box');
  if (ticket.status === 'pending_citizen_confirmation') {
    confirmBox.style.display = 'block';
    document.getElementById('verify-otp-input').value = ticket.citizen_otp; // Auto-prefill for pair programming verification
    
    // Use guaranteed reliable vector SVGs offline
    const beforeSrc = (!ticket.photo_url || ticket.photo_url.includes('unsplash.com')) ? '/assets/before_defect.svg' : ticket.photo_url;
    const afterSrc = (!ticket.resolution_photo_url || ticket.resolution_photo_url.includes('unsplash.com')) ? '/assets/after_repair.svg' : ticket.resolution_photo_url;
    document.getElementById('before-img').src = beforeSrc;
    document.getElementById('after-img').src = afterSrc;
    document.getElementById('field-notes-text').textContent = ticket.resolution_notes || 'Repair completed by Orange City Water field technician.';
  } else {
    confirmBox.style.display = 'none';
  }

  // Audit trail
  const auditContainer = document.getElementById('audit-trail-container');
  auditContainer.innerHTML = '';
  if (ticket.audit_trail) {
    ticket.audit_trail.forEach(log => {
      auditContainer.innerHTML += `
        <li class="audit-item">
          <div class="audit-meta">${new Date(log.timestamp).toLocaleTimeString()} • ${log.actor} (${log.actor_role})</div>
          <div class="audit-desc">${log.action}</div>
          <div class="audit-rationale">${log.rationale}</div>
        </li>
      `;
    });
  }

  // SMS simulation preview
  if (ticket.simulated_notifications) {
    document.getElementById('track-sms-preview').textContent = ticket.simulated_notifications.channel_whatsapp;
  }
}

async function confirmCitizenClosure() {
  if (!currentGrievance) return;
  const otp = document.getElementById('verify-otp-input').value.trim();
  const comments = document.getElementById('citizen-feedback-input').value.trim();

  try {
    const res = await fetch(`/api/grievances/${currentGrievance.ticket_id}/citizen-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otp: otp,
        feedback_rating: 5,
        citizen_comments: comments || "Satisfied with Orange City Water repair."
      })
    });
    if (!res.ok) {
      const err = await res.json();
      alert('Verification failed: ' + err.detail);
      return;
    }
    const updated = await res.json();
    showToast('✅ Resolution Verified! Grievance closed with 100% audit integrity.', 'success');
    loadTrackedTicket(updated.ticket_id);
    loadCommandCenterAnalytics();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function contestResolution() {
  if (!currentGrievance) return;
  const reason = prompt('Please specify why the repair is inadequate (हे काम अपूर्ण असण्याचे कारण स्पष्ट करा):', 'पाणी गळती अजूनही सुरू आहे व डांबरी रस्ता खचला आहे.');
  if (!reason) return;

  try {
    const res = await fetch(`/api/grievances/${currentGrievance.ticket_id}/citizen-contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contest_reason: reason
      })
    });
    const updated = await res.json();
    showToast('⚠️ Grievance Contested! Reopened and escalated to Zonal Executive Engineer.', 'warning');
    loadTrackedTicket(updated.ticket_id);
    loadCommandCenterAnalytics();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// Field Queue
async function loadFieldQueue() {
  try {
    const agency = document.getElementById('field-agency-filter').value;
    const zone = document.getElementById('field-zone-filter').value;
    let url = '/api/grievances?';
    if (agency) url += `agency=${agency}&`;
    if (zone) url += `zone_id=${zone}&`;

    const res = await fetch(url);
    const tickets = await res.json();
    const container = document.getElementById('field-task-list');
    container.innerHTML = '';

    if (tickets.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;">No active tasks matching filter criteria.</div>';
      return;
    }

    tickets.forEach(t => {
      const isPendingConfirm = t.status === 'pending_citizen_confirmation';
      const isClosed = t.status === 'closed';

      container.innerHTML += `
        <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${isClosed ? '#10b981' : isPendingConfirm ? '#f472b6' : '#f59e0b'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <strong style="font-size: 1rem;">#${t.ticket_id}</strong>
              <span class="badge badge-${t.status}" style="margin-left: 6px;">${t.status.replace(/_/g, ' ')}</span>
              <span style="font-size: 0.8rem; color: #64748b; margin-left: 8px;">📍 ${t.zone_name_en} (Ward ${t.ward_no})</span>
            </div>
            <span style="font-size: 0.78rem; font-weight: 700; color: #0284c7;">SLA: < ${t.sla_hours}h</span>
          </div>
          <p style="font-size: 0.88rem; color: #334155; margin-bottom: 0.75rem;">${t.description}</p>
          
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${t.status === 'reported' || t.status === 'assigned' ? `
              <button class="btn btn-outline" style="font-size: 0.8rem; padding: 4px 10px;" onclick="executeFieldAction('${t.ticket_id}', 'start_work')">
                ▶ Start Field Inspection
              </button>
            ` : ''}

            ${t.status === 'in_progress' || t.status === 'reopened_contested' ? `
              <button class="btn btn-primary" style="font-size: 0.8rem; padding: 4px 10px;" onclick="executeFieldAction('${t.ticket_id}', 'complete_repair')">
                📸 Upload Photo Proof & Submit for Citizen OTP
              </button>
            ` : ''}

            ${isPendingConfirm ? `
              <span style="font-size: 0.8rem; color: #be185d; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                ⏳ Awaiting Citizen OTP (Direct field closure strictly forbidden by NMC policy)
              </span>
            ` : ''}

            ${isClosed ? `
              <span style="font-size: 0.8rem; color: #15803d; font-weight: 600;">
                ✅ Citizen Verified & Closed (Rating: ${t.citizen_rating || 5}/5 ⭐)
              </span>
            ` : ''}
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error loading field queue:', err);
  }
}

async function executeFieldAction(ticketId, action) {
  try {
    const res = await fetch(`/api/grievances/${ticketId}/field-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        inspector_name: "Pravin Gaikwad (OCW Lead)",
        inspector_id: "OCW-TECH-409",
        resolution_notes: "Replaced damaged collar joint with ductile iron repair sleeve. Water pressure tested at 2.4 bar.",
        resolution_photo_url: "/assets/after_repair.svg"
      })
    });
    if (!res.ok) {
      const err = await res.json();
      showToast('Action error: ' + err.detail, 'error');
      return;
    }
    showToast(action === 'start_work' ? 'Inspection commenced.' : 'Resolution submitted with photo proof! Verification OTP sent to Citizen.', 'success');
    loadFieldQueue();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// Command Center & GIS Map
async function loadCommandCenterAnalytics() {
  try {
    const res = await fetch('/api/analytics/command-center');
    const data = await res.json();
    const k = data.kpis;

    document.getElementById('kpi-total-val').textContent = k.total_grievances;
    document.getElementById('kpi-response-val').textContent = `${k.avg_first_response_hours}h`;
    document.getElementById('kpi-unauth-val').textContent = `${k.unauthorized_closure_rate_pct}%`;
    document.getElementById('kpi-regional-val').textContent = `${k.regional_language_adoption_pct}%`;
    document.getElementById('kpi-clusters-val').textContent = k.active_infrastructure_clusters;
    document.getElementById('kpi-overhaul-val').textContent = `${k.pipeline_overhaul_conversion_pct}%`;

    // Render 10-Zone Matrix
    const matrixTbody = document.getElementById('zone-matrix-tbody');
    if (matrixTbody) {
      matrixTbody.innerHTML = '';
      data.zone_matrix.forEach(z => {
        matrixTbody.innerHTML += `
          <tr>
            <td><strong>Zone ${z.zone_no}</strong></td>
            <td>${z.name_en} (${z.name_mr})</td>
            <td><strong>${z.total_tickets}</strong></td>
            <td><span style="color: #15803d; font-weight: 700;">${z.closed}</span></td>
            <td><span style="color: #b45309; font-weight: 700;">${z.pending}</span></td>
            <td>${z.escalated > 0 ? `<span class="badge badge-escalated">${z.escalated}</span>` : '0'}</td>
            <td>${z.active_clusters > 0 ? `<span class="badge badge-pending_citizen_confirmation" style="color: #d97706; border-color: #f59e0b;">${z.active_clusters} Active</span>` : 'None'}</td>
            <td><strong>${z.resolution_rate}%</strong></td>
          </tr>
        `;
      });
    }

    // Render Department Accountability
    const deptTbody = document.getElementById('dept-index-tbody');
    if (deptTbody) {
      deptTbody.innerHTML = '';
      data.department_accountability.forEach(d => {
        deptTbody.innerHTML += `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.avg_response_h}h</td>
            <td><span style="color: #15803d; font-weight: 700;">${d.closure_integrity}%</span></td>
            <td><span class="badge badge-closed">${d.status}</span></td>
          </tr>
        `;
      });
    }

    // Render Spatial Clusters Card
    renderClusterCards();

    // Render 3 Interactive SVG Pie / Donut Charts
    if (data.analytics_breakdown) {
      const { status_counts, category_counts, language_counts } = data.analytics_breakdown;

      // 1. Status Breakdown Donut Chart
      const statusSlices = [
        { label: 'Closed (Resolved)', value: status_counts['closed'] || 0, color: '#10b981' },
        { label: 'Pending Citizen OTP', value: status_counts['pending_citizen_confirmation'] || 0, color: '#ec4899' },
        { label: 'In Progress (Field)', value: (status_counts['in_progress'] || 0) + (status_counts['assigned'] || 0), color: '#f59e0b' },
        { label: 'New Reported', value: status_counts['reported'] || 0, color: '#0284c7' },
        { label: 'Contested / Escalated', value: (status_counts['reopened_contested'] || 0) + (status_counts['escalated'] || 0), color: '#ef4444' }
      ];
      renderSvgDonut('chart-status-container', 'chart-status-legend', statusSlices, `${k.total_grievances}`, 'TICKETS');

      // 2. Category Distribution Donut Chart
      const catLabels = {
        'pipeline_burst': 'Water Pipeline',
        'pothole': 'Road Potholes',
        'garbage_overflow': 'Solid Waste',
        'streetlight_fault': 'Streetlights',
        'drainage_choke': 'Drainage Cell',
        'water_contamination': 'Water Contamination'
      };
      const catColors = {
        'pipeline_burst': '#0284c7',
        'pothole': '#d97706',
        'garbage_overflow': '#10b981',
        'streetlight_fault': '#eab308',
        'drainage_choke': '#8b5cf6',
        'water_contamination': '#06b6d4'
      };
      const categorySlices = Object.keys(category_counts).map(catKey => ({
        label: catLabels[catKey] || catKey,
        value: category_counts[catKey] || 0,
        color: catColors[catKey] || '#64748b'
      }));
      renderSvgDonut('chart-category-container', 'chart-category-legend', categorySlices, `${Object.keys(category_counts).length}`, 'CATEGORIES');

      // 3. Regional Language Adoption Donut Chart
      const langSlices = [
        { label: 'मराठी (Marathi)', value: language_counts['mr'] || 0, color: '#ea580c' },
        { label: 'हिंदी (Hindi)', value: language_counts['hi'] || 0, color: '#0284c7' },
        { label: 'English', value: language_counts['en'] || 0, color: '#64748b' }
      ];
      renderSvgDonut('chart-lang-container', 'chart-lang-legend', langSlices, `${k.regional_language_adoption_pct}%`, 'REGIONAL');
    }
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

async function renderClusterCards() {
  try {
    const res = await fetch('/api/spatial/clusters');
    const data = await res.json();
    const container = document.getElementById('clusters-container');
    if (!container) return;

    container.innerHTML = '';
    if (data.clusters.length === 0) {
      container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #64748b;">No chronic clusters detected.</div>';
      return;
    }

    data.clusters.forEach(c => {
      container.innerHTML += `
        <div class="card" style="border: 2px solid ${c.is_converted ? '#10b981' : '#f59e0b'}; background: ${c.is_converted ? '#f0fdf4' : '#fffbeb'}; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <span class="badge ${c.is_converted ? 'badge-closed' : 'badge-pending_citizen_confirmation'}" style="margin-bottom: 4px;">
                ${c.is_converted ? 'SANCTIONED OVERHAUL' : 'CHRONIC FAULT CLUSTER'}
              </span>
              <h3 style="font-size: 1.05rem; color: #0f172a; margin-top: 4px;">${c.title}</h3>
            </div>
            <span style="font-size: 0.85rem; font-weight: 700; color: #b45309;">${c.ticket_count} Bursts in ${Math.round(c.radius_meters)}m</span>
          </div>

          <p style="font-size: 0.85rem; color: #334155; margin-bottom: 0.5rem;"><strong>Analysis:</strong> ${c.infra_analysis}</p>
          <p style="font-size: 0.85rem; color: #0369a1; margin-bottom: 0.75rem;"><strong>Recommendation:</strong> ${c.recommendation}</p>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.82rem; color: #475569;">Est. Overhaul Budget: <strong>₹${c.estimated_cost_lakhs} Lakhs</strong></span>
            ${c.is_converted ? `
              <span style="font-size: 0.85rem; color: #15803d; font-weight: 700;">
                ✅ Project Sanctioned (${c.converted_project ? c.converted_project.project_id : 'PROJ-NMC-2026'})
              </span>
            ` : `
              <button class="btn btn-primary" style="font-size: 0.82rem; padding: 6px 14px;" onclick="convertClusterToProject('${c.cluster_id}', '${c.title}')">
                🚀 Authorize Capital Overhaul (Convert to Project)
              </button>
            `}
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error rendering clusters:', err);
  }
}

async function convertClusterToProject(clusterId, title) {
  try {
    const res = await fetch('/api/spatial/convert-to-overhaul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cluster_id: clusterId,
        project_title: `${title} - Capital Pipeline Overhaul`,
        budget_lakhs: 48.5,
        contractor_agency: "Orange City Water Infrastructure Cell",
        notes: "Authorized via Zonal Commissioner Command Center based on DBSCAN predictive spatial detection."
      })
    });
    const proj = await res.json();
    alert(`🎉 Overhaul Project Sanctioned!
Project ID: ${proj.project_id}
Budget: ₹${proj.budget_lakhs} Lakhs
KPI Updated: 100% Conversion.`);
    loadCommandCenterAnalytics();
    initOrRefreshMap();
  } catch (err) {
    alert('Error converting cluster: ' + err.message);
  }
}

function initOrRefreshMap() {
  const mapContainer = document.getElementById('gis-map');
  if (!mapContainer) return;

  if (!leafletMap && typeof L !== 'undefined') {
    leafletMap = L.map('gis-map').setView([21.1458, 79.0882], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors | Nagpur Municipal Corporation'
    }).addTo(leafletMap);
    mapMarkersLayer = L.layerGroup().addTo(leafletMap);
  }

  if (leafletMap && mapMarkersLayer) {
    mapMarkersLayer.clearLayers();
    loadMapPoints();
  }
}

async function loadMapPoints() {
  try {
    // 1. Plot 10 Zone Centers
    allZones.forEach(z => {
      const zoneMarker = L.circleMarker([z.lat, z.lng], {
        radius: 8,
        fillColor: '#0f172a',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.8
      }).bindPopup(`<strong>Zone ${z.zone_no}: ${z.name_en} (${z.name_mr})</strong><br>${z.office_address}`);
      mapMarkersLayer.addLayer(zoneMarker);
    });

    // 2. Plot Complaints
    const res = await fetch('/api/grievances');
    const tickets = await res.json();

    const colorMap = {
      'reported': '#0284c7',
      'assigned': '#f59e0b',
      'in_progress': '#8b5cf6',
      'pending_citizen_confirmation': '#ec4899',
      'closed': '#10b981',
      'escalated': '#ef4444',
      'reopened_contested': '#ef4444'
    };

    tickets.forEach(t => {
      const pt = L.circleMarker([t.latitude, t.longitude], {
        radius: 6,
        fillColor: colorMap[t.status] || '#64748b',
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9
      }).bindPopup(`
        <strong>#${t.ticket_id}</strong><br>
        <strong>Category:</strong> ${t.category}<br>
        <strong>Zone:</strong> ${t.zone_name_en} (Ward ${t.ward_no})<br>
        <strong>Status:</strong> <span class="badge badge-${t.status}">${t.status}</span><br>
        <button onclick="loadTrackedTicket('${t.ticket_id}'); switchPersona('citizen');" style="margin-top: 5px; font-size: 0.75rem; padding: 2px 6px; cursor: pointer;">Inspect Ticket</button>
      `);
      mapMarkersLayer.addLayer(pt);
    });

    // 3. Plot DBSCAN Clusters
    const clusterRes = await fetch('/api/spatial/clusters');
    const clusterData = await clusterRes.json();

    clusterData.clusters.forEach(c => {
      const clusterCircle = L.circle([c.center_lat, c.center_lng], {
        radius: c.radius_meters + 40,
        color: c.is_converted ? '#10b981' : '#ef4444',
        fillColor: c.is_converted ? '#10b981' : '#ef4444',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '4, 4'
      }).bindPopup(`
        <strong style="color: #b91c1c;">⚠️ DBSCAN Infrastructure Alert</strong><br>
        <strong>${c.title}</strong><br>
        ${c.ticket_count} pipeline failures detected.<br>
        <strong>Status:</strong> ${c.is_converted ? 'Sanctioned Overhaul' : 'Action Required'}<br>
        <button onclick="switchPersona('admin');" style="margin-top: 5px; font-size: 0.75rem; padding: 2px 6px; cursor: pointer;">View Recommendation</button>
      `);
      mapMarkersLayer.addLayer(clusterCircle);
    });

  } catch (err) {
    console.error('Error plotting map points:', err);
  }
}

// ==================== VOICE INPUT ENGINE (Web Speech API) ====================
let speechRecognitionInstance = null;
let isVoiceRecording = false;

function toggleVoiceInput() {
  const voiceBtn = document.getElementById('btn-voice-input');
  const statusBox = document.getElementById('voice-recording-status');
  const statusText = document.getElementById('voice-status-text');
  const descEl = document.getElementById('form-desc');

  if (isVoiceRecording) {
    if (speechRecognitionInstance) {
      try { speechRecognitionInstance.stop(); } catch(e){}
    }
    isVoiceRecording = false;
    if (voiceBtn) voiceBtn.classList.remove('recording');
    if (statusBox) statusBox.style.display = 'none';
    return;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    // Graceful fallback for non-supported browsers
    if (statusBox) statusBox.style.display = 'flex';
    if (statusText) statusText.textContent = "🎙️ बोलणे ऐकत आहे... (Voice Input Simulated)";
    if (voiceBtn) voiceBtn.classList.add('recording');
    isVoiceRecording = true;

    setTimeout(() => {
      const simulatedPhrases = {
        mr: "आसी नगर प्रभाग २४, कामठी रोड मुख्य जलवाहिनी फुटून लाखो लिटर पिण्याचे पाणी रस्त्यावर वाहत आहे.",
        hi: "आशी नगर वार्ड २४, कामठी रोड मेन पाइपलाइन फट गई है और भारी मात्रा में पानी बर्बाद हो रहा है।",
        en: "Ashi Nagar Ward 24, Kamptee Road main water distribution pipeline has ruptured and is causing heavy water logging."
      };
      if (descEl) descEl.value = simulatedPhrases[currentLanguage] || simulatedPhrases.mr;
      if (statusBox) statusBox.style.display = 'none';
      if (voiceBtn) voiceBtn.classList.remove('recording');
      isVoiceRecording = false;
    }, 1600);
    return;
  }

  try {
    speechRecognitionInstance = new SpeechRec();
    speechRecognitionInstance.continuous = false;
    speechRecognitionInstance.interimResults = false;

    const langCodes = { 'mr': 'mr-IN', 'hi': 'hi-IN', 'en': 'en-IN' };
    speechRecognitionInstance.lang = langCodes[currentLanguage] || 'mr-IN';

    speechRecognitionInstance.onstart = () => {
      isVoiceRecording = true;
      if (voiceBtn) voiceBtn.classList.add('recording');
      if (statusBox) statusBox.style.display = 'flex';
      if (statusText) {
        statusText.textContent = currentLanguage === 'mr' ? "🎙️ ऐकत आहे... कृपया आपली समस्या बोला" :
                                 currentLanguage === 'hi' ? "🎙️ सुन रहे हैं... कृपया अपनी शिकायत बोलें" :
                                 "🎙️ Listening... Please speak your complaint";
      }
    };

    speechRecognitionInstance.onresult = (event) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const spokenText = event.results[0][0].transcript;
        if (descEl) descEl.value = spokenText;
      }
    };

    speechRecognitionInstance.onerror = (event) => {
      console.warn("Speech recognition notice:", event.error);
      isVoiceRecording = false;
      if (voiceBtn) voiceBtn.classList.remove('recording');
      if (statusBox) statusBox.style.display = 'none';
    };

    speechRecognitionInstance.onend = () => {
      isVoiceRecording = false;
      if (voiceBtn) voiceBtn.classList.remove('recording');
      if (statusBox) statusBox.style.display = 'none';
    };

    speechRecognitionInstance.start();
  } catch (err) {
    console.error("Speech recognition error:", err);
    isVoiceRecording = false;
    if (statusBox) statusBox.style.display = 'none';
  }
}

// ==================== RESET DEMO STATE ====================
async function resetDemoState() {
  const resetBtn = document.getElementById('btn-reset-demo');
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.style.opacity = '0.6';
  }
  try {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    const data = await res.json();
    showToast(t('demo_reset_success') || data.message, 'success');
    await loadZones();
    await loadTrackedTicket('NMC-2026-ASH-0042');
    await loadCommandCenterAnalytics();
    selectSamplePhoto('pipe', false);
    detectGpsLocation();
    if (activePersona === 'field') loadFieldQueue();
  } catch (err) {
    showToast("Failed to reset demo: " + err.message, 'error');
  } finally {
    if (resetBtn) {
      resetBtn.disabled = false;
      resetBtn.style.opacity = '1';
    }
  }
}

// ==================== WHATSAPP BOT CHATBOT SIMULATOR ====================
function toggleWhatsAppDrawer() {
  const drawer = document.getElementById('whatsapp-drawer');
  if (drawer) drawer.classList.toggle('open');
}

function handleWaKeypress(e) {
  if (e.key === 'Enter') sendWhatsAppMessage();
}

async function sendWhatsAppQuick(choice) {
  if (choice === '1') {
    addWaMessage("१. आसी नगर पाणी गळती तक्रार नोंदवा", "user");
    setTimeout(async () => {
      addWaMessage("कृपया प्रतीक्षा करा, तक्रार नोंदवत आहे... ⏳", "bot");
      try {
        const res = await fetch('/api/grievances', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            citizen_name: "Sunita Meshram",
            phone: "+91 98230 45678",
            language: "mr",
            category: "pipeline_burst",
            description: "आसी नगर प्रभाग २४, कामठी रोड मुख्य पाईपलाईन फुटली आहे. (Reported via WhatsApp Bot)",
            latitude: 21.1852,
            longitude: 79.1154,
            zone_id: 9,
            ward_no: 24
          })
        });
        const data = await res.json();
        addWaMessage(`✅ तक्रार नोंदवली गेली!\n\n📋 *तक्रार क्र.:* ${data.ticket.ticket_id}\n🏛️ *झोन:* आसी नगर (प्रभाग २४)\n🔧 *विभाग:* ऑरेंज सिटी वॉटर (OCW)\n⏱️ *प्रतिसाद मुदत:* ४ तास\n🔐 *आपला सुरक्षित ओटीपी:* ${data.ticket.citizen_otp}\n\nआपली तक्रार काम पूर्ण झाल्यावरच आपल्या ओटीपी ने बंद होईल. धन्यवाद! 🙏`, "bot");
        loadTrackedTicket(data.ticket.ticket_id);
        loadCommandCenterAnalytics();
      } catch (err) {
        addWaMessage("तक्रार नोंदवताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.", "bot");
      }
    }, 600);
  } else if (choice === '2') {
    addWaMessage("२. तक्रार स्थिती तपासा (NMC-2026-ASH-0042)", "user");
    setTimeout(async () => {
      try {
        const res = await fetch('/api/grievances/NMC-2026-ASH-0042');
        const t = await res.json();
        addWaMessage(`🔍 *तक्रार स्थिती: #${t.ticket_id}*\n\n👤 *नागरिक:* ${t.citizen_name}\n📍 *स्थान:* ${t.zone_name_mr} (प्रभाग ${t.ward_no})\n📌 *स्थिती:* ${t.status === 'pending_citizen_confirmation' ? '⏳ काम पूर्ण झाले - नागरिक ओटीपी मंजुरी प्रलंबित' : t.status}\n🔧 *यंत्रणा:* ${t.assigned_agency}\n🔐 *ओटीपी:* ${t.citizen_otp}\n\nवेब पोर्टलवर जाऊन आपण कामाचा आधी व नंतरचा फोटो तपासून ओटीपी देऊ शकता.`, "bot");
      } catch (err) {
        addWaMessage("तक्रार माहिती मिळवण्यात त्रुटी आली.", "bot");
      }
    }, 600);
  } else if (choice === '3') {
    addWaMessage("३. आजचे मनपा निवारण प्रमाण जाणून घ्या", "user");
    setTimeout(async () => {
      try {
        const res = await fetch('/api/analytics/command-center');
        const a = await res.json();
        const k = a.kpis;
        addWaMessage(`📊 *नागपूर मनपा स्मार्ट डॅशबोर्ड*\n\n• एकूण तक्रारी: ${k.total_grievances}\n• निवारण झालेल्या: ${k.resolved_grievances}\n• सरासरी प्रतिसाद: ${k.avg_first_response_hours} तास (लक्ष्य: <= ४.० तास)\n• अनधिकृत बंद प्रमाण: ${k.unauthorized_closure_rate_pct}% (०% लक्ष्य साध्य)\n• स्थानिक भाषा वापर: ${k.regional_language_adoption_pct}%\n• सक्रिय इन्फ्रास्ट्रक्चर क्लस्टर: ${k.active_infrastructure_clusters}`, "bot");
      } catch (err) {
        addWaMessage("माहिती लोड करता आली नाही.", "bot");
      }
    }, 600);
  }
}

function sendWhatsAppMessage() {
  const input = document.getElementById('wa-user-input');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  addWaMessage(msg, "user");
  input.value = "";

  setTimeout(() => {
    if (msg.includes("NMC-") || msg.includes("2026")) {
      sendWhatsAppQuick('2');
    } else if (msg.includes("1") || msg.toLowerCase().includes("तक्रार") || msg.toLowerCase().includes("complaint")) {
      sendWhatsAppQuick('1');
    } else {
      addWaMessage("आपला संदेश मिळाला. त्वरित मदतीसाठी कृपया वरील पर्यायांवर टॅप करा किंवा आपला तक्रार क्रमांक (उदा. NMC-2026-ASH-0042) पाठवा. 🙏", "bot");
    }
  }, 600);
}

function addWaMessage(text, sender) {
  const container = document.getElementById('wa-chat-messages');
  if (!container) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `wa-msg ${sender}`;
  msgDiv.innerHTML = text.replace(/\n/g, '<br>') + `<div class="wa-msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

// ==================== SUPERVISOR OVERRIDE ====================
function openSupervisorModal(ticketId) {
  const tidInput = document.getElementById('override-ticket-id');
  if (tidInput) tidInput.value = ticketId;
  const modal = document.getElementById('supervisor-modal');
  if (modal) modal.classList.add('active');
}

function closeSupervisorModal() {
  const modal = document.getElementById('supervisor-modal');
  if (modal) modal.classList.remove('active');
}

async function submitSupervisorOverride() {
  const ticketId = document.getElementById('override-ticket-id').value;
  const supName = document.getElementById('override-supervisor-name').value;
  const reason = document.getElementById('override-reason').value.trim();

  if (!reason) {
    alert("Please enter mandatory justification for emergency override.");
    return;
  }

  try {
    const res = await fetch(`/api/grievances/${ticketId}/supervisor-override`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        supervisor_name: supName,
        override_reason: reason
      })
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Override failed: " + err.detail);
      return;
    }
    alert("⚠️ Emergency Supervisor Override Logged in Immutable Audit Trail.");
    closeSupervisorModal();
    loadTrackedTicket(ticketId);
    loadCommandCenterAnalytics();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ==================== SVG PIE & DONUT CHARTS ENGINE ====================
function renderSvgDonut(containerId, legendId, slices, centerMain = '', centerSub = '') {
  const container = document.getElementById(containerId);
  const legend = document.getElementById(legendId);
  if (!container) return;

  const total = slices.reduce((acc, s) => acc + (s.value || 0), 0);
  if (total === 0) {
    container.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:2rem;">No data available</div>';
    if (legend) legend.innerHTML = '';
    return;
  }

  // Radius = 38 => Circumference = 2 * PI * 38 = 238.76
  const r = 38;
  const C = 2 * Math.PI * r;
  let accumulated = 0;
  let circlesHtml = '';
  let legendHtml = '';

  slices.forEach(slice => {
    const val = slice.value || 0;
    if (val === 0) return;
    const pct = ((val / total) * 100).toFixed(1);
    const strokeDash = (val / total) * C;
    const strokeGap = C - strokeDash;
    const strokeOffset = -accumulated;
    accumulated += strokeDash;

    circlesHtml += `
      <circle r="${r}" cx="55" cy="55" fill="transparent"
              stroke="${slice.color}" stroke-width="16"
              stroke-dasharray="${strokeDash.toFixed(2)} ${strokeGap.toFixed(2)}"
              stroke-dashoffset="${strokeOffset.toFixed(2)}"
              transform="rotate(-90 55 55)"
              style="transition: stroke-width 0.2s ease; cursor: pointer;">
        <title>${slice.label}: ${val} (${pct}%)</title>
      </circle>
    `;

    legendHtml += `
      <div class="legend-item" title="${slice.label}: ${val} (${pct}%)">
        <span class="legend-dot" style="background: ${slice.color};"></span>
        <span>${slice.label}: <strong>${val}</strong> <small style="color:#64748b;">(${pct}%)</small></span>
      </div>
    `;
  });

  const svgHtml = `
    <svg class="chart-donut-svg" viewBox="0 0 110 110" width="100%" height="100%">
      ${circlesHtml}
      <text x="55" y="${centerSub ? 51 : 58}" text-anchor="middle" class="chart-center-val" font-size="13" font-weight="800" fill="#0f172a">${centerMain}</text>
      ${centerSub ? `<text x="55" y="66" text-anchor="middle" class="chart-center-sub" font-size="7" font-weight="700" fill="#64748b">${centerSub}</text>` : ''}
    </svg>
  `;

  container.innerHTML = svgHtml;
  if (legend) legend.innerHTML = legendHtml;
}

// ==================== 7. TWIST DEMONSTRATION & DIGITAL INCLUSION MODE ====================
function triggerInclusionAction(action) {
  if (action === 'offline') {
    const offlineToggle = document.getElementById('offline-toggle');
    if (offlineToggle) {
      offlineToggle.checked = !offlineToggle.checked;
      isOfflineSimulated = offlineToggle.checked;
    } else {
      isOfflineSimulated = !isOfflineSimulated;
    }
    const banner = document.getElementById('offline-banner');
    if (banner) banner.style.display = isOfflineSimulated ? 'flex' : 'none';
    if (isOfflineSimulated) {
      showToast("📡 Offline Support Active: ServiceWorker LocalCache enabled!", "info");
    } else {
      showToast("🌐 Online Mode Restored: Municipal cloud sync active.", "success");
    }
  } else if (action === 'sms') {
    switchPersona('citizen');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === 'citizen'));
    const smsBox = document.getElementById('track-sms-preview');
    if (smsBox) {
      smsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      smsBox.parentElement.classList.add('pulse-highlight');
      setTimeout(() => smsBox.parentElement.classList.remove('pulse-highlight'), 3000);
      showToast("💬 SMS Services: Dual telecom SMS + WhatsApp receipt payload active.", "success");
    }
  } else if (action === 'voice') {
    switchPersona('citizen');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === 'citizen'));
    const voiceBtn = document.getElementById('btn-voice-input');
    if (voiceBtn) {
      voiceBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toggleVoiceInput();
      showToast(`🎙️ Voice Assistance: Web Speech recognition active in ${currentLanguage.toUpperCase()}!`, "info");
    }
  } else if (action === 'lang') {
    const nextLang = currentLanguage === 'mr' ? 'hi' : currentLanguage === 'hi' ? 'en' : 'mr';
    setLanguage(nextLang);
    const langNames = { 'mr': 'मराठी (Marathi)', 'hi': 'हिंदी (Hindi)', 'en': 'English' };
    showToast(`🌐 भाषा बदलली: ${langNames[nextLang]}`, "success");
  } else if (action === 'bandwidth') {
    document.body.classList.toggle('low-bandwidth-mode');
    const isLB = document.body.classList.contains('low-bandwidth-mode');
    const card = document.getElementById('cap-bandwidth-card');
    if (card) {
      card.style.borderColor = isLB ? '#10b981' : '';
    }
    if (isLB) {
      showToast("⚡ Low-Bandwidth Mode Active: Pure SVG, zero CDN load (<45KB)", "success");
    } else {
      showToast("Standard Mode Active", "info");
    }
  } else if (action === 'simple_ui') {
    switchPersona('citizen');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === 'citizen'));
    const grid = document.getElementById('category-grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      grid.classList.add('pulse-highlight');
      setTimeout(() => grid.classList.remove('pulse-highlight'), 3000);
      showToast("👁️ Simple Citizen Interface: Tap-to-select visual icon grid highlighted.", "info");
    }
  }
}

function toggleTwistPanelCollapse() {
  const body = document.getElementById('twist-content-body');
  const icon = document.getElementById('twist-toggle-icon');
  if (!body) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (icon) icon.textContent = '−';
  } else {
    body.style.display = 'none';
    if (icon) icon.textContent = '+';
  }
}



