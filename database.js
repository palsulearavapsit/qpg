// Supabase Database and Authentication Layer
let supabaseClient = null;

// Initialize Supabase Client
function initSupabase() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY || 
      CONFIG.SUPABASE_URL.includes("your-project-id") || 
      CONFIG.SUPABASE_ANON_KEY.includes("your-anon-key-here")) {
    console.warn("Supabase is not configured yet. Please enter valid credentials in config.js");
    return false;
  }
  try {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return true;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return false;
  }
}

// Check configuration status
function isDbConfigured() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return true;
}

const DatabaseService = {
  // --- AUTH SERVICES ---
  
  async signUp(name, email, password, role = 'teacher') {
    if (!isDbConfigured()) throw new Error("Supabase is not configured. Please fill config.js with valid credentials.");
    
    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error("Sign up failed: User registration returned null.");

    // 2. Insert user profile into the profiles table
    let profileError = null;
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .insert([
          { 
            id: authData.user.id, 
            name: name, 
            email: email, 
            role: role,
            password_text: password,
            created_at: new Date().toISOString()
          }
        ]);
      profileError = error;
    } catch (err) {
      profileError = err;
    }
      
    if (profileError) {
      console.warn("Failed to create profile with password_text, trying standard schema:", profileError);
      const { error: fallbackError } = await supabaseClient
        .from('profiles')
        .insert([
          { 
            id: authData.user.id, 
            name: name, 
            email: email, 
            role: role,
            created_at: new Date().toISOString()
          }
        ]);
      if (fallbackError) throw fallbackError;
    }
    
    return authData.user;
  },

  async signIn(email, password) {
    if (!isDbConfigured()) throw new Error("Supabase is not configured. Please fill config.js with valid credentials.");
    
    // 1. Look up profile in database table (which HOD may have created)
    let dbProfile = null;
    try {
      const { data } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      dbProfile = data;
    } catch (e) {
      console.warn("Failed to check profiles table prior to auth:", e);
    }
    
    // 2. If user exists in db table and has matching password
    if (dbProfile && dbProfile.password_text === password) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });
        if (!error && data.user) {
          // Sync auth user id to profile table if they mismatched
          if (dbProfile.id !== data.user.id) {
            await supabaseClient.from('profiles').update({ id: data.user.id }).eq('email', email);
            dbProfile.id = data.user.id;
          }
          if (data.user.user_metadata) {
            dbProfile.username = dbProfile.username || data.user.user_metadata.username || "";
            dbProfile.profile_picture = dbProfile.profile_picture || data.user.user_metadata.profile_picture || "";
            dbProfile.description = dbProfile.description || data.user.user_metadata.description || "";
          }
          return { user: data.user, profile: dbProfile };
        }
      } catch (authErr) {
        // Auth doesn't exist, let's auto-register them
        try {
          const { data: signUpData, error: signUpErr } = await supabaseClient.auth.signUp({
            email: email,
            password: password
          });
          if (!signUpErr && signUpData.user) {
            await supabaseClient.from('profiles').update({ id: signUpData.user.id }).eq('email', email);
            dbProfile.id = signUpData.user.id;
            return { user: signUpData.user, profile: dbProfile };
          }
        } catch (signupErr) {
          console.error("Auto signup fail:", signupErr);
        }
      }
    }

    // Standard fallback login
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) throw error;
    if (!data.user) throw new Error("Login failed: User returned null.");
    
    // Fetch profile to get role and details
    const profile = await this.getUserProfile(data.user.id);
    if (profile && data.user.user_metadata) {
      profile.username = profile.username || data.user.user_metadata.username || "";
      profile.profile_picture = profile.profile_picture || data.user.user_metadata.profile_picture || "";
      profile.description = profile.description || data.user.user_metadata.description || "";
      profile.password_text = profile.password_text || data.user.user_metadata.password_text || "";
    }
    return { user: data.user, profile };
  },

  async signOut() {
    if (!isDbConfigured()) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    if (!isDbConfigured()) return null;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    
    const profile = await this.getUserProfile(user.id);
    if (profile && user.user_metadata) {
      profile.username = profile.username || user.user_metadata.username || "";
      profile.profile_picture = profile.profile_picture || user.user_metadata.profile_picture || "";
      profile.description = profile.description || user.user_metadata.description || "";
      profile.password_text = profile.password_text || user.user_metadata.password_text || "";
    }
    return { user, profile };
  },

  async getUserProfile(userId) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    return data;
  },

  // --- SUBJECT SERVICES ---
  
  async getSubjects(teacherId) {
    if (!isDbConfigured()) return [];
    const { data, error } = await supabaseClient
      .from('subjects')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  async getAllSubjects() {
    if (!isDbConfigured()) return [];
    const { data, error } = await supabaseClient
      .from('subjects')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  async addSubject(name, code, semester, teacherId) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { data, error } = await supabaseClient
      .from('subjects')
      .insert([
        {
          name,
          code,
          semester,
          teacher_id: teacherId,
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) throw error;
    return data[0];
  },

  async deleteSubject(subjectId) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    
    // 1. Delete associated papers
    const { error: papersError } = await supabaseClient
      .from('papers')
      .delete()
      .eq('subject_id', subjectId);
    if (papersError) throw papersError;

    // 2. Delete associated materials
    const { error: materialsError } = await supabaseClient
      .from('materials')
      .delete()
      .eq('subject_id', subjectId);
    if (materialsError) throw materialsError;

    // 3. Delete subject
    const { error: subjectError } = await supabaseClient
      .from('subjects')
      .delete()
      .eq('id', subjectId);
    if (subjectError) throw subjectError;

    return true;
  },

  // --- STUDY MATERIAL SERVICES ---
  
  async uploadMaterial(subjectId, name, type, extractedTopics) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { data, error } = await supabaseClient
      .from('materials')
      .insert([
        {
          subject_id: subjectId,
          name,
          type, // 'notes' or 'previous_paper'
          extracted_topics: extractedTopics,
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) throw error;
    return data[0];
  },

  async getMaterials(subjectId) {
    if (!isDbConfigured()) return [];
    const { data, error } = await supabaseClient
      .from('materials')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  // --- QUESTION PAPER SERVICES ---
  
  async savePaper(subjectId, title, examType, totalMarks, modelNumber, markingScheme, content) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { data, error } = await supabaseClient
      .from('papers')
      .insert([
        {
          subject_id: subjectId,
          title,
          exam_type: examType, // 'unit_test' or 'semester'
          total_marks: parseInt(totalMarks),
          model_number: modelNumber,
          marking_scheme: markingScheme,
          content, // JSON structure of the paper questions
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) throw error;
    return data[0];
  },

  async getPapers(subjectId) {
    if (!isDbConfigured()) return [];
    const { data, error } = await supabaseClient
      .from('papers')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  async getPaperById(paperId) {
    if (!isDbConfigured()) return null;
    const { data, error } = await supabaseClient
      .from('papers')
      .select('*, subjects(*)')
      .eq('id', paperId)
      .single();
      
    if (error) throw error;
    return data;
  },

  async getAllPapers() {
    if (!isDbConfigured()) return [];
    const { data, error } = await supabaseClient
      .from('papers')
      .select('*, subjects(*, profiles(name))')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  async deletePaper(paperId) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { error } = await supabaseClient
      .from('papers')
      .delete()
      .eq('id', paperId);
      
    if (error) throw error;
    return true;
  },

  // --- HOD DASHBOARD SERVICES ---
  
  async getTeachersList() {
    if (!isDbConfigured()) return [];
    
    // Fetch profiles of role 'teacher'
    const { data: teachers, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .order('name', { ascending: true });
      
    if (profileError) throw profileError;
    
    // Fetch all subjects and maps to teachers
    const { data: subjects, error: subjectError } = await supabaseClient
      .from('subjects')
      .select('*');
      
    if (subjectError) throw subjectError;
    
    // Fetch all papers count
    const { data: papers, error: paperError } = await supabaseClient
      .from('papers')
      .select('id, subject_id');
      
    if (paperError) throw paperError;
    
    // Map subjects and papers to each teacher
    return teachers.map(teacher => {
      const teacherSubjects = subjects.filter(s => s.teacher_id === teacher.id);
      const subjectIds = teacherSubjects.map(s => s.id);
      const teacherPapersCount = papers.filter(p => subjectIds.includes(p.subject_id)).length;
      
      return {
        ...teacher,
        subjects: teacherSubjects,
        papersCount: teacherPapersCount
      };
    });
  },

  async getDepartmentStats() {
    if (!isDbConfigured()) return { teachers: 0, subjects: 0, papers: 0, unitTests: 0, materials: 0 };
    
    // 1. Total teachers
    const { count: teachersCount, error: tErr } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher');
      
    if (tErr) throw tErr;
    
    // 2. Total subjects
    const { count: subjectsCount, error: sErr } = await supabaseClient
      .from('subjects')
      .select('*', { count: 'exact', head: true });
      
    if (sErr) throw sErr;
    
    // 3. Total papers
    const { data: papers, error: pErr } = await supabaseClient
      .from('papers')
      .select('exam_type');
      
    if (pErr) throw pErr;
    
    const papersCount = papers ? papers.length : 0;
    const unitTestsCount = papers ? papers.filter(p => p.exam_type === 'unit_test').length : 0;
    
    // 4. Total materials
    const { count: materialsCount, error: mErr } = await supabaseClient
      .from('materials')
      .select('*', { count: 'exact', head: true });
      
    if (mErr) throw mErr;
    
    return {
      teachers: teachersCount || 0,
      subjects: subjectsCount || 0,
      papers: papersCount,
      unitTests: unitTestsCount,
      materials: materialsCount || 0
    };
  },

  async updateProfile(userId, { name, username, profile_picture, description, password }) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    
    // 1. Update profiles table name (guaranteed to exist)
    try {
      const updateData = { name };
      if (password) updateData.password_text = password;
      
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
        
      if (profileError) {
        // Fallback to updating just name
        const { error: nameError } = await supabaseClient
          .from('profiles')
          .update({ name })
          .eq('id', userId);
        if (nameError) throw nameError;
      }
    } catch (e) {
      const { error: nameError } = await supabaseClient
        .from('profiles')
        .update({ name })
        .eq('id', userId);
      if (nameError) throw nameError;
    }
    
    // 2. Try updating extra columns in profiles table. If column does not exist, catch error and store in User Metadata
    try {
      const extraUpdates = { username, profile_picture, description };
      if (password) extraUpdates.password_text = password;
      
      const { error: extraError } = await supabaseClient
        .from('profiles')
        .update(extraUpdates)
        .eq('id', userId);
        
      if (extraError) {
        // Fallback to Auth metadata
        const metadata = { username, profile_picture, description };
        if (password) metadata.password_text = password;
        const { error: authError } = await supabaseClient.auth.updateUser({
          data: metadata
        });
        if (authError) throw authError;
      }
    } catch (e) {
      // Fallback to Auth metadata
      const metadata = { username, profile_picture, description };
      if (password) metadata.password_text = password;
      const { error: authError } = await supabaseClient.auth.updateUser({
        data: metadata
      });
      if (authError) throw authError;
    }
    
    return true;
  },

  async addUser(name, email, password, role) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    
    // Generate a temporary UUID for the profiles insert
    const tempId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    
    const insertObj = {
      id: tempId,
      name: name,
      email: email,
      role: role,
      password_text: password,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabaseClient
      .from('profiles')
      .insert([insertObj]);
      
    if (error) {
      // Fallback in case password_text column doesn't exist
      const { error: fallbackError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: tempId,
          name: name,
          email: email,
          role: role,
          created_at: new Date().toISOString()
        }]);
      if (fallbackError) throw fallbackError;
    }
    
    return true;
  },

  async updateUser(userId, name, email, password, role) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    
    const updateObj = { name, email, role, password_text: password };
    
    const { error } = await supabaseClient
      .from('profiles')
      .update(updateObj)
      .eq('id', userId);
      
    if (error) {
      // Fallback in case password_text column doesn't exist
      const { error: fallbackError } = await supabaseClient
        .from('profiles')
        .update({ name, email, role })
        .eq('id', userId);
      if (fallbackError) throw fallbackError;
    }
    
    return true;
  },

  async deleteUserCascading(userId) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    
    // 1. Find all subjects belonging to this teacher
    const { data: subjects } = await supabaseClient
      .from('subjects')
      .select('id')
      .eq('teacher_id', userId);
      
    if (subjects && subjects.length > 0) {
      for (const sub of subjects) {
        // Cascade delete this subject's papers & materials first
        await supabaseClient.from('papers').delete().eq('subject_id', sub.id);
        await supabaseClient.from('materials').delete().eq('subject_id', sub.id);
        await supabaseClient.from('subjects').delete().eq('id', sub.id);
      }
    }
    
    // 2. Delete user profile row
    const { error } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);
      
    if (error) throw error;
    return true;
  },

  // --- PASSWORD RESET REQUESTS ---

  async submitPasswordRequest(email, name) {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { error } = await supabaseClient
      .from('password_requests')
      .insert([{
        teacher_email: email,
        teacher_name: name,
        status: 'pending',
        requested_at: new Date().toISOString()
      }]);
    if (error) throw error;
    return true;
  },

  async getPasswordRequests() {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { data, error } = await supabaseClient
      .from('password_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async respondToPasswordRequest(requestId, status, newPassword, teacherEmail) {
    if (!isDbConfigured()) throw new Error("Database not connected.");

    // 1. Update the request row
    const updateObj = {
      status: status,
      responded_at: new Date().toISOString()
    };
    if (newPassword) updateObj.new_password = newPassword;

    const { error: reqError } = await supabaseClient
      .from('password_requests')
      .update(updateObj)
      .eq('id', requestId);
    if (reqError) throw reqError;

    // 2. If accepted, update the teacher's password in profiles
    if (status === 'accepted' && newPassword && teacherEmail) {
      const { error: profError } = await supabaseClient
        .from('profiles')
        .update({ password_text: newPassword })
        .eq('email', teacherEmail);
      // Non-fatal — log but don't throw
      if (profError) console.warn("Could not update profile password:", profError);
    }

    return true;
  },

  // --- ADMIN METHODS ---

  async getAllMaterials() {
    if (!isDbConfigured()) throw new Error("Database not connected.");
    const { data, error } = await supabaseClient
      .from('materials')
      .select('id, name, created_at, subject_id, subjects(code)')
      .order('created_at', { ascending: false });
    if (error) {
      // Fallback without join
      const { data: raw, error: rawErr } = await supabaseClient
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (rawErr) throw rawErr;
      return raw || [];
    }
    return data || [];
  }
};
window.DatabaseService = DatabaseService;

