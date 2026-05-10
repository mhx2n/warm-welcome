
-- Drop all RESTRICTIVE "viewable by everyone" SELECT policies and recreate as PERMISSIVE
-- Also drop RESTRICTIVE admin ALL policies and recreate as PERMISSIVE

-- ===== site_settings =====
DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage site_settings" ON public.site_settings;
CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== exams =====
DROP POLICY IF EXISTS "Published exams are viewable by everyone" ON public.exams;
DROP POLICY IF EXISTS "Admins can manage exams" ON public.exams;
CREATE POLICY "Published exams are viewable by everyone" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== questions =====
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== notices =====
DROP POLICY IF EXISTS "Notices are viewable by everyone" ON public.notices;
DROP POLICY IF EXISTS "Admins can manage notices" ON public.notices;
CREATE POLICY "Notices are viewable by everyone" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== sections =====
DROP POLICY IF EXISTS "Sections are viewable by everyone" ON public.sections;
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
CREATE POLICY "Sections are viewable by everyone" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== categories =====
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== subjects =====
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== reminders =====
DROP POLICY IF EXISTS "Reminders are viewable by everyone" ON public.reminders;
DROP POLICY IF EXISTS "Admins can manage reminders" ON public.reminders;
CREATE POLICY "Reminders are viewable by everyone" ON public.reminders FOR SELECT USING (true);
CREATE POLICY "Admins can manage reminders" ON public.reminders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== event_banners =====
DROP POLICY IF EXISTS "Event banners are viewable by everyone" ON public.event_banners;
DROP POLICY IF EXISTS "Admins can manage event_banners" ON public.event_banners;
CREATE POLICY "Event banners are viewable by everyone" ON public.event_banners FOR SELECT USING (true);
CREATE POLICY "Admins can manage event_banners" ON public.event_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== results =====
DROP POLICY IF EXISTS "Results are viewable by everyone" ON public.results;
DROP POLICY IF EXISTS "Admins can manage results" ON public.results;
DROP POLICY IF EXISTS "Anyone can insert results" ON public.results;
CREATE POLICY "Results are viewable by everyone" ON public.results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert results" ON public.results FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage results" ON public.results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== user_roles =====
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
