import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import (
    get_grievance, get_all_grievances, field_action,
    citizen_confirm, citizen_contest, detect_zone_and_ward,
    create_grievance
)
from spatial_clustering import detect_infrastructure_clusters

print("=== Running Unified Civic Platform Verification Tests ===")

# Test 1: Coordinate to Zone auto-mapping
coords_ashi = {"lat": 21.1852, "lng": 79.1154}
detected = detect_zone_and_ward(coords_ashi["lat"], coords_ashi["lng"])
assert detected["name_en"] == "Ashi Nagar", f"Expected Ashi Nagar, got {detected['name_en']}"
print("[PASS] Test 1: GPS Coordinate (21.1852, 79.1154) correctly auto-detected as Ashi Nagar (Zone 9).")

# Test 2: DBSCAN Spatial Clustering identifies Ashi Nagar pipeline cluster
clusters_res = detect_infrastructure_clusters()
assert len(clusters_res["clusters"]) >= 1, "Expected at least 1 infrastructure cluster"
main_cluster = clusters_res["clusters"][0]
assert main_cluster["zone_name_en"] == "Ashi Nagar"
assert main_cluster["category"] == "pipeline_burst"
print(f"[PASS] Test 2: DBSCAN identified '{main_cluster['title']}' with {main_cluster['ticket_count']} incidents within {main_cluster['radius_meters']}m.")

# Test 3: Sunita's complaint is in pending_citizen_confirmation
sunita = get_grievance("NMC-2026-ASH-0042")
assert sunita is not None, "Sunita ticket not found"
assert sunita["status"] == "pending_citizen_confirmation"
assert sunita["citizen_otp"] == "482910"
print("[PASS] Test 3: Primary Citizen Persona (Sunita Meshram) ticket is loaded in 'pending_citizen_confirmation' state.")

# Test 4: Anti-tamper guardrail rejected bad OTP
try:
    citizen_confirm("NMC-2026-ASH-0042", "000000", 5, "Nice")
    assert False, "Should have failed on invalid OTP"
except ValueError as e:
    print(f"[PASS] Test 4: Anti-tamper guardrail rejected bad OTP: {e}")

# Test 5: Field Officer cannot directly close ticket
try:
    field_action("NMC-2026-ASH-0042", "closed", "Pravin Gaikwad", "OCW-TECH-409", "Done", None)
    assert False, "Should have failed on direct closure"
except ValueError as e:
    print(f"[PASS] Test 5: Field technician direct closure blocked: {e}")

# Test 6: Create new Grievance & verify digital receipt generation
new_ticket = create_grievance(
    citizen_name="Pradeep Tayde",
    phone="+91 99887 76655",
    language="hi",
    category="pothole",
    description="Dharampeth main road pothole near coffee square",
    latitude=21.1450,
    longitude=79.0620
)
assert new_ticket["assigned_agency"] == "NMC_PWD"
assert new_ticket["zone_name_en"] == "Dharampeth"
print(f"[PASS] Test 6: New grievance {new_ticket['ticket_id']} successfully registered & auto-routed to NMC_PWD.")

# Test 7: Citizen Verification with OTP transitions to 'closed'
test_conf = citizen_confirm("NMC-2026-ASH-0042", "482910", 5, "Water supply restored cleanly.")
assert test_conf["status"] == "closed"
print(f"[PASS] Test 7: Citizen OTP (482910) validated successfully; ticket moved to '{test_conf['status']}'.")

# Reset baseline so Sunita's ticket returns to pending_citizen_confirmation for live user session
from seed_data import seed_database
seed_database(force_reset=True)

print("\nAll Backend Core Verification Tests Passed Successfully & DB reset to baseline for live session!")

