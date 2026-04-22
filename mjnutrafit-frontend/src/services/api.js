const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

class ApiService {
  getAuthToken() {
    return localStorage.getItem("token");
  }

  async request(endpoint, options = {}) {
    const token = this.getAuthToken();
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText || "An error occurred",
      }));
      const msg = error.message || error.emailOrPassword || (Array.isArray(error.errors) && typeof error.errors[0] === "string" ? error.errors[0] : null);
      throw new Error(msg || "Request failed");
    }

    return response.json();
  }

  async register(data) {
    return this.request("/users/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data) {
    return this.request("/users/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser() {
    return this.request("/users/currentUser", {
      method: "GET",
    });
  }

  async getClientProfile() {
    return this.request("/users/client-profile", { method: "GET" });
  }

  async submitClientProfile(data) {
    return this.request("/users/client-profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken, userId, email) {
    return this.request("/auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({
        id: userId,
        email,
        refreshToken,
      }),
    });
  }

  async updateProfile(data) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request("/users/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append("profilePicture", file);
    
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/users/upload-picture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText || "An error occurred",
      }));
      throw new Error(error.message || "Upload failed");
    }

    return response.json();
  }

  async getPlans(clientId) {
    const q =
      clientId != null && clientId !== ""
        ? `?clientId=${encodeURIComponent(String(clientId))}`
        : "";
    return this.request(`/plans${q}`, { method: "GET" });
  }

  async getCurrentPlan() {
    return this.request("/plans/current", { method: "GET" });
  }

  async createPlan(data) {
    return this.request("/plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePlan(id, data) {
    return this.request(`/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async submitProgressLog(data) {
    const body =
      data && typeof data === "object" && data.logDate == null && data.weekStartDate != null
        ? { ...data, logDate: data.weekStartDate }
        : data;
    return this.request("/progress", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getProgressForDay(logDate) {
    const q = new URLSearchParams({ logDate });
    return this.request(`/progress/day?${q.toString()}`, { method: "GET" });
  }

  async getProgressForWeek(weekStartDate) {
    return this.getProgressForDay(weekStartDate);
  }

  async getProgressLogs(clientId) {
    const q =
      clientId != null && clientId !== ""
        ? `?clientId=${encodeURIComponent(String(clientId))}`
        : "";
    return this.request(`/progress${q}`, { method: "GET" });
  }

  async getProgressLogById(id) {
    return this.request(`/progress/${id}`, { method: "GET" });
  }

  async getPendingClients() {
    return this.request("/coach/pending-clients", { method: "GET" });
  }

  async approveClient(clientId) {
    return this.request(`/coach/approve-client/${clientId}`, {
      method: "POST",
    });
  }

  async rejectClient(clientId) {
    return this.request(`/coach/reject-client/${clientId}`, {
      method: "POST",
    });
  }

  async getAssignedClients() {
    return this.request("/coach/assigned-clients", { method: "GET" });
  }

  async getMyClients() {
    return this.request("/coach/my-clients", { method: "GET" });
  }

  async getCoachAdherenceOverview() {
    return this.request("/coach/adherence-overview", { method: "GET" });
  }

  async reviewProgressLog(logId, action, feedback) {
    return this.request(`/coach/review-log/${logId}`, {
      method: "POST",
      body: JSON.stringify({ action, feedback }),
    });
  }

  async getClientDashboard() {
    return this.request("/dashboard/client", { method: "GET" });
  }

  async getCoachDashboard() {
    return this.request("/dashboard/coach", { method: "GET" });
  }

  async aiCoachChat({ message, sessionId }) {
    return this.request("/ai-coach/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: sessionId || undefined,
      }),
    });
  }
}

export const apiService = new ApiService();
