-- AI Question Paper Generator Schema
-- Copy and paste this script into your Supabase SQL Editor (Dashboard > SQL Editor > New Query) and click Run.

-- 1. Create Profiles Table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'hod')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies for Profiles
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-- 2. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    semester TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create Policies for Subjects
CREATE POLICY "Allow read access to all subjects for department" ON public.subjects
    FOR SELECT USING (true);

CREATE POLICY "Allow teachers to insert their own subjects" ON public.subjects
    FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Allow teachers to update/delete their own subjects" ON public.subjects
    FOR ALL USING (auth.uid() = teacher_id);


-- 3. Create Study Materials / Papers Upload Table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('notes', 'previous_paper')),
    extracted_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Create Policies for Materials
CREATE POLICY "Allow read access to all materials for department" ON public.materials
    FOR SELECT USING (true);

CREATE POLICY "Allow teachers to manage materials of their subjects" ON public.materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.subjects 
            WHERE public.subjects.id = public.materials.subject_id 
            AND public.subjects.teacher_id = auth.uid()
        )
    );


-- 4. Create Generated Question Papers Table
CREATE TABLE IF NOT EXISTS public.papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('unit_test', 'semester')),
    total_marks INTEGER NOT NULL,
    model_number TEXT NOT NULL,
    marking_scheme TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Papers
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- Create Policies for Papers
CREATE POLICY "Allow read access to all papers for department HOD and teachers" ON public.papers
    FOR SELECT USING (true);

CREATE POLICY "Allow teachers to manage papers of their subjects" ON public.papers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.subjects 
            WHERE public.subjects.id = public.papers.subject_id 
            AND public.subjects.teacher_id = auth.uid()
        )
    );

-- Create optimization indexes
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON public.subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_papers_subject ON public.papers(subject_id);
