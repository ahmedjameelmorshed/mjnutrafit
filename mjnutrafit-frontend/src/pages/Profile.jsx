import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Lock, Camera, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Lose weight", description: "Reduce body fat and reach a healthier weight" },
  { value: "gain_weight", label: "Gain weight", description: "Build muscle and increase mass in a healthy way" },
  { value: "get_fit_healthy", label: "Get fit & healthy", description: "Improve overall fitness, energy, and wellbeing" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", description: "Little or no exercise" },
  { value: "light", label: "Light", description: "Light exercise 1-3 days/week" },
  { value: "moderate", label: "Moderate", description: "Moderate exercise 3-5 days/week" },
  { value: "active", label: "Active", description: "Hard exercise 6-7 days/week" },
  { value: "very_active", label: "Very active", description: "Athlete or physically demanding job" },
];

const Profile = () => {
  const { firstName, lastName, userEmail, userRole, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: firstName || "",
    lastName: lastName || "",
    email: userEmail || "",
    profilePicture: null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [fitnessForm, setFitnessForm] = useState({
    gender: "",
    heightCm: "",
    weightKg: "",
    goal: "",
    targetWeightKg: "",
    activityLevel: "",
    medicalNotes: "",
    dietaryRestrictions: "",
    additionalNotes: "",
  });
  const [fitnessSaving, setFitnessSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
        setProfileData({
          firstName: currentUser.firstName || "",
          lastName: currentUser.lastName || "",
          email: currentUser.email || "",
          profilePicture: currentUser.profilePicture || null,
        });
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (userRole !== "client") return;
    apiService.getClientProfile().then((p) => {
      if (p && p.id) {
        setFitnessForm({
          gender: p.gender || "",
          heightCm: p.heightCm != null ? String(p.heightCm) : "",
          weightKg: p.weightKg != null ? String(p.weightKg) : "",
          goal: p.goal || "",
          targetWeightKg: p.targetWeightKg != null && p.targetWeightKg !== "" ? String(p.targetWeightKg) : "",
          activityLevel: p.activityLevel || "",
          medicalNotes: p.medicalNotes || "",
          dietaryRestrictions: p.dietaryRestrictions || "",
          additionalNotes: p.additionalNotes || "",
        });
      }
    }).catch(() => {});
  }, [userRole]);

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const response = await apiService.updateProfile({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        email: profileData.email.trim(),
      });
      toast.success("Profile updated successfully");
      await refreshUser();
      setUser(response.user);
      setEditDialogOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }
    try {
      setLoading(true);
      await apiService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords({ current: false, new: false, confirm: false });
    } catch (error) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleFitnessProfileSubmit = async (e) => {
    e.preventDefault();
    const { gender, heightCm, weightKg, goal } = fitnessForm;
    if (!gender || !heightCm || !weightKg || !goal) {
      toast.error("Please fill in all required fields (gender, height, weight, goal)");
      return;
    }
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (h < 100 || h > 250) {
      toast.error("Height must be between 100 and 250 cm");
      return;
    }
    if (w < 30 || w > 300) {
      toast.error("Weight must be between 30 and 300 kg");
      return;
    }
    setFitnessSaving(true);
    try {
      await apiService.submitClientProfile({
        gender,
        heightCm: h,
        weightKg: w,
        goal,
        targetWeightKg: fitnessForm.targetWeightKg ? Number(fitnessForm.targetWeightKg) : undefined,
        activityLevel: fitnessForm.activityLevel || undefined,
        medicalNotes: fitnessForm.medicalNotes?.trim() || undefined,
        dietaryRestrictions: fitnessForm.dietaryRestrictions?.trim() || undefined,
        additionalNotes: fitnessForm.additionalNotes?.trim() || undefined,
      });
      toast.success("Fitness profile updated");
    } catch (err) {
      toast.error(err?.message || "Failed to save fitness profile");
    } finally {
      setFitnessSaving(false);
    }
  };

  const handlePictureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    try {
      setUploading(true);
      const response = await apiService.uploadProfilePicture(file);
      toast.success("Profile picture updated successfully");
      await refreshUser();
      setUser(response.user);
    } catch (error) {
      toast.error(error.message || "Failed to upload picture");
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    const first = profileData.firstName?.[0]?.toUpperCase() || "";
    const last = profileData.lastName?.[0]?.toUpperCase() || "";
    return first + last || "U";
  };

  const profilePicture = user?.profilePicture || profileData.profilePicture;

  if (loading && !user) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage
                    src={profilePicture}
                    alt={`${profileData.firstName || ""} ${profileData.lastName || ""}`}
                  />
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {profileData.firstName || ""} {profileData.lastName || ""}
                </h2>
                <p className="text-muted-foreground">{profileData.email || "Not set"}</p>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    variant="outline"
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Update picture"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>Edit your profile information and change password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className={cn("grid w-full", userRole === "client" ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                {userRole === "client" && <TabsTrigger value="fitness">Fitness profile</TabsTrigger>}
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>
              <TabsContent value="profile">
                <div className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <p className="text-lg font-semibold mt-1">{profileData.firstName || "Not set"}</p>
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <p className="text-lg font-semibold mt-1">{profileData.lastName || "Not set"}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-lg font-semibold mt-1">{profileData.email || "Not set"}</p>
                  </div>
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>Update your profile information</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-firstName">First Name</Label>
                            <Input
                              id="edit-firstName"
                              value={profileData.firstName}
                              onChange={(e) =>
                                setProfileData({ ...profileData, firstName: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-lastName">Last Name</Label>
                            <Input
                              id="edit-lastName"
                              value={profileData.lastName}
                              onChange={(e) =>
                                setProfileData({ ...profileData, lastName: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) =>
                              setProfileData({ ...profileData, email: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleProfileUpdate} disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>
              {userRole === "client" && (
                <TabsContent value="fitness" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">Update your intake details (gender, height, weight, goal). Your coach uses this to tailor your plans.</p>
                  <form onSubmit={handleFitnessProfileSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="fp-gender">Gender *</Label>
                      <select
                        id="fp-gender"
                        value={fitnessForm.gender}
                        onChange={(e) => setFitnessForm({ ...fitnessForm, gender: e.target.value })}
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select</option>
                        <option value="male">Men</option>
                        <option value="female">Women</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fp-heightCm">Height (cm) *</Label>
                        <Input
                          id="fp-heightCm"
                          type="number"
                          min={100}
                          max={250}
                          value={fitnessForm.heightCm}
                          onChange={(e) => setFitnessForm({ ...fitnessForm, heightCm: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="fp-weightKg">Current weight (kg) *</Label>
                        <Input
                          id="fp-weightKg"
                          type="number"
                          min={30}
                          max={300}
                          step="0.1"
                          value={fitnessForm.weightKg}
                          onChange={(e) => setFitnessForm({ ...fitnessForm, weightKg: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Primary goal *</Label>
                      <div className="mt-2 space-y-2">
                        {GOAL_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              fitnessForm.goal === opt.value ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
                            )}
                          >
                            <input
                              type="radio"
                              name="fp-goal"
                              value={opt.value}
                              checked={fitnessForm.goal === opt.value}
                              onChange={() => setFitnessForm({ ...fitnessForm, goal: opt.value })}
                              className="mt-1"
                            />
                            <div>
                              <span className="font-medium">{opt.label}</span>
                              <p className="text-sm text-muted-foreground">{opt.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="fp-targetWeightKg">Target weight (kg)</Label>
                      <Input
                        id="fp-targetWeightKg"
                        type="number"
                        min={30}
                        max={300}
                        step="0.1"
                        value={fitnessForm.targetWeightKg}
                        onChange={(e) => setFitnessForm({ ...fitnessForm, targetWeightKg: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Activity level</Label>
                      <select
                        value={fitnessForm.activityLevel}
                        onChange={(e) => setFitnessForm({ ...fitnessForm, activityLevel: e.target.value })}
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select (optional)</option>
                        {ACTIVITY_LEVELS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="fp-medicalNotes">Medical conditions / injuries</Label>
                      <textarea
                        id="fp-medicalNotes"
                        value={fitnessForm.medicalNotes}
                        onChange={(e) => setFitnessForm({ ...fitnessForm, medicalNotes: e.target.value })}
                        className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fp-dietaryRestrictions">Dietary restrictions or allergies</Label>
                      <textarea
                        id="fp-dietaryRestrictions"
                        value={fitnessForm.dietaryRestrictions}
                        onChange={(e) => setFitnessForm({ ...fitnessForm, dietaryRestrictions: e.target.value })}
                        className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fp-additionalNotes">Anything else for your coach</Label>
                      <textarea
                        id="fp-additionalNotes"
                        value={fitnessForm.additionalNotes}
                        onChange={(e) => setFitnessForm({ ...fitnessForm, additionalNotes: e.target.value })}
                        className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" disabled={fitnessSaving}>
                      {fitnessSaving ? "Saving…" : "Save fitness profile"}
                    </Button>
                  </form>
                </TabsContent>
              )}
              <TabsContent value="password">
                <form onSubmit={handlePasswordChange} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                        }
                      >
                        {showPasswords.current ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                        }
                      >
                        {showPasswords.new ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            confirm: !showPasswords.confirm,
                          })
                        }
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
    </div>
  );
};

export default Profile;
