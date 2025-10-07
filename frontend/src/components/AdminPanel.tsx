import React, { useState, useEffect } from "react";
import { AuthService } from "../services/auth";
import "./AdminPanel.css";

interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  expense_count: number;
}

interface AdminStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_with_expense_data: number;
}

interface EditingUser {
  id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = AuthService.getAuthHeaders();

      // Fetch users
      const usersResponse = await fetch(`${API_BASE}/admin/users`, { headers });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      } else {
        setMessage("Failed to load users - Admin access required");
      }

      // Fetch stats
      const statsResponse = await fetch(`${API_BASE}/admin/stats`, { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      setMessage("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const endpoint = currentStatus ? "deactivate" : "activate";
      const headers = AuthService.getAuthHeaders();

      const response = await fetch(
        `${API_BASE}/admin/users/${userId}/${endpoint}`,
        {
          method: "POST",
          headers,
        }
      );

      if (response.ok) {
        setMessage(
          `User ${currentStatus ? "deactivated" : "activated"} successfully`
        );
        fetchData();
      } else {
        setMessage("Failed to update user status");
      }
    } catch (error) {
      setMessage("Error updating user status");
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete user ${email}? This will delete ALL their data permanently!`
      )
    ) {
      return;
    }

    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setMessage("User deleted successfully");
        fetchData();
      } else {
        setMessage("Failed to delete user");
      }
    } catch (error) {
      setMessage("Error deleting user");
    }
  };

  const startEdit = (user: User) => {
    setEditingUser({
      id: user.id,
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
    });
  };

  const saveUser = async () => {
    if (!editingUser) return;

    try {
      const headers = {
        ...AuthService.getAuthHeaders(),
        "Content-Type": "application/json",
      };

      const updateData: any = {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        is_active: editingUser.is_active,
      };

      if (editingUser.password) {
        updateData.password = editingUser.password;
      }

      const response = await fetch(
        `${API_BASE}/admin/users/${editingUser.id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updateData),
        }
      );

      if (response.ok) {
        setMessage("User updated successfully");
        setEditingUser(null);
        fetchData();
      } else {
        const error = await response.json();
        setMessage(error.detail || "Failed to update user");
      }
    } catch (error) {
      setMessage("Error updating user");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return <div className="admin-loading">🔧 Loading Admin Dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>�️ Super Admin Dashboard</h1>
        <p>Complete user management and system control</p>
      </div>

      {message && (
        <div
          className={`admin-message ${
            message.includes("Failed") || message.includes("Error")
              ? "error"
              : "success"
          }`}
        >
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {/* Statistics Dashboard */}
      {stats && (
        <div className="stats-dashboard">
          <h2>📊 System Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-number">{stats.total_users}</div>
                <div className="stat-label">Total Users</div>
              </div>
            </div>
            <div className="stat-card active">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-number">{stats.active_users}</div>
                <div className="stat-label">Active Users</div>
              </div>
            </div>
            <div className="stat-card inactive">
              <div className="stat-icon">⏸️</div>
              <div className="stat-info">
                <div className="stat-number">{stats.inactive_users}</div>
                <div className="stat-label">Inactive Users</div>
              </div>
            </div>
            <div className="stat-card data">
              <div className="stat-icon">💾</div>
              <div className="stat-info">
                <div className="stat-number">
                  {stats.users_with_expense_data}
                </div>
                <div className="stat-label">Users with Data</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Section */}
      <div className="users-management">
        <div className="section-header">
          <h2>👥 User Management ({filteredUsers.length})</h2>
          <div className="controls">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button
              onClick={() => setShowPasswords(!showPasswords)}
              className={`toggle-passwords ${showPasswords ? "active" : ""}`}
            >
              {showPasswords ? "🔒 Hide Passwords" : "👁️ Show Passwords"}
            </button>
          </div>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User Info</th>
                <th>Authentication</th>
                <th>Status & Role</th>
                <th>Activity</th>
                <th>Data</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={!user.is_active ? "inactive-user" : ""}
                >
                  <td>
                    <div className="user-info">
                      <div className="user-name">{user.username}</div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-id">
                        ID: {user.id.substring(0, 8)}...
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="auth-info">
                      <div className="password-row">
                        <strong>Password Hash:</strong>
                        <div className="password-display">
                          {showPasswords ? (
                            <code className="password-hash">
                              {user.password_hash}
                            </code>
                          ) : (
                            <span className="password-hidden">
                              ••••••••••••••••
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="status-info">
                      <span
                        className={`status-badge ${
                          user.is_active ? "active" : "inactive"
                        }`}
                      >
                        {user.is_active ? "✅ Active" : "⏸️ Inactive"}
                      </span>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === "super_admin"
                          ? "👑 Super Admin"
                          : user.role === "admin"
                          ? "🛡️ Admin"
                          : "👤 User"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="activity-info">
                      <div>
                        <strong>Created:</strong>{" "}
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Last Login:</strong>{" "}
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : "Never"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="data-info">
                      <div className="expense-count">
                        📊 {user.expense_count} expenses
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => startEdit(user)}
                        className="btn-edit"
                        title="Edit User"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() =>
                          toggleUserStatus(user.id, user.is_active)
                        }
                        className={`btn-toggle ${
                          user.is_active ? "deactivate" : "activate"
                        }`}
                        title={
                          user.is_active ? "Deactivate User" : "Activate User"
                        }
                      >
                        {user.is_active ? "⏸️ Deactivate" : "▶️ Activate"}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="btn-delete"
                        title="Delete User"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3>✏️ Edit User: {editingUser.email}</h3>
            <div className="edit-form">
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>New Password (leave empty to keep current):</label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  placeholder="Enter new password or leave empty"
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value })
                  }
                >
                  <option value="user">👤 User</option>
                  <option value="admin">🛡️ Admin</option>
                  <option value="super_admin">👑 Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  Account Active
                </label>
              </div>
              <div className="modal-actions">
                <button onClick={saveUser} className="btn-save">
                  💾 Save Changes
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="btn-cancel"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
