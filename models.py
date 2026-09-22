from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ZoneInfo(BaseModel):
    zone_id: int
    name_en: str
    name_mr: str
    name_hi: str
    zone_no: int
    office_address: str
    lat: float
    lng: float
    wards: List[int]

class GrievanceCreate(BaseModel):
    citizen_name: str = Field(..., description="Full name of citizen")
    phone: str = Field(..., description="10-digit mobile number")
    language: str = Field("mr", description="mr, hi, or en")
    category: str = Field(..., description="Defect category")
    description: str = Field(..., description="Description of issue")
    latitude: float = Field(..., description="GPS Latitude")
    longitude: float = Field(..., description="GPS Longitude")
    zone_id: Optional[int] = None
    ward_no: Optional[int] = None
    photo_url: Optional[str] = None

class FieldActionRequest(BaseModel):
    action: str = Field(..., description="start_work or complete_repair")
    inspector_name: str = Field(..., description="Name of field lead")
    inspector_id: str = Field("OCW-TECH-409", description="Employee ID")
    resolution_notes: Optional[str] = None
    resolution_photo_url: Optional[str] = None

class CitizenConfirmRequest(BaseModel):
    otp: str = Field(..., description="6-digit confirmation OTP")
    feedback_rating: int = Field(5, ge=1, le=5)
    citizen_comments: Optional[str] = None

class CitizenContestRequest(BaseModel):
    contest_reason: str = Field(..., description="Reason work was inadequate")
    additional_notes: Optional[str] = None

class SupervisorOverrideRequest(BaseModel):
    supervisor_name: str = Field(..., description="Officer name")
    override_reason: str = Field(..., description="Mandatory audit justification")

class ConvertClusterRequest(BaseModel):
    cluster_id: str
    project_title: str
    budget_lakhs: float = 45.0
    contractor_agency: str = "Orange City Water Infrastructure Cell"
    notes: Optional[str] = None
