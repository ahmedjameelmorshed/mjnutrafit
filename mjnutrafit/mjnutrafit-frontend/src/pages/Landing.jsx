import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  UtensilsCrossed, 
  Dumbbell, 
  TrendingUp, 
  UserCheck, 
  Target, 
  RefreshCw,
  CheckCircle2,
  Trophy
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-accent/20">
      <Navbar />

      <section className="container mx-auto px-4 py-20 md:py-32 flex-1">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Trophy className="w-4 h-4" />
            Trusted by fitness professionals worldwide
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            The Only Fitness Platform That
            <span className="block bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              Actually Works
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Get personalized diet and workout plans from certified coaches. Log progress day by day.
            Receive expert feedback. Achieve your fitness goals faster than ever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link to="/register">
              <Button size="xl" className="text-lg px-8 py-6 h-auto">
                Start Your Journey Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="xl" variant="outline" className="text-lg px-8 py-6 h-auto">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete platform designed to help you achieve your fitness goals with professional guidance
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Custom Diet Plans</CardTitle>
              <CardDescription className="text-base">
                Personalized nutrition plans tailored to your goals, preferences, and lifestyle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our certified nutrition coaches create detailed meal plans that fit your schedule, 
                dietary restrictions, and fitness objectives. No more guessing what to eat.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Workout Programs</CardTitle>
              <CardDescription className="text-base">
                Expert-designed training plans that adapt to your fitness level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get structured workout routines from professional trainers. Whether you're a beginner 
                or advanced, we have the perfect program for you.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Progress Tracking</CardTitle>
              <CardDescription className="text-base">
                Daily logging with visual trends and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Log your weight, meal adherence, and workout completion as you go. See your progress
                over time with clear trends and insights.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Expert Feedback</CardTitle>
              <CardDescription className="text-base">
                Get personalized guidance from certified coaches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Submit your progress and receive detailed feedback from your assigned coach.
                Get tips, adjustments, and motivation to stay on track.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Goal Achievement</CardTitle>
              <CardDescription className="text-base">
                Track milestones and celebrate your wins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set clear goals and track your journey. Our platform helps you stay accountable 
                and motivated throughout your fitness transformation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Plan Updates</CardTitle>
              <CardDescription className="text-base">
                Your plans evolve as you progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                As you improve, your coach updates your diet and workout plans to keep challenging 
                you and ensuring continuous progress.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 bg-accent/30 rounded-3xl my-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Simple, straightforward, and effective
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
              <p className="text-muted-foreground">
                Create your account and get matched with a certified coach
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Your Plan</h3>
              <p className="text-muted-foreground">
                Receive personalized diet and workout plans from your coach
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-muted-foreground">
                Log weight, meals, and workouts on the days that matter
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Feedback</h3>
              <p className="text-muted-foreground">
                Receive expert feedback and plan adjustments from your coach
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Join Thousands of Successful Clients
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            See what our community is achieving
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-6 rounded-lg bg-card border">
              <div className="text-3xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Certified Coaches</div>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <div className="text-3xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Plans Created</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12 md:p-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Life?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of people who are achieving their fitness goals with professional guidance. 
            Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="xl" className="text-lg px-8 py-6 h-auto">
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="xl" variant="outline" className="text-lg px-8 py-6 h-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
