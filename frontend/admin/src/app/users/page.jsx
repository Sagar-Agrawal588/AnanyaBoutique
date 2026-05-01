"use client";

import { useAdmin } from "@/context/AdminContext";
import {
  MANAGER_PERMISSION_OPTIONS,
  hasAdminPermission,
  normalizeManagerPermissions,
} from "@/utils/adminPermissions";
import { deleteData, getData, postData, putData } from "@/utils/api";
import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { RiVipCrownLine } from "react-icons/ri";

const MANAGER_PERMISSION_LABEL_MAP = MANAGER_PERMISSION_OPTIONS.reduce(
  (acc, option) => {
    acc[option.key] = option.label;
    return acc;
  },
  {},
);

export default function UserManagement() {
  const { token, isAuthenticated, loading, admin } = useAdmin();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(""); // role, status, delete, permissions
  const [selectedRole, setSelectedRole] = useState("User");
  const [selectedManagerPermissions, setSelectedManagerPermissions] = useState(
    [],
  );
  const [actionLoading, setActionLoading] = useState(false);

  const isAdminUser = String(admin?.role || "").trim() === "Admin";
  const canManageUsers = hasAdminPermission(admin, "manage_users");
  const canManageMembership = hasAdminPermission(admin, "manage_membership");

  const getManagerPermissionLabels = (permissions = []) =>
    normalizeManagerPermissions(permissions).map(
      (key) => MANAGER_PERMISSION_LABEL_MAP[key] || key,
    );

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({
        page: String(pagination.page + 1),
        limit: String(pagination.limit),
        search,
        role: roleFilter,
        includeCoinSummary: "1",
      });

      const response = await getData(`/api/user/admin/users?${params}`, token);

      if (response.success) {
        setUsers(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: Number(response.pagination?.total || 0),
        }));
      } else {
        setUsers([]);
        setLoadError(response.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setLoadError(error?.message || "Failed to fetch users");
    }
    setIsLoading(false);
  }, [pagination.page, pagination.limit, roleFilter, search, token]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUsers();
    }
  }, [isAuthenticated, token, fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleChangePage = (event, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    setPagination((prev) => ({
      ...prev,
      limit: Number.parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  const openDialog = (user, type) => {
    setSelectedUser(user);
    setDialogType(type);
    setSelectedRole(user?.role || "User");
    setSelectedManagerPermissions(
      normalizeManagerPermissions(user?.managerPermissions),
    );
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setDialogType("");
    setSelectedRole("User");
    setSelectedManagerPermissions([]);
    setDialogOpen(false);
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await putData(
        `/api/user/admin/users/${selectedUser._id}/role`,
        { role: newRole },
        token,
      );

      if (response.success) {
        await fetchUsers();
        closeDialog();
      } else {
        alert(response.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role");
    }

    setActionLoading(false);
  };

  const toggleManagerPermission = (permissionKey) => {
    setSelectedManagerPermissions((prev) => {
      if (prev.includes(permissionKey)) {
        return prev.filter((key) => key !== permissionKey);
      }
      return [...prev, permissionKey];
    });
  };

  const handleManagerPermissionsSave = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await putData(
        `/api/user/admin/users/${selectedUser._id}/manager-permissions`,
        { permissions: selectedManagerPermissions },
        token,
      );

      if (response.success) {
        await fetchUsers();
        closeDialog();
      } else {
        alert(response.message || "Failed to update manager permissions");
      }
    } catch (error) {
      console.error("Failed to update manager permissions:", error);
      alert("Failed to update manager permissions");
    }

    setActionLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await putData(
        `/api/user/admin/users/${selectedUser._id}/status`,
        { status: newStatus },
        token,
      );

      if (response.success) {
        await fetchUsers();
        closeDialog();
      } else {
        alert(response.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    }

    setActionLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await deleteData(
        `/api/user/admin/users/${selectedUser._id}`,
        token,
      );

      if (response.success) {
        await fetchUsers();
        closeDialog();
      } else {
        alert(response.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }

    setActionLoading(false);
  };

  const handleConvertToMember = async (user) => {
    if (!user?._id) return;
    const shouldConvert = window.confirm(
      `Convert ${user.name} into membership user for 365 days?`,
    );
    if (!shouldConvert) return;

    setActionLoading(true);
    try {
      const response = await postData(
        "/api/admin/membership-users/convert",
        { userId: user._id, days: 365 },
        token,
      );

      if (response.success) {
        await fetchUsers();
        alert(response.message || "User converted to member successfully");
      } else {
        alert(response.message || "Failed to convert user to member");
      }
    } catch (error) {
      console.error("Failed to convert user to member:", error);
      alert("Failed to convert user to member");
    }
    setActionLoading(false);
  };

  const getRoleChip = (role) => {
    if (role === "Admin") {
      return (
        <Chip
          icon={<MdOutlineAdminPanelSettings />}
          label="Admin"
          color="primary"
          size="small"
        />
      );
    }
    if (role === "Manager") {
      return (
        <Chip
          icon={<FiShield />}
          label="Manager"
          color="secondary"
          size="small"
        />
      );
    }
    return <Chip icon={<FiUser />} label="User" color="default" size="small" />;
  };

  const getStatusChip = (status) => {
    const colors = {
      active: "success",
      inactive: "warning",
      Suspended: "error",
    };
    return (
      <Chip label={status} color={colors[status] || "default"} size="small" />
    );
  };

  const isActiveMember = (user) => Boolean(user?.isMember);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h1>
          <p className="text-gray-600">
            Your account does not have permission to manage users. Ask an Admin
            to grant the <strong>User management</strong> permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          User Management
        </h1>
        <p className="text-gray-600">Manage user roles and permissions</p>
        {isAdminUser ? (
          <p className="text-xs text-gray-500 mt-1">
            To grant Manager advanced modules, use the{" "}
            <strong>Set Permissions</strong>
            button in the <strong>Manager Access</strong> column.
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap gap-4 items-end"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div className="w-[150px]">
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="User">User</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
              </Select>
            </FormControl>
          </div>

          <Button type="submit" variant="contained" color="primary">
            Search
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow className="bg-gray-50">
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Coins</TableCell>
                <TableCell>Membership Status</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Manager Access</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" className="py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    className="py-8 text-red-600"
                  >
                    {loadError}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    className="py-8 text-gray-500"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const managerPermissionLabels = getManagerPermissionLabels(
                    user?.managerPermissions,
                  );

                  return (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar} alt={user.name}>
                            {user.name?.[0]?.toUpperCase()}
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleChip(user.role)}</TableCell>
                      <TableCell>{getStatusChip(user.status)}</TableCell>
                      <TableCell>{Number(user.coinBalance || 0)}</TableCell>
                      <TableCell>
                        {isActiveMember(user) ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                            <RiVipCrownLine />
                            Member
                          </span>
                        ) : (
                          <span className="text-gray-500">Normal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.provider || "email"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.role === "Manager" ? (
                          <div className="max-w-[260px]">
                            <p className="text-xs text-gray-700 leading-5">
                              {managerPermissionLabels.length
                                ? managerPermissionLabels.join(", ")
                                : "No advanced permissions assigned"}
                            </p>
                            {isAdminUser ? (
                              <Button
                                size="small"
                                variant="outlined"
                                className="!mt-2"
                                onClick={() => openDialog(user, "permissions")}
                              >
                                Set Permissions
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex justify-end gap-1">
                          {isAdminUser ? (
                            <Tooltip title="Change Role">
                              <IconButton
                                size="small"
                                color={
                                  user.role === "Admin" ? "warning" : "primary"
                                }
                                onClick={() => openDialog(user, "role")}
                              >
                                {user.role === "Admin" ? (
                                  <FiUserX />
                                ) : (
                                  <FiShield />
                                )}
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          {canManageUsers ? (
                            <Tooltip title="Change Status">
                              <IconButton
                                size="small"
                                color={
                                  user.status === "active"
                                    ? "success"
                                    : "warning"
                                }
                                onClick={() => openDialog(user, "status")}
                              >
                                <FiUserCheck />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          {canManageUsers ? (
                            <Tooltip title="Delete User">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openDialog(user, "delete")}
                              >
                                <FiTrash2 />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          {canManageMembership &&
                          !["Admin", "Manager"].includes(user.role) ? (
                            <Tooltip title="Convert to Member">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleConvertToMember(user)}
                                disabled={actionLoading}
                              >
                                <RiVipCrownLine />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </div>

      <Dialog open={dialogOpen && dialogType === "role"} onClose={closeDialog}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <p className="mb-4">
            Change role for <strong>{selectedUser?.name}</strong> (
            {selectedUser?.email})?
          </p>
          <p className="text-sm text-gray-600">
            Current role: <strong>{selectedUser?.role}</strong>
          </p>
          <FormControl fullWidth className="mt-4">
            <InputLabel>New Role</InputLabel>
            <Select
              value={selectedRole}
              label="New Role"
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={actionLoading}
            >
              <MenuItem value="User">User</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => handleRoleChange(selectedRole)}
            variant="contained"
            color="primary"
            disabled={actionLoading || !selectedRole}
          >
            {actionLoading ? "Updating..." : "Save Role"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen && dialogType === "status"}
        onClose={closeDialog}
      >
        <DialogTitle>Change User Status</DialogTitle>
        <DialogContent>
          <p className="mb-4">
            Change status for <strong>{selectedUser?.name}</strong>?
          </p>
          <FormControl fullWidth className="mt-4">
            <InputLabel>New Status</InputLabel>
            <Select
              defaultValue={selectedUser?.status || "active"}
              label="New Status"
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={actionLoading}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="Suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={actionLoading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen && dialogType === "permissions"}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manager Permissions</DialogTitle>
        <DialogContent>
          <p className="mb-4">
            Select advanced modules <strong>{selectedUser?.name}</strong> can
            access.
          </p>
          <FormGroup>
            {MANAGER_PERMISSION_OPTIONS.map((option) => (
              <FormControlLabel
                key={option.key}
                control={
                  <Checkbox
                    checked={selectedManagerPermissions.includes(option.key)}
                    onChange={() => toggleManagerPermission(option.key)}
                    disabled={actionLoading}
                  />
                }
                label={
                  <span>
                    <span className="font-medium text-gray-900">
                      {option.label}
                    </span>
                    <span className="block text-xs text-gray-600">
                      {option.description}
                    </span>
                  </span>
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleManagerPermissionsSave}
            variant="contained"
            color="secondary"
            disabled={actionLoading}
          >
            {actionLoading ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen && dialogType === "delete"}
        onClose={closeDialog}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedUser?.name}</strong>?
          </p>
          <p className="text-sm text-red-600 mt-2">
            This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={actionLoading}
          >
            {actionLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
