import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, ChevronRight } from "lucide-react";

const GOAL_LABELS = { lose_weight: "Lose weight", gain_weight: "Gain weight", get_fit_healthy: "Get fit & healthy" };
const GENDER_LABELS = { male: "Men", female: "Women" };
const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very active",
};

const CoachDashboard = () => {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingClients, setPendingClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (userRole !== "coach") {
      navigate("/dashboard");
      return;
    }
    loadDashboard();
    loadPendingClients();
  }, [authLoading, userRole, navigate]);

  const loadDashboard = async () => {
    try {
      const data = await apiService.getCoachDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingClients = async () => {
    try {
      const data = await apiService.getPendingClients();
      setPendingClients(data);
    } catch (error) {
      toast.error("Failed to load pending clients");
    }
  };

  const handleApproveClient = async (clientId) => {
    setActionLoading(true);
    try {
      await apiService.approveClient(clientId);
      toast.success("Client accepted and assigned to you");
      setSelectedClient(null);
      loadDashboard();
      loadPendingClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept client");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClient = async (clientId) => {
    setActionLoading(true);
    try {
      await apiService.rejectClient(clientId);
      toast.success("Client rejected");
      setSelectedClient(null);
      loadDashboard();
      loadPendingClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject client");
    } finally {
      setActionLoading(false);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Coach Dashboard</h1>
          <p className="text-muted-foreground">Manage your clients and review their progress.</p>
        </div>

        {dashboardData?.pendingLogsCount > 0 && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>
                You have {dashboardData.pendingLogsCount} progress logs waiting for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/progress">
                <Button>Review Now</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {pendingClients.length > 0 && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle>Pending Client Approvals</CardTitle>
              <CardDescription>
                {pendingClients.length} client(s) waiting for approval. These requests are visible to every coach until someone accepts one; then that client is assigned only to them. Click a row to view intake and accept or reject.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="w-full border rounded-lg p-4 flex justify-between items-center text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {client.first_name} {client.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Registered {new Date(client.created_at).toLocaleDateString()}
                          {client.profile && (
                            <span className="ml-2">
                              · {client.profile.goal ? GOAL_LABELS[client.profile.goal] || client.profile.goal : "No intake yet"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedClient
                  ? `${selectedClient.first_name} ${selectedClient.last_name}`
                  : "Client details"}
              </DialogTitle>
              <DialogDescription>
                Intake info for personalized nutrition and training recommendations
              </DialogDescription>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-6 py-2">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact</h4>
                  <p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Registered {new Date(selectedClient.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedClient.profile ? (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Essential info</h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Gender</dt>
                        <dd>{GENDER_LABELS[selectedClient.profile.gender] || selectedClient.profile.gender}</dd>
                        <dt className="text-muted-foreground">Height</dt>
                        <dd>{selectedClient.profile.heightCm} cm</dd>
                        <dt className="text-muted-foreground">Current weight</dt>
                        <dd>{selectedClient.profile.weightKg} kg</dd>
                        <dt className="text-muted-foreground">Goal</dt>
                        <dd>{GOAL_LABELS[selectedClient.profile.goal] || selectedClient.profile.goal}</dd>
                        {selectedClient.profile.targetWeightKg && (
                          <>
                            <dt className="text-muted-foreground">Target weight</dt>
                            <dd>{selectedClient.profile.targetWeightKg} kg</dd>
                          </>
                        )}
                        {selectedClient.profile.activityLevel && (
                          <>
                            <dt className="text-muted-foreground">Activity level</dt>
                            <dd>{ACTIVITY_LABELS[selectedClient.profile.activityLevel] || selectedClient.profile.activityLevel}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                    {(selectedClient.profile.medicalNotes || selectedClient.profile.dietaryRestrictions || selectedClient.profile.additionalNotes) && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Optional details</h4>
                        <div className="space-y-2 text-sm">
                          {selectedClient.profile.medicalNotes && (
                            <div>
                              <span className="text-muted-foreground">Medical / injuries: </span>
                              <span className="whitespace-pre-wrap">{selectedClient.profile.medicalNotes}</span>
                            </div>
                          )}
                          {selectedClient.profile.dietaryRestrictions && (
                            <div>
                              <span className="text-muted-foreground">Dietary: </span>
                              <span className="whitespace-pre-wrap">{selectedClient.profile.dietaryRestrictions}</span>
                            </div>
                          )}
                          {selectedClient.profile.additionalNotes && (
                            <div>
                              <span className="text-muted-foreground">Notes: </span>
                              <span className="whitespace-pre-wrap">{selectedClient.profile.additionalNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No intake form submitted yet.</p>
                )}

                {selectedClient.status === "active" && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Latest progress</h4>
                      {selectedClient.latestProgress ? (
                        <div className="rounded-lg border p-3 space-y-1">
                          <p className="text-2xl font-bold text-primary">
                            {selectedClient.latestProgress.progressPercentage}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedClient.latestProgress.weekStartDate).toLocaleDateString()}
                            {selectedClient.latestProgress.weight != null && ` · ${selectedClient.latestProgress.weight} kg`}
                          </p>
                          <Link to="/progress">
                            <Button variant="outline" size="sm" className="mt-2">
                              Review progress
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No progress submitted yet.</p>
                      )}
                    </div>
                    {dashboardData?.weightTrends?.[selectedClient.id]?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Weight trend</h4>
                        <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                          {dashboardData.weightTrends[selectedClient.id].map((entry, idx) => (
                            <div key={idx} className="text-sm font-semibold">
                              {entry.weight} kg
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setSelectedClient(null)}
                disabled={actionLoading}
              >
                Close
              </Button>
              {selectedClient?.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectClient(selectedClient.id)}
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproveClient(selectedClient.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing…" : "Accept client"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Clients</CardTitle>
            <CardDescription>Clients assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.clients && dashboardData.clients.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="w-full text-left border rounded-lg p-4 hover:bg-muted/50 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      <p className="text-sm mt-2">
                        Status: <span className="capitalize">{client.status}</span>
                        {client.profile?.goal && (
                          <span className="ml-2">
                            · {GOAL_LABELS[client.profile.goal] || client.profile.goal}
                          </span>
                        )}
                      </p>
                        <p className="text-sm text-muted-foreground">
                          Plans: {client.planCount} | Logs: {client.logCount}
                          {client.latestProgress?.progressPercentage != null && (
                            <span className="ml-2 font-medium text-primary">
                              · {client.latestProgress.progressPercentage}% progress
                            </span>
                          )}
                        </p>
                      {client.avgMealAdherence != null && (
                        <p className="text-sm text-muted-foreground">
                          Avg Meal Adherence: {parseFloat(client.avgMealAdherence).toFixed(1)}% |
                          Avg Workout Completion: {parseFloat(client.avgWorkoutCompletion).toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No clients assigned yet</p>
            )}
          </CardContent>
        </Card>

        {dashboardData?.weightTrends && Object.keys(dashboardData.weightTrends).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Weight Trends</CardTitle>
              <CardDescription>Client progress over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(dashboardData.weightTrends).map(([clientId, trends]) => {
                  const client = dashboardData.clients.find((c) => c.id === parseInt(clientId));
                  return (
                    <div key={clientId} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-4">
                        {client?.first_name} {client?.last_name}
                      </h3>
                      <div className="space-y-2">
                        {trends.map((entry, index) => (
                          <div key={index} className="flex justify-between items-center gap-4 text-sm">
                            <span className="font-semibold">{entry.weight} kg</span>
                            <span className="text-muted-foreground text-right">
                              Meals: {entry.meal_adherence}% | Workouts: {entry.workout_completion}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default CoachDashboard;
