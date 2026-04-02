"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UserCog,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
  User,
  Phone,
  BookOpen,
  FileText,
  Shield,
  Barcode,
} from "lucide-react";
import { staffsApi, modulesApi, rolesApi } from "@/app/lib/api";
import {
  Staff,
  StaffFormData,
  StaffStatus,
  Gender,
  bloodGroups,
} from "@/app/types/staff";
import { Module } from "@/app/types/module";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import Pagination from "@/app/components/Pagination";
import { useAuth } from "@/app/contexts/AuthContext";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffAttendanceQr } from "@/app/components/StaffAttendanceQr";

type ModalMode = "create" | "edit" | "view" | null;

function mapApiStaffRecord(s: any): Staff {
  const firstName = s.firstName || s.first_name || "";
  const lastName = s.lastName || s.last_name || "";
  return {
    id: s.id.toString(),
    barcode: s.barcode ?? null,
    firstName: firstName,
    lastName: lastName,
    fullName: s.fullName || `${firstName} ${lastName}`.trim() || "Unknown Staff",
    nicNumber: s.nicNumber || s.nic_number || null,
    dateOfBirth: s.dateOfBirth || s.date_of_birth || "",
    address: s.address || "",
    gender: s.gender || "male",
    bloodGroup: s.bloodGroup || s.blood_group || null,
    schoolName: s.schoolName || s.school_name || null,
    qualifications: s.qualifications || null,
    secondaryPhone: s.secondaryPhone || s.secondary_phone || "",
    secondaryPhoneHasWhatsapp: s.secondaryPhoneHasWhatsapp || s.secondary_phone_has_whatsapp || false,
    medicalNotes: s.medicalNotes || s.medical_notes || null,
    imagePath: s.imagePath || s.image_path || null,
    status: s.status || "active",
    account: s.account ?? null,
    modules: (s.modules || []).map((m: any) => ({
      id: m.id.toString(),
      name: m.name,
      category: m.category,
      amount: Number(m.amount ?? 0),
    })),
    createdAt: s.createdAt || s.created_at,
    updatedAt: s.updatedAt || s.updated_at,
  };
}

const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const statusOptions: { value: StaffStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
  { value: "terminated", label: "Terminated" },
];

const getStatusBadge = (status: StaffStatus) => {
  const badges = {
    active: "badge-success",
    inactive: "badge-error",
    on_leave: "badge-warning",
    terminated: "badge-error",
  };
  return badges[status] || "badge-ghost";
};

export default function StaffsPage() {
  const { isSuperAdmin } = useAuth();
  const { showNotice } = useAppNotice();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [newStaffForQr, setNewStaffForQr] = useState<Staff | null>(null);
  const [search, setSearch] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
    has_more_pages: false,
  });

  const [formData, setFormData] = useState<StaffFormData>({
    firstName: "",
    lastName: "",
    nicNumber: "",
    dateOfBirth: "",
    address: "",
    gender: "male",
    bloodGroup: "",
    schoolName: "",
    qualifications: "",
    moduleIds: [],
    secondaryPhone: "",
    secondaryPhoneHasWhatsapp: false,
    medicalNotes: "",
    status: "active",
    imageFile: null,
  });

  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [accessRoleId, setAccessRoleId] = useState<string>("");
  const [accessEmail, setAccessEmail] = useState<string>("");
  const [accessPassword, setAccessPassword] = useState<string>("");

  const ensureRolesLoaded = async () => {
    if (!isSuperAdmin() || roles.length > 0) return;
    const res = await rolesApi.getAll();
    const list = (res.roles || []).map((r: any) => ({ id: r.id.toString(), name: r.name }));
    setRoles(list);
  };

  const filteredStaffs = useMemo(() => {
    if (!search.trim()) return staffs;
    const searchLower = search.toLowerCase();
    return staffs.filter(
      (staff) =>
        staff.fullName.toLowerCase().includes(searchLower) ||
        staff.nicNumber?.toLowerCase().includes(searchLower) ||
        staff.secondaryPhone.includes(searchLower) ||
        staff.schoolName?.toLowerCase().includes(searchLower)
    );
  }, [staffs, search]);

  const loadData = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const [staffsRes, modulesRes] = await Promise.all([
        staffsApi.getAll(page),
        modulesApi.getAll(),
      ]);

      // Update pagination state
      if (staffsRes.pagination) {
        setPagination(staffsRes.pagination);
        setCurrentPage(staffsRes.pagination.current_page);
      }

      const mappedStaffs: Staff[] = staffsRes.staffs.map((s: any) => mapApiStaffRecord(s));

      const mappedModules: Module[] = modulesRes.modules.map((m: any) => ({
        id: m.id.toString(),
        name: m.name,
        category: m.category,
        subModulesCount: m.sub_modules_count ?? m.subModulesCount ?? 0,
        amount: Number(m.amount ?? 0),
        staffs: (m.staffs || []).map((s: any) => ({
          id: s.id.toString(),
          name: s.name,
          email: s.email,
          department: s.department ?? null,
          phone: s.phone ?? null,
        })),
      }));

      setStaffs(mappedStaffs);
      setModules(mappedModules);
    } catch (error) {
      console.error("Failed to load staffs/modules:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedStaff(null);
    setImagePreview(null);
    if (isSuperAdmin()) {
      ensureRolesLoaded().catch(() => {});
    }
    setAccessRoleId("");
    setAccessEmail("");
    setAccessPassword("");
    setFormData({
      firstName: "",
      lastName: "",
      nicNumber: "",
      dateOfBirth: "",
      address: "",
      gender: "male",
      bloodGroup: "",
      schoolName: "",
      qualifications: "",
      moduleIds: [],
      secondaryPhone: "",
      secondaryPhoneHasWhatsapp: false,
      medicalNotes: "",
      status: "active",
      imageFile: null,
    });
    setModalMode("create");
  };

  const openEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setImagePreview(staff.imagePath || null);
    if (isSuperAdmin()) {
      ensureRolesLoaded().catch(() => {});
      setAccessRoleId(staff.account?.role?.id ? String(staff.account.role.id) : "");
      setAccessEmail(staff.account?.email || "");
      setAccessPassword("");
    } else {
      setAccessRoleId("");
      setAccessEmail("");
      setAccessPassword("");
    }
    setFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      nicNumber: staff.nicNumber || "",
      dateOfBirth: staff.dateOfBirth,
      address: staff.address,
      gender: staff.gender,
      bloodGroup: staff.bloodGroup || "",
      schoolName: staff.schoolName || "",
      qualifications: staff.qualifications || "",
      moduleIds: staff.modules.map((m) => m.id),
      secondaryPhone: staff.secondaryPhone,
      secondaryPhoneHasWhatsapp: staff.secondaryPhoneHasWhatsapp,
      medicalNotes: staff.medicalNotes || "",
      status: staff.status,
      imageFile: null,
    });
    setModalMode("edit");
  };

  const openView = (staff: Staff) => {
    setSelectedStaff(staff);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStaff(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imageFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // TODO: Upload image to S3 first, then get image_path
      const image_path = null; // Will be set after S3 upload

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        nic_number: formData.nicNumber || null,
        date_of_birth: formData.dateOfBirth,
        address: formData.address,
        gender: formData.gender,
        blood_group: formData.bloodGroup || null,
        school_name: formData.schoolName || null,
        qualifications: formData.qualifications || null,
        module_ids: formData.moduleIds.map((id) => parseInt(id)),
        secondary_phone: formData.secondaryPhone,
        secondary_phone_has_whatsapp: formData.secondaryPhoneHasWhatsapp,
        medical_notes: formData.medicalNotes || null,
        image_path: image_path,
        status: formData.status,
      };

      let savedStaffId: string | null = selectedStaff?.id ?? null;
      if (modalMode === "edit" && selectedStaff) {
        const res = await staffsApi.update(selectedStaff.id, payload as any);
        savedStaffId = (res as any)?.staff?.id?.toString?.() ?? selectedStaff.id;
      } else {
        const res = await staffsApi.create(payload as any);
        const created = (res as any)?.staff;
        savedStaffId = created?.id?.toString?.() ?? null;
        if (created) {
          setNewStaffForQr(mapApiStaffRecord(created));
        }
      }

      if (isSuperAdmin() && savedStaffId && accessRoleId && accessEmail) {
        await staffsApi.setAccess(savedStaffId, {
          role_id: accessRoleId,
          email: accessEmail,
          password: accessPassword || null,
        });
      }

      await loadData();
      closeModal();
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to save staff",
        variant: "error",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await staffsApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to delete staff",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Staffs</h1>
          <p className="text-muted-foreground mt-2">
            Manage staff members and their information
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          <button className="btn btn-outline btn-sm gap-2 items-center">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline whitespace-nowrap">Add Staff</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="form-control flex-1 min-w-0">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search staff by name, NIC, phone, or school..."
                  className="input input-bordered w-full border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-square btn-primary flex-shrink-0">
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="form-control flex-shrink-0">
              <button className="btn btn-outline btn-sm gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Staffs Table */}
      <div className="card bg-card border border-border shadow-md">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredStaffs.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No staff found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first staff member to get started
              </p>
              <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="whitespace-nowrap">Add Staff</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-foreground font-semibold whitespace-nowrap">Staff</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Phone</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">School</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Modules</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Status</th>
                    <th className="text-foreground font-semibold whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaffs.map((staff) => (
                    <tr key={staff.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          {staff.imagePath ? (
                            <div className="avatar flex-shrink-0">
                              <div className="w-10 h-10 rounded-full">
                                <img src={staff.imagePath} alt={staff.fullName} />
                              </div>
                            </div>
                          ) : (
                            <div className="avatar placeholder flex-shrink-0">
                              <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                  {staff.firstName?.charAt(0) || "S"}
                                  {staff.lastName?.charAt(0) || ""}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {staff.fullName}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {staff.nicNumber || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground truncate">{staff.secondaryPhone}</span>
                          {staff.secondaryPhoneHasWhatsapp && (
                            <span className="badge badge-success badge-xs flex-shrink-0">WhatsApp</span>
                          )}
                        </div>
                      </td>
                      <td className="text-foreground truncate max-w-[200px]">
                        {staff.schoolName || "N/A"}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {staff.modules.slice(0, 2).map((module) => (
                            <span key={module.id} className="badge badge-primary badge-sm whitespace-nowrap">
                              {module.name}
                            </span>
                          ))}
                          {staff.modules.length > 2 && (
                            <span className="badge badge-outline badge-sm whitespace-nowrap">
                              +{staff.modules.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(staff.status)} badge-sm whitespace-nowrap`}>
                          {staff.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => openView(staff)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">View</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                            onClick={() => openEdit(staff)}
                            title="Edit Staff"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(staff)}
                            title="Delete Staff"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && filteredStaffs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={loadData}
            itemName="staff members"
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && modalMode !== "view" && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-card border border-border max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3>{modalMode === "edit" ? "Edit Staff" : "Create New Staff"}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Personal Information */}
              <div className="admin-form-section">
                <h4>
                  <User className="h-5 w-5 shrink-0 text-primary" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Profile Image - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Profile Image</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        className="file-input file-input-bordered file-input-primary flex-1 border-border"
                        onChange={handleImageChange}
                      />
                      {imagePreview && (
                        <div className="avatar">
                          <div className="w-20 rounded-lg">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="object-cover rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* First Name */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">First Name *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Last Name *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Date of Birth *</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* NIC Number */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">NIC Number</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                      placeholder="Enter NIC number"
                      value={formData.nicNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, nicNumber: e.target.value })
                      }
                    />
                  </div>

                  {/* Gender */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Gender *</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value as Gender })
                      }
                      required
                    >
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Blood Group */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Blood Group</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                      value={formData.bloodGroup}
                      onChange={(e) =>
                        setFormData({ ...formData, bloodGroup: e.target.value })
                      }
                    >
                      <option value="">Select Blood Group</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Address - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Address *</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full h-24 border-border focus:border-primary focus:outline-none"
                      placeholder="Enter full address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* School Name - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">School Name</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                      placeholder="Enter school name"
                      value={formData.schoolName}
                      onChange={(e) =>
                        setFormData({ ...formData, schoolName: e.target.value })
                      }
                    />
                  </div>

                  {/* Qualifications - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Qualifications</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full h-32 border-border focus:border-primary focus:outline-none"
                      placeholder="Enter qualifications (e.g., B.Sc. in Computer Science, M.Sc. in Mathematics)"
                      value={formData.qualifications}
                      onChange={(e) =>
                        setFormData({ ...formData, qualifications: e.target.value })
                      }
                    />
                  </div>

                  {/* Secondary Phone with WhatsApp */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Secondary Phone *</span>
                    </label>
                    <div className="join w-full">
                      <input
                        type="tel"
                        className="input input-bordered join-item flex-1 border-border focus:border-primary focus:outline-none"
                        placeholder="Enter phone number"
                        value={formData.secondaryPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, secondaryPhone: e.target.value })
                        }
                        required
                      />
                      <label className="join-item btn btn-outline border-l-0 px-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={formData.secondaryPhoneHasWhatsapp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              secondaryPhoneHasWhatsapp: e.target.checked,
                            })
                          }
                        />
                        <span className="label-text text-xs ml-2">WhatsApp</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Module Information */}
              <div className="admin-form-section">
                <h4>
                  <BookOpen className="h-5 w-5 shrink-0 text-primary" />
                  Module Assignment (Multiple Selection)
                </h4>
                <div className="form-control">
                  {modules.length === 0 ? (
                    <div className="alert alert-info">
                      <span>No modules available. Please create modules first.</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 border border-border rounded-lg bg-base-50">
                        {modules.map((module) => (
                          <label
                            key={module.id}
                            className={`label cursor-pointer justify-start gap-3 p-4 rounded-lg border transition-all ${
                              formData.moduleIds.includes(module.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted hover:border-base-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary"
                              checked={formData.moduleIds.includes(module.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    moduleIds: [...formData.moduleIds, module.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    moduleIds: formData.moduleIds.filter((id) => id !== module.id),
                                  });
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="label-text font-semibold block truncate">
                                {module.name}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <label className="label mt-3">
                        <span className="label-text font-medium text-foreground">
                          Selected: <span className="text-primary font-bold">{formData.moduleIds.length}</span> modules
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {isSuperAdmin() ? (
                <div className="admin-form-section">
                  <h4>
                    <Shield className="h-5 w-5 shrink-0 text-primary" />
                    Staff access (Role & login)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-foreground">Role</span>
                      </label>
                      <select
                        className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                        value={accessRoleId}
                        onChange={(e) => setAccessRoleId(e.target.value)}
                      >
                        <option value="">No access (no role)</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <label className="label pt-2">
                        <span className="label-text-alt text-muted-foreground">
                          Only Super Admin can assign roles to staff.
                        </span>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-foreground">Login email</span>
                      </label>
                      <input
                        type="email"
                        className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                        placeholder="staff@example.com"
                        value={accessEmail}
                        onChange={(e) => setAccessEmail(e.target.value)}
                        disabled={!accessRoleId}
                      />
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold text-foreground">
                          {modalMode === "create" ? "Set password" : "Reset password (optional)"}
                        </span>
                      </label>
                      <input
                        type="password"
                        className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                        placeholder={modalMode === "create" ? "Minimum 8 characters" : "Leave empty to keep current"}
                        value={accessPassword}
                        onChange={(e) => setAccessPassword(e.target.value)}
                        disabled={!accessRoleId}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Section 3: Additional Information */}
              <div className="admin-form-section">
                <h4>
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  Additional Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Medical Notes - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Medical Notes</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full h-24 border-border focus:border-primary focus:outline-none"
                      value={formData.medicalNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, medicalNotes: e.target.value })
                      }
                      placeholder="Any medical conditions or notes..."
                    />
                  </div>

                  {/* Status */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-foreground">Status *</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as StaffStatus,
                        })
                      }
                      required
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost gap-2 px-6"
                  onClick={closeModal}
                >
                  <span className="whitespace-nowrap">Cancel</span>
                </button>
                <button type="submit" className="btn btn-primary gap-2 px-6 items-center">
                  <span className="whitespace-nowrap">
                    {modalMode === "edit" ? "Update Staff" : "Create Staff"}
                  </span>
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={closeModal}>
            <button>close</button>
          </form>
        </dialog>
      )}

      <RecordDetailModal
        open={modalMode === "view" && !!selectedStaff}
        title="Staff"
        onClose={closeModal}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm min-h-9 h-9 px-4" onClick={closeModal}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm min-h-9 h-9 gap-1.5 px-4"
              onClick={() => {
                if (!selectedStaff) return;
                closeModal();
                openEdit(selectedStaff);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        }
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div className="flex gap-3 border-b border-border pb-3">
              {selectedStaff.imagePath ? (
                <div className="avatar shrink-0">
                  <div className="w-14 rounded-full ring ring-border ring-offset-2 ring-offset-background">
                    <img src={selectedStaff.imagePath} alt="" />
                  </div>
                </div>
              ) : (
                <div className="avatar placeholder shrink-0">
                  <div className="w-14 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {selectedStaff.firstName?.charAt(0) || "S"}
                    {selectedStaff.lastName?.charAt(0) || ""}
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight text-foreground">{selectedStaff.fullName}</p>
                <div className="mt-1.5">
                  <span className={`badge badge-sm ${getStatusBadge(selectedStaff.status)}`}>
                    {selectedStaff.status}
                  </span>
                </div>
                {selectedStaff.barcode ? (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Barcode className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono">{selectedStaff.barcode}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {selectedStaff.barcode ? (
              <StaffAttendanceQr
                compact
                showDescription={false}
                barcode={selectedStaff.barcode}
                fullName={selectedStaff.fullName}
                subtitle={`ID: ${selectedStaff.barcode}`}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No attendance ID on file for this staff member.</p>
            )}

            <div>
              <RecordDetailSectionTitle>Personal</RecordDetailSectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Date of birth</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(selectedStaff.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                {selectedStaff.nicNumber ? (
                  <div>
                    <p className="text-xs text-muted-foreground">NIC</p>
                    <p className="text-sm font-medium text-foreground">{selectedStaff.nicNumber}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium capitalize text-foreground">{selectedStaff.gender}</p>
                </div>
                {selectedStaff.bloodGroup ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Blood group</p>
                    <p className="text-sm font-medium text-foreground">{selectedStaff.bloodGroup}</p>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Secondary phone</p>
                  <p className="text-sm font-medium text-foreground flex flex-wrap items-center gap-1.5">
                    {selectedStaff.secondaryPhone}
                    {selectedStaff.secondaryPhoneHasWhatsapp ? (
                      <span className="badge badge-success badge-xs">WA</span>
                    ) : null}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium text-foreground leading-snug">{selectedStaff.address}</p>
                </div>
                {selectedStaff.schoolName ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">School</p>
                    <p className="text-sm font-medium text-foreground">{selectedStaff.schoolName}</p>
                  </div>
                ) : null}
                {selectedStaff.qualifications ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Qualifications</p>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {selectedStaff.qualifications}
                    </p>
                  </div>
                ) : null}
                {selectedStaff.medicalNotes ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Medical notes</p>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {selectedStaff.medicalNotes}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <RecordDetailSectionTitle>Modules</RecordDetailSectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {selectedStaff.modules.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None assigned</span>
                ) : (
                  selectedStaff.modules.map((module) => (
                    <span key={module.id} className="badge badge-primary badge-sm">
                      {module.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </RecordDetailModal>

      <Dialog open={!!newStaffForQr} onOpenChange={(o) => !o && setNewStaffForQr(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff created</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This QR is unique to this staff member and does not change. Download the PNG for an ID card or gate
            check-in.
          </p>
          {newStaffForQr?.barcode ? (
            <StaffAttendanceQr
              barcode={newStaffForQr.barcode}
              fullName={newStaffForQr.fullName}
              subtitle={newStaffForQr.nicNumber ? `NIC: ${newStaffForQr.nicNumber}` : undefined}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No attendance ID was returned. Open the staff profile after refresh to generate or view the ID if
              available.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete staff?"
        description={
          <>
            Remove <span className="font-medium text-foreground">{deleteTarget?.fullName}</span>.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
