import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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

const Onboarding = () => {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
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

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (userRole === "coach") {
        navigate("/coach-dashboard");
        return;
      }
      if (userRole !== "client") return;
      try {
        const profile = await apiService.getClientProfile();
        if (profile && profile.id) {
          navigate("/dashboard");
          return;
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [authLoading, userRole, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { gender, heightCm, weightKg, goal } = form;
    if (!gender || !heightCm || !weightKg || !goal) {
      toast.error("Please fill in all required fields");
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
    setSaving(true);
    try {
      await apiService.submitClientProfile({
        gender,
        heightCm: h,
        weightKg: w,
        goal,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
        activityLevel: form.activityLevel || undefined,
        medicalNotes: form.medicalNotes?.trim() || undefined,
        dietaryRestrictions: form.dietaryRestrictions?.trim() || undefined,
        additionalNotes: form.additionalNotes?.trim() || undefined,
      });
      toast.success("Profile saved. You’re all set!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-10 flex-1 w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Quick intake</h1>
          <p className="text-muted-foreground mt-2">
            A few details so your coach can tailor your nutrition and training.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Essential info</CardTitle>
              <CardDescription>Required for personalized recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <select
                  id="gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
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
                  <Label htmlFor="heightCm">Height (cm) *</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    min={100}
                    max={250}
                    placeholder="e.g. 170"
                    value={form.heightCm}
                    onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="weightKg">Current weight (kg) *</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    placeholder="e.g. 72"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
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
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        form.goal === opt.value ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="goal"
                        value={opt.value}
                        checked={form.goal === opt.value}
                        onChange={() => setForm({ ...form, goal: opt.value })}
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
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Optional details</CardTitle>
              <CardDescription>Helps your coach give better food and workout advice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="targetWeightKg">Target weight (kg)</Label>
                <Input
                  id="targetWeightKg"
                  type="number"
                  min={30}
                  max={300}
                  step="0.1"
                  placeholder="e.g. 68"
                  value={form.targetWeightKg}
                  onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Activity level</Label>
                <select
                  value={form.activityLevel}
                  onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
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
                <Label htmlFor="medicalNotes">Medical conditions / injuries</Label>
                <textarea
                  id="medicalNotes"
                  placeholder="e.g. lower back pain, asthma, diabetes"
                  value={form.medicalNotes}
                  onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
                  className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="dietaryRestrictions">Dietary restrictions or allergies</Label>
                <textarea
                  id="dietaryRestrictions"
                  placeholder="e.g. lactose intolerant, nut allergy, vegetarian"
                  value={form.dietaryRestrictions}
                  onChange={(e) => setForm({ ...form, dietaryRestrictions: e.target.value })}
                  className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="additionalNotes">Anything else for your coach</Label>
                <textarea
                  id="additionalNotes"
                  placeholder="Schedule, preferences, or goals in your own words"
                  value={form.additionalNotes}
                  onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                  className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </form>
    </div>
  );
};

export default Onboarding;
