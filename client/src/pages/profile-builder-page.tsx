import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { CreditCounter } from "@/components/credit-counter";
import { AutosaveToast } from "@/components/autosave-toast";
import { CreditTopupModal } from "@/components/modals/credit-topup-modal";
import { ShareProfileModal } from "@/components/modals/share-profile-modal";
import { Plus, Trash2, FileText, Share, Upload, Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import debounce from "lodash.debounce";

interface ProfileData {
  id?: string;
  name?: string;
  email?: string;
  bio?: string;
  photoUrl?: string;
  cvUrl?: string;
  shareSlug?: string;
  education: Array<{
    id?: string;
    degree: string;
    university: string;
    duration: string;
  }>;
  projects: Array<{
    id?: string;
    name: string;
    description: string;
    link: string;
    duration: string;
  }>;
  skills: Array<{
    id?: string;
    name: string;
    proficiency: string;
  }>;
  experiences: Array<{
    id?: string;
    role: string;
    company: string;
    duration: string;
    description: string;
  }>;
}

export default function ProfileBuilderPage() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAutosaveToast, setShowAutosaveToast] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });

  const { data: credits } = useQuery<{creditsRemaining: number, hasSubscription: boolean, planType: string}>({
    queryKey: ["/api/credits"],
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      setShowAutosaveToast(true);
    },
    onError: (error: Error) => {
      if (error.message.includes("Insufficient credits")) {
        toast({
          title: "Insufficient Credits",
          description: "Please top-up your credits to continue editing.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Education mutations
  const addEducationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/education", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      setShowAutosaveToast(true);
    },
  });

  const updateEducationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await apiRequest("PUT", `/api/education/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      setShowAutosaveToast(true);
    },
  });

  const deleteEducationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/education/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  // Similar mutations for projects, skills, experiences (abbreviated for space)
  // ... (add similar patterns for other sections)

  // Debounced autosave function
  const debouncedAutosave = useCallback(
    debounce((field: string, value: string) => {
      if (credits?.creditsRemaining && credits.creditsRemaining >= 5) {
        updateProfileMutation.mutate({ [field]: value });
      }
    }, 1000),
    [credits?.creditsRemaining]
  );

  const handleInputChange = (field: string, value: string) => {
    debouncedAutosave(field, value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Canar</h1>
              <div className="ml-8 flex items-center space-x-4">
                <Button
                  variant={!isPreviewMode ? "default" : "ghost"}
                  onClick={() => setIsPreviewMode(false)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Mode
                </Button>
                <Button
                  variant={isPreviewMode ? "default" : "ghost"}
                  onClick={() => setIsPreviewMode(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <CreditCounter 
                credits={credits?.creditsRemaining || 0}
                onClick={() => setShowCreditModal(true)}
              />
              <Button
                variant="outline"
                onClick={() => toast({ title: "Export PDF", description: "PDF export functionality coming soon!" })}
                size="sm"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                onClick={() => setShowShareModal(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Sections (Left Column) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      defaultValue={profile?.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={isPreviewMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      defaultValue={profile?.email || ""}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={isPreviewMode}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    rows={4}
                    defaultValue={profile?.bio || ""}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    disabled={isPreviewMode}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Profile Photo</Label>
                    <div className="mt-2 flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                        {profile?.photoUrl ? (
                          <img 
                            src={profile.photoUrl} 
                            alt="Profile" 
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <Upload className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      {!isPreviewMode && (
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Resume/CV</Label>
                    {!isPreviewMode && (
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-gray-400">
                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Upload your CV (PDF, DOC)</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Education Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle>Education</CardTitle>
                {!isPreviewMode && (
                  <Button
                    onClick={() => addEducationMutation.mutate({
                      degree: "New Degree",
                      university: "University Name",
                      duration: "Year - Year"
                    })}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Education
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {profile?.education && profile.education.length > 0 ? (
                  <div className="space-y-6">
                    {profile.education.map((edu, index) => (
                      <div key={edu.id || index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Degree</Label>
                            <Input
                              defaultValue={edu.degree}
                              onChange={(e) => {
                                if (edu.id) {
                                  updateEducationMutation.mutate({
                                    id: edu.id,
                                    data: { degree: e.target.value }
                                  });
                                }
                              }}
                              disabled={isPreviewMode}
                            />
                          </div>
                          <div>
                            <Label>University</Label>
                            <Input
                              defaultValue={edu.university}
                              onChange={(e) => {
                                if (edu.id) {
                                  updateEducationMutation.mutate({
                                    id: edu.id,
                                    data: { university: e.target.value }
                                  });
                                }
                              }}
                              disabled={isPreviewMode}
                            />
                          </div>
                          <div>
                            <Label>Duration</Label>
                            <Input
                              defaultValue={edu.duration}
                              onChange={(e) => {
                                if (edu.id) {
                                  updateEducationMutation.mutate({
                                    id: edu.id,
                                    data: { duration: e.target.value }
                                  });
                                }
                              }}
                              disabled={isPreviewMode}
                            />
                          </div>
                          {!isPreviewMode && (
                            <div className="flex items-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => edu.id && deleteEducationMutation.mutate(edu.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No education added yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle>Skills</CardTitle>
                {!isPreviewMode && (
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Skill
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {profile?.skills && profile.skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.skills.map((skill, index) => (
                      <div key={skill.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-grow">
                          <Input
                            defaultValue={skill.name}
                            className="font-medium mb-2"
                            disabled={isPreviewMode}
                          />
                          <Select defaultValue={skill.proficiency} disabled={isPreviewMode}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                              <SelectItem value="Expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {!isPreviewMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No skills added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Preview (Right Column) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="mx-auto h-20 w-20 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
                      {profile?.photoUrl ? (
                        <img 
                          src={profile.photoUrl} 
                          alt="Profile" 
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {profile?.name || "Your Name"}
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      {profile?.email || "your@email.com"}
                    </p>
                    <p className="text-sm text-gray-700 mb-6">
                      {profile?.bio || "Your professional bio will appear here..."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Skills</h5>
                      <div className="flex flex-wrap gap-2">
                        {profile?.skills && profile.skills.length > 0 ? (
                          profile.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={skill.id || index} variant="default" className="text-xs">
                              {skill.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No skills added</span>
                        )}
                      </div>
                    </div>
                    
                    {profile?.experiences && profile.experiences.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Latest Experience</h5>
                        <div className="text-sm">
                          <p className="font-medium">{profile.experiences[0].role}</p>
                          <p className="text-gray-600">{profile.experiences[0].company}</p>
                          <p className="text-xs text-gray-500">{profile.experiences[0].duration}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreditTopupModal 
        open={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        currentCredits={credits?.creditsRemaining || 0}
      />
      
      <ShareProfileModal 
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={profile?.shareSlug ? `${window.location.origin}/profile/share/${profile.shareSlug}` : ""}
      />

      {/* Autosave Toast */}
      <AutosaveToast 
        show={showAutosaveToast}
        onClose={() => setShowAutosaveToast(false)}
        creditsRemaining={credits?.creditsRemaining || 0}
      />
    </div>
  );
}
