import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Brain,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const handleSignup = () => {
    navigate("/signup");
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
      title: "Smart Analysis",
      description:
        "Advanced AI analyzes email content, links, and attachments to detect sophisticated phishing attempts.",
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Real-time Protection",
      description:
        "Get instant alerts and protection against the latest phishing threats with continuous updates.",
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Personal Dashboard",
      description:
        "Track your security insights, view threat history, and monitor your email safety metrics.",
    },
  ];

  const benefits = [
    "Block 99% of phishing attempts with AI detection",
    "Real-time scanning of emails, links, and attachments",
    "Personal threat intelligence and security insights",
    "Easy-to-use interface for daily email protection",
    "Detailed analysis reports for every email scanned",
    "24/7 automated monitoring and instant alerts",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-20 pt-16">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Personal Phishing
              <br />
              <span className="text-primary">Detection & Protection</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Protect yourself with AI-powered phishing detection. Scan suspicious emails,
              get instant threat analysis, and stay safe from cyber attacks.
              Built for individuals who value their security.
            </p>
            {/* Single centered Get Started button */}
            <div className="flex justify-center pt-8">
              <Button
                size="lg"
                onClick={handleSignup}
                className="px-8 py-4 text-lg font-semibold"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid - 4 Cards */}
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
                Personal security solution trusted by individuals worldwide
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
                Ready to Secure Your Email?
              </CardTitle>
              <CardDescription>
                Join thousands of users protecting themselves with PhishGuard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                size="lg"
                onClick={handleSignup}
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