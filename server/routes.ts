import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertSubscriptionSchema, insertProfileSchema, insertEducationSchema, insertProjectSchema, insertSkillSchema, insertExperienceSchema, insertCreditPurchaseSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";

function requireAuth(req: any, res: any, next: any) {
  console.log('Auth check - isAuthenticated:', req.isAuthenticated());
  console.log('Auth check - user exists:', !!req.user);
  console.log('Auth check - session:', req.session?.passport);
  
  if (!req.isAuthenticated() || !req.user) {
    return res.sendStatus(401);
  }
  next();
}

async function requireCredits(req: any, res: any, next: any) {
  if (!req.user) {
    return res.sendStatus(401);
  }
  
  const userId = req.user.id;
  const subscription = await storage.getUserSubscription(userId);
  
  if (!subscription || !subscription.active) {
    return res.status(403).json({ message: "Active subscription required" });
  }
  
  if (subscription.creditsRemaining < 5) {
    return res.status(403).json({ message: "Insufficient credits. Please top-up or upgrade your plan." });
  }
  
  req.subscription = subscription;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Serve test forms for debugging
  app.get("/test", (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test_form.html'));
  });
  
  app.get("/input-test", (req, res) => {
    res.sendFile(path.join(process.cwd(), 'simple_input_test.html'));
  });

  app.get("/debug-input", (req, res) => {
    res.sendFile(path.join(process.cwd(), 'debug_input_test.html'));
  });

  // Subscription routes
  app.get("/api/subscription/plans", (req, res) => {
    res.json([
      {
        id: "basic",
        name: "Basic",
        price: 199900, // in paise
        credits: 500,
        features: ["500 editing credits", "PDF export unlimited", "Public profile sharing", "Photo & CV upload"]
      },
      {
        id: "premium", 
        name: "Premium",
        price: 299900, // in paise
        credits: 1000,
        features: ["1,000 editing credits", "PDF export unlimited", "Public profile sharing", "Photo & CV upload", "Priority support"]
      }
    ]);
  });

  app.post("/api/subscription/subscribe", async (req, res) => {
    try {
      const { planType } = req.body;
      
      // For bypass mode, use UUID format for user ID
      const userId = "00000000-0000-0000-0000-000000000001";
      
      // Ensure user exists
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.createUser({
          email: "bypass@canar.com",
          username: "bypass-user",
          password: "bypass-password-hash"
        });
      }
      
      if (!["Basic", "Premium"].includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }

      const creditsAllocated = planType === "Basic" ? 500 : 1000;
      
      const subscription = await storage.createSubscription({
        userId,
        planType,
        creditsAllocated,
        creditsRemaining: creditsAllocated,
        active: true,
      });

      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Error creating subscription" });
    }
  });

  app.post("/api/subscription/credits/topup", async (req, res) => {
    try {
      const { credits, amount } = req.body;
      const userId = "00000000-0000-0000-0000-000000000001";

      // Verify user has active subscription
      const subscription = await storage.getUserSubscription(userId);
      if (!subscription || !subscription.active) {
        return res.status(403).json({ message: "Active subscription required for credit top-up" });
      }

      // Create credit purchase record
      await storage.createCreditPurchase({
        userId,
        credits,
        amount,
      });

      // Add credits to subscription
      await storage.addCreditsToSubscription(userId, credits);

      res.json({ message: "Credits added successfully", credits });
    } catch (error) {
      console.error("Error adding credits:", error);
      res.status(500).json({ message: "Error adding credits" });
    }
  });

  // Credits info
  app.get("/api/credits", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        return res.json({ creditsRemaining: 0, hasSubscription: false });
      }

      res.json({
        creditsRemaining: subscription.creditsRemaining,
        hasSubscription: subscription.active,
        planType: subscription.planType
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Error fetching credits" });
    }
  });

  // Profile routes
  app.get("/api/profile", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.json(null);
      }

      // Get all related data
      const [education, projects, skills, experiences] = await Promise.all([
        storage.getUserEducation(userId),
        storage.getUserProjects(userId),
        storage.getUserSkills(userId),
        storage.getUserExperiences(userId)
      ]);

      res.json({
        ...profile,
        education,
        projects,
        skills,
        experiences
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Error fetching profile" });
    }
  });

  app.put("/api/profile", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const profileData = insertProfileSchema.parse({ ...req.body, userId });
      
      const profile = await storage.createOrUpdateProfile(profileData);
      
      // Deduct credits (5 credits per edit) - properly handle the result
      try {
        const updatedSubscription = await storage.updateSubscriptionCredits(userId, 5);
        if (!updatedSubscription) {
          console.log("Credit deduction failed: insufficient credits or no subscription");
          // For bypass mode, create a default subscription with credits if none exists
          const subscription = await storage.getUserSubscription(userId);
          if (!subscription) {
            await storage.createSubscription({
              userId,
              planType: "premium",
              creditsAllocated: 1000,
              creditsRemaining: 995, // 1000 - 5 for this edit
              active: true,
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            });
          }
        }
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
        // Continue without blocking profile update for bypass mode
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating profile" });
    }
  });

  // Education routes
  app.get("/api/education", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const education = await storage.getUserEducation(userId);
      res.json(education);
    } catch (error) {
      console.error("Error fetching education:", error);
      res.status(500).json({ message: "Error fetching education" });
    }
  });

  app.post("/api/education", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const educationData = insertEducationSchema.parse({ ...req.body, userId });
      
      const education = await storage.createEducation(educationData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(education);
    } catch (error) {
      console.error("Error creating education:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid education data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating education" });
    }
  });

  app.put("/api/education/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = "00000000-0000-0000-0000-000000000001";
      const educationData = insertEducationSchema.partial().parse(req.body);
      
      const education = await storage.updateEducation(id, educationData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(education);
    } catch (error) {
      console.error("Error updating education:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid education data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating education" });
    }
  });

  app.delete("/api/education/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEducation(id);
      res.json({ message: "Education deleted successfully" });
    } catch (error) {
      console.error("Error deleting education:", error);
      res.status(500).json({ message: "Error deleting education" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Error fetching projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const projectData = insertProjectSchema.parse({ ...req.body, userId });
      
      const project = await storage.createProject(projectData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = "00000000-0000-0000-0000-000000000001";
      const projectData = insertProjectSchema.partial().parse(req.body);
      
      const project = await storage.updateProject(id, projectData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProject(id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Error deleting project" });
    }
  });

  // Skill routes
  app.get("/api/skills", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const skills = await storage.getUserSkills(userId);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ message: "Error fetching skills" });
    }
  });

  app.post("/api/skills", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const skillData = insertSkillSchema.parse({ ...req.body, userId });
      
      const skill = await storage.createSkill(skillData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(skill);
    } catch (error) {
      console.error("Error creating skill:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid skill data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating skill" });
    }
  });

  app.put("/api/skills/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = "00000000-0000-0000-0000-000000000001";
      const skillData = insertSkillSchema.partial().parse(req.body);
      
      const skill = await storage.updateSkill(id, skillData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(skill);
    } catch (error) {
      console.error("Error updating skill:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid skill data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating skill" });
    }
  });

  app.delete("/api/skills/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSkill(id);
      res.json({ message: "Skill deleted successfully" });
    } catch (error) {
      console.error("Error deleting skill:", error);
      res.status(500).json({ message: "Error deleting skill" });
    }
  });

  // Experience routes
  app.get("/api/experiences", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const experiences = await storage.getUserExperiences(userId);
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      res.status(500).json({ message: "Error fetching experiences" });
    }
  });

  app.post("/api/experiences", async (req, res) => {
    try {
      const userId = "00000000-0000-0000-0000-000000000001";
      const experienceData = insertExperienceSchema.parse({ ...req.body, userId });
      
      const experience = await storage.createExperience(experienceData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(experience);
    } catch (error) {
      console.error("Error creating experience:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid experience data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating experience" });
    }
  });

  app.put("/api/experiences/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = "00000000-0000-0000-0000-000000000001";
      const experienceData = insertExperienceSchema.partial().parse(req.body);
      
      const experience = await storage.updateExperience(id, experienceData);
      
      // Deduct credits
      try {
        await storage.updateSubscriptionCredits(userId, 5);
      } catch (creditError) {
        console.log("Credit deduction failed:", creditError);
      }
      
      res.json(experience);
    } catch (error) {
      console.error("Error updating experience:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid experience data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating experience" });
    }
  });

  app.delete("/api/experiences/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteExperience(id);
      res.json({ message: "Experience deleted successfully" });
    } catch (error) {
      console.error("Error deleting experience:", error);
      res.status(500).json({ message: "Error deleting experience" });
    }
  });

  // Public profile sharing
  app.get("/api/profile/share/:shareSlug", async (req, res) => {
    try {
      const { shareSlug } = req.params;
      const profile = await storage.getProfileByShareSlug(shareSlug);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Get all related data for public profile
      const [education, projects, skills, experiences] = await Promise.all([
        storage.getUserEducation(profile.userId),
        storage.getUserProjects(profile.userId),
        storage.getUserSkills(profile.userId),
        storage.getUserExperiences(profile.userId)
      ]);

      res.json({
        ...profile,
        education,
        projects,
        skills,
        experiences
      });
    } catch (error) {
      console.error("Error fetching shared profile:", error);
      res.status(500).json({ message: "Error fetching profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
