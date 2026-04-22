import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
const PLACEHOLDER_DIET = "Your personalized diet plan will be created by your coach.";
const PLACEHOLDER_WORKOUT = "Your personalized workout plan will be created by your coach.";
const isEmptyPlanText = (text, placeholder) =>
  !text?.trim() || text.trim() === placeholder;
const hasPlanContent = (plan) =>
  plan &&
  (!isEmptyPlanText(plan.dietText, PLACEHOLDER_DIET) ||
    !isEmptyPlanText(plan.workoutText, PLACEHOLDER_WORKOUT));

const GENDER_LABELS = { male: "Men", female: "Women" };
const GOAL_LABELS = {
  lose_weight: "Lose weight",
  gain_weight: "Gain weight",
  get_fit_healthy: "Get fit & healthy",
};
const SUBMISSION_STATUS_PRESENTATION = {
  submitted: {
    label: "Pending review",
    className: "text-amber-700 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "text-green-700 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "text-red-700 dark:text-red-400",
  },
};

function submissionStatusDisplay(status) {
  const key = status?.toLowerCase?.() || "";
  if (SUBMISSION_STATUS_PRESENTATION[key]) {
    return SUBMISSION_STATUS_PRESENTATION[key];
  }
  return {
    label: status ? String(status).replace(/_/g, " ") : "-",
    className: "text-foreground",
  };
}

const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very active",
};

function getBMICategory(bmi) {
  if (bmi == null || Number.isNaN(bmi) || bmi <= 0) return null;
  if (bmi < 16) return { label: "Severe underweight", comment: "Your BMI is in the severely underweight range. Consider speaking with a healthcare provider and a coach to build a safe nutrition and training plan." };
  if (bmi < 18.5) return { label: "Underweight", comment: "Your BMI is in the underweight range. A coach can help you gain weight healthily with the right diet and strength training." };
  if (bmi < 25) return { label: "Normal", comment: "Your BMI is in the healthy range. Keep up good habits; your coach can help you maintain or fine-tune your goals." };
  if (bmi < 30) return { label: "Overweight", comment: "Your BMI is in the overweight range. Small changes to nutrition and activity, guided by your coach, can move you toward a healthier weight." };
  if (bmi < 35) return { label: "Obese (Class I)", comment: "Your BMI is in the obese (Class I) range. Your coach can design a sustainable plan to improve diet and activity step by step." };
  return { label: "Obese (Class II+)", comment: "Your BMI is in the obese (Class II or higher) range. Working with your coach and a healthcare provider can help you set safe, effective goals." };
}

const ClientDashboard = () => {
  const { userRole, userStatus, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (userRole === "coach") {
      navigate("/coach-dashboard");
      return;
    }
    loadDashboard();
  }, [authLoading, userRole, navigate]);

  const loadDashboard = async () => {
    try {
      const data = await apiService.getClientDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userStatus === "pending") {
    if (dashboardData && dashboardData.hasCompletedOnboarding === false) {
      navigate("/onboarding");
      return null;
    }
    const c = dashboardData?.assignedCoach;
    const coachName =
      c && (c.firstName || c.lastName)
        ? [c.firstName, c.lastName].filter(Boolean).join(" ")
        : null;
    const profile = dashboardData?.clientProfile || null;
    return (
      <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Waiting for Approval</CardTitle>
              <CardDescription className="text-center">
                {coachName
                  ? `Your account is pending approval from ${coachName}.`
                  : "Your coach request is visible to all coaches until one accepts you."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                {coachName
                  ? `You have been assigned to ${coachName}. Please wait while they review your registration. You'll be notified once your account is approved.`
                  : "After you complete onboarding, any coach can accept you. When one does, you will be their client only. You'll get full access once your account is approved."}
              </p>

              {profile && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Details you submitted
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {profile.gender && (
                      <div>
                        <span className="text-muted-foreground">Gender</span>
                        <p className="font-medium">{GENDER_LABELS[profile.gender] ?? profile.gender}</p>
                      </div>
                    )}
                    {profile.heightCm != null && (
                      <div>
                        <span className="text-muted-foreground">Height</span>
                        <p className="font-medium">{profile.heightCm} cm</p>
                      </div>
                    )}
                    {profile.weightKg != null && (
                      <div>
                        <span className="text-muted-foreground">Current weight</span>
                        <p className="font-medium">{profile.weightKg} kg</p>
                      </div>
                    )}
                    {profile.goal && (
                      <div>
                        <span className="text-muted-foreground">Goal</span>
                        <p className="font-medium">{GOAL_LABELS[profile.goal] ?? profile.goal}</p>
                      </div>
                    )}
                    {profile.targetWeightKg != null && profile.targetWeightKg !== "" && (
                      <div>
                        <span className="text-muted-foreground">Target weight</span>
                        <p className="font-medium">{profile.targetWeightKg} kg</p>
                      </div>
                    )}
                    {profile.activityLevel && (
                      <div>
                        <span className="text-muted-foreground">Activity level</span>
                        <p className="font-medium">{ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel}</p>
                      </div>
                    )}
                  </div>
                  {(profile.medicalNotes?.trim() || profile.dietaryRestrictions?.trim() || profile.additionalNotes?.trim()) && (
                    <div className="space-y-2 pt-2 border-t text-sm">
                      {profile.medicalNotes?.trim() && (
                        <div>
                          <span className="text-muted-foreground">Medical / injuries</span>
                          <p className="font-medium whitespace-pre-wrap">{profile.medicalNotes.trim()}</p>
                        </div>
                      )}
                      {profile.dietaryRestrictions?.trim() && (
                        <div>
                          <span className="text-muted-foreground">Dietary restrictions</span>
                          <p className="font-medium whitespace-pre-wrap">{profile.dietaryRestrictions.trim()}</p>
                        </div>
                      )}
                      {profile.additionalNotes?.trim() && (
                        <div>
                          <span className="text-muted-foreground">Additional notes</span>
                          <p className="font-medium whitespace-pre-wrap">{profile.additionalNotes.trim()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button onClick={logout} variant="outline" className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
      </div>
    );
  }

  const lastSubmissionVisual =
    dashboardData?.lastSubmission != null
      ? submissionStatusDisplay(dashboardData.lastSubmission.status)
      : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your fitness overview.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Weight</CardTitle>
              <CardDescription>Your current or latest recorded weight</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {dashboardData?.latestWeight != null
                  ? `${dashboardData.latestWeight} kg`
                  : dashboardData?.clientProfile?.weightKg != null
                    ? `${dashboardData.clientProfile.weightKg} kg`
                    : "N/A"}
              </p>
            </CardContent>
          </Card>

          {(() => {
            const heightM = dashboardData?.clientProfile?.heightCm != null
              ? Number(dashboardData.clientProfile.heightCm) / 100
              : null;
            const weightKg = dashboardData?.latestWeight != null
              ? Number(dashboardData.latestWeight)
              : dashboardData?.clientProfile?.weightKg != null
                ? Number(dashboardData.clientProfile.weightKg)
                : null;
            const bmi = heightM && weightKg && heightM > 0
              ? Number((weightKg / (heightM * heightM)).toFixed(1))
              : null;
            const bmiInfo = bmi != null ? getBMICategory(bmi) : null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>BMI</CardTitle>
                  <CardDescription>Body Mass Index from your height and weight</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-3xl font-bold">
                    {bmi != null ? bmi : "-"}
                    {bmi != null && <span className="text-lg font-normal text-muted-foreground ml-1">kg/m²</span>}
                  </p>
                  {bmiInfo && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <p className="font-medium">{bmiInfo.label}</p>
                      <p className="text-muted-foreground mt-1">{bmiInfo.comment}</p>
                    </div>
                  )}
                  {bmi == null && dashboardData?.clientProfile?.heightCm == null && (
                    <p className="text-sm text-muted-foreground">
                      Add your height under Profile, then Fitness profile, to see your BMI.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardHeader>
              <CardTitle>Last Submission</CardTitle>
              <CardDescription>Status of your last progress log</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.lastSubmission && lastSubmissionVisual ? (
                <div>
                  <p className="text-lg mb-2">
                    <span className="text-muted-foreground font-medium">Current status: </span>
                    <span className={`font-semibold capitalize ${lastSubmissionVisual.className}`}>
                      {lastSubmissionVisual.label}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last entry:{" "}
                    {new Date(
                      dashboardData.lastSubmission.logDate || dashboardData.lastSubmission.weekStartDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No submissions yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {dashboardData?.currentPlan && hasPlanContent(dashboardData.currentPlan) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active diet and workout plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Diet Plan</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {!isEmptyPlanText(dashboardData.currentPlan.dietText, PLACEHOLDER_DIET)
                      ? dashboardData.currentPlan.dietText
                      : "Your coach hasn't added a diet plan yet."}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Workout Plan</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {!isEmptyPlanText(dashboardData.currentPlan.workoutText, PLACEHOLDER_WORKOUT)
                      ? dashboardData.currentPlan.workoutText
                      : "Your coach hasn't added a workout plan yet."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {dashboardData?.weightTrend && dashboardData.weightTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Weight Trend</CardTitle>
              <CardDescription>Your progress over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.weightTrend.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center gap-4 p-2 border-b">
                    <span className="font-semibold">{entry.weight} kg</span>
                    <span className="text-sm text-muted-foreground text-right">
                      Meals: {entry.mealAdherence}% | Workouts: {entry.workoutCompletion}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default ClientDashboard;
