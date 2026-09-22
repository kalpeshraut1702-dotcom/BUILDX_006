// Nagpur Municipal Corporation - Netlify Serverless Local Adapter
// Simulates FastAPI + SQLite REST API in browser when deployed on static hosts (Netlify / GitHub Pages)
(function() {
  const ZONES_DATA = [
    { zone_id: 1, zone_no: 1, name_en: "Laxmi Nagar", name_mr: "लक्ष्मीनगर", name_hi: "लक्ष्मीनगर", office_address: "Laxmi Nagar Square, Wardha Rd", lat: 21.1189, lng: 79.0689, wards: [1, 2, 3, 4, 5] },
    { zone_id: 2, zone_no: 2, name_en: "Dharampeth", name_mr: "धरमपेठ", name_hi: "धरमपेठ", office_address: "Gokulpeth Market Rd, Dharampeth", lat: 21.1415, lng: 79.0624, wards: [6, 7, 8, 9, 10, 11, 12] },
    { zone_id: 3, zone_no: 3, name_en: "Hanuman Nagar", name_mr: "हनुमान नगर", name_hi: "हनुमान नगर", office_address: "Medical College Rd, Hanuman Nagar", lat: 21.1218, lng: 79.0982, wards: [13, 14, 15, 16, 17, 18] },
    { zone_id: 4, zone_no: 4, name_en: "Dhantoli", name_mr: "धंतोली", name_hi: "धंतोली", office_address: "Mehadia Square, Dhantoli", lat: 21.1345, lng: 79.0831, wards: [19, 20, 21, 22, 23] },
    { zone_id: 5, zone_no: 5, name_en: "Nehrunagar", name_mr: "नेहरूनगर", name_hi: "नेहरूनगर", office_address: "Nandanvan Main Rd, Nehru Nagar", lat: 21.1294, lng: 79.1245, wards: [24, 25, 26, 27, 28, 29] },
    { zone_id: 6, zone_no: 6, name_en: "Gandhibagh", name_mr: "गांधीबाग", name_hi: "गांधीबाग", office_address: "Central Avenue Rd, Gandhibagh", lat: 21.1502, lng: 79.1021, wards: [30, 31, 32, 33, 34, 35] },
    { zone_id: 7, zone_no: 7, name_en: "Satranjipura", name_mr: "सतरंजीपुरा", name_hi: "सतरंजीपुरा", office_address: "Itwari Railway Station Rd", lat: 21.1618, lng: 79.1124, wards: [36, 37, 38, 39, 40] },
    { zone_id: 8, zone_no: 8, name_en: "Lakadganj", name_mr: "लकडगंज", name_hi: "लकडगंज", office_address: "Old Bhandara Rd, Lakadganj", lat: 21.1472, lng: 79.1315, wards: [41, 42, 43, 44, 45] },
    { zone_id: 9, zone_no: 9, name_en: "Ashi Nagar", name_mr: "आसी नगर", name_hi: "आशी नगर", office_address: "Teka Naka, Kamptee Rd", lat: 21.1852, lng: 79.1154, wards: [21, 22, 23, 24, 25, 26] },
    { zone_id: 10, zone_no: 10, name_en: "Mangalwari", name_mr: "मंगळवारी", name_hi: "मंगलवारी", office_address: "Sadar Bazar, Residency Rd", lat: 21.1645, lng: 79.0815, wards: [46, 47, 48, 49, 50] }
  ];

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function getInitialGrievances() {
    return [
      {
        ticket_id: "NMC-2026-ASH-0042",
        citizen_name: "Sunita Meshram",
        phone: "+91 98230 45678",
        language: "mr",
        category: "pipeline_burst",
        description: "आसी नगर प्रभाग २४, कामठी रोड मुख्य पाईपलाईन जोरदार फुटली असून लाखो लिटर पिण्याचे पाणी वाहत आहे.",
        latitude: 21.1852,
        longitude: 79.1154,
        zone_id: 9,
        zone_no: 9,
        zone_name_en: "Ashi Nagar",
        zone_name_mr: "आसी नगर",
        ward_no: 24,
        assigned_agency: "Orange City Water (OCW)",
        status: "pending_citizen_confirmation",
        sla_hours: 4,
        sla_deadline: new Date(Date.now() + 4*3600000).toISOString(),
        is_escalated: 0,
        inspector_name: "Pravin Gaikwad (OCW Lead)",
        inspector_id: "OCW-TECH-409",
        resolution_notes: "Replaced fractured 150mm Cast Iron collar joint with ductile iron repair clamp. Tested under 2.5 bar water pressure.",
        photo_url: "/assets/before_defect.svg",
        resolution_photo_url: "/assets/after_repair.svg",
        citizen_otp: "482910",
        created_at: new Date(Date.now() - 3*3600000).toISOString(),
        audit_trail: [
          { timestamp: new Date(Date.now() - 3*3600000).toISOString(), actor: "Sunita Meshram", actor_role: "Citizen", action: "Grievance Reported", rationale: "Automated GPS mapping to Zone 9 (Ashi Nagar) Ward 24. SLA 4h allocated." },
          { timestamp: new Date(Date.now() - 2.8*3600000).toISOString(), actor: "Auto-Routing Engine", actor_role: "System", action: "Assigned to OCW Cell", rationale: "Specialized water infrastructure contract dispatch." },
          { timestamp: new Date(Date.now() - 1.5*3600000).toISOString(), actor: "Pravin Gaikwad", actor_role: "Field Lead", action: "Excavation & Pipe Repair", rationale: "Ductile clamp installed on Kamptee Rd." },
          { timestamp: new Date(Date.now() - 0.5*3600000).toISOString(), actor: "Pravin Gaikwad", actor_role: "Field Lead", action: "Repair Proof Submitted", rationale: "Citizen OTP 482910 dispatched. Direct technician closure blocked by policy." }
        ]
      },
      // Cluster points in Ashi Nagar Ward 24
      { ticket_id: "NMC-2026-ASH-0043", citizen_name: "Ramesh Tembhurne", phone: "+91 98230 11111", language: "mr", category: "pipeline_burst", description: "Water line collar leak near Teka Naka square.", latitude: 21.1856, longitude: 79.1158, zone_id: 9, zone_no: 9, zone_name_en: "Ashi Nagar", zone_name_mr: "आसी नगर", ward_no: 24, assigned_agency: "Orange City Water (OCW)", status: "in_progress", sla_hours: 4, created_at: new Date(Date.now() - 5*3600000).toISOString() },
      { ticket_id: "NMC-2026-ASH-0044", citizen_name: "Fatima Bi", phone: "+91 98230 22222", language: "hi", category: "pipeline_burst", description: "Severe pressure burst opposite Reliance Petrol Pump Kamptee Rd.", latitude: 21.1849, longitude: 79.1150, zone_id: 9, zone_no: 9, zone_name_en: "Ashi Nagar", zone_name_mr: "आसी नगर", ward_no: 24, assigned_agency: "Orange City Water (OCW)", status: "assigned", sla_hours: 4, created_at: new Date(Date.now() - 7*3600000).toISOString() },
      { ticket_id: "NMC-2026-ASH-0045", citizen_name: "Abdul Qadir", phone: "+91 98230 33333", language: "mr", category: "pipeline_burst", description: "Potable line leaking contaminated water into storm drain.", latitude: 21.1854, longitude: 79.1152, zone_id: 9, zone_no: 9, zone_name_en: "Ashi Nagar", zone_name_mr: "आसी नगर", ward_no: 24, assigned_agency: "Orange City Water (OCW)", status: "closed", sla_hours: 4, created_at: new Date(Date.now() - 12*3600000).toISOString() },
      { ticket_id: "NMC-2026-ASH-0046", citizen_name: "Kavita Raut", phone: "+91 98230 44444", language: "mr", category: "pipeline_burst", description: "Fourth pipe rupture this month on same 150m street segment.", latitude: 21.1850, longitude: 79.1155, zone_id: 9, zone_no: 9, zone_name_en: "Ashi Nagar", zone_name_mr: "आसी नगर", ward_no: 24, assigned_agency: "Orange City Water (OCW)", status: "pending_citizen_confirmation", sla_hours: 4, citizen_otp: "192837", created_at: new Date(Date.now() - 2*3600000).toISOString() },
      // Other zones
      { ticket_id: "NMC-2026-DHP-1011", citizen_name: "Anand Deshmukh", phone: "+91 98230 55555", language: "mr", category: "pothole", description: "Deep crater near Gokulpeth market.", latitude: 21.1415, longitude: 79.0624, zone_id: 2, zone_no: 2, zone_name_en: "Dharampeth", zone_name_mr: "धरमपेठ", ward_no: 12, assigned_agency: "NMC Public Works (PWD)", status: "in_progress", sla_hours: 8, photo_url: "/assets/pothole_defect.svg", created_at: new Date(Date.now() - 4*3600000).toISOString() },
      { ticket_id: "NMC-2026-HNM-2012", citizen_name: "Pooja Sharma", phone: "+91 98230 66666", language: "hi", category: "garbage_overflow", description: "Solid waste overflowing at Medical square.", latitude: 21.1218, longitude: 79.0982, zone_id: 3, zone_no: 3, zone_name_en: "Hanuman Nagar", zone_name_mr: "हनुमान नगर", ward_no: 18, assigned_agency: "NMC Solid Waste (SWM)", status: "closed", sla_hours: 4, photo_url: "/assets/garbage_defect.svg", created_at: new Date(Date.now() - 6*3600000).toISOString() }
    ];
  }

  function loadGrievances() {
    try {
      const data = localStorage.getItem('nmc_grievances_data');
      if (data) return JSON.parse(data);
    } catch(e){}
    const initial = getInitialGrievances();
    saveGrievances(initial);
    return initial;
  }

  function saveGrievances(data) {
    try {
      localStorage.setItem('nmc_grievances_data', JSON.stringify(data));
    } catch(e){}
  }

  // Intercept window.fetch for /api/* when running on static hosts
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    const urlStr = typeof url === 'string' ? url : (url.url || '');
    
    // Only intercept /api/ requests
    if (!urlStr.includes('/api/')) {
      return originalFetch(url, options);
    }

    const method = (options.method || 'GET').toUpperCase();
    let body = {};
    if (options.body) {
      try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; } catch(e){}
    }

    // 1. GET /api/zones
    if (urlStr.endsWith('/api/zones')) {
      return new Response(JSON.stringify(ZONES_DATA), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 2. POST /api/zones/detect
    if (urlStr.includes('/api/zones/detect')) {
      const lat = body.lat || 21.1852;
      const lng = body.lng || 79.1154;
      let closest = ZONES_DATA[0], minDist = Infinity;
      ZONES_DATA.forEach(z => {
        const d = haversineKm(lat, lng, z.lat, z.lng);
        if (d < minDist) { minDist = d; closest = z; }
      });
      return new Response(JSON.stringify({
        zone_id: closest.zone_id,
        zone_no: closest.zone_no,
        name_en: closest.name_en,
        name_mr: closest.name_mr,
        name_hi: closest.name_hi,
        ward_no: closest.wards[0] || 1,
        distance_km: Math.round(minDist * 100)/100
      }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 3. POST /api/reset-demo
    if (urlStr.includes('/api/reset-demo')) {
      const fresh = getInitialGrievances();
      saveGrievances(fresh);
      try { localStorage.removeItem('nmc_cluster_converted'); } catch(e){}
      return new Response(JSON.stringify({ status: "success", message: "Demo data reset successfully to initial baseline state." }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 4. GET /api/grievances (with optional filters) or POST
    if (urlStr.includes('/api/grievances')) {
      const grievances = loadGrievances();

      // Individual Ticket: /api/grievances/:id
      const parts = urlStr.split('/api/grievances/')[1];
      if (parts) {
        const [ticketId, subAction] = parts.split('?')[0].split('/');
        const ticket = grievances.find(g => g.ticket_id === ticketId);

        if (!ticket && subAction !== 'confirm' && subAction !== 'contest') {
          return new Response(JSON.stringify({ detail: "Ticket not found" }), { status: 404, headers: {'Content-Type': 'application/json'} });
        }

        // POST /api/grievances/:id/citizen-confirm
        if (subAction === 'citizen-confirm') {
          if (ticket.citizen_otp && body.otp && body.otp.trim() !== ticket.citizen_otp) {
            return new Response(JSON.stringify({ detail: "Invalid Citizen Verification OTP. Please check SMS." }), { status: 400, headers: {'Content-Type': 'application/json'} });
          }
          ticket.status = 'closed';
          ticket.citizen_rating = body.feedback_rating || 5;
          ticket.citizen_comments = body.citizen_comments || "Satisfied with repair.";
          ticket.otp_verified_at = new Date().toISOString();
          ticket.audit_trail = ticket.audit_trail || [];
          ticket.audit_trail.push({
            timestamp: new Date().toISOString(),
            actor: ticket.citizen_name,
            actor_role: "Citizen",
            action: "Closure Confirmed (OTP Verified)",
            rationale: `6-digit OTP validated. Citizen Rating: ${ticket.citizen_rating}/5. Closed with 100% integrity.`
          });
          saveGrievances(grievances);
          return new Response(JSON.stringify(ticket), { status: 200, headers: {'Content-Type': 'application/json'} });
        }

        // POST /api/grievances/:id/citizen-contest
        if (subAction === 'citizen-contest') {
          ticket.status = 'reopened_contested';
          ticket.is_escalated = 1;
          ticket.audit_trail = ticket.audit_trail || [];
          ticket.audit_trail.push({
            timestamp: new Date().toISOString(),
            actor: ticket.citizen_name,
            actor_role: "Citizen",
            action: "Resolution Contested",
            rationale: body.contest_reason || "Defect persists. Escalated to Executive Engineer."
          });
          saveGrievances(grievances);
          return new Response(JSON.stringify(ticket), { status: 200, headers: {'Content-Type': 'application/json'} });
        }

        // POST /api/grievances/:id/field-action
        if (subAction === 'field-action') {
          if (body.action === 'start_work') {
            ticket.status = 'in_progress';
          } else if (body.action === 'complete_repair') {
            ticket.status = 'pending_citizen_confirmation';
            ticket.resolution_notes = body.notes || "Repair completed.";
            ticket.resolution_photo_url = body.photo_url || "/assets/after_repair.svg";
          }
          ticket.audit_trail = ticket.audit_trail || [];
          ticket.audit_trail.push({
            timestamp: new Date().toISOString(),
            actor: body.inspector_name || "Field Engineer",
            actor_role: "Technician",
            action: body.action === 'start_work' ? "Field Work Commenced" : "Repair Proof Uploaded",
            rationale: "Technician action logged. Direct field closure blocked."
          });
          saveGrievances(grievances);
          return new Response(JSON.stringify(ticket), { status: 200, headers: {'Content-Type': 'application/json'} });
        }

        // Single ticket GET
        ticket.simulated_notifications = {
          channel_sms: `[NMC SMS] Dear ${ticket.citizen_name}, ticket #${ticket.ticket_id} status: ${ticket.status}. OTP: ${ticket.citizen_otp || '482910'}.`,
          channel_whatsapp: `🏛️ *नागपूर महानगरपालिका*
नमस्कार ${ticket.citizen_name},
तक्रार क्र.: *${ticket.ticket_id}*
सद्यस्थिती: *${ticket.status}*
आपला पडताळणी ओटीपी: *${ticket.citizen_otp || '482910'}*`
        };
        return new Response(JSON.stringify(ticket), { status: 200, headers: {'Content-Type': 'application/json'} });
      }

      // POST /api/grievances (Create new)
      if (method === 'POST') {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const tid = `NMC-2026-ASH-${rand}`;
        const newTicket = {
          ticket_id: tid,
          citizen_name: body.citizen_name || "Nagpur Citizen",
          phone: body.phone || "+91 98230 00000",
          language: body.language || "mr",
          category: body.category || "pipeline_burst",
          description: body.description || "Civic Defect",
          latitude: body.latitude || 21.1852,
          longitude: body.longitude || 79.1154,
          zone_id: body.zone_id || 9,
          zone_no: 9,
          zone_name_en: "Ashi Nagar",
          zone_name_mr: "आसी नगर",
          ward_no: 24,
          assigned_agency: body.category === 'pothole' ? "NMC Public Works (PWD)" : body.category === 'garbage_overflow' ? "NMC Solid Waste (SWM)" : "Orange City Water (OCW)",
          status: "reported",
          sla_hours: 4,
          photo_url: body.photo_url || "/assets/before_defect.svg",
          citizen_otp: Math.floor(100000 + Math.random() * 900000).toString(),
          created_at: new Date().toISOString(),
          audit_trail: [{
            timestamp: new Date().toISOString(),
            actor: body.citizen_name,
            actor_role: "Citizen",
            action: "Grievance Registered",
            rationale: "GPS ward tagged. SLA countdown commenced."
          }]
        };
        grievances.unshift(newTicket);
        saveGrievances(grievances);

        const receipt = {
          ticket_id: tid,
          timestamp: newTicket.created_at,
          zone: "Ashi Nagar",
          zone_mr: "आसी नगर",
          ward_no: 24,
          assigned_agency: newTicket.assigned_agency,
          sla_target_hours: 4,
          qr_token: `NMC-VERIFY-2026-${tid}-${newTicket.citizen_otp}`,
          simulated_notifications: {
            channel_sms: `[NMC SMS] Grievance ${tid} registered. OTP: ${newTicket.citizen_otp}`,
            channel_whatsapp: `🏛️ *नागपूर महानगरपालिका*
तक्रार नोंदणी पावती: *${tid}*
ओटीपी: *${newTicket.citizen_otp}*`
          }
        };
        return new Response(JSON.stringify({ status: "success", ticket: newTicket, receipt: receipt }), { status: 200, headers: {'Content-Type': 'application/json'} });
      }

      // Filtered GET /api/grievances
      let list = [...grievances];
      const urlObj = new URL(urlStr, window.location.origin);
      const agency = urlObj.searchParams.get('agency');
      const zoneId = urlObj.searchParams.get('zone_id');
      if (agency) list = list.filter(g => g.assigned_agency && g.assigned_agency.includes(agency));
      if (zoneId) list = list.filter(g => g.zone_id === parseInt(zoneId));
      return new Response(JSON.stringify(list), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 5. GET /api/spatial/clusters
    if (urlStr.includes('/api/spatial/clusters')) {
      const isConverted = localStorage.getItem('nmc_cluster_converted') === 'true';
      return new Response(JSON.stringify({
        total_clusters: 1,
        conversion_rate_pct: isConverted ? 100.0 : 0.0,
        clusters: [{
          cluster_id: "DBSCAN-Z9-W24-001",
          zone_id: 9,
          zone_name_en: "Ashi Nagar",
          zone_name_mr: "आसी नगर",
          title: "Chronic Water Main Failure: Ashi Nagar (Ward 24)",
          ticket_count: 5,
          center_lat: 21.1852,
          center_lng: 79.1154,
          radius_meters: 68.5,
          is_converted: isConverted,
          estimated_cost_lakhs: 48.5,
          infra_analysis: "Repeated joint shears on 1984 Cast Iron main line caused by heavy truck traffic on Kamptee Rd.",
          recommendation: "Replace 380m brittle CI main with 200mm K9 Ductile Iron (DI) pipe with restrained joints.",
          converted_project: isConverted ? { project_id: "PROJ-NMC-2026-DI-OVERHAUL", title: "Ashi Nagar DI Overhaul", budget_lakhs: 48.5 } : null
        }]
      }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 6. POST /api/spatial/convert-to-overhaul
    if (urlStr.includes('/api/spatial/convert-to-overhaul')) {
      localStorage.setItem('nmc_cluster_converted', 'true');
      return new Response(JSON.stringify({
        project_id: "PROJ-NMC-2026-DI-OVERHAUL",
        title: body.project_title || "Ashi Nagar Pipeline Overhaul",
        budget_lakhs: body.budget_lakhs || 48.5,
        status: "SANCTIONED"
      }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 7. GET /api/analytics/command-center
    if (urlStr.includes('/api/analytics/command-center')) {
      const grievances = loadGrievances();
      const isConverted = localStorage.getItem('nmc_cluster_converted') === 'true';
      const statusCounts = {};
      const categoryCounts = {};
      const languageCounts = {};

      grievances.forEach(g => {
        statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
        categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
        languageCounts[g.language || 'mr'] = (languageCounts[g.language || 'mr'] || 0) + 1;
      });

      const zoneMatrix = ZONES_DATA.map(z => {
        const zTickets = grievances.filter(g => g.zone_id === z.zone_id);
        const zClosed = zTickets.filter(g => g.status === 'closed').length;
        return {
          zone_id: z.zone_id,
          zone_no: z.zone_no,
          name_en: z.name_en,
          name_mr: z.name_mr,
          name_hi: z.name_hi,
          total_tickets: zTickets.length,
          closed: zClosed,
          pending: zTickets.length - zClosed,
          escalated: zTickets.filter(g => g.is_escalated).length,
          active_clusters: z.zone_id === 9 ? 1 : 0,
          resolution_rate: zTickets.length ? Math.round((zClosed / zTickets.length)*1000)/10 : 100.0
        };
      });

      return new Response(JSON.stringify({
        kpis: {
          total_grievances: grievances.length,
          pending_grievances: grievances.filter(g => g.status !== 'closed').length,
          resolved_grievances: grievances.filter(g => g.status === 'closed').length,
          unauthorized_closure_rate_pct: 0.0,
          avg_first_response_hours: 2.8,
          regional_language_adoption_pct: 76.0,
          active_infrastructure_clusters: 1,
          pipeline_overhaul_conversion_pct: isConverted ? 100.0 : 0.0
        },
        analytics_breakdown: {
          status_counts: statusCounts,
          category_counts: categoryCounts,
          language_counts: languageCounts
        },
        zone_matrix: zoneMatrix,
        department_accountability: [
          { name: "Orange City Water (OCW)", avg_response_h: 2.1, closure_integrity: 100.0, status: "Best Performer" },
          { name: "NMC Electrical Dept", avg_response_h: 3.4, closure_integrity: 100.0, status: "On Track" },
          { name: "NMC Public Works (PWD)", avg_response_h: 4.6, closure_integrity: 100.0, status: "Action Required" },
          { name: "NMC Drainage Cell", avg_response_h: 4.8, closure_integrity: 100.0, status: "Action Required" },
          { name: "NMC Solid Waste Management", avg_response_h: 5.2, closure_integrity: 100.0, status: "Critical Review Needed" }
        ]
      }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    return originalFetch(url, options);
  };
})();
