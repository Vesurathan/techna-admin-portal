"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { modulesApi, staffsApi } from "@/app/lib/api";
import { Module, ModuleCategory, Staff } from "@/app/types/module";

type ModalMode = "create" | "edit" | "view" | null;

const categoryOptions: { value: ModuleCategory; label: string }[] = [
  { value: "main", label: "Main Subject" },
  { value: "compulsory", label: "Compulsory Subject" },
  { value: "basket", label: "Basket Subject" },
];

import { formatCurrency } from "@/app/utils/currency";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import Pagination from "@/app/components/Pagination";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";

export default function ModulesPage() {
  const getErrorMessage = (error: unknown) => {
    if (error && typeof error === "object" && "message" in error) {
      const msg = (error as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    return "Something went wrong";
  };

  const { showNotice } = useAppNotice();
  const [modules, setModules] = useState<Module[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);
  const [search, setSearch] = useState("");
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

  const [formData, setFormData] = useState({
    name: "",
    category: "main" as ModuleCategory,
    subModulesCount: 0,
    subModules: [] as Array<{ id?: string; name: string; sortOrder: number }>,
    amount: 0,
    staffIds: [] as string[],
  });

  const filteredModules = useMemo(() => {
    if (!search.trim()) return modules;
    return modules.filter((module) =>
      module.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [modules, search]);

  const loadData = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const [modulesRes, staffsRes] = await Promise.all([
        modulesApi.getAll(page),
        staffsApi.getAll(1, true), // Get all staff for module assignment
      ]);

      // Update pagination state
      if (modulesRes.pagination) {
        setPagination(modulesRes.pagination);
        setCurrentPage(modulesRes.pagination.current_page);
      }

      const mappedModules: Module[] = (modulesRes.modules as unknown[]).map((raw) => {
        const m = raw as Record<string, unknown>;
        const subModulesRaw = (m.sub_modules as unknown[]) ?? [];
        const staffsRaw = (m.staffs as unknown[]) ?? [];

        return {
          id: String(m.id ?? ""),
          name: String(m.name ?? ""),
          category: m.category as ModuleCategory,
          subModulesCount: Number(m.sub_modules_count ?? (m as { subModulesCount?: unknown }).subModulesCount ?? 0),
          subModules: subModulesRaw.map((smRaw) => {
            const sm = smRaw as Record<string, unknown>;
            return {
              id: String(sm.id ?? ""),
              name: String(sm.name ?? ""),
              sortOrder: Number(sm.sort_order ?? (sm as { sortOrder?: unknown }).sortOrder ?? 0),
            };
          }),
          amount: Number(m.amount ?? 0),
          staffs: staffsRaw.map((sRaw) => {
            const s = sRaw as Record<string, unknown>;
            const firstName = String(s.first_name ?? (s as { firstName?: unknown }).firstName ?? "");
            const lastName = String(s.last_name ?? (s as { lastName?: unknown }).lastName ?? "");
            const fullName =
              String(s.full_name ?? (s as { fullName?: unknown }).fullName ?? "").trim() ||
              `${firstName} ${lastName}`.trim() ||
              String(s.name ?? "Unknown");

            return {
              id: String(s.id ?? ""),
              name: fullName,
              email: String(s.email ?? ""),
              department: (s.department as string | null | undefined) ?? null,
              phone: (s.phone as string | null | undefined) ?? ((s as { secondary_phone?: unknown }).secondary_phone as string | null | undefined) ?? null,
            };
          }),
        };
      });

      const mappedStaffs: Staff[] = (staffsRes.staffs as unknown[]).map((sRaw) => {
        const s = sRaw as Record<string, unknown>;
        const firstName = String(s.first_name ?? (s as { firstName?: unknown }).firstName ?? "");
        const lastName = String(s.last_name ?? (s as { lastName?: unknown }).lastName ?? "");
        const fullName =
          String(s.full_name ?? (s as { fullName?: unknown }).fullName ?? "").trim() ||
          `${firstName} ${lastName}`.trim() ||
          String(s.name ?? "Unknown");
        return {
          id: String(s.id ?? ""),
          name: fullName,
          email: String(s.email ?? ""),
          department: (s.department as string | null | undefined) ?? null,
          phone: (s.phone as string | null | undefined) ?? ((s as { secondary_phone?: unknown }).secondary_phone as string | null | undefined) ?? null,
        };
      });

      setModules(mappedModules);
      setStaffs(mappedStaffs);
    } catch (error) {
      console.error("Failed to load modules/staffs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const openCreate = () => {
    setSelectedModule(null);
    setFormData({
      name: "",
      category: "main",
      subModulesCount: 0,
      subModules: [],
      amount: 0,
      staffIds: [],
    });
    setModalMode("create");
  };

  const openEdit = (module: Module) => {
    setSelectedModule(module);
    setFormData({
      name: module.name,
      category: module.category,
      subModulesCount: module.subModulesCount,
      subModules: (module.subModules || []).map((sm) => ({
        id: sm.id,
        name: sm.name,
        sortOrder: sm.sortOrder,
      })),
      amount: module.amount,
      staffIds: module.staffs.map((s) => s.id),
    });
    setModalMode("edit");
  };

  const openView = (module: Module) => {
    setSelectedModule(module);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedModule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const normalizedSubModules = formData.subModules
        .map((sm) => ({
          id: sm.id ? parseInt(sm.id, 10) : undefined,
          name: sm.name.trim(),
          sort_order: Number(sm.sortOrder ?? 0),
        }))
        .filter((sm) => sm.name !== "");

      const payload = {
        name: formData.name,
        category: formData.category,
        sub_modules_count:
          normalizedSubModules.length > 0 ? normalizedSubModules.length : Number(formData.subModulesCount),
        amount: Number(formData.amount),
        staff_ids: formData.staffIds.map((id) => parseInt(id, 10)),
        sub_modules: normalizedSubModules.length > 0 ? normalizedSubModules : undefined,
      };

      if (modalMode === "edit" && selectedModule) {
        await modulesApi.update(selectedModule.id, payload);
      } else {
        await modulesApi.create(payload);
      }

      await loadData(currentPage);
      closeModal();
    } catch (error: unknown) {
      showNotice({
        message: getErrorMessage(error) || "Failed to save module",
        variant: "error",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await modulesApi.delete(deleteTarget.id);
      await loadData(currentPage);
      setDeleteTarget(null);
    } catch (error: unknown) {
      showNotice({
        message: getErrorMessage(error) || "Failed to delete module",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground mt-2">
            Create modules first, then assign staff when adding or editing staff
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          <button className="btn btn-outline btn-sm gap-2 items-center">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline whitespace-nowrap">Add Module</span>
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
                  placeholder="Search modules..."
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

      {/* Modules Table */}
      <div className="card bg-card border border-border shadow-md overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No modules found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first module to get started
              </p>
              <button className="btn btn-primary gap-2 items-center px-6" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="whitespace-nowrap">Add Module</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-foreground font-semibold whitespace-nowrap">Module</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Category</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Sub Modules</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Amount</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Staffs</th>
                    <th className="text-foreground font-semibold whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map((module) => (
                    <tr key={module.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {module.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: MOD-{module.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-outline badge-sm whitespace-nowrap">
                          {categoryOptions.find((c) => c.value === module.category)
                            ?.label || module.category}
                        </span>
                      </td>
                      <td className="text-foreground font-semibold whitespace-nowrap">
                        {module.subModulesCount}
                      </td>
                      <td className="text-foreground font-semibold whitespace-nowrap">
                        {formatCurrency(module.amount)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {module.staffs.length === 0 ? (
                            <span className="text-muted-foreground text-sm">
                              No staff assigned
                            </span>
                          ) : (
                            module.staffs.map((staff) => (
                              <span
                                key={staff.id}
                                className="badge badge-primary badge-sm whitespace-nowrap"
                              >
                                {staff.name?.split(" ")[0] || "Unknown"}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => openView(module)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">View</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                            onClick={() => openEdit(module)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(module)}
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
        {!loading && filteredModules.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={loadData}
            itemName="modules"
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && modalMode !== "view" && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-card border border-border max-w-2xl w-full mx-4">
            <h3>{modalMode === "edit" ? "Edit Module" : "Create New Module"}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="admin-form-section space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Module Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Category</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as ModuleCategory,
                      })
                    }
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">
                      No. of Sub Modules
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={formData.subModulesCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subModulesCount: Number(e.target.value),
                      })
                    }
                    min={0}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Amount</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: Number(e.target.value),
                      })
                    }
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-foreground">
                    Sub modules <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                </label>

                <div className="space-y-2">
                  {formData.subModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sub modules added. You can still use the count field above, or add a real list here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {formData.subModules.map((sm, idx) => (
                        <div
                          key={sm.id ?? `new-${idx}`}
                          className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 items-center"
                        >
                          <input
                            type="text"
                            className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                            placeholder={`Sub module ${idx + 1} name`}
                            value={sm.name}
                            onChange={(e) => {
                              const next = [...formData.subModules];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setFormData({ ...formData, subModules: next });
                            }}
                          />
                          <input
                            type="number"
                            className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                            placeholder="Sort order"
                            value={sm.sortOrder}
                            min={0}
                            onChange={(e) => {
                              const next = [...formData.subModules];
                              next[idx] = { ...next[idx], sortOrder: Number(e.target.value) };
                              setFormData({ ...formData, subModules: next });
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm px-3"
                            onClick={() => {
                              const next = formData.subModules.filter((_, i) => i !== idx);
                              setFormData({ ...formData, subModules: next });
                            }}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm gap-2"
                      onClick={() => {
                        const nextOrder =
                          formData.subModules.length === 0
                            ? 1
                            : Math.max(...formData.subModules.map((x) => Number(x.sortOrder ?? 0))) + 1;
                        setFormData({
                          ...formData,
                          subModules: [...formData.subModules, { name: "", sortOrder: nextOrder }],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add sub module
                    </button>
                  </div>
                </div>

                <label className="label pt-1">
                  <span className="label-text-alt text-muted-foreground">
                    If you add sub modules here, the backend will automatically set{" "}
                    <strong>sub module count</strong> to match this list.
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-foreground">
                    Assigned staff <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                </label>
                {staffs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No staff yet. Save the module without staff—you can assign teachers from{" "}
                    <strong>Staff</strong> after you add them.
                  </p>
                ) : (
                  <>
                    <select
                      multiple
                      className="select select-bordered w-full h-32 border-border focus:border-primary focus:outline-none"
                      value={formData.staffIds}
                      onChange={(e) => {
                        const values = Array.from(
                          e.target.selectedOptions
                        ).map((option) => option.value);
                        setFormData({ ...formData, staffIds: values });
                      }}
                    >
                      {staffs.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name || "Unknown"} {staff.department ? `- ${staff.department}` : ""}
                        </option>
                      ))}
                    </select>
                    <label className="label pt-1">
                      <span className="label-text-alt text-muted-foreground">
                        Optional. You can also assign modules when creating or editing a staff member.
                        Hold Ctrl/Cmd to select multiple.
                      </span>
                    </label>
                  </>
                )}
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
                    {modalMode === "edit" ? "Update Module" : "Create Module"}
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
        open={modalMode === "view" && !!selectedModule}
        title="Module"
        subtitle={selectedModule?.name}
        onClose={closeModal}
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm min-h-9 h-9 px-4" onClick={closeModal}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm min-h-9 h-9 gap-1.5 px-4"
              onClick={() => {
                if (!selectedModule) return;
                closeModal();
                openEdit(selectedModule);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        }
      >
        {selectedModule && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium text-foreground">
                  {categoryOptions.find((c) => c.value === selectedModule.category)?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sub-modules</p>
                <p className="text-sm font-medium text-foreground">{selectedModule.subModulesCount}</p>
              </div>
              {selectedModule.subModules && selectedModule.subModules.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Sub module list</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedModule.subModules
                      .slice()
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((sm) => (
                        <span key={sm.id} className="badge badge-outline badge-sm">
                          {sm.name}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-medium text-foreground">{formatCurrency(selectedModule.amount)}</p>
              </div>
            </div>

            <div>
              <RecordDetailSectionTitle>Assigned staff</RecordDetailSectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {selectedModule.staffs.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No staff assigned</span>
                ) : (
                  selectedModule.staffs.map((staff) => (
                    <span key={staff.id} className="badge badge-primary badge-sm">
                      {staff.name || "Unknown"}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete module?"
        description={
          <>
            Remove <span className="font-medium text-foreground">{deleteTarget?.name}</span>. This
            cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
