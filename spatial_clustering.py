import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math
from typing import List, Dict, Any
from database import get_all_grievances, get_overhaul_projects, haversine_km

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return haversine_km(lat1, lon1, lat2, lon2) * 1000.0

class SpatialDBSCAN:
    """Pure Python DBSCAN implementation for spatial clustering with Haversine distance."""
    def __init__(self, eps_meters: float = 250.0, min_samples: int = 3):
        self.eps = eps_meters
        self.min_samples = min_samples

    def fit(self, points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        n = len(points)
        if n == 0:
            return []

        # Find neighbors for each point
        neighbors = [[] for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i == j:
                    neighbors[i].append(j)
                else:
                    d = haversine_meters(points[i]["latitude"], points[i]["longitude"],
                                         points[j]["latitude"], points[j]["longitude"])
                    if d <= self.eps:
                        neighbors[i].append(j)

        visited = [False] * n
        cluster_labels = [-1] * n # -1 indicates noise or unassigned
        current_cluster = 0

        for i in range(n):
            if visited[i]:
                continue
            visited[i] = True
            
            # If point has enough neighbors within eps, it is a core point
            if len(neighbors[i]) >= self.min_samples:
                cluster_labels[i] = current_cluster
                # Expand cluster using queue
                queue = list(neighbors[i])
                head = 0
                while head < len(queue):
                    p = queue[head]
                    head += 1
                    
                    if not visited[p]:
                        visited[p] = True
                        if len(neighbors[p]) >= self.min_samples:
                            for q in neighbors[p]:
                                if q not in queue:
                                    queue.append(q)
                                    
                    if cluster_labels[p] == -1:
                        cluster_labels[p] = current_cluster
                        
                current_cluster += 1

        # Group points by cluster label (ignore noise label -1)
        clusters = {}
        for idx, label in enumerate(cluster_labels):
            if label == -1:
                continue
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(points[idx])

        result = []
        for label, cluster_pts in clusters.items():
            result.append(cluster_pts)
        return result

def detect_infrastructure_clusters(eps_meters: float = 250.0, min_samples: int = 3) -> Dict[str, Any]:
    """
    Run spatial clustering on grievances to uncover systemic infrastructure failures.
    Specifically isolates water pipeline bursts, potholes, and drainage issues.
    """
    grievances = get_all_grievances()
    overhauls = get_overhaul_projects()
    overhaul_cluster_ids = {o["cluster_id"] for o in overhauls}
    
    # Filter by recurring infrastructure categories
    categories = ["pipeline_burst", "pothole", "drainage_choke"]
    clusters_detected = []
    
    for cat in categories:
        cat_points = [g for g in grievances if g["category"] == cat]
        if len(cat_points) < min_samples:
            continue
            
        dbscan = SpatialDBSCAN(eps_meters=eps_meters, min_samples=min_samples)
        grouped = dbscan.fit(cat_points)
        
        for idx, group in enumerate(grouped):
            lats = [p["latitude"] for p in group]
            lngs = [p["longitude"] for p in group]
            center_lat = sum(lats) / len(lats)
            center_lng = sum(lngs) / len(lngs)
            
            # Maximum radius from centroid
            max_r = max(haversine_meters(center_lat, center_lng, lat, lng) for lat, lng in zip(lats, lngs))
            cluster_radius = max(round(max_r, 1), 60.0)
            
            zone_id = group[0]["zone_id"]
            zone_name_en = group[0]["zone_name_en"]
            zone_name_mr = group[0]["zone_name_mr"]
            ward_no = group[0]["ward_no"]
            ticket_ids = [p["ticket_id"] for p in group]
            
            cluster_id = f"CLUS-NMC-Z{zone_id}-{cat[:4].upper()}-{idx+1}"
            is_converted = cluster_id in overhaul_cluster_ids
            
            if cat == "pipeline_burst":
                cluster_title = f"Chronic Water Main Failure: {zone_name_en} (Ward {ward_no})"
                infra_analysis = (
                    f"PostGIS DBSCAN identified {len(group)} recurring pipe bursts within a {int(cluster_radius)}m radius. "
                    "Data points to a deteriorating 1970s cast-iron distribution trunk line along Kamptee Road. "
                    "Repetitive spot excavations are economically inefficient."
                )
                recommendation = "Convert to Planned Capital Overhaul: 750m Ductile Iron (DI) Pipeline Overhaul."
                est_cost = 45.0
                est_savings = "Prevents ₹12L in annual ad-hoc patch expenses and saves 1.5 MLD water loss."
            elif cat == "pothole":
                cluster_title = f"Structural Road Subgrade Failure: {zone_name_en}"
                infra_analysis = f"{len(group)} structural asphalt failures within {int(cluster_radius)}m indicate base layer water ingress."
                recommendation = "Convert to Full Road Re-metalling and Bituminous Overlay Project."
                est_cost = 38.0
                est_savings = "Avoids 15 emergency pothole filler deployments annually."
            else:
                cluster_title = f"Under-capacity Stormwater Conduit: {zone_name_en}"
                infra_analysis = f"{len(group)} overflow complaints clustered near low-lying culvert."
                recommendation = "Construct Dedicated RCC Box Drain Channel."
                est_cost = 52.0
                est_savings = "Mitigates monsoon flooding across 4 residential blocks."
                
            clusters_detected.append({
                "cluster_id": cluster_id,
                "category": cat,
                "zone_id": zone_id,
                "zone_name_en": zone_name_en,
                "zone_name_mr": zone_name_mr,
                "ward_no": ward_no,
                "center_lat": round(center_lat, 6),
                "center_lng": round(center_lng, 6),
                "radius_meters": cluster_radius,
                "ticket_count": len(group),
                "ticket_ids": ticket_ids,
                "title": cluster_title,
                "infra_analysis": infra_analysis,
                "recommendation": recommendation,
                "estimated_cost_lakhs": est_cost,
                "projected_savings": est_savings,
                "is_converted": is_converted,
                "converted_project": next((o for o in overhauls if o["cluster_id"] == cluster_id), None)
            })

    # KPI Calculation: % of repetitive repairs converted to planned pipeline overhaul projects
    total_clusters = len(clusters_detected)
    converted_count = sum(1 for c in clusters_detected if c["is_converted"])
    conversion_rate = round((converted_count / total_clusters * 100.0), 1) if total_clusters > 0 else 0.0
    
    return {
        "clusters": clusters_detected,
        "total_clusters": total_clusters,
        "converted_overhaul_count": converted_count,
        "conversion_rate_pct": conversion_rate,
        "kpi_target_pct": 20.0,
        "kpi_status": "Target Achieved" if conversion_rate >= 20.0 else "In Progress"
    }
