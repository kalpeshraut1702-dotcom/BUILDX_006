import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from datetime import datetime, timedelta
from database import get_connection, init_db, add_audit_log, create_overhaul_project

NAGPUR_ZONES = [
    {
        "zone_id": 1, "zone_no": 1, "name_en": "Laxmi Nagar", "name_mr": "लक्ष्मीनगर", "name_hi": "लक्ष्मी नगर",
        "office_address": "NMC Zonal Office, Near Water Tank, Laxmi Nagar, Nagpur 440022",
        "lat": 21.1152, "lng": 79.0654, "wards": [16, 36, 37, 38]
    },
    {
        "zone_id": 2, "zone_no": 2, "name_en": "Dharampeth", "name_mr": "धरमपेठ", "name_hi": "धरमपेठ",
        "office_address": "NMC Dharampeth Zonal Office, West High Court Rd, Nagpur 440010",
        "lat": 21.1450, "lng": 79.0620, "wards": [10, 11, 12, 13]
    },
    {
        "zone_id": 3, "zone_no": 3, "name_en": "Hanuman Nagar", "name_mr": "हनुमाननगर", "name_hi": "हनुमान नगर",
        "office_address": "NMC Hanuman Nagar Office, Near Medical Square, Nagpur 440009",
        "lat": 21.1210, "lng": 79.1020, "wards": [28, 29, 31, 32]
    },
    {
        "zone_id": 4, "zone_no": 4, "name_en": "Dhantoli", "name_mr": "धंतोली", "name_hi": "धंतोली",
        "office_address": "NMC Dhantoli Office, Near Mehadia Square, Nagpur 440012",
        "lat": 21.1320, "lng": 79.0820, "wards": [15, 17, 33, 34]
    },
    {
        "zone_id": 5, "zone_no": 5, "name_en": "Nehru Nagar", "name_mr": "नेहरूनगर", "name_hi": "नेहरू नगर",
        "office_address": "NMC Nehru Nagar Office, Sakkardara Chowk, Nagpur 440024",
        "lat": 21.1150, "lng": 79.1250, "wards": [26, 27, 29, 30]
    },
    {
        "zone_id": 6, "zone_no": 6, "name_en": "Gandhibagh", "name_mr": "गांधीबाग", "name_hi": "गांधीबाग",
        "office_address": "NMC Gandhibagh Zonal Office, Near Itwari, Nagpur 440002",
        "lat": 21.1510, "lng": 79.1040, "wards": [18, 19, 21, 22]
    },
    {
        "zone_id": 7, "zone_no": 7, "name_en": "Satranjipura", "name_mr": "सतरंजीपुरा", "name_hi": "सतरंजीपुरा",
        "office_address": "NMC Satranjipura Office, Golibar Chowk, Nagpur 440017",
        "lat": 21.1680, "lng": 79.1120, "wards": [5, 6, 7, 8]
    },
    {
        "zone_id": 8, "zone_no": 8, "name_en": "Lakadganj", "name_mr": "लकडगंज", "name_hi": "लकड़गंज",
        "office_address": "NMC Lakadganj Office, Near Central Avenue, Nagpur 440008",
        "lat": 21.1550, "lng": 79.1350, "wards": [23, 24, 25]
    },
    {
        "zone_id": 9, "zone_no": 9, "name_en": "Ashi Nagar", "name_mr": "आसी नगर", "name_hi": "आशी नगर",
        "office_address": "NMC Ashi Nagar Zonal Office, Kamptee Road, Teka Naka, Nagpur 440014",
        "lat": 21.1850, "lng": 79.1150, "wards": [2, 3, 4, 9, 24]
    },
    {
        "zone_id": 10, "zone_no": 10, "name_en": "Mangalwari", "name_mr": "मंगळवारी", "name_hi": "मंगलवारी",
        "office_address": "NMC Mangalwari Zonal Office, Sadar / Koradi Rd, Nagpur 440001",
        "lat": 21.1780, "lng": 79.0760, "wards": [1, 14, 15]
    }
]

def seed_database(force_reset: bool = False):
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    
    if force_reset:
        print("Force resetting database tables...")
        cursor.execute("DELETE FROM audit_logs")
        cursor.execute("DELETE FROM overhaul_projects")
        cursor.execute("DELETE FROM grievances")
        cursor.execute("DELETE FROM zones")
        conn.commit()
    else:
        # Check if already seeded
        cursor.execute("SELECT COUNT(*) FROM zones")
        if cursor.fetchone()[0] > 0:
            print("Database already seeded. Skipping.")
            conn.close()
            return

    print("Seeding Nagpur 10 Zones...")
    for z in NAGPUR_ZONES:
        cursor.execute("""
        INSERT INTO zones (zone_id, zone_no, name_en, name_mr, name_hi, office_address, lat, lng, wards)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            z["zone_id"], z["zone_no"], z["name_en"], z["name_mr"], z["name_hi"],
            z["office_address"], z["lat"], z["lng"], json.dumps(z["wards"])
        ))
        
    now = datetime.now()
    
    # 1. Sunita Meshram's Primary Ticket in Ashi Nagar (Pending Citizen Confirmation)
    sunita_ticket_id = "NMC-2026-ASH-0042"
    t_created = (now - timedelta(hours=3, minutes=45)).isoformat()
    t_assigned = (now - timedelta(hours=3, minutes=10)).isoformat()
    t_work = (now - timedelta(hours=1, minutes=30)).isoformat()
    t_completed = (now - timedelta(minutes=25)).isoformat()
    
    cursor.execute("""
    INSERT INTO grievances (
        ticket_id, citizen_name, phone, language, category, description, photo_url,
        latitude, longitude, zone_id, ward_no, assigned_agency, status,
        sla_hours, sla_deadline, is_escalated, escalation_level,
        inspector_name, inspector_id, resolution_notes, resolution_photo_url,
        citizen_otp, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sunita_ticket_id, "Sunita Meshram", "+91 98230 45678", "mr",
        "pipeline_burst", "आसी नगर प्रभाग २४, कामठी रोड मुख्य पाईपलाईन जोरदार फुटली असून लाखो लिटर पिण्याचे पाणी वाहत आहे.",
        "/assets/before_defect.svg",
        21.1852, 79.1154, 9, 24, "OCW", "pending_citizen_confirmation",
        4, (now + timedelta(minutes=15)).isoformat(),
        "Pravin Gaikwad (OCW Lead)", "OCW-TECH-409",
        "Replaced fractured 150mm Cast Iron collar joint with heavy-duty Ductile Iron repair clamp. Tested under 2.5 bar water pressure.",
        "/assets/after_repair.svg",
        "482910", t_created, t_completed
    ))
    
    # Audit trail for Sunita's ticket
    cursor.execute("""
    INSERT INTO audit_logs (ticket_id, actor, actor_role, action, from_agency, to_agency, rationale, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (sunita_ticket_id, "Sunita Meshram", "Citizen", "Grievance Registered", "Web Portal (Marathi)", "Ashi Nagar Zone Office", "Complaint filed via mobile GPS tag", t_created))
    
    cursor.execute("""
    INSERT INTO audit_logs (ticket_id, actor, actor_role, action, from_agency, to_agency, rationale, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (sunita_ticket_id, "Auto-Dispatcher", "System", "Auto-Routed to OCW", "Ashi Nagar Zone Office", "Orange City Water (OCW)", "Pipeline category assigned to water concessionaire", t_assigned))
    
    cursor.execute("""
    INSERT INTO audit_logs (ticket_id, actor, actor_role, action, from_agency, to_agency, rationale, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (sunita_ticket_id, "Pravin Gaikwad", "Field Technician", "Inspection & Repair Started", "Orange City Water (OCW)", "Orange City Water (OCW)", "Crew arrived on site with excavator & DI clamp", t_work))
    
    cursor.execute("""
    INSERT INTO audit_logs (ticket_id, actor, actor_role, action, from_agency, to_agency, rationale, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (sunita_ticket_id, "Pravin Gaikwad", "Field Lead", "Work Completed - Awaiting Citizen OTP", "Orange City Water (OCW)", "Citizen (Sunita)", "Resolution photo uploaded. Municipal protocol requires citizen OTP verification before closure.", t_completed))

    # 2. Add Clustered Water Leaks in Ashi Nagar (forming the DBSCAN Pipeline Degradation Cluster)
    ashi_leaks = [
        ("NMC-2026-ASH-0118", "Rajendra Raut", "+91 98221 11001", "mr", 21.1856, 79.1150, "Teka Naka main road recurring water seepage from underground pipe.", "closed", "481101"),
        ("NMC-2026-ASH-0145", "Mohd. Farooq", "+91 94228 33441", "hi", 21.1849, 79.1158, "पाइपलाइन जॉइंट लीक होने से सड़क पर भारी जलभराव।", "closed", "992341"),
        ("NMC-2026-ASH-0202", "Anand Kolhe", "+91 97654 22109", "mr", 21.1854, 79.1160, "गेल्या आठवड्यात दुरुस्त केलेल्या ठिकाणी पुन्हा पाणी गळती सुरू.", "in_progress", "112233"),
        ("NMC-2026-ASH-0239", "Shabana Bano", "+91 98901 66554", "hi", 21.1848, 79.1149, "पीने के पानी की लाइन में गटर का पानी मिल रहा है, पाइप फटा है।", "assigned", "887766"),
    ]
    
    for tid, name, ph, lng, lat, lon, desc, st, otp in ashi_leaks:
        c_time = (now - timedelta(days=3, hours=2)).isoformat()
        cursor.execute("""
        INSERT INTO grievances (
            ticket_id, citizen_name, phone, language, category, description, photo_url,
            latitude, longitude, zone_id, ward_no, assigned_agency, status,
            sla_hours, sla_deadline, is_escalated, escalation_level,
            citizen_otp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pipeline_burst', ?, 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
                  ?, ?, 9, 24, 'OCW', ?, 4, ?, 0, 0, ?, ?, ?)
        """, (
            tid, name, ph, lng, desc, lat, lon, st, (now + timedelta(hours=2)).isoformat(), otp, c_time, c_time
        ))
        cursor.execute("""
        INSERT INTO audit_logs (ticket_id, actor, actor_role, action, from_agency, to_agency, rationale, timestamp)
        VALUES (?, ?, 'Citizen', 'Grievance Registered', 'Citizen App', 'OCW', 'Reported via Ashi Nagar Zone', ?)
        """, (tid, name, c_time))

    # 3. Seed complaints across all other zones for comprehensive 10-zone analytics
    other_zone_complaints = [
        # Dharampeth (Zone 2)
        ("NMC-2026-DHP-1082", "Amol Deshpande", "+91 98222 34567", "mr", "pothole", "लॉ कॉलेज चौकाजवळ डांबरी रस्त्यावर मोठा धोकादायक खड्डा.", 21.1448, 79.0615, 2, 11, "NMC_PWD", "in_progress", 8),
        ("NMC-2026-DHP-1104", "Sheetal Sharma", "+91 94231 78901", "hi", "streetlight_fault", "रामदासपेठ मेन रोड की 4 स्ट्रीट लाइटें पिछले 3 दिनों से बंद हैं।", 21.1455, 79.0630, 2, 12, "NMC_ELECTRICAL", "assigned", 6),
        ("NMC-2026-DHP-1150", "Vikram Joshi", "+91 98900 12345", "en", "pothole", "Pothole crater developing near Coffee House Square.", 21.1442, 79.0625, 2, 10, "NMC_PWD", "closed", 8),
        
        # Gandhibagh (Zone 6)
        ("NMC-2026-GNB-2031", "Girish Agrawal", "+91 98233 44556", "hi", "garbage_overflow", "इतवारी किराणा बाजार के सामने कचरा पेटी 4 दिनों से खाली नहीं हुई।", 21.1515, 79.1045, 6, 19, "NMC_SWM", "reported", 4),
        ("NMC-2026-GNB-2055", "Suresh Patil", "+91 98500 66778", "mr", "drainage_choke", "गांधीबाग उद्यान परिसरातील मुख्य गटार तुंबून रस्त्यावर दुर्गंधी पसरली आहे.", 21.1505, 79.1035, 6, 18, "NMC_DRAINAGE", "in_progress", 6),
        
        # Laxmi Nagar (Zone 1)
        ("NMC-2026-LXN-3012", "Nitin Gadkari", "+91 98224 55667", "mr", "drainage_choke", "बजाज नगर चौकात पावसाचे पाणी वाहून नेणारी जलवाहिनी चोक झाली आहे.", 21.1158, 79.0660, 1, 37, "NMC_DRAINAGE", "closed", 6),
        ("NMC-2026-LXN-3044", "Ramesh Kulkarni", "+91 94220 99887", "en", "pothole", "Deep road depression near Laxmi Nagar Water Tank.", 21.1145, 79.0648, 1, 36, "NMC_PWD", "assigned", 8),
        
        # Hanuman Nagar (Zone 3)
        ("NMC-2026-HNM-4021", "Dr. Manoj Vaidya", "+91 98225 66778", "mr", "water_contamination", "मेडिकल चौकाजवळ नळाला पिवळट दुर्गंधीयुक्त पाणी येत आहे.", 21.1215, 79.1025, 3, 29, "OCW", "in_progress", 4),
        ("NMC-2026-HNM-4050", "Pooja Wankhede", "+91 97644 11223", "hi", "streetlight_fault", "हनुमान नगर ग्राउंड के चारों तरफ की लाइटें खराब हैं।", 21.1205, 79.1015, 3, 28, "NMC_ELECTRICAL", "closed", 6),
        
        # Dhantoli (Zone 4)
        ("NMC-2026-DHN-5011", "Adv. Sanjay Mehta", "+91 98226 77889", "en", "garbage_overflow", "Construction debris illegally dumped near Mehadia Square.", 21.1325, 79.0825, 4, 17, "NMC_SWM", "assigned", 4),
        ("NMC-2026-DHN-5038", "Deepak Bhende", "+91 94235 44332", "mr", "pothole", "काँग्रेस नगर चौकातील खड्ड्यामुळे अपघात होण्याची शक्यता.", 21.1315, 79.0815, 4, 15, "NMC_PWD", "closed", 8),
        
        # Nehru Nagar (Zone 5)
        ("NMC-2026-NHR-6019", "Kishore Chincholkar", "+91 98227 88990", "mr", "pipeline_burst", "सक्करदरा तलावाजवळ व्हॉल्व्ह चेंबरमधून पाणी गळती सुरू आहे.", 21.1155, 79.1255, 5, 27, "OCW", "in_progress", 4),
        ("NMC-2026-NHR-6042", "Naveen Khan", "+91 98902 33445", "hi", "streetlight_fault", "नेहरू नगर चौक का हाई-मास्ट लैंप बंद पड़ा है।", 21.1145, 79.1245, 5, 26, "NMC_ELECTRICAL", "closed", 6),
        
        # Satranjipura (Zone 7)
        ("NMC-2026-STP-7014", "Abdul Karim", "+91 98228 99001", "hi", "drainage_choke", "गोलीबार चौक के पास गटर का चैंबर ओवरफ्लो हो रहा है।", 21.1685, 79.1125, 7, 6, "NMC_DRAINAGE", "in_progress", 6),
        ("NMC-2026-STP-7033", "Mohan Lal", "+91 94223 55664", "en", "garbage_overflow", "Sanitation workers skipping daily collection on Lane 4.", 21.1675, 79.1115, 7, 5, "NMC_SWM", "closed", 4),
        
        # Lakadganj (Zone 8)
        ("NMC-2026-LKD-8022", "Harvinder Singh", "+91 98229 00112", "en", "pothole", "Severe road damage near Timber Market, Central Avenue.", 21.1555, 79.1355, 8, 24, "NMC_PWD", "escalated", 8),
        ("NMC-2026-LKD-8049", "Ganesh Tiwari", "+91 98903 44556", "mr", "streetlight_fault", "लकडगंज स्मशानभूमी समोरील पथदिवे बंद आहेत.", 21.1545, 79.1345, 8, 23, "NMC_ELECTRICAL", "closed", 6),
        
        # Mangalwari (Zone 10)
        ("NMC-2026-MGL-9018", "Sandhya Pathak", "+91 98230 11223", "mr", "streetlight_fault", "कोराडी रोड, मानकापूर उड्डाणपुलाखालील दिवे बंद.", 21.1785, 79.0765, 10, 14, "NMC_ELECTRICAL", "in_progress", 6),
        ("NMC-2026-MGL-9051", "Alok Saxena", "+91 94226 77889", "hi", "pipeline_burst", "सदर बाजार में पानी की लाइन फटने से रोड बह रही है।", 21.1775, 79.0755, 10, 1, "OCW", "closed", 4)
    ]
    
    for tid, name, ph, lng, cat, desc, lat, lon, zid, wno, agn, st, sla_h in other_zone_complaints:
        c_time = (now - timedelta(hours=(10 if st != 'escalated' else 36))).isoformat()
        dl = (now + timedelta(hours=sla_h - 2)).isoformat() if st != 'escalated' else (now - timedelta(hours=4)).isoformat()
        is_esc = 1 if st == 'escalated' else 0
        esc_lvl = 1 if st == 'escalated' else 0
        
        cursor.execute("""
        INSERT INTO grievances (
            ticket_id, citizen_name, phone, language, category, description, photo_url,
            latitude, longitude, zone_id, ward_no, assigned_agency, status,
            sla_hours, sla_deadline, is_escalated, escalation_level,
            citizen_otp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&w=600&q=80',
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '392810', ?, ?)
        """, (
            tid, name, ph, lng, cat, desc, lat, lon, zid, wno, agn, st,
            sla_h, dl, is_esc, esc_lvl, c_time, c_time
        ))
        
        cursor.execute("""
        INSERT INTO audit_logs (ticket_id, actor, actor_role, action, from_agency, to_agency, rationale, timestamp)
        VALUES (?, ?, 'Citizen', 'Complaint Lodged', 'Citizen Web Portal', ?, 'Mapped to designated zone authority', ?)
        """, (tid, name, agn, c_time))
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {len(NAGPUR_ZONES)} zones and {1 + len(ashi_leaks) + len(other_zone_complaints)} realistic grievances.")

if __name__ == "__main__":
    seed_database()
