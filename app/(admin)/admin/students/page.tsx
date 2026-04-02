"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
  User,
  Phone,
  Calendar,
  GraduationCap,
  Image as ImageIcon,
  Barcode,
  FileText,
} from "lucide-react";
import { studentsApi, modulesApi } from "@/app/lib/api";
import {
  Student,
  StudentFormData,
  StudentStatus,
  PaymentType,
  bloodGroups,
} from "@/app/types/student";
import { Module } from "@/app/types/module";

type ModalMode = "create" | "edit" | "view" | null;

import { formatCurrency } from "@/app/utils/currency";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import Pagination from "@/app/components/Pagination";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Student | null>(null);
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

  const [formData, setFormData] = useState<StudentFormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    nicNumber: "",
    personalPhone: "",
    parentPhone: "",
    personalPhoneHasWhatsapp: false,
    parentPhoneHasWhatsapp: false,
    admissionBatch: "",
    address: "",
    schoolName: "",
    bloodGroup: "",
    medicalNotes: "",
    moduleIds: [],
    paymentType: "admission_only",
    paidAmount: 500,
    status: "active",
    imageFile: null,
  });

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const searchLower = search.toLowerCase();
    return students.filter((student) =>
      student.fullName.toLowerCase().includes(searchLower) ||
      student.admissionNumber.toLowerCase().includes(searchLower) ||
      student.personalPhone.includes(searchLower) ||
      student.parentPhone.includes(searchLower) ||
      student.admissionBatch.toLowerCase().includes(searchLower)
    );
  }, [students, search]);

  // Calculate module total amount
  const calculatedModuleTotal = useMemo(() => {
    return modules
      .filter((m) => formData.moduleIds.includes(m.id))
      .reduce((sum, m) => sum + m.amount, 0);
  }, [modules, formData.moduleIds]);

  // Calculate total payment
  const totalPayment = useMemo(() => {
    if (formData.paymentType === "full") {
      return 500 + calculatedModuleTotal;
    }
    return 500; // admission_only
  }, [formData.paymentType, calculatedModuleTotal]);

  const loadData = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const [studentsRes, modulesRes] = await Promise.all([
        studentsApi.getAll(page),
        modulesApi.getAll(),
      ]);

      // Update pagination state
      if (studentsRes.pagination) {
        setPagination(studentsRes.pagination);
        setCurrentPage(studentsRes.pagination.current_page);
      }

      const mappedStudents: Student[] = studentsRes.students.map((s: any) => ({
        id: s.id.toString(),
        admissionNumber: s.admissionNumber,
        barcode: s.barcode,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: s.fullName || `${s.firstName} ${s.lastName}`,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender || "male",
        nicNumber: s.nicNumber,
        personalPhone: s.personalPhone,
        parentPhone: s.parentPhone,
        personalPhoneHasWhatsapp: s.personalPhoneHasWhatsapp || false,
        parentPhoneHasWhatsapp: s.parentPhoneHasWhatsapp || false,
        admissionBatch: s.admissionBatch,
        address: s.address,
        schoolName: s.schoolName,
        bloodGroup: s.bloodGroup,
        medicalNotes: s.medicalNotes,
        imagePath: s.imagePath,
        admissionFee: Number(s.admissionFee ?? 500),
        moduleTotalAmount: Number(s.moduleTotalAmount ?? 0),
        paidAmount: Number(s.paidAmount ?? 0),
        paymentType: s.paymentType,
        status: s.status,
        modules: (s.modules || []).map((m: any) => ({
          id: m.id.toString(),
          name: m.name,
          category: m.category,
          subModulesCount: 0,
          amount: Number(m.amount ?? 0),
          staffs: [],
        })),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

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

      setStudents(mappedStudents);
      setModules(mappedModules);
    } catch (error) {
      console.error("Failed to load students/modules:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedStudent(null);
    setImagePreview(null);
    setFormData({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "male",
      nicNumber: "",
      personalPhone: "",
      parentPhone: "",
      personalPhoneHasWhatsapp: false,
      parentPhoneHasWhatsapp: false,
      admissionBatch: "",
      address: "",
      schoolName: "",
      bloodGroup: "",
      medicalNotes: "",
      moduleIds: [],
      paymentType: "admission_only",
      paidAmount: 500,
      status: "active",
      imageFile: null,
    });
    setModalMode("create");
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setImagePreview(student.imagePath || null);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender || "male",
      nicNumber: student.nicNumber || "",
      personalPhone: student.personalPhone,
      parentPhone: student.parentPhone,
      personalPhoneHasWhatsapp: student.personalPhoneHasWhatsapp,
      parentPhoneHasWhatsapp: student.parentPhoneHasWhatsapp,
      admissionBatch: student.admissionBatch,
      address: student.address,
      schoolName: student.schoolName || "",
      bloodGroup: student.bloodGroup || "",
      medicalNotes: student.medicalNotes || "",
      moduleIds: student.modules.map((m) => m.id),
      paymentType: student.paymentType,
      paidAmount: student.paidAmount,
      status: student.status,
      imageFile: null,
    });
    setModalMode("edit");
  };

  const openView = (student: Student) => {
    setSelectedStudent(student);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStudent(null);
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

  const handleModuleChange = (moduleId: string, checked: boolean) => {
    const currentIds = formData.moduleIds;
    if (checked) {
      if (currentIds.length >= 3) {
        alert("Maximum 3 modules can be selected");
        return;
      }
      setFormData({ ...formData, moduleIds: [...currentIds, moduleId] });
    } else {
      setFormData({ ...formData, moduleIds: currentIds.filter((id) => id !== moduleId) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.moduleIds.length === 0 || formData.moduleIds.length > 3) {
      alert("Please select 1 to 3 modules");
      return;
    }

    try {
      // TODO: Upload image to S3 first, then get image_path
      // For now, we'll skip image upload and set it to null
      // In production, you'll need an image upload endpoint
      const image_path = null; // Will be set after S3 upload

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        nic_number: formData.nicNumber || null,
        personal_phone: formData.personalPhone,
        parent_phone: formData.parentPhone,
        personal_phone_has_whatsapp: formData.personalPhoneHasWhatsapp,
        parent_phone_has_whatsapp: formData.parentPhoneHasWhatsapp,
        admission_batch: formData.admissionBatch,
        address: formData.address,
        school_name: formData.schoolName || null,
        blood_group: formData.bloodGroup || null,
        medical_notes: formData.medicalNotes || null,
        image_path: image_path,
        module_ids: formData.moduleIds.map((id) => parseInt(id)),
        payment_type: formData.paymentType,
        paid_amount: formData.paymentType === "full" ? totalPayment : 500,
        status: formData.status,
      };

      if (modalMode === "edit" && selectedStudent) {
        await studentsApi.update(selectedStudent.id, payload as any);
      } else {
        await studentsApi.create(payload as any);
      }

      await loadData();
      closeModal();
    } catch (error: any) {
      alert(error.message || "Failed to save student");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await studentsApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete student");
    }
  };

  const handleDeactivate = (student: Student) => {
    setDeactivateTarget(student);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await studentsApi.deactivate(deactivateTarget.id);
      await loadData();
      setDeactivateTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to deactivate student");
    }
  };

  const getStatusBadge = (status: StudentStatus) => {
    const badges = {
      active: "badge-success",
      inactive: "badge-error",
      graduated: "badge-info",
      suspended: "badge-warning",
    };
    return badges[status] || "badge-ghost";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-base-content">Students</h1>
          <p className="text-base-content/70 mt-2">
            Manage student records, admissions, and information
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          <button className="btn btn-outline btn-sm gap-2 items-center">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline whitespace-nowrap">Add Student</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="form-control flex-1 min-w-0">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search by name, admission number, phone, or batch..."
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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

      {/* Students Table */}
      <div className="card bg-base-100 border border-base-300 shadow-md">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">
                No students found
              </h3>
              <p className="text-base-content/70 mb-4">
                Create your first student to get started
              </p>
              <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="whitespace-nowrap">Add Student</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-200">
                    <th className="text-base-content font-semibold whitespace-nowrap">Student</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Phone</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Parent Phone</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Batch</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Modules</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Status</th>
                    <th className="text-base-content font-semibold whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          {student.imagePath ? (
                            <div className="avatar flex-shrink-0">
                              <div className="w-10 h-10 rounded-full">
                                <img src={student.imagePath} alt={student.fullName} />
                              </div>
                            </div>
                          ) : (
                            <div className="avatar placeholder flex-shrink-0">
                              <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                  {student.firstName.charAt(0)}
                                  {student.lastName.charAt(0)}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-base-content truncate">
                              {student.fullName}
                            </div>
                            <div className="text-sm text-base-content/70 truncate">
                              {student.admissionNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-4 w-4 text-base-content/50 flex-shrink-0" />
                          <span className="text-base-content truncate">{student.personalPhone}</span>
                          {student.personalPhoneHasWhatsapp && (
                            <span className="badge badge-success badge-xs flex-shrink-0">WhatsApp</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-4 w-4 text-base-content/50 flex-shrink-0" />
                          <span className="text-base-content truncate">{student.parentPhone}</span>
                          {student.parentPhoneHasWhatsapp && (
                            <span className="badge badge-success badge-xs flex-shrink-0">WhatsApp</span>
                          )}
                        </div>
                      </td>
                      <td className="text-base-content font-semibold whitespace-nowrap">
                        {student.admissionBatch}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {student.modules.slice(0, 2).map((module) => (
                            <span key={module.id} className="badge badge-primary badge-sm whitespace-nowrap">
                              {module.name}
                            </span>
                          ))}
                          {student.modules.length > 2 && (
                            <span className="badge badge-outline badge-sm whitespace-nowrap">
                              +{student.modules.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(student.status)} badge-sm whitespace-nowrap`}>
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => openView(student)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">View</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                            onClick={() => openEdit(student)}
                            title="Edit Student"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(student)}
                            title="Delete Student"
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
        {!loading && filteredStudents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={loadData}
            itemName="students"
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && modalMode !== "view" && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-300 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-base-content">
              {modalMode === "edit" ? "Edit Student" : "Create New Student"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Personal Information */}
              <div className="border-b border-base-300 pb-6">
                <h4 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profile Image - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Profile Image</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        className="file-input file-input-bordered file-input-primary flex-1 border-base-300"
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
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">First Name *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Last Name *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Date of Birth *</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Gender */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Gender *</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value as "male" | "female" | "other" })
                      }
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* NIC Number */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">NIC Number</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                      placeholder="Enter NIC number"
                      value={formData.nicNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, nicNumber: e.target.value })
                      }
                    />
                  </div>

                  {/* Blood Group */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Blood Group</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Address *</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full h-24 border-base-300 focus:border-primary focus:outline-none"
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
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">School Name</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                      placeholder="Enter school name"
                      value={formData.schoolName}
                      onChange={(e) =>
                        setFormData({ ...formData, schoolName: e.target.value })
                      }
                    />
                  </div>

                  {/* Personal Phone with WhatsApp */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Personal Phone *</span>
                    </label>
                    <div className="join w-full">
                      <input
                        type="tel"
                        className="input input-bordered join-item flex-1 border-base-300 focus:border-primary focus:outline-none"
                        placeholder="Enter phone number"
                        value={formData.personalPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, personalPhone: e.target.value })
                        }
                        required
                      />
                      <label className="join-item btn btn-outline border-l-0 px-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={formData.personalPhoneHasWhatsapp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              personalPhoneHasWhatsapp: e.target.checked,
                            })
                          }
                        />
                        <span className="label-text text-xs ml-2">WhatsApp</span>
                      </label>
                    </div>
                  </div>

                  {/* Parent Phone with WhatsApp */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Parent Phone *</span>
                    </label>
                    <div className="join w-full">
                      <input
                        type="tel"
                        className="input input-bordered join-item flex-1 border-base-300 focus:border-primary focus:outline-none"
                        placeholder="Enter parent phone number"
                        value={formData.parentPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, parentPhone: e.target.value })
                        }
                        required
                      />
                      <label className="join-item btn btn-outline border-l-0 px-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={formData.parentPhoneHasWhatsapp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              parentPhoneHasWhatsapp: e.target.checked,
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
              <div className="border-b border-base-300 pb-6">
                <h4 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Module Information (Select 1-3 Modules)
                </h4>
                <div className="form-control">
                  {modules.length === 0 ? (
                    <div className="alert alert-info">
                      <span>No modules available. Please create modules first.</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 border border-base-300 rounded-lg bg-base-50">
                        {modules.map((module) => (
                          <label
                            key={module.id}
                            className={`label cursor-pointer justify-start gap-3 p-4 rounded-lg border transition-all ${
                              formData.moduleIds.includes(module.id)
                                ? "border-primary bg-primary/10"
                                : "border-base-300 hover:bg-base-200 hover:border-base-400"
                            } ${
                              !formData.moduleIds.includes(module.id) &&
                              formData.moduleIds.length >= 3
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary"
                              checked={formData.moduleIds.includes(module.id)}
                              onChange={(e) =>
                                handleModuleChange(module.id, e.target.checked)
                              }
                              disabled={
                                !formData.moduleIds.includes(module.id) &&
                                formData.moduleIds.length >= 3
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <span className="label-text font-semibold block truncate">
                                {module.name}
                              </span>
                              <span className="label-text-alt text-primary font-medium block mt-1">
                                {formatCurrency(module.amount)}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <label className="label mt-3">
                        <span className="label-text font-medium text-base-content">
                          Selected: <span className="text-primary font-bold">{formData.moduleIds.length}</span> / 3 modules
                          {calculatedModuleTotal > 0 && (
                            <span className="ml-3 text-success font-semibold">
                              Module Total: {formatCurrency(calculatedModuleTotal)}
                            </span>
                          )}
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Section 3: Admission Information */}
              <div>
                <h4 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Admission Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Admission Batch */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Admission Batch *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                      placeholder="e.g., 2026"
                      value={formData.admissionBatch}
                      onChange={(e) =>
                        setFormData({ ...formData, admissionBatch: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Payment Type */}
                  <div className="form-control">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Payment Type *</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                      value={formData.paymentType}
                      onChange={(e) => {
                        const paymentType = e.target.value as PaymentType;
                        setFormData({
                          ...formData,
                          paymentType,
                          paidAmount:
                            paymentType === "full" ? 500 + calculatedModuleTotal : 500,
                        });
                      }}
                      required
                    >
                      <option value="admission_only">
                        Admission Fee Only ({formatCurrency(500)})
                      </option>
                      <option value="full">
                        Full Payment ({formatCurrency(500 + calculatedModuleTotal)})
                      </option>
                    </select>
                  </div>

                  {/* Status - Only in Edit Mode */}
                  {modalMode === "edit" && (
                    <div className="form-control">
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-base-content">Status *</span>
                      </label>
                      <select
                        className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as StudentStatus,
                          })
                        }
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="graduated">Graduated</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  )}

                  {/* Medical Notes - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label pb-2">
                      <span className="label-text font-semibold text-base-content">Medical Notes</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full h-24 border-base-300 focus:border-primary focus:outline-none"
                      value={formData.medicalNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, medicalNotes: e.target.value })
                      }
                      placeholder="Any medical conditions or notes..."
                    />
                  </div>

                  {/* Payment Summary - Full Width */}
                  <div className="form-control md:col-span-2">
                    <label className="label mb-2">
                      <span className="label-text font-semibold">Payment Summary</span>
                    </label>
                    <div className="card bg-primary/5 border border-primary/20 p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-base-content/70">Admission Fee:</span>
                          <span className="font-semibold text-base-content">
                            {formatCurrency(500)}
                          </span>
                        </div>
                        {formData.moduleIds.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-base-content/70">
                              Modules ({formData.moduleIds.length}):
                            </span>
                            <span className="font-semibold text-base-content">
                              {formatCurrency(calculatedModuleTotal)}
                            </span>
                          </div>
                        )}
                        <div className="divider my-1"></div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="font-bold text-lg text-base-content">
                            Total Amount:
                          </span>
                          <span className="font-bold text-xl text-primary">
                            {formatCurrency(totalPayment)}
                          </span>
                        </div>
                        {formData.paymentType === "full" && (
                          <div className="badge badge-success badge-lg mt-2 w-full justify-center">
                            Full Payment Selected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-action flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  className="btn btn-ghost gap-2 px-6"
                  onClick={closeModal}
                >
                  <span className="whitespace-nowrap">Cancel</span>
                </button>
                <button type="submit" className="btn btn-primary gap-2 px-6 items-center">
                  <span className="whitespace-nowrap">
                    {modalMode === "edit" ? "Update Student" : "Create Student"}
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
        open={modalMode === "view" && !!selectedStudent}
        title="Student"
        subtitle={selectedStudent?.admissionNumber}
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
                if (!selectedStudent) return;
                closeModal();
                openEdit(selectedStudent);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        }
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex gap-3 border-b border-base-200 pb-3">
              {selectedStudent.imagePath ? (
                <div className="avatar shrink-0">
                  <div className="w-14 rounded-full ring ring-base-200 ring-offset-2 ring-offset-base-100">
                    <img src={selectedStudent.imagePath} alt="" />
                  </div>
                </div>
              ) : (
                <div className="avatar placeholder shrink-0">
                  <div className="w-14 rounded-full bg-primary text-primary-content text-sm font-semibold">
                    {selectedStudent.firstName.charAt(0)}
                    {selectedStudent.lastName.charAt(0)}
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight text-base-content">
                  {selectedStudent.fullName}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className={`badge badge-sm ${getStatusBadge(selectedStudent.status)}`}>
                    {selectedStudent.status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-base-content/60">
                  <Barcode className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono">{selectedStudent.barcode}</span>
                </div>
              </div>
            </div>

            <div>
              <RecordDetailSectionTitle>Personal</RecordDetailSectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
                <div>
                  <p className="text-xs text-base-content/60">Date of birth</p>
                  <p className="text-sm font-medium text-base-content">
                    {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Gender</p>
                  <p className="text-sm font-medium capitalize text-base-content">
                    {selectedStudent.gender || "—"}
                  </p>
                </div>
                {selectedStudent.nicNumber ? (
                  <div>
                    <p className="text-xs text-base-content/60">NIC</p>
                    <p className="text-sm font-medium text-base-content">{selectedStudent.nicNumber}</p>
                  </div>
                ) : null}
                {selectedStudent.bloodGroup ? (
                  <div>
                    <p className="text-xs text-base-content/60">Blood group</p>
                    <p className="text-sm font-medium text-base-content">{selectedStudent.bloodGroup}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-base-content/60">Personal phone</p>
                  <p className="text-sm font-medium text-base-content flex flex-wrap items-center gap-1.5">
                    {selectedStudent.personalPhone}
                    {selectedStudent.personalPhoneHasWhatsapp ? (
                      <span className="badge badge-success badge-xs">WA</span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Parent phone</p>
                  <p className="text-sm font-medium text-base-content flex flex-wrap items-center gap-1.5">
                    {selectedStudent.parentPhone}
                    {selectedStudent.parentPhoneHasWhatsapp ? (
                      <span className="badge badge-success badge-xs">WA</span>
                    ) : null}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-base-content/60">Address</p>
                  <p className="text-sm font-medium text-base-content leading-snug">{selectedStudent.address}</p>
                </div>
                {selectedStudent.schoolName ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-base-content/60">School</p>
                    <p className="text-sm font-medium text-base-content">{selectedStudent.schoolName}</p>
                  </div>
                ) : null}
                {selectedStudent.medicalNotes ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-base-content/60">Medical notes</p>
                    <p className="text-sm font-medium text-base-content leading-snug">
                      {selectedStudent.medicalNotes}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <RecordDetailSectionTitle>Admission</RecordDetailSectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-base-content/60">Batch</p>
                  <p className="text-sm font-medium text-base-content">{selectedStudent.admissionBatch}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Payment type</p>
                  <p className="text-sm font-medium text-base-content">
                    {selectedStudent.paymentType === "full" ? "Full" : "Admission only"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <RecordDetailSectionTitle>Modules</RecordDetailSectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {selectedStudent.modules.map((module) => (
                  <span key={module.id} className="badge badge-primary badge-sm gap-1">
                    {module.name}
                    <span className="opacity-80">{formatCurrency(module.amount)}</span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-base-content/60">
                Total {formatCurrency(selectedStudent.moduleTotalAmount)}
              </p>
            </div>

            <div>
              <RecordDetailSectionTitle>Payment</RecordDetailSectionTitle>
              <div className="rounded-lg border border-base-200 bg-base-200/50 px-3 py-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-base-content/60">Admission</span>
                  <span className="font-medium">{formatCurrency(selectedStudent.admissionFee)}</span>
                </div>
                {selectedStudent.moduleTotalAmount > 0 ? (
                  <div className="mt-1.5 flex justify-between gap-2">
                    <span className="text-base-content/60">Modules</span>
                    <span className="font-medium">{formatCurrency(selectedStudent.moduleTotalAmount)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex justify-between gap-2 border-t border-base-300 pt-2">
                  <span className="font-semibold text-base-content">Paid</span>
                  <span className="font-semibold text-primary">{formatCurrency(selectedStudent.paidAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete student?"
        description={
          <>
            <span className="font-medium text-base-content">{deleteTarget?.fullName}</span> will be
            marked inactive. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate student?"
        description={
          <>
            <span className="font-medium text-base-content">{deactivateTarget?.fullName}</span> will
            not appear as active.
          </>
        }
        confirmLabel="Deactivate"
        tone="warning"
        icon="alert"
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}