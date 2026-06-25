-- AI Question Paper Generator - Database Schema Setup
-- Run this in the SQL Editor of your Supabase Console (https://supabase.com)

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE CHECK (email LIKE '%@apsit.edu.in'),
    role TEXT NOT NULL CHECK (role IN ('teacher', 'hod')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create SUBJECTS Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    semester TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create MATERIALS Table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('notes', 'previous_paper')),
    extracted_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create PAPERS Table
CREATE TABLE IF NOT EXISTS public.papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('unit_test', 'semester')),
    total_marks INTEGER NOT NULL,
    model_number TEXT NOT NULL,
    marking_scheme TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Enable ROW LEVEL SECURITY (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- 6. Define PROFILES Policies
CREATE POLICY "Allow authenticated users to select profiles" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow users to insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 7. Define SUBJECTS Policies
CREATE POLICY "Allow authenticated users to select all subjects" 
    ON public.subjects FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow teachers to insert their own subjects" 
    ON public.subjects FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Allow teachers to update their own subjects" 
    ON public.subjects FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Allow teachers to delete their own subjects" 
    ON public.subjects FOR DELETE 
    TO authenticated 
    USING (auth.uid() = teacher_id);

-- 8. Define MATERIALS Policies
CREATE POLICY "Allow authenticated users to select materials" 
    ON public.materials FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow teachers to manage materials for their subjects" 
    ON public.materials FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.subjects 
            WHERE public.subjects.id = subject_id 
              AND public.subjects.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.subjects 
            WHERE public.subjects.id = subject_id 
              AND public.subjects.teacher_id = auth.uid()
        )
    );

-- 9. Define PAPERS Policies
CREATE POLICY "Allow authenticated users to select papers" 
    ON public.papers FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow teachers to manage papers for their subjects" 
    ON public.papers FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.subjects 
            WHERE public.subjects.id = subject_id 
              AND public.subjects.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.subjects 
            WHERE public.subjects.id = subject_id 
              AND public.subjects.teacher_id = auth.uid()
        )
    );
