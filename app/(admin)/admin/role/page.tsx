"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { Role, Permission } from "@/app/types/role";
import { rolesApi } from "@/app/lib/api";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";

const allPermissions: Permission[] = [
  "dashboard",
  "attendance",
  "modules",
  "students",
  "staffs",
  "timetables",
  "questionbank",
  "payments",
  "salary_payroll",
  "reports",
  "photo_library",
  "role",
  "notes",
];

const permissionLabels: Record<Permission, string> = {
  dashboard: "Dashboard",
  attendance: "Attendance",
  modules: "Modules",
  students: "Students",
  staffs: "Staffs",
  timetables: "Time Tables",
  questionbank: "Question Bank",
  payments: "Payments",
  salary_payroll: "Salary & Payroll",
  reports: "Reports",
  photo_library: "Drive & website gallery",
  role: "Role",
  notes: "Notes",
};

export default function RolePage() {
  const { isSuperAdmin, refreshUser } = useAuth();
  const { showNotice } = useAppNotice();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await rolesApi.getAll();
      const formattedRoles: Role[] = response.roles.map((r: any) => ({
        id: r.id.toString(),
        name: r.name,
        permissions: r.permissions || [],
        isSuperAdmin: r.isSuperAdmin || false,
      }));
      setRoles(formattedRoles);
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    permissions: [] as Permission[],
  });

  if (!isSuperAdmin()) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only Super Admins can manage roles and permissions.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        permissions: [...role.permissions],
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: "",
        permissions: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData({
      name: "",
      permissions: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, {
          name: formData.name,
          description: "",
          permissions: formData.permissions,
        });
      } else {
        await rolesApi.create({
          name: formData.name,
          description: "",
          permissions: formData.permissions,
        });
      }
      await loadRoles();
      await refreshUser(); // Refresh user to get updated permissions
      handleCloseModal();
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to save role",
        variant: "error",
      });
    }
  };

  const confirmDeleteRole = async () => {
    if (!deleteRole) return;
    try {
      await rolesApi.delete(deleteRole.id);
      await loadRoles();
      setDeleteRole(null);
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to delete role",
        variant: "error",
      });
    }
  };

  const togglePermission = (permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage roles and their permissions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary gap-2 items-center px-6"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline whitespace-nowrap">Add Role</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="card bg-card border border-border shadow-md overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-foreground font-semibold whitespace-nowrap">Role Name</th>
                    <th className="text-foreground font-semibold whitespace-nowrap">Permissions</th>
                    <th className="text-foreground font-semibold whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                  <tr key={role.id} className="hover">
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="font-semibold text-foreground truncate">{role.name}</span>
                        {role.isSuperAdmin && (
                          <span className="badge badge-primary badge-sm flex-shrink-0 whitespace-nowrap">
                            Super Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1 max-w-[400px]">
                        {role.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="badge badge-outline badge-sm whitespace-nowrap"
                          >
                            {permissionLabels[perm]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {!role.isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenModal(role)}
                              className="btn btn-primary btn-sm gap-1.5 items-center px-3"
                              title="Edit Role"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="hidden sm:inline whitespace-nowrap">Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteRole(role)}
                              className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                              title="Delete Role"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline whitespace-nowrap">Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-card border border-border w-full max-w-2xl mx-4">
            <h3>{editingRole ? "Edit Role" : "Create New Role"}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="admin-form-section space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-foreground">Role Name</span>
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
                  <span className="label-text font-semibold text-foreground">Permissions</span>
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allPermissions.map((permission) => (
                    <label
                      key={permission}
                      className="label cursor-pointer justify-start gap-3"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={formData.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                      />
                      <span className="label-text">
                        {permissionLabels[permission]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost gap-2 px-6"
                >
                  <span className="whitespace-nowrap">Cancel</span>
                </button>
                <button type="submit" className="btn btn-primary gap-2 px-6 items-center">
                  <span className="whitespace-nowrap">
                    {editingRole ? "Update" : "Create"}
                  </span>
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={handleCloseModal}>
            <button>close</button>
          </form>
        </dialog>
      )}

      <ConfirmDialog
        open={!!deleteRole}
        title="Delete role?"
        description={
          <>
            <span className="font-medium text-foreground">{deleteRole?.name}</span> — assigned users
            may lose access. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteRole(null)}
        onConfirm={confirmDeleteRole}
      />
    </div>
  );
}
