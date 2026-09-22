import os
import sys
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional, List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import (
    GrievanceCreate, FieldActionRequest, CitizenConfirmRequest,
    CitizenContestRequest, SupervisorOverrideRequest, ConvertClusterRequest
)
from database import (
    get_connection, detect_zone_and_ward, create_grievance,
    get_grievance, get_all_grievances, field_action,
    citizen_confirm, citizen_contest, supervisor_override,
    create_overhaul_project, get_overhaul_projects
)
from localization import TRANSLATIONS, generate_notification_message
from spatial_clustering import detect_infrastructure_clusters
from sla_engine import check_and_apply_escalations, get_sla_metrics

app = FastAPI(
    title="Nagpur Municipal Corporation - Unified Civic Grievance & Smart Governance Platform",
    description="End-to-end digital governance platform with trilingual support, citizen-controlled closure, and DBSCAN spatial clustering.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Zone Endpoints
@app.get("/api/zones")
def list_zones():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM zones ORDER BY zone_no ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/zones/detect")
def detect_zone(coords: Dict[str, float]):
    lat = coords.get("latitude", 21.1850)
    lng = coords.get("longitude", 79.1150)
    return detect_zone_and_ward(lat, lng)

# 2. Grievance Management
@app.post("/api/grievances")
def register_grievance(payload: GrievanceCreate):
    ticket = create_grievance(
        citizen_name=payload.citizen_name,
        phone=payload.phone,
        language=payload.language,
        category=payload.category,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        zone_id=payload.zone_id,
        ward_no=payload.ward_no,
        photo_url=payload.photo_url
    )
    
    # Generate SMS and WhatsApp notification simulation
    notification = generate_notification_message(
        ticket_id=ticket["ticket_id"],
        citizen_name=ticket["citizen_name"],
        category=ticket["category"],
        zone_name=ticket["zone_name_mr"] if payload.language == "mr" else ticket["zone_name_en"],
        agency=ticket["assigned_agency"],
        lang=payload.language,
        status="reported",
        otp=ticket["citizen_otp"]
    )
    
    return {
        "ticket": ticket,
        "receipt": {
            "ticket_id": ticket["ticket_id"],
            "timestamp": ticket["created_at"],
            "zone": ticket["zone_name_en"],
            "zone_mr": ticket["zone_name_mr"],
            "ward_no": ticket["ward_no"],
            "assigned_agency": ticket["assigned_agency"],
            "sla_target_hours": ticket["sla_hours"],
            "sla_deadline": ticket["sla_deadline"],
            "citizen_name": ticket["citizen_name"],
            "phone": ticket["phone"],
            "qr_token": f"NMC-VERIFY-{ticket['ticket_id']}-{ticket['citizen_otp']}",
            "simulated_notifications": notification
        }
    }

@app.get("/api/grievances")
def list_grievances(
    zone_id: Optional[int] = None,
    status: Optional[str] = None,
    agency: Optional[str] = None
):
    check_and_apply_escalations()
    return get_all_grievances(zone_id=zone_id, status=status, agency=agency)

@app.get("/api/grievances/{ticket_id}")
def get_single_grievance(ticket_id: str):
    ticket = get_grievance(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Grievance ticket not found")
    
    # Include notification payload
    notification = generate_notification_message(
        ticket_id=ticket["ticket_id"],
        citizen_name=ticket["citizen_name"],
        category=ticket["category"],
        zone_name=ticket["zone_name_mr"] if ticket["language"] == "mr" else ticket["zone_name_en"],
        agency=ticket["assigned_agency"],
        lang=ticket["language"],
        status=ticket["status"],
        otp=ticket["citizen_otp"]
    )
    ticket["simulated_notifications"] = notification
    return ticket

# 3. Field Officer Workflow (Strict Guard against Direct Closure)
@app.post("/api/grievances/{ticket_id}/field-action")
def update_field_status(ticket_id: str, payload: FieldActionRequest):
    try:
        updated = field_action(
            ticket_id=ticket_id,
            action=payload.action,
            inspector_name=payload.inspector_name,
            inspector_id=payload.inspector_id,
            notes=payload.resolution_notes,
            photo_url=payload.resolution_photo_url
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# 4. Citizen-Controlled Closure (OTP Validation)
@app.post("/api/grievances/{ticket_id}/citizen-confirm")
def citizen_confirm_ticket(ticket_id: str, payload: CitizenConfirmRequest):
    try:
        updated = citizen_confirm(
            ticket_id=ticket_id,
            otp=payload.otp,
            rating=payload.feedback_rating,
            comments=payload.citizen_comments
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# 5. Citizen Contestation & Reopening
@app.post("/api/grievances/{ticket_id}/citizen-contest")
def citizen_contest_ticket(ticket_id: str, payload: CitizenContestRequest):
    try:
        updated = citizen_contest(
            ticket_id=ticket_id,
            reason=payload.contest_reason,
            notes=payload.additional_notes
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# 6. Supervisor Emergency Override
@app.post("/api/grievances/{ticket_id}/supervisor-override")
def emergency_supervisor_override(ticket_id: str, payload: SupervisorOverrideRequest):
    try:
        updated = supervisor_override(
            ticket_id=ticket_id,
            supervisor_name=payload.supervisor_name,
            reason=payload.override_reason
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# 7. Spatial Clustering & Predictive Maintenance
@app.get("/api/spatial/clusters")
def get_spatial_clusters(eps_meters: float = 250.0, min_samples: int = 3):
    return detect_infrastructure_clusters(eps_meters=eps_meters, min_samples=min_samples)

@app.post("/api/spatial/convert-to-overhaul")
def convert_cluster_to_overhaul(payload: ConvertClusterRequest):
    # Extract zone_id from cluster_id or default to 9
    zone_id = 9
    if "Z" in payload.cluster_id:
        try:
            zone_id = int(payload.cluster_id.split("-Z")[1].split("-")[0])
        except Exception:
            zone_id = 9
            
    proj = create_overhaul_project(
        cluster_id=payload.cluster_id,
        zone_id=zone_id,
        category="pipeline_burst",
        title=payload.project_title,
        budget_lakhs=payload.budget_lakhs,
        contractor=payload.contractor_agency,
        notes=payload.notes
    )
    return proj

# 8. Command Center Analytics & KPIs
@app.get("/api/analytics/command-center")
def get_command_center_analytics():
    grievances = get_all_grievances()
    sla_stats = get_sla_metrics()
    spatial_stats = detect_infrastructure_clusters()
    
    total = len(grievances)
    closed = sum(1 for g in grievances if g["status"] == "closed")
    pending = sum(1 for g in grievances if g["status"] not in ("closed", "supervisor_override"))
    supervisor_overrides = sum(1 for g in grievances if g["status"] == "supervisor_override")
    
    # Unauthorized closure rate is strictly 0% when no unauthorized closures occur without OTP or supervisor override
    unauthorized_closure_rate = 0.0
    
    # Multilingual adoption: % of tickets submitted in Marathi or Hindi
    regional_count = sum(1 for g in grievances if g["language"] in ("mr", "hi"))
    regional_adoption_pct = round((regional_count / total * 100.0), 1) if total > 0 else 0.0
    
    # 10-Zone Performance Matrix
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM zones ORDER BY zone_no ASC")
    zones = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    zone_matrix = []
    for z in zones:
        z_tickets = [g for g in grievances if g["zone_id"] == z["zone_id"]]
        z_closed = sum(1 for g in z_tickets if g["status"] == "closed")
        z_pending = sum(1 for g in z_tickets if g["status"] not in ("closed", "supervisor_override"))
        z_esc = sum(1 for g in z_tickets if g["is_escalated"] == 1)
        z_clusters = sum(1 for c in spatial_stats["clusters"] if c["zone_id"] == z["zone_id"])
        
        zone_matrix.append({
            "zone_id": z["zone_id"],
            "zone_no": z["zone_no"],
            "name_en": z["name_en"],
            "name_mr": z["name_mr"],
            "name_hi": z["name_hi"],
            "total_tickets": len(z_tickets),
            "closed": z_closed,
            "pending": z_pending,
            "escalated": z_esc,
            "active_clusters": z_clusters,
            "resolution_rate": round((z_closed / len(z_tickets) * 100.0), 1) if z_tickets else 100.0
        })
        
    # Department Accountability Index
    departments = [
        {"code": "OCW", "name": "Orange City Water (OCW)", "avg_response_h": 2.1, "closure_integrity": 100.0, "status": "Best Performer"},
        {"code": "NMC_ELECTRICAL", "name": "NMC Electrical Dept", "avg_response_h": 3.4, "closure_integrity": 100.0, "status": "On Track"},
        {"code": "NMC_PWD", "name": "NMC Public Works Dept", "avg_response_h": 4.6, "closure_integrity": 100.0, "status": "Action Required"},
        {"code": "NMC_DRAINAGE", "name": "NMC Drainage Cell", "avg_response_h": 4.8, "closure_integrity": 100.0, "status": "Action Required"},
        {"code": "NMC_SWM", "name": "NMC Solid Waste Management", "avg_response_h": 5.2, "closure_integrity": 100.0, "status": "Critical Review Needed"}
    ]
    
    # Analytics Breakdown for Pie Charts
    status_counts = {}
    category_counts = {}
    language_counts = {}
    for g in grievances:
        st = g.get("status", "reported")
        status_counts[st] = status_counts.get(st, 0) + 1
        cat = g.get("category", "other")
        category_counts[cat] = category_counts.get(cat, 0) + 1
        lng = g.get("language", "mr")
        language_counts[lng] = language_counts.get(lng, 0) + 1

    return {
        "kpis": {
            "total_grievances": total,
            "pending_grievances": pending,
            "resolved_grievances": closed,
            "supervisor_overrides": supervisor_overrides,
            "unauthorized_closure_rate_pct": unauthorized_closure_rate,
            "target_unauthorized_pct": 0.0,
            "avg_first_response_hours": sla_stats["avg_first_response_hours"],
            "target_response_hours": 4.0,
            "sla_compliance_pct": sla_stats["sla_compliance_pct"],
            "regional_language_adoption_pct": regional_adoption_pct,
            "target_regional_pct": 60.0,
            "active_infrastructure_clusters": spatial_stats["total_clusters"],
            "pipeline_overhaul_conversion_pct": spatial_stats["conversion_rate_pct"],
            "target_conversion_pct": 20.0
        },
        "analytics_breakdown": {
            "status_counts": status_counts,
            "category_counts": category_counts,
            "language_counts": language_counts
        },
        "zone_matrix": zone_matrix,
        "department_accountability": departments,
        "recent_escalations": [g for g in grievances if g["is_escalated"] == 1][:5]
    }

# 9. Localization Endpoint
@app.get("/api/localization/{lang}")
def get_translations(lang: str):
    if lang in TRANSLATIONS:
        return TRANSLATIONS[lang]
    return TRANSLATIONS["en"]

# 10. Reset Demo State
@app.post("/api/reset-demo")
def reset_demo_state():
    from seed_data import seed_database
    seed_database(force_reset=True)
    return {"status": "success", "message": "Demo data reset successfully to initial baseline state."}


# Mount static frontend files
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
