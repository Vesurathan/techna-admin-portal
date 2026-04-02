"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
  User,
  Building2,
  X,
} from "lucide-react";
import Pagination from "@/app/components/Pagination";
import { timetablesApi, modulesApi, staffsApi, classroomsApi } from "@/app/lib/api";
import { Timetable, TimetableSlot, TimetableFormData } from "@/app/types/timetable";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import { Module } from "@/app/types/module";
import { Staff } from "@/app/types/module";
import { Classroom } from "@/app/types/classroom";

type ModalMode = "create" | "edit" | "view" | null;

// Helper function to normalize time to HH:MM format
const normalizeTime = (time: string | null | undefined): string => {
  if (!time) return "";
  // Remove seconds if present (e.g., "09:00:00" -> "09:00")
  return time.substring(0, 5);
};

export default function TimetablesPage() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Timetable | null>(null);
  const [search, setSearch] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterDate, setFilterDate] = useState("");
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

  const [formData, setFormData] = useState<TimetableFormData>({
    batch: "",
    date: "",
    slots: [],
  });

  const filteredTimetables = useMemo(() => {
    // Backend handles batch and date filtering, we only do search on frontend
    if (!search.trim()) return timetables;
    const searchLower = search.toLowerCase();
    return timetables.filter(
      (timetable) =>
        timetable.batch.toLowerCase().includes(searchLower) ||
        timetable.weekday.toLowerCase().includes(searchLower)
    );
  }, [timetables, search]);

  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(timetables.map((t) => t.batch))).sort();
  }, [timetables]);

  const loadData = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const [timetablesRes, modulesRes, staffsRes, classroomsRes] = await Promise.all([
        timetablesApi.getAll({ page, batch: filterBatch || undefined, date: filterDate || undefined }),
        modulesApi.getAll(1), // Get first page of modules for selection
        staffsApi.getAll(1, true), // Get all staff without pagination
        classroomsApi.getAll({ active_only: true }),
      ]);

      // Update pagination state
      if (timetablesRes.pagination) {
        setPagination(timetablesRes.pagination);
        setCurrentPage(timetablesRes.pagination.current_page);
      }

      const mappedTimetables: Timetable[] = timetablesRes.timetables.map((t: any) => ({
        id: t.id.toString(),
        batch: t.batch,
        date: t.date,
        weekday: t.weekday,
        slots: (t.slots || []).map((s: any) => ({
          id: s.id?.toString(),
          start_time: normalizeTime(s.start_time),
          end_time: normalizeTime(s.end_time),
          module_id: s.module?.id?.toString() || s.module_id?.toString() || "",
          staff_id: s.staff?.id?.toString() || s.staff_id?.toString() || "",
          classroom: s.classroom,
          interval_time: s.interval_time,
          module: s.module,
          staff: s.staff,
        })),
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      const mappedModules: Module[] = (modulesRes.modules || []).map((m: any) => ({
        id: m.id.toString(),
        name: m.name,
        category: m.category,
        subModulesCount: m.sub_modules_count ?? m.subModulesCount ?? 0,
        amount: Number(m.amount ?? 0),
        staffs: (m.staffs || []).map((s: any) => {
          // Use fullName from API response, fallback to constructing from first_name/last_name
          const fullName = s.full_name || s.fullName || 
            `${s.first_name || s.firstName || ""} ${s.last_name || s.lastName || ""}`.trim() || 
            s.name || "Unknown";
          return {
            id: s.id.toString(),
            name: fullName,
            email: s.email || "",
            department: s.department ?? null,
            phone: s.phone ?? s.secondary_phone ?? null,
          };
        }),
      }));

      const mappedStaffs: Staff[] = staffsRes.staffs.map((s: any) => {
        // Use fullName from API response, fallback to constructing from first_name/last_name
        const fullName = s.fullName || s.full_name || 
          `${s.firstName || s.first_name || ""} ${s.lastName || s.last_name || ""}`.trim() || 
          s.name || "Unknown";
        return {
          id: s.id.toString(),
          name: fullName,
          email: s.email || "",
          department: s.department ?? null,
          phone: s.phone || s.secondaryPhone || s.secondary_phone || null,
        };
      });

      const mappedClassrooms: Classroom[] = classroomsRes.classrooms.map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        type: c.type,
        capacity: c.capacity,
        description: c.description,
        is_active: c.is_active,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

      setTimetables(mappedTimetables);
      setModules(mappedModules);
      setStaffs(mappedStaffs);
      setClassrooms(mappedClassrooms);
    } catch (error) {
      console.error("Failed to load timetables/modules/staffs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadData(1);
  }, [filterBatch, filterDate]);

  const openCreate = () => {
    setSelectedTimetable(null);
    setFormData({
      batch: "",
      date: "",
      slots: [],
    });
    setModalMode("create");
  };

  const openEdit = (timetable: Timetable) => {
    setSelectedTimetable(timetable);
    setFormData({
      batch: timetable.batch,
      date: timetable.date,
        slots: timetable.slots.map((slot) => {
          // Try to find classroom_id by matching classroom name if classroom_id is missing
          let classroomId = slot.classroom_id;
          if (!classroomId && slot.classroom && classrooms.length > 0) {
            const matchedClassroom = classrooms.find(
              (c) => c.name === slot.classroom
            );
            if (matchedClassroom) {
              classroomId = matchedClassroom.id;
            }
          }
          return {
            ...slot,
            module_id: slot.module_id || slot.module?.id || "",
            staff_id: slot.staff_id || slot.staff?.id || "",
            classroom_id: classroomId || null,
            classroom: slot.classroom || "",
          };
        }),
    });
    setModalMode("edit");
  };

  const openView = (timetable: Timetable) => {
    setSelectedTimetable(timetable);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTimetable(null);
  };

  const addSlot = () => {
    setFormData({
      ...formData,
      slots: [
        ...formData.slots,
        {
          start_time: "",
          end_time: "",
          module_id: "",
          staff_id: "",
          classroom_id: null,
          classroom: "",
          interval_time: null,
        },
      ],
    });
  };

  const removeSlot = (index: number) => {
    setFormData({
      ...formData,
      slots: formData.slots.filter((_, i) => i !== index),
    });
  };

  const updateSlot = (index: number, field: keyof TimetableSlot, value: any) => {
    const newSlots = [...formData.slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setFormData({ ...formData, slots: newSlots });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.slots.length === 0) {
      alert("Please add at least one time slot");
      return;
    }

    // Validate all slots
    for (const slot of formData.slots) {
      if (!slot.start_time || !slot.end_time || !slot.module_id || !slot.staff_id || (!slot.classroom && !slot.classroom_id)) {
        alert("Please fill in all required fields for all slots");
        return;
      }
      if (slot.start_time >= slot.end_time) {
        alert("End time must be after start time");
        return;
      }
    }

    try {
      const payload = {
        batch: formData.batch,
        date: formData.date,
        slots: formData.slots.map((slot) => ({
          start_time: normalizeTime(slot.start_time),
          end_time: normalizeTime(slot.end_time),
          module_id: parseInt(slot.module_id),
          staff_id: parseInt(slot.staff_id),
          classroom_id: slot.classroom_id ? parseInt(slot.classroom_id) : null,
          classroom: slot.classroom,
          interval_time: slot.interval_time || null,
        })),
      };

      if (modalMode === "edit" && selectedTimetable) {
        await timetablesApi.update(selectedTimetable.id, payload);
      } else {
        await timetablesApi.create(payload);
      }

      await loadData();
      closeModal();
    } catch (error: any) {
      alert(error.message || "Failed to save timetable");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await timetablesApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete timetable");
    }
  };

  const handleDownload = async (timetable: Timetable) => {
    try {
      // Dynamically import html2canvas (client-side only)
      const html2canvas = (await import('html2canvas')).default;

      // Create a printable container with isolated styles
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.top = '0';
      printContainer.style.left = '0';
      printContainer.style.width = '1200px';
      printContainer.style.minHeight = '800px';
      printContainer.style.backgroundColor = '#ffffff';
      printContainer.style.padding = '40px';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      printContainer.style.zIndex = '9999';
      printContainer.style.boxSizing = 'border-box';
      printContainer.style.margin = '0';
      printContainer.style.border = 'none';

      // Format date
      const date = new Date(timetable.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Build HTML content
      printContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #432AD5; font-size: 32px; margin: 0 0 10px 0; font-weight: bold;">
            Timetable
          </h1>
          <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">
            Batch: ${timetable.batch}
          </h2>
          <p style="color: #666; font-size: 18px; margin: 0;">
            ${formattedDate}
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background-color: #432AD5; color: white;">
              <th style="padding: 15px; text-align: left; font-size: 16px; font-weight: 600; border: 1px solid #ddd;">
                Time
              </th>
              <th style="padding: 15px; text-align: left; font-size: 16px; font-weight: 600; border: 1px solid #ddd;">
                Module
              </th>
              <th style="padding: 15px; text-align: left; font-size: 16px; font-weight: 600; border: 1px solid #ddd;">
                Staff
              </th>
              <th style="padding: 15px; text-align: left; font-size: 16px; font-weight: 600; border: 1px solid #ddd;">
                Classroom/Hall
              </th>
              ${timetable.slots.some(s => s.interval_time) ? `
              <th style="padding: 15px; text-align: left; font-size: 16px; font-weight: 600; border: 1px solid #ddd;">
                Interval
              </th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${timetable.slots
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((slot, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                <td style="padding: 15px; border: 1px solid #ddd; font-size: 15px; font-weight: 600; color: #432AD5;">
                  ${slot.start_time} - ${slot.end_time}
                </td>
                <td style="padding: 15px; border: 1px solid #ddd; font-size: 15px; color: #333;">
                  ${slot.module?.name || 'N/A'}
                </td>
                <td style="padding: 15px; border: 1px solid #ddd; font-size: 15px; color: #333;">
                  ${slot.staff?.name || 'N/A'}
                </td>
                <td style="padding: 15px; border: 1px solid #ddd; font-size: 15px; color: #333;">
                  ${slot.classroom}
                </td>
                ${timetable.slots.some(s => s.interval_time) ? `
                <td style="padding: 15px; border: 1px solid #ddd; font-size: 15px; color: #333;">
                  ${slot.interval_time ? `${slot.interval_time} min` : '-'}
                </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      `;

      // Append to body temporarily
      document.body.appendChild(printContainer);

      // Convert to canvas with options to avoid color parsing issues
      const canvas = await html2canvas(printContainer, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: false,
        allowTaint: false,
        foreignObjectRendering: false,
        windowWidth: 1200,
        windowHeight: printContainer.scrollHeight || 1000,
        // Remove stylesheets that might contain unsupported color functions
        onclone: (clonedDoc: Document) => {
          // Remove ALL stylesheets from head to avoid parsing lab() colors
          if (clonedDoc.head) {
            const allStyles = clonedDoc.head.querySelectorAll('style, link[rel="stylesheet"]');
            allStyles.forEach((style: Element) => {
              try {
                if (style.parentNode) {
                  style.parentNode.removeChild(style);
                }
              } catch (e) {
                // Ignore errors
              }
            });
          }
          // Remove any inline styles that might reference external styles
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: Element) => {
            // Skip SVG elements as they have read-only className
            if (el instanceof SVGElement) {
              return;
            }
            const htmlEl = el as HTMLElement;
            if (htmlEl.classList && typeof htmlEl.className === 'string') {
              // Remove all classes to prevent CSS inheritance
              htmlEl.className = '';
            }
          });
        },
      } as any);

      // Remove temporary container
      document.body.removeChild(printContainer);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to generate image');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Timetable_${timetable.batch}_${timetable.date.replace(/-/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.message || 'Failed to download timetable');
    }
  };

  const getWeekdayFromDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-base-content">Timetables</h1>
          <p className="text-base-content/70 mt-2">
            Manage class schedules, time slots, and assignments
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline whitespace-nowrap">Create Timetable</span>
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
                  placeholder="Search by batch or weekday..."
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-square btn-primary flex-shrink-0">
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">All Batches</option>
                {uniqueBatches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <input
                type="date"
                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Filter by date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timetables List */}
      <div className="card bg-base-100 border border-base-300 shadow-md">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredTimetables.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">
                No timetables found
              </h3>
              <p className="text-base-content/70 mb-4">
                Create your first timetable to get started
              </p>
              <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="whitespace-nowrap">Create Timetable</span>
              </button>
            </div>
          ) : (
          <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-base-200">
                    <th className="text-base-content font-semibold whitespace-nowrap">Batch</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Date</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Weekday</th>
                    <th className="text-base-content font-semibold whitespace-nowrap">Time Slots</th>
                    <th className="text-base-content font-semibold whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {filteredTimetables.map((timetable) => (
                    <tr key={timetable.id} className="hover">
                      <td>
                        <div className="font-semibold text-base-content">{timetable.batch}</div>
                      </td>
                      <td className="text-base-content whitespace-nowrap">
                        {new Date(timetable.date).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge badge-outline badge-sm whitespace-nowrap">
                          {timetable.weekday}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {timetable.slots.slice(0, 3).map((slot, idx) => (
                            <span
                              key={idx}
                              className="badge badge-primary badge-sm whitespace-nowrap"
                            >
                              {slot.start_time} - {slot.end_time}
                            </span>
                          ))}
                          {timetable.slots.length > 3 && (
                            <span className="badge badge-outline badge-sm whitespace-nowrap">
                              +{timetable.slots.length - 3} more
                            </span>
                          )}
                      </div>
                    </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => openView(timetable)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">View</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                            onClick={() => openEdit(timetable)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => handleDownload(timetable)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Download</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(timetable)}
                            title="Delete"
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
        {/* Pagination Controls */}
        {!loading && filteredTimetables.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={loadData}
            itemName="timetables"
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && modalMode !== "view" && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-300 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-base-content">
              {modalMode === "edit" ? "Edit Timetable" : "Create New Timetable"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Batch *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    placeholder="e.g., 2026"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                    }}
                    required
                  />
                  {formData.date && (
                    <label className="label pt-1">
                      <span className="label-text-alt text-primary font-medium">
                        Weekday: {getWeekdayFromDate(formData.date)}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              <div className="form-control">
                <div className="flex items-center justify-between mb-4">
                  <label className="label pb-0">
                    <span className="label-text font-semibold text-base-content">Time Slots *</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-2 items-center"
                    onClick={addSlot}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="whitespace-nowrap">Add Slot</span>
                  </button>
                </div>

                {formData.slots.length === 0 ? (
                  <div className="alert alert-info">
                    <span>No time slots added. Click "Add Slot" to add one.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.slots.map((slot, index) => (
                      <div
                        key={index}
                        className="card bg-base-200 border border-base-300 p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-base-content">Slot {index + 1}</h4>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={() => removeSlot(index)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text text-sm font-medium text-base-content">
                                Start Time *
                              </span>
                            </label>
                            <input
                              type="time"
                              className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                              value={slot.start_time}
                              onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text text-sm font-medium text-base-content">
                                End Time *
                              </span>
                            </label>
                            <input
                              type="time"
                              className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                              value={slot.end_time}
                              onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text text-sm font-medium text-base-content">
                                Interval (minutes)
                              </span>
                            </label>
                            <input
                              type="number"
                              className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                              placeholder="Optional"
                              min={0}
                              value={slot.interval_time || ""}
                              onChange={(e) =>
                                updateSlot(
                                  index,
                                  "interval_time",
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                            />
                          </div>

                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text text-sm font-medium text-base-content">
                                Module *
                              </span>
                            </label>
                            <select
                              className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                              value={slot.module_id}
                              onChange={(e) => updateSlot(index, "module_id", e.target.value)}
                              required
                            >
                              <option value="">Select Module</option>
                              {modules.map((module) => (
                                <option key={module.id} value={module.id}>
                                  {module.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text text-sm font-medium text-base-content">
                                Staff *
                              </span>
                            </label>
                            <select
                              className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                              value={slot.staff_id}
                              onChange={(e) => updateSlot(index, "staff_id", e.target.value)}
                              required
                            >
                              <option value="">Select Staff</option>
                              {staffs.map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                  {staff.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text text-sm font-medium text-base-content">
                                Classroom/Hall *
                              </span>
                            </label>
                            {classrooms.length > 0 ? (
                              <select
                                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                                value={slot.classroom_id || ""}
                                onChange={(e) => {
                                  const selectedClassroomId = e.target.value;
                                  const selectedClassroom = classrooms.find(
                                    (c) => c.id === selectedClassroomId
                                  );
                                  // Update both classroom_id and classroom in a single operation
                                  const newSlots = [...formData.slots];
                                  newSlots[index] = {
                                    ...newSlots[index],
                                    classroom_id: selectedClassroomId || null,
                                    classroom: selectedClassroom ? selectedClassroom.name : newSlots[index].classroom || "",
                                  };
                                  setFormData({ ...formData, slots: newSlots });
                                }}
                                required
                              >
                                <option value="">Select Classroom/Hall</option>
                                {classrooms.map((classroom) => (
                                  <option key={classroom.id} value={classroom.id}>
                                    {classroom.name} {classroom.capacity ? `(${classroom.capacity} seats)` : ""}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                                placeholder="e.g., Hall A, Room 101"
                                value={slot.classroom}
                                onChange={(e) => updateSlot(index, "classroom", e.target.value)}
                                required
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    {modalMode === "edit" ? "Update Timetable" : "Create Timetable"}
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
        open={modalMode === "view" && !!selectedTimetable}
        title="Timetable"
        subtitle={
          selectedTimetable
            ? `${selectedTimetable.batch} · ${new Date(selectedTimetable.date).toLocaleDateString()}`
            : undefined
        }
        onClose={closeModal}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm min-h-9 h-9 px-4" onClick={closeModal}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm min-h-9 h-9 gap-1.5 px-4"
              onClick={() => selectedTimetable && handleDownload(selectedTimetable)}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm min-h-9 h-9 gap-1.5 px-4"
              onClick={() => {
                if (!selectedTimetable) return;
                closeModal();
                openEdit(selectedTimetable);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        }
      >
        {selectedTimetable && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-base-content/60">Batch</p>
                <p className="text-sm font-medium text-base-content">{selectedTimetable.batch}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Date</p>
                <p className="text-sm font-medium text-base-content">
                  {new Date(selectedTimetable.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Weekday</p>
                <p className="text-sm font-medium text-base-content">{selectedTimetable.weekday}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Slots</p>
                <p className="text-sm font-medium text-base-content">{selectedTimetable.slots.length}</p>
              </div>
            </div>

            <RecordDetailSectionTitle>Time slots</RecordDetailSectionTitle>
            <div className="space-y-2">
              {selectedTimetable.slots
                .slice()
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((slot, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="font-medium text-base-content">
                        {slot.start_time} – {slot.end_time}
                      </span>
                      {slot.interval_time ? (
                        <span className="badge badge-ghost badge-xs">+{slot.interval_time}m</span>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-1.5 text-xs text-base-content/80 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{slot.module?.name || "Unknown module"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{slot.staff?.name || "Unknown staff"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{slot.classroom}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete timetable?"
        description={
          <>
            Batch <span className="font-medium text-base-content">{deleteTarget?.batch}</span>
            {" · "}
            <span className="font-medium text-base-content">
              {deleteTarget ? new Date(deleteTarget.date).toLocaleDateString() : ""}
            </span>
            . This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
