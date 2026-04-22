import { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "@/services/api";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [firstName, setFirstName] = useState(null);
  const [lastName, setLastName] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const user = await apiService.getCurrentUser();
          if (mounted) {
            setIsAuthenticated(true);
            setUserEmail(user.email);
            setFirstName(user.firstName);
            setLastName(user.lastName);
            setUserId(user.id);
            setUserRole(user.role);
            setUserStatus(user.status);
            setProfilePicture(user.profilePicture ?? null);
          }
        } catch (error) {
          if (mounted) {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("firstName");
            localStorage.removeItem("lastName");
            localStorage.removeItem("userId");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userStatus");
            localStorage.removeItem("profilePicture");
          }
        }
      }
      if (mounted) {
        setLoading(false);
      }
    };

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiService.login({ email, password });
      localStorage.setItem("token", response.token);
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      localStorage.setItem("userEmail", response.user.email);
      localStorage.setItem("firstName", response.user.firstName);
      localStorage.setItem("lastName", response.user.lastName);
      localStorage.setItem("userId", response.user.id.toString());
      localStorage.setItem("userRole", response.user.role);
      localStorage.setItem("userStatus", response.user.status);
      localStorage.setItem("profilePicture", response.user.profilePicture ?? "");
      
      setIsAuthenticated(true);
      setUserEmail(response.user.email);
      setFirstName(response.user.firstName);
      setLastName(response.user.lastName);
      setUserId(response.user.id);
      setUserRole(response.user.role);
      setUserStatus(response.user.status);
      setProfilePicture(response.user.profilePicture ?? null);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (email, password, firstName, lastName, role = "client") => {
    try {
      const response = await apiService.register({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      
      localStorage.setItem("token", response.token);
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      localStorage.setItem("userEmail", response.user.email);
      localStorage.setItem("firstName", response.user.firstName);
      localStorage.setItem("lastName", response.user.lastName);
      localStorage.setItem("userId", response.user.id.toString());
      localStorage.setItem("userRole", response.user.role);
      localStorage.setItem("userStatus", response.user.status);
      localStorage.setItem("profilePicture", response.user.profilePicture ?? "");
      
      setIsAuthenticated(true);
      setUserEmail(response.user.email);
      setFirstName(response.user.firstName);
      setLastName(response.user.lastName);
      setUserId(response.user.id);
      setUserRole(response.user.role);
      setUserStatus(response.user.status);
      setProfilePicture(response.user.profilePicture ?? null);
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const user = await apiService.getCurrentUser();
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setUserId(user.id);
        setUserRole(user.role);
        setUserStatus(user.status);
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("firstName", user.firstName);
        localStorage.setItem("lastName", user.lastName);
        localStorage.setItem("userId", user.id.toString());
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userStatus", user.status);
        localStorage.setItem("profilePicture", user.profilePicture ?? "");
        setProfilePicture(user.profilePicture ?? null);
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userStatus");
    localStorage.removeItem("profilePicture");
    setIsAuthenticated(false);
    setUserEmail(null);
    setFirstName(null);
    setLastName(null);
    setUserId(null);
    setUserRole(null);
    setUserStatus(null);
    setProfilePicture(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        firstName,
        lastName,
        userId,
        userRole,
        userStatus,
        profilePicture,
        login,
        register,
        logout,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
