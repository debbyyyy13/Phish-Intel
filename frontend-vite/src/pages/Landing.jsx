import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Brain,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "AI-Powered Detection",
      description:
        "Advanced machine learning models identify and block sophisticated phishing attempts in real-time.",
    },
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "Intelligent Training",
      description:
        "Personalized security awareness training that adapts to your organization's threat landscape.",
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Enterprise Management",
      description:
        "Comprehensive admin tools for managing users, policies, and organization-wide security metrics.",
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Advanced Analytics",
      description:
        "Deep insights into threat patterns, user behavior, and security effectiveness across your organization.",
    },
  ];

  const benefits = [
    "Block 99% of phishing attempts with AI detection",
    "Reduce security incidents by 85% through training",
    "Get real-time threat intelligence and alerts",
    "Comprehensive compliance reporting and analytics",
    "Enterprise-grade security with zero-trust architecture",
    "24/7 automated monitoring and incident response",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">PhishGuard</h1>
              <p className="text-sm text-muted-foreground">Security Platform</p>
            </div>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Advanced Phishing
              <br />
              <span className="text-primary">Detection & Training</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Protect your organization with AI-powered phishing detection,
              comprehensive user training, and enterprise-grade security
              analytics. Built for modern businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={handleLogin}
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover-elevate">
              <CardHeader>
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Why Choose PhishGuard?</CardTitle>
              <CardDescription>
                Comprehensive security solution trusted by enterprise
                organizations worldwide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-chart-2 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">
                Ready to Secure Your Organization?
              </CardTitle>
              <CardDescription>
                Join thousands of companies protecting their employees with
                PhishGuard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                size="lg"
                onClick={handleLogin}
                className="w-full sm:w-auto"
                data-testid="button-start-protection"
              >
                Start Your Protection Today
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
